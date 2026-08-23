-- Il banner che ricorda a chi ha visto un'attività, e se ne è andato senza
-- lasciare un contatto, che il Guest Pass esiste.
--
-- Il sito registra già ogni pageview in `visite_pagina` (vid, sid, pagina) e
-- sa già, tramite la vista `visitatori`, se un vid risolve a un contatto
-- conosciuto (`utente_id` non nullo). Questa tabella è il registro
-- dell'automazione n8n "athlon-suggerisci-prova": una riga per ogni
-- chiamata del banner, non solo per ogni banner mostrato — vale la stessa
-- regola di `richieste_referral`/`email_bozze`: gli scarti si registrano
-- come i successi, o non si può sapere quante proposte sono state
-- soppresse e perché.
--
-- **Il banner non apre nessun modal e non manda nessun ping di "mostrato" o
-- "cliccato".** Il pulsante rimanda a `/prova?source=banner-ritorno`, e
-- quel click si misura con lo stesso meccanismo di attribuzione (`source`)
-- già usato dalle altre CTA — niente webhook di scrittura in più per questo.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260823b_bozze_email.sql.


-- ---------------------------------------------------------------------------
-- La tabella
-- ---------------------------------------------------------------------------
create table if not exists public.prove_suggerite (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  vid          text,

  -- Gli slug proposti (al massimo tre, i più recenti), vuoto se scartato.
  -- Un array e non una riga per attività: è una proposta sola, con dentro
  -- fino a tre nomi — non tre proposte distinte.
  attivita     jsonb not null default '[]'::jsonb,

  -- proposto | scartato-contatto-noto | scartato-nessuna-pagina-attivita.
  -- Due gli scarti, e sono i due unici modi in cui il webhook decide di non
  -- proporre niente: il vid è già un contatto (ha lasciato un dato in
  -- qualunque form/chat del sito, verificato via `visitatori.utente_id`), o
  -- non ha visitato nessuna pagina di attività adulti nella finestra utile
  -- (almeno 24 ore fa, non più di 30 giorni).
  esito        text not null
);

comment on table public.prove_suggerite is
  'Registro dell''automazione n8n "athlon-suggerisci-prova": una riga per ogni chiamata del banner di richiamo, scarti compresi. Il vid e'' quello di attribuzione.ts; le attivita'' proposte vengono da visite_pagina filtrate contro /pagine-adulti.json.';
comment on column public.prove_suggerite.esito is
  'proposto | scartato-contatto-noto | scartato-nessuna-pagina-attivita.';

create index if not exists prove_suggerite_vid_idx on public.prove_suggerite (vid) where vid is not null;
create index if not exists prove_suggerite_created_at_idx on public.prove_suggerite (created_at desc);

alter table public.prove_suggerite enable row level security;


-- ---------------------------------------------------------------------------
-- prove_suggerite_esiti — il riepilogo, sul modello di email_bozze_esiti
-- ---------------------------------------------------------------------------
create or replace view public.prove_suggerite_esiti as
  select date_trunc('day', created_at) as giorno,
         esito,
         count(*) as quante
  from public.prove_suggerite
  group by 1, 2
  order by 1 desc, 2;

comment on view public.prove_suggerite_esiti is
  'Quante chiamate al banner di richiamo per giorno ed esito: proposto, o i due modi di scarto. Per capire se le soglie (24 ore, 30 giorni, fino a 3 attivita'') vanno riviste con dati reali.';

alter view public.prove_suggerite_esiti set (security_invoker = true);
