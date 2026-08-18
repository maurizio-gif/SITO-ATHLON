-- Richieste inviate dal form "Scrivi all'assistenza" dell'Help Desk (pagina
-- /club-life del sito). Il form posta su https://automazione.n8ndevelop.it/webhook/help-desk-athlon
-- e l'automazione n8n "HELP DESK ATHLON" scrive qui una riga per ogni richiesta,
-- oltre a mandare la mail al desk e la conferma all'utente via SendGrid.
--
-- Progetto Supabase: app-athlon.
-- Da eseguire nella SQL Editor del progetto (o via supabase db push).

create table if not exists public.richieste_help_desk (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),

  -- Cosa ha chiesto la persona
  attivita           text,          -- primo passo del box: Adulti e Club, Scuola Nuoto Bambini, tutte
  topic              text,          -- valore secco della select: sospensione, certificato, ...
  topic_label        text,          -- etichetta leggibile, la stessa che finisce in email
  messaggio          text,

  -- Chi ha scritto
  first_name         text,
  last_name          text,
  email              text,

  -- Identificativi PerfectGym, se il link li portava negli utm
  user_id            text,
  user_number        text,

  -- Provenienza marketing
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  utm_term           text,
  utm_content        text,

  -- Contesto della richiesta
  pagina             text,          -- path + query da cui e' partita
  ricerca_effettuata text,          -- cosa aveva cercato nell'Help Desk prima di scrivere

  -- La risposta che l'Help Desk aveva gia' dato e che non l'ha soddisfatto:
  -- e' il modo per capire quali schede non funzionano
  risposta_tipo      text,          -- Help Desk, Evento, News, Servizio
  risposta_titolo    text,
  risposta_testo     text,
  risposta_link      text,
  origine            text not null default 'sito-club-life',
  user_agent         text,
  ip                 text,

  -- Payload normalizzato completo, per non perdere niente se aggiungiamo campi
  -- al form senza aggiornare subito questa tabella
  payload            jsonb,

  -- Lavorazione da parte del desk
  stato              text not null default 'nuova'
                       check (stato in ('nuova', 'in_lavorazione', 'risolta', 'archiviata')),
  gestita_da         text,
  gestita_il         timestamptz,
  note_interne       text
);

comment on table public.richieste_help_desk is
  'Richieste del form "Scrivi all''assistenza" dell''Help Desk (pagina /club-life). Scritte dall''automazione n8n "HELP DESK ATHLON", che in parallelo manda la mail al desk e la conferma all''utente via SendGrid.';
comment on column public.richieste_help_desk.topic is
  'Valore della select del form (certificato, prenotazioni, abbonamento, sospensione, corsi, scuola-nuoto, struttura, altro).';
comment on column public.richieste_help_desk.ricerca_effettuata is
  'Ultima domanda digitata nel campo di ricerca dell''Help Desk prima di aprire il form: dice quale risposta manca.';
comment on column public.richieste_help_desk.payload is
  'Copia integrale del payload normalizzato dal nodo "Prepara richiesta" di n8n.';

-- La coda del desk si legge dalla piu' recente; le altre due servono a
-- ritrovare lo storico di una persona e a filtrare per stato.
create index if not exists richieste_help_desk_created_at_idx
  on public.richieste_help_desk (created_at desc);
create index if not exists richieste_help_desk_email_idx
  on public.richieste_help_desk (lower(trim(email)));
create index if not exists richieste_help_desk_stato_idx
  on public.richieste_help_desk (stato)
  where stato <> 'risolta';

-- RLS attivo e nessuna policy: la tabella e' scrivibile solo con la service key
-- (n8n) e leggibile solo dal pannello di segreteria, che passa dalla stessa
-- chiave. Le richieste contengono dati personali, quindi niente accesso anon.
alter table public.richieste_help_desk enable row level security;
