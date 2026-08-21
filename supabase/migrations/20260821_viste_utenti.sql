-- Le viste che leggono l'anagrafica: la scheda di una persona, l'elenco per la
-- segreteria, e i doppioni che la deduplica automatica non puo' risolvere.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260821_utenti_deduplica.sql.


-- ---------------------------------------------------------------------------
-- utente_attivita — la scheda: tutto quello che una persona ha fatto
-- ---------------------------------------------------------------------------
create or replace view public.utente_attivita as
  select p.utente_id, p.created_at as momento, 'richieste_prova'::text as fonte,
         'prova'::text as tipo, p.id as riferimento_id, p.stato as esito
  from public.richieste_prova p where p.utente_id is not null

  union all
  select c.utente_id, c.created_at, 'richieste_contatto', 'contatto', c.id, c.stato
  from public.richieste_contatto c where c.utente_id is not null

  union all
  select h.utente_id, h.created_at, 'richieste_help_desk', 'help-desk', h.id, h.stato
  from public.richieste_help_desk h where h.utente_id is not null

  union all
  select k.utente_id, k.created_at, 'chat_conversazioni', 'chat', k.id, k.stato_pgm
  from public.chat_conversazioni k where k.utente_id is not null

  union all
  select l.utente_id, l.created_at, 'chat_lead', 'chat-dati', l.id, l.pgm_strada
  from public.chat_lead l where l.utente_id is not null

  union all
  select t.utente_id, t.created_at, 'chat_ticket', 'chat-ticket', t.id, t.stato
  from public.chat_ticket t where t.utente_id is not null

  union all
  select r.utente_invitante_id, r.created_at, 'richieste_referral', 'referral-invitante', r.id, r.esito
  from public.richieste_referral r where r.utente_invitante_id is not null

  union all
  select r.utente_amico_id, r.created_at, 'richieste_referral', 'referral-amico', r.id, r.esito
  from public.richieste_referral r where r.utente_amico_id is not null

  -- Gli eventi email stanno in fondo di proposito: sono il tocco, non la
  -- richiesta. Filtrali via se ti serve solo cosa la persona ha chiesto.
  union all
  select e.utente_id, e.created_at, 'eventi_email', e.tipo, e.id, e.esito
  from public.eventi_email e where e.utente_id is not null;

comment on view public.utente_attivita is
  'La scheda di una persona: form, chat, ticket, inviti e ogni email digitata, in ordine di tempo. Le righe con fonte eventi_email sono i tocchi (una verifica di email non e'' una richiesta): escludile quando conti le conversioni.';


-- ---------------------------------------------------------------------------
-- utenti_completi — l'anagrafica con quello che ci sta attaccato
-- ---------------------------------------------------------------------------
create or replace view public.utenti_completi as
  select u.*,
         coalesce(a.attivita_totali, 0)  as attivita_totali,
         coalesce(a.richieste, 0)        as richieste,
         a.ultima_attivita,
         a.fonti
  from public.utenti u
  left join lateral (
    select count(*)                                       as attivita_totali,
           count(*) filter (where fonte <> 'eventi_email') as richieste,
           max(momento)                                   as ultima_attivita,
           array_agg(distinct fonte order by fonte)       as fonti
    from public.utente_attivita x where x.utente_id = u.id
  ) a on true;

comment on view public.utenti_completi is
  'utenti piu'' quante cose ci sono attaccate. `richieste` esclude eventi_email: e'' quante volte la persona ha chiesto qualcosa davvero, contro `attivita_totali` che conta anche le sole verifiche di email.';


-- ---------------------------------------------------------------------------
-- utenti_da_unire — i doppioni che restano
-- ---------------------------------------------------------------------------
-- Le coppie che la deduplica automatica non puo' unire: stesso numero di
-- telefono e id diversi. Succede a chi scrive due indirizzi diversi e non e'
-- ancora su PerfectGym, che e' il caso in cui nessuna delle due chiavi tiene.
--
-- Si uniscono a mano, guardandole, e il telefono non e' una chiave di
-- deduplica proprio per questo: due figli iscritti col cellulare del genitore
-- compaiono qui e sono due persone. Un accorpamento automatico le fonderebbe.
create or replace view public.utenti_da_unire as
  select a.id as id_a, a.email as email_a, a.nome as nome_a, a.cognome as cognome_a,
         b.id as id_b, b.email as email_b, b.nome as nome_b, b.cognome as cognome_b,
         a.telefono_norm,
         (lower(btrim(coalesce(a.cognome, '#'))) = lower(btrim(coalesce(b.cognome, '§')))) as stesso_cognome
  from public.utenti a
  join public.utenti b
    on a.telefono_norm = b.telefono_norm
   and a.id < b.id
  where a.telefono_norm is not null
    and (a.pgm_member_id is null or b.pgm_member_id is null
         or a.pgm_member_id <> b.pgm_member_id);

comment on view public.utenti_da_unire is
  'Coppie di utenti con lo stesso telefono e id diversi: candidati all''accorpamento, da decidere a mano. Non e'' una lista di errori — due figli iscritti col cellulare del genitore compaiono qui e sono due persone.';


-- Le viste ereditano i permessi di chi le interroga, non del proprietario.
alter view public.utente_attivita set (security_invoker = true);
alter view public.utenti_completi set (security_invoker = true);
alter view public.utenti_da_unire set (security_invoker = true);
