-- Completa il tracciamento del vid, in due mosse:
--
--  1. Tre tabelle lo ricevevano gia' dal browser e lo perdevano per strada.
--     `chat_lead` e `chat_ticket` non avevano affatto le colonne — la verifica
--     del 22/8 ha trovato tutte le righe reali con `vid` assente, comprese
--     quelle precedenti alla correzione lato sito che ora lo manda. Vanno
--     aggiunte per uniformita' con richieste_prova/richieste_contatto/
--     richieste_referral, che ce l'hanno gia'. `richieste_help_desk` aveva gli
--     utm_* ma non il vid: il modulo dell'Help Desk oggi non lo manda ancora
--     (il sito lo aggiunge in parallelo a questa migrazione), la colonna nasce
--     vuota finche' quel deploy non arriva.
--
--  2. `visite_pagina` e' nuova: un registro di ogni caricamento di pagina, non
--     solo di chi compila un modulo. E' la base per «quanti accessi», «quante
--     pagine a visita», «quanto restano» — le domande a cui nessuna tabella
--     richieste_* puo' rispondere, perche' contano solo chi e' arrivato in
--     fondo. La vista `visitatori` aggrega quel registro per vid e, se lo
--     stesso vid ha lasciato un'email altrove, ci affianca chi e'.
--
-- Progetto Supabase: app-athlon.
-- Da eseguire nella SQL Editor del progetto (o via supabase db push), dopo
-- 20260821_eventi_email_referral_chat.sql e 20260821_viste_email.sql.


-- ---------------------------------------------------------------------------
-- 1. Le colonne mancanti
-- ---------------------------------------------------------------------------
alter table public.chat_lead
  add column if not exists vid          text,
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term     text,
  add column if not exists utm_content  text,
  add column if not exists gclid        text,
  add column if not exists fbclid       text;

alter table public.chat_ticket
  add column if not exists vid          text,
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term     text,
  add column if not exists utm_content  text,
  add column if not exists gclid        text,
  add column if not exists fbclid       text;

alter table public.richieste_help_desk
  add column if not exists vid    text,
  add column if not exists gclid  text,
  add column if not exists fbclid text;

create index if not exists chat_lead_vid_idx          on public.chat_lead (vid) where vid is not null;
create index if not exists chat_ticket_vid_idx        on public.chat_ticket (vid) where vid is not null;
create index if not exists richieste_help_desk_vid_idx on public.richieste_help_desk (vid) where vid is not null;


-- ---------------------------------------------------------------------------
-- 2. visite_pagina — un caricamento di pagina, non un modulo compilato
-- ---------------------------------------------------------------------------
-- La granularita' e' la pagina, non la visita: piu' righe con lo stesso `sid`
-- sono la stessa visita, piu' visite con lo stesso `vid` (quando il consenso
-- lo permette) sono la stessa persona che torna. Il conteggio delle visite e
-- delle pagine per visita si fa aggregando, non scrivendo un contatore che
-- andrebbe aggiornato ad ogni pagina della stessa sessione.
create table if not exists public.visite_pagina (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- `vid` sopravvive al consenso pubblicitario (localStorage, mesi); `sid`
  -- e' per-scheda (sessionStorage, muore con la scheda) e non chiede consenso
  -- per lo stesso motivo per cui non lo chiede `athlon_utm`: e' un conteggio,
  -- non un identificativo che sopravvive alla visita. Senza consenso `vid`
  -- vale una pagina sola (si rigenera ad ogni caricamento): le pagine restano
  -- contate, si perde solo il riconoscimento di chi torna.
  vid          text,
  sid          text,

  pagina       text,
  referrer     text,
  titolo       text,

  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  gclid        text,
  fbclid       text,

  user_agent   text,
  payload      jsonb
);

comment on table public.visite_pagina is
  'Un caricamento di pagina, con vid e sid. E'' il registro a monte di tutto: le tabelle richieste_* ed eventi_email contengono solo chi ha scritto qualcosa, questa conta ogni visita. Scritta dall''automazione n8n "athlon-visita-pagina".';
comment on column public.visite_pagina.sid is
  'Identificativo di sessione per-scheda (sessionStorage): raggruppa le pagine della stessa visita anche quando vid non e'' disponibile per mancato consenso.';

create index if not exists visite_pagina_created_at_idx on public.visite_pagina (created_at desc);
create index if not exists visite_pagina_vid_idx        on public.visite_pagina (vid) where vid is not null;
create index if not exists visite_pagina_sid_idx        on public.visite_pagina (sid) where sid is not null;
create index if not exists visite_pagina_pagina_idx     on public.visite_pagina (pagina);

alter table public.visite_pagina enable row level security;


-- ---------------------------------------------------------------------------
-- visitatori — un vid, con quante visite/pagine e, se lo sappiamo, chi e'
-- ---------------------------------------------------------------------------
-- L'identita' arriva da `email_tutte` (vista esistente): lo stesso vid puo'
-- aver lasciato un'email in un form diverso da quello con cui e' arrivato qui,
-- ed e' esattamente il caso che il vid esiste per risolvere.
create or replace view public.visitatori as
  with tocchi as (
    select vid,
           min(created_at)          as primo_accesso,
           max(created_at)          as ultimo_accesso,
           count(*)                 as pagine_viste,
           count(distinct sid)      as visite
    from public.visite_pagina
    where vid is not null
    group by vid
  ),
  identita as (
    select distinct on (vid) vid, email, nome, cognome, utente_id
    from public.email_tutte
    where vid is not null
    order by vid, momento desc
  )
  select t.vid, t.primo_accesso, t.ultimo_accesso, t.pagine_viste, t.visite,
         i.email, i.nome, i.cognome, i.utente_id
  from tocchi t
  left join identita i using (vid)
  order by t.ultimo_accesso desc;

comment on view public.visitatori is
  'Un vid per riga: quante pagine e quante visite ha fatto, e se lo stesso vid ha lasciato un''email in un form (via email_tutte) il nome e l''indirizzo compaiono qui. Senza corrispondenza resta un visitatore anonimo.';

alter view public.visitatori set (security_invoker = true);
