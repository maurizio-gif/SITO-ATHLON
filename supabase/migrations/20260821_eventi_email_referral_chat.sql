-- Le quattro tabelle che mancavano perche' quattro automazioni n8n non
-- scrivevano da nessuna parte: la verifica dell'email, il reset password, il
-- referral e il form dentro l'assistente della chat.
--
-- Progetto Supabase: app-athlon.
-- Da eseguire nella SQL Editor del progetto (o via supabase db push).


-- ---------------------------------------------------------------------------
-- eventi_email — ogni indirizzo digitato in un form, quale che sia l'esito
-- ---------------------------------------------------------------------------
-- Le tabelle richieste_* contengono chi e' arrivato in fondo. Questa contiene
-- chi ha cominciato: ogni volta che qualcuno scrive un'email e il sito la manda
-- a n8n, ne resta una riga. La distanza fra le due e' quanti si fermano a meta',
-- che prima non era visibile da nessuna parte — athlon-verifica-iscritto e'
-- l'endpoint piu' trafficato del sito (ci passano prova, contattaci, la chat,
-- l'Help Desk e i pulsanti Iscriviti) e non lasciava traccia.
create table if not exists public.eventi_email (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  email          text,
  -- Calcolata, non scritta: e' la chiave con cui si uniscono gli inserimenti
  -- della stessa persona fra form diversi.
  email_norm     text generated always as (lower(btrim(email))) stored,

  tipo           text not null, -- quale form: verifica-iscritto, reset-password,
                                -- referral-invitante, referral-amico, chat-dati,
                                -- chat-ticket
  esito          text,          -- nuovo | esiste | iscritto | errore |
                                -- email_non_valida | inviata | ticket-aperto

  -- Cosa sapeva PerfectGym di questo indirizzo in quel momento
  stato_pgm      text,
  stato_nucleo   text,
  member_id      text,
  member_type    text,
  nome           text,
  cognome        text,
  telefono       text,
  contratti_vivi integer,
  figli_visti    integer,

  -- Provenienza
  pagina         text,
  origine        text,
  cta            text,
  vid            text,
  sessione       text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_term       text,
  utm_content    text,
  gclid          text,
  fbclid         text,
  user_agent     text,

  payload        jsonb
);

comment on table public.eventi_email is
  'Registro di ogni email digitata in un form del sito: una riga per inserimento, qualunque sia il form e qualunque sia l''esito. E'' il funnel a monte delle richieste — le tabelle richieste_* contengono solo chi e'' arrivato in fondo.';
comment on column public.eventi_email.tipo is
  'Quale form/endpoint ha raccolto l''email: verifica-iscritto | reset-password | prova | contatto | referral-invitante | referral-amico | chat-dati | chat-ticket | help-desk.';
comment on column public.eventi_email.esito is
  'Cosa e'' successo: per la verifica nuovo|esiste|iscritto|errore|email_non_valida; per il reset inviata|errore|email_non_valida; altrove l''esito del passo.';
comment on column public.eventi_email.email_norm is
  'Email in minuscolo e senza spazi, calcolata: e'' la chiave con cui si uniscono gli inserimenti della stessa persona fra form diversi.';

create index if not exists eventi_email_email_norm_idx  on public.eventi_email (email_norm);
create index if not exists eventi_email_created_at_idx  on public.eventi_email (created_at desc);
create index if not exists eventi_email_tipo_idx        on public.eventi_email (tipo);
create index if not exists eventi_email_vid_idx         on public.eventi_email (vid) where vid is not null;

alter table public.eventi_email enable row level security;


-- ---------------------------------------------------------------------------
-- richieste_referral — un invito per amico, scarti compresi
-- ---------------------------------------------------------------------------
-- Gli scarti sono meta' del punto. Prima un invito rifiutato — chi invita non
-- e' socio, l'amico lo e' gia' — usciva dal workflow su un nodo No-Op e non
-- restava da nessuna parte: nessuno sapeva quanti fossero ne' perche'.
create table if not exists public.richieste_referral (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),

  invitante_email      text,
  invitante_nome       text,
  invitante_cognome    text,
  invitante_member_id  text,
  invitante_e_socio    boolean,

  amico_nome           text,
  amico_cognome        text,
  amico_email          text,
  amico_cellulare      text,      -- E.164 completo, come lo compone il campo del sito
  amico_stato          text,
  amico_e_socio        boolean,

  esito                text,      -- inviato | scartato-invitante-non-socio |
                                  -- scartato-amico-gia-socio
  motivo_scarto        text,

  -- Registrato != consegnato: questi due flag li scrivono due update dopo
  -- SendGrid e dopo Spoki, e senza di loro le due cose sarebbero la stessa.
  email_inviata        boolean not null default false,
  whatsapp_inviato     boolean not null default false,

  quanti_amici         integer,
  pagina               text,
  vid                  text,
  consenso             boolean,
  payload              jsonb,

  stato                text not null default 'nuovo'
                         check (stato in ('nuovo', 'in_gestione', 'vinto', 'perso')),
  gestito_da           text,
  gestito_il           timestamptz,
  note_interne         text
);

