-- Un gesto che non e' ne' un caricamento di pagina ne' un modulo inviato.
--
-- Oggi ce n'e' uno solo: l'apertura dell'assistente. Prima non lasciava
-- traccia da nessuna parte — `chat_conversazioni` nasce al **primo messaggio**,
-- quindi chi apriva il pannello e lo chiudeva senza scrivere non esisteva. E'
-- il gradino che mancava fra «e' passato di qui» (visite_pagina) e «ha chiesto
-- qualcosa» (le richieste_*): misura l'intenzione che non arriva in fondo.
--
-- La tabella e' generica di proposito: `tipo` e' una stringa, quindi tracciare
-- un secondo gesto non richiedera' una migrazione ma una riga di JavaScript.
--
-- Lo stesso evento va **anche nel dataLayer**, da cui GTM costruisce il tag
-- GA4: la funzione che lo manda e' una sola (`window.athlonEvento`, in
-- `scripts/visita.ts`), perche' contare lo stesso gesto in due posti con due
-- codici diversi e' il modo di ritrovarsi due numeri che non tornano.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822d_percorso_normalizzato.sql.

create table if not exists public.eventi_interazione (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  tipo         text not null,
  origine      text,

  vid          text,
  vid_stabile  boolean,
  sid          text,

  pagina       text,
  -- Come in visite_pagina: la query string spezzerebbe la stessa pagina in
  -- tante righe quante sono le UTM con cui ci si arriva.
  percorso     text generated always as (
                 case when pagina is null then null
                      else coalesce(nullif(rtrim(split_part(pagina, '?', 1), '/'), ''), '/')
                 end
               ) stored,

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

comment on table public.eventi_interazione is
  'Un gesto compiuto in pagina che non e'' ne'' un caricamento ne'' un modulo inviato: oggi l''apertura dell''assistente. Sta fra visite_pagina (chi e'' passato) e le richieste_* (chi ha lasciato i dati), e misura l''intenzione che non arriva in fondo. Scritta dall''automazione n8n "athlon-evento".';
comment on column public.eventi_interazione.tipo is
  'Che gesto: chat_open oggi. Un valore nuovo non richiede una migrazione — la tabella e'' generica di proposito.';
comment on column public.eventi_interazione.origine is
  'Da quale comando: header, header-mobile, footer, fab, hero-home, help-desk, club-life, modal-contattaci. E'' il data-cta-source del pulsante premuto.';

create index if not exists eventi_interazione_created_at_idx on public.eventi_interazione (created_at desc);
create index if not exists eventi_interazione_tipo_idx       on public.eventi_interazione (tipo);
create index if not exists eventi_interazione_sid_idx        on public.eventi_interazione (sid) where sid is not null;
create index if not exists eventi_interazione_vid_idx        on public.eventi_interazione (vid) where vid is not null;

alter table public.eventi_interazione enable row level security;


-- ---------------------------------------------------------------------------
-- chat_imbuto — quanto lontano arriva chi apre l'assistente
-- ---------------------------------------------------------------------------
create or replace view public.chat_imbuto as
  with aperture as (
    select sid, min(created_at) as aperta_il, count(*) as aperture,
           (array_remove(array_agg(origine order by created_at), null))[1] as prima_origine,
           (array_agg(percorso order by created_at))[1] as pagina_di_apertura
    from public.eventi_interazione
    where tipo = 'chat_open' and sid is not null
    group by sid
  )
  select a.sid, a.aperta_il, a.aperture, a.prima_origine, a.pagina_di_apertura,
         exists (select 1 from public.chat_conversazioni c where c.sid = a.sid) as ha_scritto,
         exists (select 1 from public.chat_lead      l where l.sid = a.sid)     as ha_lasciato_dati,
         exists (select 1 from public.chat_ticket    t where t.sid = a.sid)     as ha_aperto_ticket
  from aperture a
  order by a.aperta_il desc;

comment on view public.chat_imbuto is
  'Quante volte l''assistente viene aperto e quanto lontano arriva chi lo apre: ha scritto, ha lasciato i dati, ha aperto un ticket. Senza l''evento di apertura questa domanda non aveva risposta — chi apriva e chiudeva senza scrivere non esisteva da nessuna parte.';

alter view public.chat_imbuto set (security_invoker = true);
