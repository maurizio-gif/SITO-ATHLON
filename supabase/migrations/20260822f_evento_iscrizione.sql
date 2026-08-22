-- Il click su «Iscriviti», e il campo che serviva per distinguerli
--
-- Secondo gesto tracciato in `eventi_interazione` dopo l'apertura
-- dell'assistente, ed e' il piu' vicino al denaro che il sito abbia: chi
-- preme «Iscriviti» su /abbonamenti o /promo sta comprando. Prima quel click
-- non lasciava traccia — la riga nasceva solo quando la persona digitava
-- l'email, e chi apriva il pannello e lo chiudeva non esisteva.
--
-- `tipo` e' generico apposta e non serviva una migrazione per il valore nuovo.
-- Serve invece per **`dettaglio`**, e la ragione e' che `origine` da sola non
-- basta: `origine` porta il piano (Smart, Premium), ma ogni piano ha tre
-- formule con tre pulsanti distinti — annuale a rate, annuale in unica
-- soluzione, mensile flex — e la differenza fra loro e' esattamente la domanda
-- commerciale interessante. Su /promo il problema e' ancora piu' netto: quella
-- pagina filtra le sole formule annuali, quindi i suoi due pulsanti per piano
-- avrebbero avuto `origine` e `titolo` identici e sarebbero stati
-- indistinguibili.
--
-- Il campo e' generico come `tipo`: e' «quale variante del gesto», non «quale
-- piano». Un secondo evento che ne avesse bisogno lo trova gia' qui.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822e_eventi_interazione.sql.

alter table public.eventi_interazione
  add column if not exists dettaglio text;

comment on column public.eventi_interazione.dettaglio is
  'Quale variante del gesto, quando origine non basta: per iscrizione_click e'' la formula scelta ("Annuale · Pagamento mensile"), che distingue i tre pulsanti dello stesso piano.';

comment on column public.eventi_interazione.tipo is
  'Che gesto: chat_open (apertura dell''assistente) e iscrizione_click (pressione di un pulsante Iscriviti). Un valore nuovo non richiede una migrazione — la tabella e'' generica di proposito.';
comment on column public.eventi_interazione.origine is
  'Da quale comando. Per chat_open e'' il data-cta-source del pulsante (header, header-mobile, footer, fab, hero-home, help-desk, club-life, modal-contattaci); per iscrizione_click e'' il nome del piano (Smart, Premium).';


-- ---------------------------------------------------------------------------
-- iscrizione_imbuto — dove si ferma chi voleva iscriversi
-- ---------------------------------------------------------------------------
-- Tre gradini, e il secondo e' quello che nessuno vedeva:
--
--   1. ha premuto «Iscriviti»            (eventi_interazione, iscrizione_click)
--   2. ha digitato l'email               (eventi_email, origine = 'iscrizione')
--   3. e li' o e' passato a PerfectGym, o ha trovato il muro «hai gia' un
--      account» — che e' il caso che questo pannello esiste per gestire, e il
--      solo numero che dice se il muro capita a uno su venti o a uno su tre.
--
-- Il quarto gradino — la registrazione conclusa — sta su PerfectGym e da qui
-- non si vede. Meglio dirlo che fingere di contarlo.
--
-- Si aggrega per `sid` e non per `vid`: il sid c'e' sempre, il vid senza
-- consenso pubblicitario vale una pagina sola (vedi 20260822b). E' la stessa
-- scelta di percorso_conversione e di chat_imbuto.
create or replace view public.iscrizione_imbuto as
  with click as (
    select sid,
           min(created_at) as primo_click,
           count(*)        as click,
           (array_remove(array_agg(origine   order by created_at), null))[1] as primo_piano,
           (array_remove(array_agg(dettaglio order by created_at), null))[1] as prima_formula,
           (array_agg(percorso order by created_at))[1] as pagina,
           (array_remove(array_agg(utm_source order by created_at), null))[1] as utm_source,
           (array_remove(array_agg(utm_campaign order by created_at), null))[1] as utm_campaign
    from public.eventi_interazione
    where tipo = 'iscrizione_click' and sid is not null
    group by sid
  ),
  verifica as (
    select sid,
           min(created_at) as prima_verifica,
           count(*)        as verifiche,
           -- `member_type` decide e `stato` no: la regola sta in
           -- `data/contatto.ts` (haGiaAccount) ed e' la stessa che il pannello
           -- applica in pagina. Il ripiego su stato_pgm serve per le righe
           -- scritte prima che il webhook mandasse member_type.
           bool_or(
             member_type in ('Member', 'Guest')
             or (member_type is null and stato_pgm = 'iscritto')
           ) as ha_gia_account
    from public.eventi_email
    where origine = 'iscrizione' and sid is not null
    group by sid
  )
  select c.sid,
         c.primo_click,
         c.click,
         c.primo_piano,
         c.prima_formula,
         c.pagina,
         c.utm_source,
         c.utm_campaign,
         v.prima_verifica is not null as ha_digitato_email,
         v.verifiche,
         coalesce(v.ha_gia_account, false) as ha_gia_account,
         -- Chi ha digitato l'email e non aveva un account e' stato mandato su
         -- PerfectGym: e' il piu' avanti che questa base dati possa vedere.
         (v.prima_verifica is not null and not coalesce(v.ha_gia_account, false)) as passato_a_perfectgym
  from click c
  left join verifica v on v.sid = c.sid
  order by c.primo_click desc;

comment on view public.iscrizione_imbuto is
  'Dove si ferma chi preme «Iscriviti»: ha cliccato, ha digitato l''email, e li'' o e'' passato a PerfectGym o ha trovato il muro «hai gia'' un account». Il gradino successivo — la registrazione conclusa — sta su PerfectGym e da qui non si vede.';

alter view public.iscrizione_imbuto set (security_invoker = true);
