-- Chi chiede di vedere il listino: il gate dell'email davanti alle CTA
-- «Iscriviti» e «Scopri gli abbonamenti».
--
-- Sostituisce il form n8n di `INFO ABBONAMENTI - ATHLON`, che scriveva su
-- Airtable e chiedeva l'attività di interesse con una tendina. Qui l'attività
-- non si chiede: la portano gia' gli attributi della CTA premuta
-- (`data-cta-activity`, `data-cta-source`), quindi il dato arriva senza
-- costare una domanda a chi voleva solo vedere i prezzi.
--
-- La riga nasce **qualificata**, ed e' la ragione per cui questa tabella esiste
-- separata da `richieste_contatto`: qui la domanda non e' «di cosa vuoi
-- parlare» ma «questa persona e' un'opportunita'?». La risposta la da'
-- `statoNucleo` di `athlon-verifica-iscritto` — un abbonamento vivo nel nucleo
-- — e non `memberType`: un Lead o un Guest hanno un'anagrafica e nessun
-- abbonamento, cioe' sono esattamente le opportunita' da chiamare. Decidere su
-- «PerfectGym lo conosce», come faceva il flusso vecchio, li classificava fra
-- i clienti.
--
-- **Il ramo in `utente_attivita` non sta qui**, e non e' una dimenticanza:
-- quella vista e' definita in APP-ATHLON — l'ultima versione e'
-- `20260829c_rinnovi_e_pass_storici.sql`, con i tre rami storici di Airtable
-- che questo repository non conosce. Ridichiararla qui vorrebbe dire farla
-- tornare indietro di tre rami e due colonne. Sta in
-- `APP-ATHLON/supabase/migrations/20260907_info_abbonamenti_scheda.sql`, da
-- eseguire **dopo** questo file.
--
-- Progetto Supabase: app-athlon. Webhook n8n: `athlon-info-abbonamenti`.


-- ---------------------------------------------------------------------------
-- La tabella
-- ---------------------------------------------------------------------------
create table if not exists public.richieste_info_abbonamenti (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- L'email e' l'unica cosa sempre presente: e' quella che il gate chiede
  -- prima di aprire il listino.
  email         text not null,

  -- Chiesti solo quando `servonoISuoiDati()` e' vera, cioe' quando manca uno
  -- fra id, nome, cognome e un cellulare che passa `validaTelefono`. A chi il
  -- club ha gia' in archivio non si richiede niente: quei campi arrivano
  -- riempiti dalla verifica e la riga li conserva lo stesso, perche' e' quello
  -- che il desk legge per chiamare.
  nome          text,
  cognome       text,
  -- In E.164, con il prefisso scelto dalla tendina di `CampoTelefono.astro`.
  -- Mai `+39` incollato davanti: e' il bug che quel componente ha chiuso.
  cellulare     text,

  -- Le tre qualifiche, ed e' un `check` e non testo libero perche' sono una
  -- decisione chiusa e non un elenco che cresce: `nuovo` (nessuna anagrafica,
  -- si crea il lead), `noto_senza_abbonamento` (l'opportunita' calda: c'e'
  -- gia', non ha un abbonamento vivo), `iscritto` (non e' un'opportunita').
  -- `sconosciuta` e' il quarto caso e non e' un valore in piu': e' la verifica
  -- che non ha risposto, e quando non sappiamo non si qualifica.
  qualifica     text not null default 'sconosciuta'
                check (qualifica in ('nuovo','noto_senza_abbonamento','iscritto','sconosciuta')),

  -- Le due risposte grezze di `athlon-verifica-iscritto`, conservate accanto
  -- alla qualifica che ne e' stata dedotta: una divergenza fra le due e' un
  -- sintomo, e nessuno la vedrebbe tenendone una sola.
  stato_pgm     text,
  stato_nucleo  text,
  member_type   text,
  member_id     text,
  -- L'id che `AddLead` restituisce, e che esiste solo dopo la creazione.
  lead_id       text,

  -- Gli slug di `ACTIVITY_TAGS` letti dalla CTA premuta, non chiesti.
  -- Vuoto e' legittimo: dall'header e dal footer si arriva senza attivita'.
  attivita      jsonb not null default '[]'::jsonb,

  -- Gli scarti si registrano come i successi, o le richieste perdute non
  -- esistono e nessuno puo' contarle. `registrata` e' il caso normale.
  esito         text not null default 'registrata',
  motivo_scarto text,

  -- L'email di riepilogo e' partita. Il nodo SendGrid ha
  -- `continueRegularOutput`, quindi senza questa colonna un fallimento non si
  -- vedrebbe da nessuna parte.
  email_inviata boolean not null default false,

  -- L'attribuzione, con le stesse colonne di `richieste_prova` e
  -- `richieste_contatto` e non con un `utm` jsonb: `utente_attivita` legge
  -- `utm_source` come colonna, e le viste dell'acquisizione contatti del
  -- pannello ci raggruppano sopra. Un jsonb qui costringerebbe tutte e due a
  -- scavare nel json o a scrivere `null`.
  vid           text,
  sid           text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  pagina        text,
  -- Quale comando e' stato premuto: `data-cta-source` e `data-cta-intent`.
  origine       text,
  cta           text,

  utente_id     uuid references public.utenti (id) on delete set null
);

