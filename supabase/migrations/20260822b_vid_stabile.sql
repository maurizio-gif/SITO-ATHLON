-- Il `vid` non vale sempre come identificativo, e la vista `visitatori` senza
-- questa distinzione mente.
--
-- Con il consenso pubblicitario il vid sta in `localStorage` e riconosce chi
-- torna. **Senza consenso ne nasce uno nuovo a ogni caricamento di pagina** —
-- la copia in memoria muore con la pagina, e questo e' un sito a pagine
-- separate. Misurato: due caricamenti nello stesso browser danno due vid
-- diversi e lo stesso sid.
--
-- Quindi `count(distinct vid)` conta una persona che gira nove pagine come
-- nove visitatori: e' il conteggio degli anonimi, cioe' proprio quello che
-- serviva, ed era sbagliato per eccesso.
--
-- La riga adesso dice se il suo vid era destinato a sopravvivere, e i conti si
-- fanno su due grandezze diverse e oneste:
--
--   * le **visite** e le **pagine** si contano per `sid`, che e' stabile per
--     tutti — non chiede consenso, muore con la scheda, non profila nessuno.
--     Vale per gli anonimi esattamente come per gli altri.
--   * i **visitatori** si contano per `vid`, ma solo dove il vid e' stabile.
--     E' un sottoinsieme dichiarato, non una stima.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822_tracciamento_completo.sql.

alter table public.visite_pagina
  add column if not exists vid_stabile boolean;

comment on column public.visite_pagina.vid_stabile is
  'Se il vid di questa riga era in localStorage, cioe'' se sopravvive alla pagina. Falso senza consenso pubblicitario, e in quel caso il vid vale una pagina sola: non contarlo fra i visitatori unici. Null sulle righe scritte prima che la colonna esistesse.';

create index if not exists visite_pagina_vid_stabile_idx
  on public.visite_pagina (vid) where vid_stabile;


-- ---------------------------------------------------------------------------
-- visitatori — solo chi e' davvero riconoscibile
-- ---------------------------------------------------------------------------
create or replace view public.visitatori as
  with tocchi as (
    select vid,
           min(created_at)     as primo_accesso,
           max(created_at)     as ultimo_accesso,
           count(*)            as pagine_viste,
           count(distinct sid) as visite
    from public.visite_pagina
    where vid is not null and vid_stabile
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
  'Un vid per riga, ma solo i vid stabili: quelli effimeri (senza consenso pubblicitario) sono pagine viste, non persone, e contarli qui gonfierebbe gli unici. Per il totale del traffico — anonimi compresi — usa analytics_sintesi, che conta per sid.';


-- ---------------------------------------------------------------------------
-- analytics_sintesi — i numeri della dashboard, per giorno
-- ---------------------------------------------------------------------------
-- Le grandezze che valgono per tutti stanno a sinistra, quella che vale solo
-- per chi ha acconsentito sta a destra e si chiama con il suo nome. Nessuna
-- media che mescoli le due.
create or replace view public.analytics_sintesi as
  select
    date_trunc('day', created_at)::date            as giorno,
    count(*)                                        as pagine_viste,
    count(distinct sid)                             as visite,
    round(count(*)::numeric
          / nullif(count(distinct sid), 0), 1)      as pagine_per_visita,
    count(distinct vid) filter (where vid_stabile)  as visitatori_riconoscibili,
    count(distinct sid) filter (where not coalesce(vid_stabile, false))
                                                    as visite_anonime
  from public.visite_pagina
  group by 1
  order by 1 desc;

comment on view public.analytics_sintesi is
  'I numeri del traffico per giorno. `visite` e `pagine_viste` contano tutti, anonimi compresi, perche'' poggiano sul sid. `visitatori_riconoscibili` conta solo chi ha il consenso pubblicitario, ed e'' l''unico caso in cui sappiamo che due visite sono la stessa persona.';

alter view public.visitatori        set (security_invoker = true);
alter view public.analytics_sintesi set (security_invoker = true);
