-- Le email che arrivano alla casella del desk, agganciate a chi le ha scritte.
--
-- Fino a qui la scheda di una persona diceva cosa aveva compilato sul sito e
-- cosa aveva chiesto all'assistente. Quello che le ha scritto per email non
-- c'era, ed e' il canale su cui il desk passa la giornata: la stessa persona
-- risultava «un form e nient'altro» mentre in casella c'erano cinque scambi.
--
-- Scritta dall'automazione n8n "INBOX EMAIL DESK - SUPABASE": il trigger Gmail
-- guarda la casella ogni minuto, chiede a `utenti` chi e' il mittente e scrive
-- **solo se lo trova**. Il filtro non e' un'ottimizzazione: una casella e' fatta
-- in massima parte di cose che non sono persone — newsletter, notifiche,
-- ricevute, posta indesiderata — e archiviarla tutta trasformerebbe l'anagrafica
-- in un archivio di posta, conservando dati personali di terzi raccolti per
-- niente.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822g_assistenza_abbonati.sql.


-- ---------------------------------------------------------------------------
-- La tabella
-- ---------------------------------------------------------------------------
create table if not exists public.email_messaggi (
  id            uuid primary key default gen_random_uuid(),
  -- Quando la riga e' stata scritta, che non e' quando l'email e' arrivata:
  -- una casella si puo' ripopolare a mano, e in quel caso le due date distano
  -- mesi. Il tempo dell'email e' `ricevuta_il`, ed e' quello che si legge.
  created_at    timestamptz not null default now(),

  -- `not null`, e non `set null` come nelle tabelle dei form: quelle righe sono
  -- una richiesta e valgono anche senza aggancio, questa e' la posta di una
  -- persona e senza la persona non e' niente. Cancellare un contatto porta via
  -- la sua corrispondenza, che e' esattamente quello che deve fare.
  utente_id     uuid not null references public.utenti (id) on delete cascade,

  -- Oggi c'e' solo la posta in arrivo. La colonna esiste perche' il giorno che
  -- si vorra' vedere anche la risposta del desk — cioe' lo scambio e non le sole
  -- domande — bastera' un secondo ramo nell'automazione, non una migrazione.
  direzione     text not null default 'entrata',
  ricevuta_il   timestamptz not null,

  mittente      text not null,
  mittente_nome text,
  destinatari   text[],
  cc            text[],

  oggetto       text,
  anteprima     text,
  -- Sempre pieno: l'automazione prende il testo semplice, e quando l'email e'
  -- solo HTML lo ricava da quello. Chi legge questa tabella ha una colonna da
  -- guardare, non due da provare in ordine.
  corpo         text,
  corpo_html    text,

  -- Il thread e' quello di Gmail: e' la sola chiave che tiene insieme domanda e
  -- risposta anche quando l'oggetto cambia per strada. `in_risposta_a` e
  -- `message_id` sono gli identificativi RFC 5322, che servono a ricostruire
  -- l'ordine dentro un thread e a riconoscere un'email arrivata due volte da
  -- due strade.
  thread_id     text,
  gmail_id      text not null,
  message_id    text,
  in_risposta_a text,
  etichette     text[]
);

comment on table public.email_messaggi is
  'Le email della casella del desk, una riga per messaggio, agganciate alla persona che le ha scritte. Scritte dall''automazione n8n "INBOX EMAIL DESK - SUPABASE", che scrive solo i mittenti presenti in public.utenti: una casella e'' fatta in gran parte di cose che non sono persone, e archiviarla tutta farebbe dell''anagrafica un archivio di posta.';
comment on column public.email_messaggi.utente_id is
  'La persona che ha scritto. Obbligatoria per costruzione: un''email senza la sua persona e'' una copia di un messaggio conservata per niente, quindi non esiste una riga da agganciare dopo.';
comment on column public.email_messaggi.direzione is
  'entrata (oggi la sola) o uscita. Esiste perche'' aggiungere la posta inviata sia un ramo dell''automazione e non una migrazione.';
comment on column public.email_messaggi.ricevuta_il is
  'La data dell''email, non quella della riga: e'' il tempo con cui si ordina la corrispondenza.';
comment on column public.email_messaggi.corpo is
  'Il testo dell''email, sempre pieno: quando manca la parte testuale lo ricava l''automazione dall''HTML. Chi legge ha una colonna sola da guardare.';
comment on column public.email_messaggi.thread_id is
  'Il threadId di Gmail: la sola chiave che tiene insieme domanda e risposta quando l''oggetto cambia per strada.';
comment on column public.email_messaggi.gmail_id is
  'L''id del messaggio in Gmail. Ha un indice unico: il trigger guarda la casella ogni minuto e una consegna ripetuta non deve diventare una seconda riga.';

-- Non ci sono colonne per gli allegati, ed e' deliberato: il nodo Gmail di n8n
-- butta i metadati degli allegati a meno che non li scarichi, quindi nome, tipo
-- e peso non li abbiamo. Una colonna che nessuno riempie e' peggio di una
-- colonna che manca. Il giorno che servono, si accende `downloadAttachments`
-- nell'automazione e il file va su Supabase Storage — come per l'allegato
-- dell'Help Desk, dove nella riga restano nome, tipo e peso e non il base64.

create unique index if not exists email_messaggi_gmail_id_key
  on public.email_messaggi (gmail_id);
