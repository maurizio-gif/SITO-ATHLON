-- visite_utente — le pagine viste da una persona, non da una sessione.
--
-- `visite_pagina` non ha `utente_id`: nasce da un pageview anonimo, prima
-- ancora che qualcuno dica chi e'. L'unico modo di risalire alla persona e'
-- il `vid` (l'id del visitatore), e la mappa vid -> utente_id la tiene gia'
-- `email_tutte` - la stessa che usa `visitatori` per la sua colonna
-- `utente_id`. Si legge da li' e non si ricostruisce qui: due mappe
-- vid -> persona sono due mappe che prima o poi divergono, e la mappa vera
-- e' quella che segue ogni nuova tabella con un'email, non questa vista.
--
-- Limite noto e accettato: il `vid` e' per dispositivo/browser, non per
-- persona. Due persone sullo stesso telefono condividono lo stesso `vid`, e
-- quindi le stesse visite finiscono in entrambe le schede se entrambe hanno
-- lasciato un contatto da li'. E' lo stesso limite di ogni join su `vid` gia'
-- nel sito (vedi `chat_imbuto`, `percorso_conversione`, `visitatori`), non
-- uno nuovo.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260823c_prove_suggerite.sql.

create or replace view public.visite_utente as
  with mappa as (
    select distinct utente_id, vid
    from public.email_tutte
    where utente_id is not null and vid is not null
  )
  select
    m.utente_id,
    v.id,
    v.created_at,
    v.pagina,
    v.percorso,
    v.titolo,
    v.referrer,
    v.utm_source,
    v.utm_medium,
    v.utm_campaign,
    v.vid,
    v.sid
  from mappa m
  join public.visite_pagina v on v.vid = m.vid
  order by v.created_at desc;

comment on view public.visite_utente is
  'Le pagine viste da una persona, ricavate risalendo dal vid di email_tutte (la stessa mappa vid -> utente_id di visitatori) al vid di ogni sua pagina vista. Stesso limite di ogni join su vid: un dispositivo condiviso condivide le visite.';

alter view public.visite_utente set (security_invoker = true);
