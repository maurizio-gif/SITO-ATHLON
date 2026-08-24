-- visite_utente — le pagine viste da una persona, non da una sessione.
--
-- `visite_pagina` non ha `utente_id`: nasce da un pageview anonimo, prima
-- ancora che qualcuno dica chi e'. L'unico modo di risalire alla persona e'
-- il `vid` (l'id del visitatore, che sopravvive al cambio di pagina e - se
-- stabile - anche a piu' visite), e il `vid` lo si conosce solo **dopo** che
-- ha lasciato un contatto da qualche parte: una richiesta, una conversazione,
-- un'email verificata.
--
-- Quindi: si costruisce prima la mappa vid -> utente_id da ogni tabella che
-- porta entrambe le colonne (le stesse sette di `utente_attivita`, meno
-- `email_messaggi` che non ha `vid`), poi si aggancia `visite_pagina` su
-- quel `vid`. Un UNION e non UNION ALL nella mappa: piu' tabelle possono
-- confermare lo stesso (utente_id, vid), e senza deduplica la stessa visita
-- comparirebbe una volta per ogni conferma.
--
-- Limite noto e accettato: il `vid` e' per dispositivo/browser, non per
-- persona. Due persone sullo stesso telefono condividono lo stesso `vid`, e
-- quindi le stesse visite finiscono in entrambe le schede se entrambe hanno
-- lasciato un contatto da li'. E' lo stesso limite di ogni join su `vid` gia'
-- nel sito (vedi `chat_imbuto`, `percorso_conversione`), non uno nuovo.
--
-- Progetto Supabase: app-athlon.

create or replace view public.visite_utente as
  with mappa as (
    select utente_id, vid from public.richieste_prova       where utente_id is not null and vid is not null
    union
    select utente_id, vid from public.richieste_contatto     where utente_id is not null and vid is not null
    union
    select utente_id, vid from public.richieste_help_desk    where utente_id is not null and vid is not null
    union
    select utente_id, vid from public.chat_conversazioni     where utente_id is not null and vid is not null
    union
    select utente_id, vid from public.chat_lead               where utente_id is not null and vid is not null
    union
    select utente_id, vid from public.chat_ticket              where utente_id is not null and vid is not null
    union
    select utente_id, vid from public.eventi_email             where utente_id is not null and vid is not null
    union
    select utente_invitante_id as utente_id, vid from public.richieste_referral where utente_invitante_id is not null and vid is not null
    union
    select utente_amico_id     as utente_id, vid from public.richieste_referral where utente_amico_id     is not null and vid is not null
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
  'Le pagine viste da una persona, ricavate risalendo dal vid della sessione al vid di ogni sua richiesta/conversazione/verifica email. Stesso limite di ogni join su vid: un dispositivo condiviso condivide le visite.';

alter view public.visite_utente set (security_invoker = true);