comment on table public.richieste_referral is
  'Inviti del programma «invita un amico» (/referral), una riga per amico. Scritte dall''automazione n8n "athlon-referral". Include gli inviti scartati: senza di loro non si sa quanti inviti si perdono ne'' perche''.';
comment on column public.richieste_referral.esito is
  'inviato = invito partito; scartato-invitante-non-socio; scartato-amico-gia-socio.';
comment on column public.richieste_referral.amico_cellulare is
  'Numero completo in E.164 cosi'' come composto dal campo telefono del sito: + prefisso internazionale + numero.';

create index if not exists richieste_referral_created_at_idx
  on public.richieste_referral (created_at desc);
create index if not exists richieste_referral_amico_email_idx
  on public.richieste_referral (lower(btrim(amico_email)));
create index if not exists richieste_referral_invitante_email_idx
  on public.richieste_referral (lower(btrim(invitante_email)));

alter table public.richieste_referral enable row level security;


-- ---------------------------------------------------------------------------
-- chat_lead — i dati raccolti dal form dentro l'assistente
-- ---------------------------------------------------------------------------
-- Finivano solo su PerfectGym, e quelle chiamate hanno onError
-- continueRegularOutput: fallivano in silenzio e il lead non esisteva in nessun
-- posto. Ora la riga si scrive prima del CRM.
create table if not exists public.chat_lead (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  sessione              text,
  conversazione_id      uuid references public.chat_conversazioni (id),
  ramo                  text,      -- come parlargli: iscritto | adulti | junior
  ambito                text,      -- cosa creare su PGM: adulti | junior
  attivita_junior       text,

  email                 text,
  nome                  text,
  cognome               text,
  cellulare             text,
  telefono              text,
  data_nascita          date,
  bambino_nome          text,
  bambino_cognome       text,
  bambino_data_nascita  date,
  consenso              boolean,

  member_id             text,
  stato_pgm             text,
  pgm_strada            text,      -- lead | anagrafica+figlio | figlio | nessuna
  pgm_lead_id           text,
  pgm_member_id         text,
  pgm_figlio_id         text,

  pagina                text,
  payload               jsonb
);

comment on table public.chat_lead is
  'Dati raccolti dal form dentro l''assistente (/club-life) e mandati a PerfectGym dall''automazione n8n "CHAT ATHLON — DATI". La riga si scrive prima della chiamata al CRM, cosi'' il lead resta anche se PerfectGym non risponde.';
comment on column public.chat_lead.pgm_strada is
  'Cosa si e'' creato su PerfectGym: lead (adulto sconosciuto) | anagrafica+figlio (junior sconosciuto) | figlio (junior gia'' socio) | nessuna.';

create index if not exists chat_lead_created_at_idx on public.chat_lead (created_at desc);
create index if not exists chat_lead_email_idx      on public.chat_lead (lower(btrim(email)));
create index if not exists chat_lead_sessione_idx   on public.chat_lead (sessione);

alter table public.chat_lead enable row level security;


-- ---------------------------------------------------------------------------
-- chat_ticket — «voglio parlare con una persona»
-- ---------------------------------------------------------------------------
-- L'unica copia era l'email al desk: su Supabase restava il solo flag
-- `escalata` su chat_conversazioni, che dice che e' successo e non cosa.
create table if not exists public.chat_ticket (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  sessione            text,
  conversazione_id    uuid references public.chat_conversazioni (id),

  email               text,
  nome                text,
  cognome             text,
  telefono            text,
  member_id           text,
  ramo                text,
  attivita            text,
  attivita_junior     text,

  messaggio           text,      -- cosa ha aggiunto oltre alla conversazione
  trascritto          jsonb,
  messaggi            integer,
  pagina              text,
  email_desk_inviata  boolean not null default false,
  payload             jsonb,

  stato               text not null default 'nuovo'
                        check (stato in ('nuovo', 'in_lavorazione', 'risolto', 'archiviato')),
  gestito_da          text,
  gestito_il          timestamptz,
  note_interne        text
);

comment on table public.chat_ticket is
  'Richieste di essere contattati aperte dall''assistente (/club-life), scritte dall''automazione n8n "CHAT ATHLON — TICKET". Prima esisteva solo come email al desk: qui c''e'' il contenuto, il trascritto e lo stato di lavorazione.';
comment on column public.chat_ticket.trascritto is
  'La conversazione come l''ha vista la persona, mandata dal browser e non riletta da chat_messaggi: se una scrittura fosse fallita il trascritto sarebbe monco proprio nel punto che ha generato il ticket.';

create index if not exists chat_ticket_created_at_idx on public.chat_ticket (created_at desc);
create index if not exists chat_ticket_email_idx      on public.chat_ticket (lower(btrim(email)));
create index if not exists chat_ticket_stato_idx      on public.chat_ticket (stato);

alter table public.chat_ticket enable row level security;