comment on table public.richieste_info_abbonamenti is
  'Chi ha lasciato l''email davanti al listino: il gate delle CTA «Iscriviti» e «Scopri gli abbonamenti». La riga nasce qualificata su statoNucleo — un abbonamento vivo nel nucleo — e non su memberType: un Lead o un Guest sono opportunita'', non clienti. Sostituisce il form n8n di INFO ABBONAMENTI - ATHLON, che scriveva su Airtable.';
comment on column public.richieste_info_abbonamenti.qualifica is
  'nuovo | noto_senza_abbonamento | iscritto | sconosciuta. Deriva da statoNucleo, non da memberType. `sconosciuta` e'' la verifica che non ha risposto: quando non sappiamo, non si qualifica.';
comment on column public.richieste_info_abbonamenti.attivita is
  'Slug di ACTIVITY_TAGS letti dagli attributi della CTA premuta, non chiesti alla persona. Vuoto e'' legittimo: dall''header e dal footer si arriva senza attivita''.';
comment on column public.richieste_info_abbonamenti.cellulare is
  'In E.164, come lo restituisce validaTelefono(). Mai un +39 incollato davanti al numero digitato.';
comment on column public.richieste_info_abbonamenti.email_inviata is
  'L''email di riepilogo e'' partita. Il nodo SendGrid ha continueRegularOutput: senza questa colonna un fallimento non si vedrebbe.';

create index if not exists richieste_info_abbonamenti_created_at_idx
  on public.richieste_info_abbonamenti (created_at desc);
create index if not exists richieste_info_abbonamenti_qualifica_idx
  on public.richieste_info_abbonamenti (qualifica, created_at desc);
create index if not exists richieste_info_abbonamenti_email_idx
  on public.richieste_info_abbonamenti (lower(btrim(email)));
create index if not exists richieste_info_abbonamenti_utente_idx
  on public.richieste_info_abbonamenti (utente_id) where utente_id is not null;
create index if not exists richieste_info_abbonamenti_vid_idx
  on public.richieste_info_abbonamenti (vid) where vid is not null;
create index if not exists richieste_info_abbonamenti_sid_idx
  on public.richieste_info_abbonamenti (sid) where sid is not null;

-- RLS attiva e zero policy: passa solo la service key, che sta in n8n. Una
-- policy `anon` qui e' un elenco di opportunita' commerciali pubblicato.
alter table public.richieste_info_abbonamenti enable row level security;


-- ---------------------------------------------------------------------------
-- L'aggancio all'anagrafica
-- ---------------------------------------------------------------------------
-- BEFORE INSERT, e non puo' far fallire la scrittura: `assegna_utente` cattura
-- qualunque errore e lascia `utente_id` a null. Una riga senza aggancio si
-- ricalcola, un'opportunita' perduta no.
--
-- L'id PerfectGym si legge da `member_id` e poi da `lead_id`, in quest'ordine:
-- il primo e' l'anagrafica che c'era gia', il secondo quella appena creata, e
-- non possono esserci tutte e due.
drop trigger if exists utente_assegna on public.richieste_info_abbonamenti;
create trigger utente_assegna before insert or update of email, member_id, lead_id
  on public.richieste_info_abbonamenti for each row
  execute function public.assegna_utente(
    'utente_id','email','member_id,lead_id','nome','cognome','cellulare','member_type');


