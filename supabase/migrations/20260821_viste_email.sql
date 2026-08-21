-- Le due viste che rispondono alla domanda «tutte le email raccolte dal sito»,
-- che nessuna singola tabella puo' rispondere: gli indirizzi stanno in otto
-- posti diversi, uno per form.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo le tabelle.
-- Nota d'ordine: questo file va eseguito **dopo**
-- 20260821_utenti_deduplica.sql, perche' email_tutte porta anche la colonna
-- utente_id che quella migrazione aggiunge alle tabelle.


-- ---------------------------------------------------------------------------
-- email_tutte — ogni email digitata, da qualunque form
-- ---------------------------------------------------------------------------
-- La grana e' il *tocco*, non la persona: una sola persona che compila la prova
-- produce legittimamente due righe — la verifica dell'indirizzo e l'invio del
-- form — perche' sono due momenti diversi, e la distanza fra i due e'
-- esattamente il dato che dice quanti si fermano a meta'.
--
-- Aggiungendo un form al sito, aggiungi qui il suo ramo: una vista che non
-- copre tutte le sorgenti risponde con sicurezza a una domanda sbagliata, ed e'
-- peggio di una che non c'e'.
create or replace view public.email_tutte as
  select e.created_at as momento, e.email, e.email_norm,
         'eventi_email'::text as fonte, e.tipo, e.esito,
         e.nome, e.cognome, e.telefono, e.pagina, e.vid, e.id as fonte_id,
         e.utente_id
  from public.eventi_email e where e.email is not null

  union all
  select p.created_at, p.email, lower(btrim(p.email)),
         'richieste_prova', 'prova', p.stato,
         p.nome, p.cognome, coalesce(p.cellulare, p.telefono), p.pagina, p.vid, p.id,
         p.utente_id
  from public.richieste_prova p where p.email is not null

  union all
  select c.created_at, c.email, lower(btrim(c.email)),
         'richieste_contatto', 'contatto', c.stato,
         c.nome, c.cognome, coalesce(c.cellulare, c.telefono), c.pagina, c.vid, c.id,
         c.utente_id
  from public.richieste_contatto c where c.email is not null

  union all
  select h.created_at, h.email, lower(btrim(h.email)),
         'richieste_help_desk', 'help-desk', h.topic,
         h.first_name, h.last_name, null, h.pagina, null, h.id,
         h.utente_id
  from public.richieste_help_desk h where h.email is not null

  union all
  select k.created_at, k.email, lower(btrim(k.email)),
         'chat_conversazioni', 'chat', k.stato_pgm,
         null, null, null, k.pagina, k.vid, k.id,
         k.utente_id
  from public.chat_conversazioni k where k.email is not null

  union all
  select l.created_at, l.email, lower(btrim(l.email)),
         'chat_lead', 'chat-dati', l.stato_pgm,
         l.nome, l.cognome, l.telefono, l.pagina, null, l.id,
         l.utente_id
  from public.chat_lead l where l.email is not null

  union all
  select t.created_at, t.email, lower(btrim(t.email)),
         'chat_ticket', 'chat-ticket', t.stato,
         t.nome, t.cognome, t.telefono, t.pagina, null, t.id,
         t.utente_id
  from public.chat_ticket t where t.email is not null

  -- Il referral porta due indirizzi per riga, e vanno contati tutti e due:
  -- chi invita e chi e' invitato sono due persone.
  union all
  select r.created_at, r.invitante_email, lower(btrim(r.invitante_email)),
         'richieste_referral', 'referral-invitante', r.esito,
         r.invitante_nome, r.invitante_cognome, null, r.pagina, r.vid, r.id,
         r.utente_invitante_id
  from public.richieste_referral r where r.invitante_email is not null

  union all
  select r.created_at, r.amico_email, lower(btrim(r.amico_email)),
         'richieste_referral', 'referral-amico', r.esito,
         r.amico_nome, r.amico_cognome, r.amico_cellulare, r.pagina, r.vid, r.id,
         r.utente_amico_id
  from public.richieste_referral r where r.amico_email is not null;

comment on view public.email_tutte is
  'Ogni email digitata in un form del sito, da qualunque form. Una riga per tocco, non per persona: la verifica dell''indirizzo e l''invio del form sono due righe, e la distanza fra le due e'' quanti si fermano a meta''. Per una riga per persona usa email_contatti.';


-- ---------------------------------------------------------------------------
-- email_contatti — una riga per indirizzo
-- ---------------------------------------------------------------------------
create or replace view public.email_contatti as
  select
    email_norm,
    min(momento)                           as primo_contatto,
    max(momento)                           as ultimo_contatto,
    count(*)                               as tocchi,
    count(distinct tipo)                   as form_diversi,
    array_agg(distinct tipo order by tipo) as tipi,
    -- I piu' recenti non vuoti e non i primi: chi corregge un refuso al secondo
    -- invio ha ragione lui.
    (array_remove(array_agg(nome     order by momento desc), null))[1] as nome,
    (array_remove(array_agg(cognome  order by momento desc), null))[1] as cognome,
    (array_remove(array_agg(telefono order by momento desc), null))[1] as telefono,
    (array_remove(array_agg(vid      order by momento desc), null))[1] as vid
  from public.email_tutte
  where email_norm <> ''
  group by email_norm;

comment on view public.email_contatti is
  'Una riga per indirizzo email, aggregata da email_tutte: primo e ultimo contatto, quanti tocchi, da quali form. Nome, cognome e telefono sono i piu'' recenti non vuoti — chi corregge un refuso al secondo invio ha ragione lui.';


-- Le viste ereditano i permessi di chi le interroga, non del proprietario.
-- Senza questo scavalcherebbero la RLS delle tabelle sotto, e basterebbe la
-- chiave pubblica per leggere tutte le email raccolte dal sito.
alter view public.email_tutte    set (security_invoker = true);
alter view public.email_contatti set (security_invoker = true);
