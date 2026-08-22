-- Contare le pagine su `pagina` non funziona, e si e' visto al primo dato vero:
-- quella colonna contiene `pathname + search`, quindi la home si spezza in una
-- riga per ogni query string con cui ci si arriva. Nelle prime due ore di
-- traffico reale erano gia' quattro righe distinte per `/` — una pulita, una
-- con le UTM di Google Ads (una stringa di quattrocento caratteri), due con il
-- parametro `ved` che Google aggiunge ai clic organici. E `/aqua-fitness/` non
-- si sommava a `/aqua-fitness`.
--
-- `percorso` e' la stessa cosa senza query e senza barra finale, calcolata
-- dalla colonna: e' la chiave con cui si contano le pagine. `pagina` resta
-- integrale, perche' per una singola visita la query string e' informazione —
-- ma le UTM che servono davvero hanno gia' le loro colonne.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822c_sid_nei_form.sql.

alter table public.visite_pagina
  add column if not exists percorso text
  generated always as (
    case when pagina is null then null
         else coalesce(nullif(rtrim(split_part(pagina, '?', 1), '/'), ''), '/')
    end
  ) stored;

comment on column public.visite_pagina.percorso is
  'Il solo percorso, senza query string e senza barra finale: e'' la chiave con cui si contano le pagine. `pagina` resta integrale per il dettaglio, ma aggregare su quella spezza la home in tante righe quante sono le UTM che ci arrivano, e /aqua-fitness/ non si somma a /aqua-fitness. Calcolata, non scritta.';

create index if not exists visite_pagina_percorso_idx on public.visite_pagina (percorso);


-- ---------------------------------------------------------------------------
-- analytics_pagine — le pagine piu' viste
-- ---------------------------------------------------------------------------
create or replace view public.analytics_pagine as
  select percorso,
         count(*)                                       as viste,
         count(distinct sid)                            as visite,
         count(distinct vid) filter (where vid_stabile) as visitatori_riconoscibili,
         min(created_at)                                as prima,
         max(created_at)                                as ultima
  from public.visite_pagina
  where percorso is not null
  group by percorso
  order by viste desc, percorso;

comment on view public.analytics_pagine is
  'Le pagine piu viste, contate sul percorso normalizzato: la home resta una riga sola anche quando ci si arriva con dieci UTM diverse.';

alter view public.analytics_pagine set (security_invoker = true);