create index if not exists email_messaggi_utente_idx
  on public.email_messaggi (utente_id, ricevuta_il desc);
create index if not exists email_messaggi_thread_idx
  on public.email_messaggi (thread_id) where thread_id is not null;
create index if not exists email_messaggi_ricevuta_idx
  on public.email_messaggi (ricevuta_il desc);
create index if not exists email_messaggi_mittente_idx
  on public.email_messaggi (lower(btrim(mittente)));

alter table public.email_messaggi enable row level security;


-- ---------------------------------------------------------------------------
-- utente_attivita — l'email entra nella cronologia
-- ---------------------------------------------------------------------------
-- Il ramo nuovo e' l'ultima union, e conta come richiesta e non come tocco:
-- `utenti_completi.richieste` esclude solo `eventi_email`, ed e' giusto che
-- resti cosi'. Chi scrive alla casella ha chiesto qualcosa davvero, mentre chi
-- digita un indirizzo in un form e chiude la pagina no.
--
-- `momento` e' `ricevuta_il` e non `created_at`: in una cronologia si vuole
-- quando l'email e' arrivata, non quando la riga e' stata scritta.
create or replace view public.utente_attivita as
  select p.utente_id, p.created_at as momento, 'richieste_prova'::text as fonte,
         'prova'::text as tipo, p.id as riferimento_id, p.stato as esito
  from public.richieste_prova p where p.utente_id is not null

  union all
  select c.utente_id, c.created_at, 'richieste_contatto', 'contatto', c.id, c.stato
  from public.richieste_contatto c where c.utente_id is not null

  union all
  select h.utente_id, h.created_at, 'richieste_help_desk', 'help-desk', h.id, h.stato
  from public.richieste_help_desk h where h.utente_id is not null

  union all
  select k.utente_id, k.created_at, 'chat_conversazioni', 'chat', k.id, k.stato_pgm
  from public.chat_conversazioni k where k.utente_id is not null

  union all
  select l.utente_id, l.created_at, 'chat_lead', 'chat-dati', l.id, l.pgm_strada
  from public.chat_lead l where l.utente_id is not null

  union all
  select t.utente_id, t.created_at, 'chat_ticket', 'chat-ticket', t.id, t.stato
  from public.chat_ticket t where t.utente_id is not null

  union all
  select r.utente_invitante_id, r.created_at, 'richieste_referral', 'referral-invitante', r.id, r.esito
  from public.richieste_referral r where r.utente_invitante_id is not null

  union all
  select r.utente_amico_id, r.created_at, 'richieste_referral', 'referral-amico', r.id, r.esito
  from public.richieste_referral r where r.utente_amico_id is not null

  -- Gli eventi email stanno in fondo di proposito: sono il tocco, non la
  -- richiesta. Filtrali via se ti serve solo cosa la persona ha chiesto.
  union all
  select e.utente_id, e.created_at, 'eventi_email', e.tipo, e.id, e.esito
  from public.eventi_email e where e.utente_id is not null

  -- La posta del desk: `tipo` e' la direzione, `esito` l'oggetto — che nella
  -- cronologia e' l'unica cosa che dice di cosa si trattava.
  union all
  select m.utente_id, m.ricevuta_il, 'email_messaggi', m.direzione, m.id, m.oggetto
  from public.email_messaggi m;

comment on view public.utente_attivita is
  'La scheda di una persona: form, chat, ticket, inviti, le email arrivate al desk e ogni email digitata, in ordine di tempo. Le righe con fonte eventi_email sono i tocchi (una verifica di email non e'' una richiesta): escludile quando conti le conversioni. Quelle con fonte email_messaggi no — chi scrive alla casella ha chiesto qualcosa.';

-- Le viste ereditano i permessi di chi le interroga, non del proprietario.
-- Ridichiarato dopo il replace: e' l'opzione che tiene in piedi la RLS di tutto
-- quello che c'e' sotto.
alter view public.utente_attivita set (security_invoker = true);


-- ---------------------------------------------------------------------------
-- email_thread — la corrispondenza vista per scambio
-- ---------------------------------------------------------------------------
-- Una riga per thread e per persona: quante email, la prima, l'ultima, e
-- l'oggetto con cui e' cominciato. E' la forma in cui una casella si legge —
-- per conversazione, non per messaggio — ed e' quella che serve a chi in
-- segreteria cerca «di cosa avevamo parlato».
create or replace view public.email_thread as
  select m.utente_id,
         coalesce(m.thread_id, m.gmail_id) as thread_id,
         count(*)                          as messaggi,
         min(m.ricevuta_il)                as prima_il,
         max(m.ricevuta_il)                as ultima_il,
         (array_agg(m.oggetto order by m.ricevuta_il))[1]  as oggetto,
         (array_agg(m.mittente order by m.ricevuta_il))[1] as primo_mittente
  from public.email_messaggi m
  group by m.utente_id, coalesce(m.thread_id, m.gmail_id);

comment on view public.email_thread is
  'La posta del desk raggruppata per scambio: una riga per thread e per persona, con l''oggetto di partenza e le date estreme. Il coalesce sul gmail_id serve alle email che arrivano senza thread — restano uno scambio di un messaggio invece di sparire dal raggruppamento.';

alter view public.email_thread set (security_invoker = true);
