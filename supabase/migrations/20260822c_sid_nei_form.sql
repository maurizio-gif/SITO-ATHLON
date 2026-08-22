-- Il `sid` arriva anche dai form, e serve a una cosa sola: legare una
-- conversione alle pagine viste prima, **anche per gli anonimi**.
--
-- Con il `vid` quel collegamento c'e' gia', ma vale solo per chi ha dato il
-- consenso pubblicitario: senza consenso il vid nasce nuovo a ogni pagina
-- (vedi 20260822b_vid_stabile.sql), quindi nel payload di un form identifica
-- la sola pagina da cui e' partito, e il percorso «e' arrivato, ha girato, ha
-- compilato» non si ricostruisce. Il `sid` sta in sessionStorage, non chiede
-- consenso, ed e' stabile per tutta la visita: unendo su di lui,
-- `visite_pagina` racconta cosa ha guardato chi ha poi compilato.
--
-- **`sid` non e' `sessione`.** Le tabelle della chat hanno gia' una colonna
-- `sessione`, che e' l'identificativo della *conversazione con l'assistente*
-- (`athlon:assistente:sessione`): un'altra cosa, con un altro ciclo di vita.
-- Le due convivono e non vanno confuse.
--
-- Progetto Supabase: app-athlon. Da eseguire dopo 20260822b_vid_stabile.sql.

alter table public.richieste_prova      add column if not exists sid text;
alter table public.richieste_contatto   add column if not exists sid text;
alter table public.richieste_referral   add column if not exists sid text;
alter table public.richieste_help_desk  add column if not exists sid text;
alter table public.eventi_email         add column if not exists sid text;
alter table public.chat_lead            add column if not exists sid text;
alter table public.chat_ticket          add column if not exists sid text;
alter table public.chat_conversazioni   add column if not exists sid text;

comment on column public.richieste_prova.sid is
  'Id della visita (sessionStorage athlon_sid), per unire questa richiesta alle righe di visite_pagina della stessa sessione. Funziona anche senza consenso pubblicitario, dove il vid non basta.';
comment on column public.richieste_contatto.sid is
  'Id della visita: vedi richieste_prova.sid.';
comment on column public.richieste_referral.sid is
  'Id della visita: vedi richieste_prova.sid.';
comment on column public.richieste_help_desk.sid is
  'Id della visita: vedi richieste_prova.sid.';
comment on column public.eventi_email.sid is
  'Id della visita (athlon_sid). Da non confondere con `sessione`, che e'' l''identificativo della conversazione con l''assistente.';
comment on column public.chat_lead.sid is
  'Id della visita (athlon_sid). Da non confondere con `sessione`, che e'' la conversazione con l''assistente.';
comment on column public.chat_ticket.sid is
  'Id della visita (athlon_sid). Da non confondere con `sessione`, che e'' la conversazione con l''assistente.';
comment on column public.chat_conversazioni.sid is
  'Id della visita (athlon_sid). Da non confondere con `sessione`, che e'' la conversazione con l''assistente.';

create index if not exists richieste_prova_sid_idx     on public.richieste_prova (sid)     where sid is not null;
create index if not exists richieste_contatto_sid_idx  on public.richieste_contatto (sid)  where sid is not null;
create index if not exists richieste_referral_sid_idx  on public.richieste_referral (sid)  where sid is not null;
create index if not exists richieste_help_desk_sid_idx on public.richieste_help_desk (sid) where sid is not null;
create index if not exists eventi_email_sid_idx        on public.eventi_email (sid)        where sid is not null;
create index if not exists chat_lead_sid_visita_idx    on public.chat_lead (sid)           where sid is not null;
create index if not exists chat_ticket_sid_visita_idx  on public.chat_ticket (sid)         where sid is not null;
create index if not exists chat_conversazioni_sid_idx  on public.chat_conversazioni (sid)  where sid is not null;


-- ---------------------------------------------------------------------------
-- percorso_conversione — cosa ha guardato chi ha poi lasciato i dati
-- ---------------------------------------------------------------------------
-- Una riga per conversione, con le pagine della stessa visita contate e
-- ordinate. E' la domanda che il vid da solo non poteva rispondere per gli
-- anonimi, ed e' il motivo per cui il sid viaggia con i form.
create or replace view public.percorso_conversione as
  with conversioni as (
    select 'prova'::text as tipo, id, created_at, email, sid, vid
      from public.richieste_prova     where sid is not null
    union all
    select 'contatto', id, created_at, email, sid, vid
      from public.richieste_contatto  where sid is not null
    union all
    select 'help-desk', id, created_at, email, sid, vid
      from public.richieste_help_desk where sid is not null
    union all
    select 'chat-lead', id, created_at, email, sid, vid
      from public.chat_lead           where sid is not null
    union all
    select 'chat-ticket', id, created_at, email, sid, vid
      from public.chat_ticket         where sid is not null
    union all
    select 'referral', id, created_at, invitante_email, sid, vid
      from public.richieste_referral  where sid is not null
  )
  select c.tipo, c.id, c.created_at as convertito_il, c.email, c.sid, c.vid,
         count(v.id)                                          as pagine_prima,
         min(v.created_at)                                    as prima_pagina_il,
         (array_agg(v.pagina order by v.created_at))[1]       as pagina_di_ingresso,
         (array_remove(array_agg(v.utm_source order by v.created_at), null))[1] as utm_source,
         (array_remove(array_agg(v.referrer   order by v.created_at), null))[1] as referrer
  from conversioni c
  left join public.visite_pagina v
    on v.sid = c.sid and v.created_at <= c.created_at
  group by c.tipo, c.id, c.created_at, c.email, c.sid, c.vid
  order by c.created_at desc;

comment on view public.percorso_conversione is
  'Una riga per conversione con le pagine viste nella stessa visita prima di convertire: da dove e'' entrato, quante pagine ha girato, con quale campagna. Si unisce per sid, quindi funziona anche per chi non ha dato il consenso pubblicitario.';

alter view public.percorso_conversione set (security_invoker = true);
