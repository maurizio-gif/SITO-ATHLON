-- Le mini survey del sito: `/surveys/<tema>/`, otto questionari da tre giudizi
-- più un NPS, e la richiesta di recensione su Google a chi sta sopra soglia.
--
-- Una riga per risposta, non per domanda: i tre giudizi stanno in `risposte`
-- come jsonb. Una riga per domanda darebbe una tabella piu' "pulita" e
-- costringerebbe a una join per rispondere alla sola domanda che si fa davvero
-- — «quanto va bene questo tema questo mese» — mentre l'insieme delle risposte
-- di una persona e' un fatto solo, arrivato in un invio solo.
--
-- La soglia che decide `positivo` non e' scritta qui: e' `giudizioPositivo()`
-- in `src/data/surveys.ts`, la riapplica n8n prima di scrivere, e il browser la
-- usa per scegliere la schermata finale. Questa colonna registra la decisione,
-- non la prende: un `check` che ricalcolasse la soglia in SQL sarebbe la quarta
-- copia della stessa regola, e la prima a divergere in silenzio.
--
-- Progetto Supabase: app-athlon. Webhook n8n: `athlon-sondaggio`.


-- ---------------------------------------------------------------------------
-- La tabella
-- ---------------------------------------------------------------------------
create table if not exists public.sondaggi_risposte (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Lo slug di `SURVEYS` in src/data/surveys.ts: assistenza, lezioni, pulizia,
  -- manutenzione, piscina, prenotazioni, junior, generale. Non e' un enum
  -- apposta: un tema nuovo e' una voce in un file di dati, e non deve chiedere
  -- una migrazione per essere raccolto.
  sondaggio     text not null,

  -- [{ "id": "cortesia", "voto": 4 }, …]. `voto` puo' essere null: si risponde
  -- anche a una domanda sola, ed e' meglio di non rispondere affatto.
  risposte      jsonb not null default '[]'::jsonb,

  -- La media dei voti dati (non delle domande poste), 1–5. Null se la persona
  -- ha risposto solo all'NPS.
  media         numeric(3,2),
  -- 0–10. Null se non ha toccato la barra.
  nps           smallint,

  -- La decisione presa dal sito: sopra soglia si e' vista la richiesta di
  -- recensione su Google. Serve a misurare quante ne abbiamo chieste, che e'
  -- l'unico modo di sapere se la soglia e' quella giusta.
  positivo      boolean not null default false,

  -- Chiesta solo sotto soglia, e conservata comunque se c'e'.
  nota          text,

  -- Facoltativi tutti e tre: una risposta anonima vale. `email` e
  -- `pgm_numero_utente` sono le due chiavi che il trigger usa per agganciare la
  -- riga a `utenti`; `vid` resta l'aggancio alla visita quando non c'e' nessuna
  -- delle due.
  email              text,
  pgm_numero_utente  text,
  member_id          text,

  vid           text,
  sid           text,
  utm           jsonb not null default '{}'::jsonb,
  pagina        text,

  utente_id     uuid references public.utenti (id) on delete set null
);

comment on table public.sondaggi_risposte is
  'Le risposte alle mini survey di /surveys/<tema>/: tre giudizi a stelle, un NPS, e la nota chiesta solo sotto soglia. Una riga per invio. La soglia che decide "positivo" vive in src/data/surveys.ts (giudizioPositivo), non in SQL.';
comment on column public.sondaggi_risposte.sondaggio is
  'Slug del tema, da SURVEYS in src/data/surveys.ts. Non e'' un enum: un tema nuovo non deve chiedere una migrazione.';
comment on column public.sondaggi_risposte.positivo is
  'Il sito ha mostrato la richiesta di recensione su Google. Registra la decisione, non la ricalcola.';
comment on column public.sondaggi_risposte.nota is
  'Chiesta solo quando il giudizio sta sotto soglia. Parte anche se la persona poi alza i voti: quello che ha scritto ce l''ha detto.';

create index if not exists sondaggi_risposte_sondaggio_idx
  on public.sondaggi_risposte (sondaggio, created_at desc);
create index if not exists sondaggi_risposte_created_at_idx
  on public.sondaggi_risposte (created_at desc);
create index if not exists sondaggi_risposte_utente_idx
  on public.sondaggi_risposte (utente_id) where utente_id is not null;

-- RLS attiva e zero policy: passa solo la service key, che sta in n8n. Vale la
-- regola di tutte le tabelle di questo progetto — una policy `anon` qui e' un
-- elenco di giudizi con nome e cognome pubblicato.
alter table public.sondaggi_risposte enable row level security;


-- ---------------------------------------------------------------------------
-- L'aggancio all'anagrafica
-- ---------------------------------------------------------------------------
-- Come per ogni tabella dei form: l'email e il numero utente sono le due
-- sorgenti, il trigger sta in BEFORE INSERT e non puo' far fallire la scrittura
-- (assegna_utente cattura qualunque errore e lascia `utente_id` a null). Una
-- riga senza aggancio si ricalcola; una risposta perduta no.
--
-- Nome e cognome non ci sono: questa survey non li chiede. Gli argomenti vuoti
-- sono `''` e `primo_valore` li risolve a NULL, quindi la riga non sovrascrive
-- niente in `utenti` — riempie solo i buchi, che e' la regola di
-- trova_o_crea_utente().
drop trigger if exists utente_assegna on public.sondaggi_risposte;
create trigger utente_assegna before insert or update of email, member_id, pgm_numero_utente
  on public.sondaggi_risposte for each row
  execute function public.assegna_utente(
    'utente_id','email','member_id','','','','','pgm_numero_utente');


-- ---------------------------------------------------------------------------
-- sondaggi_esiti — il riepilogo per tema
-- ---------------------------------------------------------------------------
-- Le tre cose che si guardano davvero: quante risposte, come sta andando quel
-- tema, e quanti promotori. L'NPS si calcola qui e non a mano, perche' la
-- formula (promotori meno detrattori, in percentuale) scritta in un foglio
-- diverso ogni volta da' tre numeri diversi.
create or replace view public.sondaggi_esiti as
  select date_trunc('month', created_at) as mese,
         sondaggio,
         count(*)                                        as risposte,
         round(avg(media), 2)                            as media,
         count(*) filter (where nps is not null)         as npsdati,
         round(
           100.0 * (
             count(*) filter (where nps >= 9)
             - count(*) filter (where nps <= 6)
           ) / nullif(count(*) filter (where nps is not null), 0)
         , 1)                                            as nps,
         count(*) filter (where positivo)                as sopra_soglia,
         count(*) filter (where nota is not null and nota <> '') as con_nota
  from public.sondaggi_risposte
  group by 1, 2
  order by 1 desc, 2;

comment on view public.sondaggi_esiti is
  'Per mese e per tema: quante risposte, media delle stelle, NPS (promotori 9-10 meno detrattori 0-6, in percentuale), quante volte si e'' chiesta la recensione, quante note libere.';

alter view public.sondaggi_esiti set (security_invoker = true);
