-- La posta del desk nelle due direzioni, cioè lo scambio e non le sole domande.
--
-- Con la sola posta in arrivo la scheda di una persona mostrava metà di ogni
-- conversazione: «Informazioni abbonamento» e nessuna risposta, senza sapere se
-- una risposta c'è stata. `email_messaggi.direzione` esisteva per questo, e qui
-- si toglie l'ultimo ostacolo perché la seconda metà possa entrare.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822h_email_desk.sql.


-- ---------------------------------------------------------------------------
-- L'unicità è della coppia messaggio+persona, non del messaggio
-- ---------------------------------------------------------------------------
-- Un'email **inviata** può avere due contatti fra i destinatari, e allora è una
-- riga nella scheda di ognuno dei due: stesso `gmail_id`, `utente_id` diverso.
-- Con l'unico sul solo `gmail_id` la seconda riga veniva rifiutata, quindi uno
-- dei due destinatari non l'avrebbe vista mai — e in silenzio, perché il nodo
-- che scrive ingoia i conflitti di proposito (una consegna ripetuta non deve
-- fare un'esecuzione rossa).
--
-- Sulla posta in arrivo non cambia niente: il mittente è uno, quindi la coppia
-- è unica esattamente quando lo era il messaggio.
drop index if exists public.email_messaggi_gmail_id_key;

create unique index if not exists email_messaggi_gmail_utente_key
  on public.email_messaggi (gmail_id, utente_id);

comment on column public.email_messaggi.gmail_id is
  'L''id del messaggio in Gmail. E'' unico **per persona**, non da solo: un''email inviata a due contatti è una riga per ciascuno. La coppia (gmail_id, utente_id) è ciò che rende gli importi rieseguibili senza doppioni.';
comment on column public.email_messaggi.direzione is
  'entrata (l''ha scritta la persona) o uscita (l''ha scritta il desk). Solo questi due valori: il sotto-workflow n8n normalizza, quindi un refuso diventa "entrata" invece di una terza direzione che nessuna vista conosce.';
comment on column public.email_messaggi.mittente is
  'Chi ha scritto, come lo dichiara l''email. Sulle righe in uscita è l''indirizzo del desk, non quello della persona: la persona è utente_id, e cercarla qui darebbe metà dei suoi scambi.';


-- ---------------------------------------------------------------------------
-- email_gia_prese — cosa non serve riscaricare
-- ---------------------------------------------------------------------------
-- Due colonne, e servono all'importo storico. Rieseguirlo è la cosa che lo
-- rende utile — l'anagrafica cresce, e la posta di chi entra oggi va presa —
-- ma senza questa vista ogni giro riscaricherebbe da Gmail il corpo di ogni
-- email già importata per farla poi rifiutare dall'indice unico: il lavoro
-- fatto due volte, e la parte costosa è proprio quella (una chiamata per
-- messaggio).
--
-- È una vista e non una lettura diretta della tabella perché il nodo Supabase
-- di n8n non sa scegliere le colonne: leggerebbe anche `corpo` e `corpo_html`
-- di ogni riga, cioè megabyte per ricavarne due stringhe.
create or replace view public.email_gia_prese as
  select gmail_id, utente_id from public.email_messaggi;

comment on view public.email_gia_prese is
  'Le coppie (gmail_id, utente_id) già in email_messaggi: l''elenco di cosa l''importo storico non deve riscaricare. Due colonne di proposito — il nodo Supabase di n8n legge tutte le colonne di ciò che interroga, e sulla tabella vera sarebbero i corpi delle email.';

alter view public.email_gia_prese set (security_invoker = true);