-- ---------------------------------------------------------------------------
-- email_tutte — il ramo del gate
-- ---------------------------------------------------------------------------
-- Aggiungendo un form al sito si aggiunge qui il suo ramo: una vista che non
-- copre tutte le sorgenti risponde con sicurezza a una domanda sbagliata.
--
-- Attenzione a una cosa quando si legge il risultato: una persona sola che
-- passa dal gate produce **due** righe — la verifica dell'indirizzo
-- (`eventi_email`) e questa — e la distanza fra le due e' esattamente quanti
-- lasciano l'email e non arrivano a lasciare i dati.
create or replace view public.email_tutte as
  select e.created_at as momento, e.email, e.email_norm,
         'eventi_email'::text as fonte, e.tipo, e.esito,
         e.nome, e.cognome, e.telefono, e.pagina, e.vid, e.id as fonte_id,
         e.utente_id
  from public.eventi_email e where e.email is not null

  union all
  select p.created_at, p.email, lower(btrim(p.email)),
         'richieste_prova', 'prova', p.stato,
         p.nome, p.cognome, coalesce(p.cellulare, p.telefono), p.pagina, p.vid, p.id,
         p.utente_id
  from public.richieste_prova p where p.email is not null

  union all
  select c.created_at, c.email, lower(btrim(c.email)),
         'richieste_contatto', 'contatto', c.stato,
         c.nome, c.cognome, coalesce(c.cellulare, c.telefono), c.pagina, c.vid, c.id,
         c.utente_id
  from public.richieste_contatto c where c.email is not null

  union all
  select h.created_at, h.email, lower(btrim(h.email)),
         'richieste_help_desk', 'help-desk', h.topic,
         h.first_name, h.last_name, null, h.pagina, null, h.id,
         h.utente_id
  from public.richieste_help_desk h where h.email is not null

  union all
  select k.created_at, k.email, lower(btrim(k.email)),
         'chat_conversazioni', 'chat', k.stato_pgm,
         null, null, null, k.pagina, k.vid, k.id,
         k.utente_id
  from public.chat_conversazioni k where k.email is not null

  union all
  select l.created_at, l.email, lower(btrim(l.email)),
         'chat_lead', 'chat-dati', l.stato_pgm,
         l.nome, l.cognome, l.telefono, l.pagina, null, l.id,
         l.utente_id
  from public.chat_lead l where l.email is not null

  union all
  select t.created_at, t.email, lower(btrim(t.email)),
         'chat_ticket', 'chat-ticket', t.stato,
         t.nome, t.cognome, t.telefono, t.pagina, null, t.id,
         t.utente_id
  from public.chat_ticket t where t.email is not null

  -- Il referral porta due indirizzi per riga, e vanno contati tutti e due:
  -- chi invita e chi e' invitato sono due persone.
  union all
  select r.created_at, r.invitante_email, lower(btrim(r.invitante_email)),
         'richieste_referral', 'referral-invitante', r.esito,
         r.invitante_nome, r.invitante_cognome, null, r.pagina, r.vid, r.id,
         r.utente_invitante_id
  from public.richieste_referral r where r.invitante_email is not null

  union all
  select r.created_at, r.amico_email, lower(btrim(r.amico_email)),
         'richieste_referral', 'referral-amico', r.esito,
         r.amico_nome, r.amico_cognome, r.amico_cellulare, r.pagina, r.vid, r.id,
         r.utente_amico_id
  from public.richieste_referral r where r.amico_email is not null

  union all
  select i.created_at, i.email, lower(btrim(i.email)),
         'richieste_info_abbonamenti', 'info-abbonamenti', i.qualifica,
         i.nome, i.cognome, i.cellulare, i.pagina, i.vid, i.id,
         i.utente_id
  from public.richieste_info_abbonamenti i where i.email is not null;

comment on view public.email_tutte is
  'Ogni email digitata in un form del sito, da qualunque form. Una riga per tocco, non per persona: la verifica dell''indirizzo e l''invio del form sono due righe, e la distanza fra le due e'' quanti si fermano a meta''. Per una riga per persona usa email_contatti.';

alter view public.email_tutte set (security_invoker = true);


-- ---------------------------------------------------------------------------
-- info_abbonamenti_esiti — l'imbuto del gate
-- ---------------------------------------------------------------------------
-- Le due domande che si fanno davvero: quante opportunita' calde raccoglie
-- questo gate, e quanta gente si ferma prima di lasciare i dati. La seconda
-- non si legge da questa tabella sola — chi si ferma sta in `eventi_email` —
-- quindi qui c'e' solo la prima meta', e il confronto si fa con `email_tutte`.
create or replace view public.info_abbonamenti_esiti as
  select date_trunc('month', created_at)                              as mese,
         count(*)                                                     as richieste,
         count(*) filter (where qualifica = 'noto_senza_abbonamento')  as opportunita_calde,
         count(*) filter (where qualifica = 'nuovo')                   as nuovi,
         count(*) filter (where qualifica = 'iscritto')                as gia_iscritti,
         count(*) filter (where qualifica = 'sconosciuta')             as non_qualificate,
         count(*) filter (where esito <> 'registrata')                 as scartate,
         count(*) filter (where email_inviata)                         as email_inviate,
         count(distinct lower(btrim(email)))                           as indirizzi
  from public.richieste_info_abbonamenti
  group by 1
  order by 1 desc;

comment on view public.info_abbonamenti_esiti is
  'Per mese: quante richieste di listino, come si qualificano, quante scartate e quante email di riepilogo partite. Le opportunita'' calde sono chi ha un''anagrafica e nessun abbonamento vivo nel nucleo — Lead e Guest — cioe'' la gente da chiamare.';

alter view public.info_abbonamenti_esiti set (security_invoker = true);
