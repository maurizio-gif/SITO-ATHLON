-- Le bozze di risposta che l'assistente scrive per la casella del desk.
--
-- L'assistente della chat risponde dai contenuti di /kb.json a chi scrive dal
-- sito. Chi scrive **per email** faceva le stesse domande — che certificato
-- serve, quanto costa sospendere, a che ora si nuota — e non riceveva niente:
-- il canale su cui il desk passa la giornata era l'unico senza assistenza.
--
-- Questa tabella e' il registro dell'automazione n8n "ATHLON BOZZE EMAIL": una
-- riga per ogni email che l'assistente ha **considerato**, non per ogni bozza
-- scritta. Vale la regola del referral: gli scarti si registrano come i
-- successi, o le risposte non date non esistono e nessuno puo' sapere quante
-- fossero ne' perche'.
--
-- **La bozza non parte mai da sola.** Finisce nel thread di Gmail come bozza:
-- la legge una persona, la corregge se serve, e la manda lei. E' la ragione per
-- cui questa automazione puo' esistere — l'errore piu' grave che puo' fare e'
-- far perdere trenta secondi a chi la rilegge.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260823_chat_imbuto_email.sql.


-- ---------------------------------------------------------------------------
-- La tabella
-- ---------------------------------------------------------------------------
create table if not exists public.email_bozze (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  -- `set null` e non `cascade`, al contrario di email_messaggi: quella e' la
  -- corrispondenza di una persona e senza la persona non e' niente, questa e'
  -- il registro di cosa ha fatto l'automazione — vale anche per un mittente
  -- che nell'anagrafica non c'e', ed e' proprio il caso interessante.
  utente_id      uuid references public.utenti (id) on delete set null,

  -- Il messaggio a cui la bozza risponde. `gmail_id` ha un indice unico: il
  -- trigger guarda la casella ogni minuto e una consegna ripetuta non deve
  -- diventare una seconda bozza nello stesso thread.
  gmail_id       text not null,
  thread_id      text,
  ricevuta_il    timestamptz,

  mittente       text not null,
  mittente_nome  text,
  oggetto        text,
  -- Il testo della domanda, ripulito dal quotato e dalla firma: e' quello su
  -- cui l'assistente ha deciso. Sta qui e non solo in email_messaggi perche'
  -- quella tabella tiene i soli mittenti che sono in anagrafica, e la domanda
  -- di uno sconosciuto e' il caso che questa automazione serve.
  domanda        text,

  -- bozza | scarto. Due valori e non tre: una bozza scritta e una risposta non
  -- data sono le sole due cose che possono succedere.
  esito          text not null,
  -- Perche' non si e' risposto, e sono tre motivi che non sono lo stesso:
  --   attesa_allegato — c'era un allegato (di solito un certificato medico):
  --                     per ora si aspetta, la lettura del documento verra' dopo;
  --   fuori_ambito    — le voci del sito non c'entrano niente con l'email
  --                     (una fattura, una newsletter, un fornitore): niente
  --                     chiamata al modello, il recupero e' anche il filtro;
  --   senza_risposta  — il modello ha detto di non sapere, che e' la regola 5
  --                     dell'assistente e qui e' la risposta giusta;
  --   modello_fallito — il modello non ha risposto affatto, che e' un'altra cosa:
  --                     il primo e' l'assistente che funziona, il secondo un
  --                     guasto. Tenerli distinti e' cio' che rende leggibile
  --                     questa colonna;
  --   bozza_non_creata— la bozza c'era e Gmail non l'ha scritta. La sola perdita
  --                     vera di questa automazione, e per questo si registra.
  -- Se i `fuori_ambito` sono tanti va guardata la soglia, non il modello.
  motivo_scarto  text,

  -- Cosa sapevamo di chi ha scritto quando si e' composta la risposta. Il ramo
  -- lo decide PerfectGym come in chat: `iscritto` cambia registro e conoscenza.
  ramo           text,
  stato_pgm      text,
  stato_nucleo   text,
  member_id      text,
  member_type    text,
  -- Non c'e' una colonna `email`: l'indirizzo e' `mittente`, ed e' su quello che
  -- il trigger aggancia la persona. Una seconda colonna con lo stesso dato e'
  -- una seconda colonna da tenere in pari.
  nome           text,
  cognome        text,

  -- La bozza come e' stata scritta, e le fonti che ha citato. Restano anche
  -- quando l'operatore la riscrive da capo: e' il solo modo di sapere se quello
  -- che l'assistente propone e' vicino o lontano da quello che il desk manda.
  risposta       text,
  fonti          jsonb,
  draft_id       text,

  -- Le tre misure del recupero, per capire uno scarto senza rileggere l'email:
  -- quante voci sono entrate nel contesto, quali ancore hanno sparato, quanto
  -- ha pesato il punteggio migliore.
  kb_voci        integer,
  kb_ancore      text,
  kb_punteggio   integer,
  modello        text
);

comment on table public.email_bozze is
  'Il registro dell''automazione n8n "ATHLON BOZZE EMAIL": una riga per ogni email della casella del desk che l''assistente ha considerato, con la bozza scritta oppure il motivo per cui non l''ha scritta. La bozza non viene mai inviata da sola — resta nel thread di Gmail finche'' una persona non la manda.';
comment on column public.email_bozze.esito is
  'bozza o scarto. Gli scarti si registrano come i successi: una risposta non data che non lascia traccia non si puo'' contare ne'' spiegare.';
comment on column public.email_bozze.motivo_scarto is
  'attesa_allegato (c''era un allegato, di solito un certificato: per ora si aspetta), fuori_ambito (le voci del sito non c''entrano — niente chiamata al modello), senza_risposta (il modello non sapeva, ed e'' la risposta giusta), modello_fallito (il modello non ha risposto: un guasto, non una regola), bozza_non_creata (Gmail non ha scritto la bozza — la sola perdita vera).';
comment on column public.email_bozze.domanda is
  'Il testo dell''email ripulito dal quotato e dalla firma: e'' quello su cui l''assistente ha deciso, non quello che e'' arrivato.';
comment on column public.email_bozze.gmail_id is
  'L''id del messaggio a cui si risponde. Indice unico: il trigger guarda la casella ogni minuto e una consegna ripetuta non deve diventare una seconda bozza nello stesso thread.';
comment on column public.email_bozze.risposta is
  'La bozza come l''ha scritta l''assistente, conservata anche quando l''operatore la riscrive: e'' il solo modo di misurare quanto e'' lontana da quello che il desk manda davvero.';

-- Non c'e' una colonna `payload`, a differenza delle tabelle dei form: qui il
-- corpo dell'email e' gia' una colonna, e una copia in jsonb sarebbe la stessa
-- cosa due volte — che sulle email lunghe sono megabyte per niente.

create unique index if not exists email_bozze_gmail_id_key
  on public.email_bozze (gmail_id);
create index if not exists email_bozze_utente_idx
  on public.email_bozze (utente_id, created_at desc);
create index if not exists email_bozze_esito_idx
  on public.email_bozze (esito, motivo_scarto, created_at desc);
create index if not exists email_bozze_thread_idx
  on public.email_bozze (thread_id) where thread_id is not null;

alter table public.email_bozze enable row level security;


-- ---------------------------------------------------------------------------
-- L'aggancio all'anagrafica
-- ---------------------------------------------------------------------------
-- Come ogni altra tabella: la deduplica sta in Postgres e non in n8n, e
-- `assegna_utente` non puo' far fallire l'inserimento — se solleva, scrive un
-- warning e lascia `utente_id` a null. Un aggancio mancato si ricalcola, una
-- riga perduta no.
--
-- La chiave e' `mittente`, che l'automazione scrive gia' minuscolo e senza
-- spazi: e' l'indirizzo da cui l'email e' arrivata, cioe' la sola identita' che
-- abbiamo prima di interrogare PerfectGym. `member_id` arriva dalla verifica e
-- vince su di lui, come sempre.
drop trigger if exists utente_assegna on public.email_bozze;
create trigger utente_assegna before insert or update of mittente, member_id
  on public.email_bozze for each row
  execute function public.assegna_utente('utente_id','mittente','member_id','nome','cognome','','member_type');


-- ---------------------------------------------------------------------------
-- email_bozze_esiti — quante ne scrive, quante ne scarta e perche'
-- ---------------------------------------------------------------------------
-- La domanda che si fa guardando questa automazione non e' «ha funzionato»: e'
-- «di cento email quante hanno avuto una bozza, e le altre perche' no». Una
-- riga per giorno e per motivo, che e' la forma in cui si legge.
--
-- Non entra in `utente_attivita`, ed e' deliberato: l'email che una persona ha
-- scritto e' gia' li' attraverso email_messaggi, e rimetterla come bozza
-- conterebbe due volte lo stesso gesto — con la differenza che il secondo non
-- e' un gesto suo ma nostro.
create or replace view public.email_bozze_esiti as
  select date_trunc('day', b.created_at)::date as giorno,
         b.esito,
         coalesce(b.motivo_scarto, '-')        as motivo,
         count(*)                              as quante,
         count(b.utente_id)                    as agganciate,
         round(avg(b.kb_voci)::numeric, 1)     as voci_medie,
         round(avg(length(b.risposta))::numeric, 0) as caratteri_medi
  from public.email_bozze b
  group by 1, 2, 3;

comment on view public.email_bozze_esiti is
  'Le bozze dell''assistente email per giorno, esito e motivo di scarto. Serve a rispondere all''unica domanda che conta: di cento email quante hanno avuto una bozza, e le altre perche'' no. Molti fuori_ambito vogliono dire che la soglia del recupero e'' alta, non che il modello sbaglia.';

alter view public.email_bozze_esiti set (security_invoker = true);
