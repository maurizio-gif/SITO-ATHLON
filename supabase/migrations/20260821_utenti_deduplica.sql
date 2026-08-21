-- L'anagrafica unica del sito: una riga per persona, non per richiesta.
--
-- Il punto di tutto e' che la deduplica sta **nel database e non in n8n**. I
-- workflow continuano a scrivere quello che scrivevano; un trigger su ogni
-- tabella riconosce la persona e riempie la colonna utente_id. Aggiungere un
-- form vuol dire aggiungere una colonna e un trigger, non toccare nove
-- automazioni — e le righe gia' scritte si agganciano da sole.
--
-- Progetto Supabase: app-athlon.
-- Da eseguire nella SQL Editor del progetto (o via supabase db push), dopo
-- 20260821_eventi_email_referral_chat.sql.


-- ---------------------------------------------------------------------------
-- La tabella
-- ---------------------------------------------------------------------------
create table if not exists public.utenti (
  id               uuid primary key default gen_random_uuid(),
  creato_il        timestamptz not null default now(),
  aggiornato_il    timestamptz not null default now(),

  -- Le due chiavi di deduplica, in ordine di forza
  pgm_member_id    text,
  email            text,
  email_norm       text generated always as (nullif(lower(btrim(email)), '')) stored,

  pgm_member_type  text,
  nome             text,
  cognome          text,
  telefono         text,
  telefono_norm    text generated always as
                     (nullif(regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g'), '')) stored,

  primo_contatto   timestamptz,
  ultimo_contatto  timestamptz,
  prima_fonte      text,
  ultima_fonte     text,
  tocchi           integer not null default 0,
  note             text
);

comment on table public.utenti is
  'Anagrafica unica del sito: una riga per persona, agganciata da tutte le tabelle dei form e della chat. Le righe le crea e le aggiorna il trigger assegna_utente(), non n8n — i workflow continuano a scrivere quello che scrivevano.';
comment on column public.utenti.pgm_member_id is
  'Id dell''anagrafica su PerfectGym. E'' la chiave di deduplica piu'' forte perche'' la dice il gestionale, non chi compila: due email diverse con lo stesso id sono la stessa persona.';
comment on column public.utenti.email_norm is
  'Email in minuscolo e senza spazi, calcolata. Seconda chiave di deduplica, usata quando l''id PerfectGym non c''e'' ancora — cioe'' per tutti i contatti nuovi.';
comment on column public.utenti.telefono_norm is
  'Solo le cifre del telefono, calcolato. Non e'' una chiave di deduplica: serve alla vista utenti_da_unire per proporre gli accorpamenti a mano.';
comment on column public.utenti.tocchi is
  'Quante volte questa persona ha lasciato un dato al sito, contando ogni form e ogni verifica di email.';

create unique index if not exists utenti_email_norm_key
  on public.utenti (email_norm) where email_norm is not null;
create unique index if not exists utenti_pgm_member_id_key
  on public.utenti (pgm_member_id) where pgm_member_id is not null;
create index if not exists utenti_telefono_norm_idx
  on public.utenti (telefono_norm) where telefono_norm is not null;
create index if not exists utenti_ultimo_contatto_idx
  on public.utenti (ultimo_contatto desc);

alter table public.utenti enable row level security;


-- ---------------------------------------------------------------------------
-- Primo valore non vuoto fra piu' colonne
-- ---------------------------------------------------------------------------
-- Serve perche' il telefono sta in `cellulare` o in `telefono` a seconda della
-- tabella, e l'id PerfectGym in tre colonne diverse su chat_lead.
create or replace function public.primo_valore(r jsonb, cols text)
returns text language plpgsql immutable set search_path = public, pg_temp as $$
declare c text; v text;
begin
  if cols is null or btrim(cols) = '' then return null; end if;
  foreach c in array string_to_array(cols, ',') loop
    v := nullif(btrim(coalesce(r ->> btrim(c), '')), '');
    if v is not null then return v; end if;
  end loop;
  return null;
end $$;


-- ---------------------------------------------------------------------------
-- Trova la persona o la crea. E' l'unico posto in cui si decide chi e' chi.
-- ---------------------------------------------------------------------------
-- Gira dentro un trigger BEFORE INSERT sui form: se solleva, la richiesta della
-- persona non viene salvata. Quindi ogni conflitto va assorbito, mai propagato.
create or replace function public.trova_o_crea_utente(
  p_email       text,
  p_pgm_id      text default null,
  p_nome        text default null,
  p_cognome     text default null,
  p_telefono    text default null,
  p_member_type text default null,
  p_fonte       text default null,
  p_momento     timestamptz default null
) returns uuid language plpgsql set search_path = public, pg_temp as $$
declare
  v_email  text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_pgm    text := nullif(btrim(coalesce(p_pgm_id, '')), '');
  v_nome   text := nullif(btrim(coalesce(p_nome, '')), '');
  v_cogn   text := nullif(btrim(coalesce(p_cognome, '')), '');
  v_tel    text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_tipo   text := nullif(btrim(coalesce(p_member_type, '')), '');
  v_id     uuid;
begin
  if v_email is null and v_pgm is null then return null; end if;
  if p_momento is null then p_momento := now(); end if;

  -- 1. L'id PerfectGym per primo: lo dice il gestionale, non chi compila.
  --    Due email diverse con lo stesso id sono la stessa persona, e l'id vince
  --    anche quando l'email punterebbe altrove.
  if v_pgm is not null then
    select id into v_id from utenti where pgm_member_id = v_pgm limit 1;
  end if;

  -- 2. Poi l'email, unica chiave per chi non e' ancora su PerfectGym.
  if v_id is null and v_email is not null then
    select id into v_id from utenti where email_norm = v_email limit 1;
  end if;

  if v_id is null then
    begin
      insert into utenti (email, pgm_member_id, pgm_member_type, nome, cognome, telefono,
                          primo_contatto, ultimo_contatto, prima_fonte, ultima_fonte, tocchi)
      values (v_email, v_pgm, v_tipo, v_nome, v_cogn, v_tel,
              p_momento, p_momento, p_fonte, p_fonte, 1)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      -- Due richieste della stessa persona nello stesso istante: l'altra ha
      -- vinto la corsa fra la SELECT qui sopra e questa INSERT. Si rilegge la
      -- riga che ha creato lei invece di far fallire il form.
      v_id := null;
      if v_pgm is not null then
        select id into v_id from utenti where pgm_member_id = v_pgm limit 1;
      end if;
      if v_id is null and v_email is not null then
        select id into v_id from utenti where email_norm = v_email limit 1;
      end if;
      if v_id is null then return null; end if;
    end;
  end if;

  -- Si riempiono i buchi e non si sovrascrive: il primo dato che abbiamo di una
  -- persona e' quello che ha scritto lei, e una riga di referral porta il nome
  -- dell'amico come lo ha digitato un terzo.
  --
  -- L'email non si sostituisce mai. Se ritroviamo la persona dall'id PGM con un
  -- secondo indirizzo, quello resta nella riga della richiesta: qui la colonna
  -- email e' l'identita', e cambiarla spezzerebbe l'aggancio di tutto quello
  -- che e' gia' collegato.
  --
  -- least/greatest e non «l'ultimo che passa»: cosi' ripopolare le righe
  -- vecchie da' lo stesso risultato in qualunque ordine giri.
  begin
    update utenti u set
      email           = coalesce(u.email, v_email),
      pgm_member_id   = coalesce(u.pgm_member_id, v_pgm),
      pgm_member_type = coalesce(u.pgm_member_type, v_tipo),
      nome            = coalesce(u.nome,     v_nome),
      cognome         = coalesce(u.cognome,  v_cogn),
      telefono        = coalesce(u.telefono, v_tel),
      primo_contatto  = least(coalesce(u.primo_contatto, p_momento), p_momento),
      ultimo_contatto = greatest(coalesce(u.ultimo_contatto, p_momento), p_momento),
      prima_fonte     = case when u.primo_contatto is null or p_momento <  u.primo_contatto
                             then p_fonte else u.prima_fonte end,
      ultima_fonte    = case when u.ultimo_contatto is null or p_momento >= u.ultimo_contatto
                             then p_fonte else u.ultima_fonte end,
      tocchi          = u.tocchi + 1,
      aggiornato_il   = now()
    where u.id = v_id;
  exception when unique_violation then
    -- L'id PerfectGym e' finito nel frattempo su un'altra riga. Si aggiorna
    -- tutto il resto e lo si lascia dov'e': un id duplicato lo si sistema a
    -- mano, una richiesta perduta no.
    update utenti u set
      email           = coalesce(u.email, v_email),
      pgm_member_type = coalesce(u.pgm_member_type, v_tipo),
      nome            = coalesce(u.nome,     v_nome),
      cognome         = coalesce(u.cognome,  v_cogn),
      telefono        = coalesce(u.telefono, v_tel),
      primo_contatto  = least(coalesce(u.primo_contatto, p_momento), p_momento),
      ultimo_contatto = greatest(coalesce(u.ultimo_contatto, p_momento), p_momento),
      tocchi          = u.tocchi + 1,
      aggiornato_il   = now()
    where u.id = v_id;
  end;

  return v_id;
end $$;


-- ---------------------------------------------------------------------------
-- Un trigger solo per tutte le tabelle
-- ---------------------------------------------------------------------------
-- I nomi delle colonne arrivano come argomenti, perche' ogni form chiama le
-- stesse cose in modo diverso (first_name contro nome, user_id contro member_id
-- contro lead_id). Gli argomenti sono, in ordine: colonna di destinazione,
-- email, id PerfectGym, nome, cognome, telefono, memberType. Ognuno accetta una
-- lista separata da virgole e prende il primo valore non vuoto.
--
-- Ultima rete: qualunque cosa vada storta nell'aggancio, la richiesta si salva
-- lo stesso con utente_id nullo. Vale la regola dei form del sito — perdere il
-- collegamento e' brutto, impedire a una persona di chiedere una prova e'
-- peggio — e qui e' letterale, perche' il trigger e' BEFORE INSERT.
create or replace function public.assegna_utente()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  r         jsonb := to_jsonb(NEW);
  v_id      uuid;
  v_momento timestamptz := coalesce((r ->> 'created_at')::timestamptz, now());
begin
  begin
    v_id := public.trova_o_crea_utente(
      public.primo_valore(r, TG_ARGV[1]),   -- email
      public.primo_valore(r, TG_ARGV[2]),   -- id PerfectGym
      public.primo_valore(r, TG_ARGV[3]),   -- nome
      public.primo_valore(r, TG_ARGV[4]),   -- cognome
      public.primo_valore(r, TG_ARGV[5]),   -- telefono
      public.primo_valore(r, TG_ARGV[6]),   -- memberType
      TG_TABLE_NAME,
      v_momento
    );
  exception when others then
    raise warning 'assegna_utente su % non e'' riuscito: %', TG_TABLE_NAME, sqlerrm;
    v_id := null;
  end;
  NEW := jsonb_populate_record(NEW, jsonb_build_object(TG_ARGV[0], v_id));
  return NEW;
end $$;


-- ---------------------------------------------------------------------------
-- Le colonne di aggancio
-- ---------------------------------------------------------------------------
alter table public.eventi_email        add column if not exists utente_id uuid references public.utenti (id) on delete set null;
alter table public.richieste_prova     add column if not exists utente_id uuid references public.utenti (id) on delete set null;
alter table public.richieste_contatto  add column if not exists utente_id uuid references public.utenti (id) on delete set null;
alter table public.richieste_help_desk add column if not exists utente_id uuid references public.utenti (id) on delete set null;
alter table public.chat_conversazioni  add column if not exists utente_id uuid references public.utenti (id) on delete set null;
alter table public.chat_lead           add column if not exists utente_id uuid references public.utenti (id) on delete set null;
alter table public.chat_ticket         add column if not exists utente_id uuid references public.utenti (id) on delete set null;
-- Il referral porta due persone per riga, e sono due utenti diversi.
alter table public.richieste_referral
  add column if not exists utente_invitante_id uuid references public.utenti (id) on delete set null,
  add column if not exists utente_amico_id     uuid references public.utenti (id) on delete set null;

create index if not exists eventi_email_utente_idx        on public.eventi_email (utente_id);
create index if not exists richieste_prova_utente_idx     on public.richieste_prova (utente_id);
create index if not exists richieste_contatto_utente_idx  on public.richieste_contatto (utente_id);
create index if not exists richieste_help_desk_utente_idx on public.richieste_help_desk (utente_id);
create index if not exists chat_conversazioni_utente_idx  on public.chat_conversazioni (utente_id);
create index if not exists chat_lead_utente_idx           on public.chat_lead (utente_id);
create index if not exists chat_ticket_utente_idx         on public.chat_ticket (utente_id);
create index if not exists richieste_referral_invitante_utente_idx on public.richieste_referral (utente_invitante_id);
create index if not exists richieste_referral_amico_utente_idx     on public.richieste_referral (utente_amico_id);


-- ---------------------------------------------------------------------------
-- Ripopolamento delle righe gia' presenti
-- ---------------------------------------------------------------------------
-- Prima di accendere i trigger, cosi' il contatore `tocchi` non conta due volte
-- le stesse righe. L'ordine non conta: primo/ultimo contatto usano least e
-- greatest, quindi il risultato e' lo stesso comunque giri.
update public.eventi_email set utente_id = public.trova_o_crea_utente(
  email, member_id, nome, cognome, telefono, member_type, 'eventi_email', created_at);
update public.richieste_prova set utente_id = public.trova_o_crea_utente(
  email, lead_id, nome, cognome, coalesce(cellulare, telefono), null, 'richieste_prova', created_at);
update public.richieste_contatto set utente_id = public.trova_o_crea_utente(
  email, member_id, nome, cognome, coalesce(cellulare, telefono), member_type, 'richieste_contatto', created_at);
update public.richieste_help_desk set utente_id = public.trova_o_crea_utente(
  email, user_id, first_name, last_name, null, null, 'richieste_help_desk', created_at);
update public.chat_conversazioni set utente_id = public.trova_o_crea_utente(
  email, member_id, null, null, null, null, 'chat_conversazioni', created_at);
update public.chat_lead set utente_id = public.trova_o_crea_utente(
  email, coalesce(pgm_member_id, member_id, pgm_lead_id), nome, cognome,
  coalesce(telefono, cellulare), null, 'chat_lead', created_at);
update public.chat_ticket set utente_id = public.trova_o_crea_utente(
  email, member_id, nome, cognome, telefono, null, 'chat_ticket', created_at);
update public.richieste_referral set
  utente_invitante_id = public.trova_o_crea_utente(
    invitante_email, invitante_member_id, invitante_nome, invitante_cognome,
    null, null, 'richieste_referral', created_at),
  utente_amico_id = public.trova_o_crea_utente(
    amico_email, null, amico_nome, amico_cognome, amico_cellulare,
    null, 'richieste_referral', created_at);


-- ---------------------------------------------------------------------------
-- I trigger
-- ---------------------------------------------------------------------------
-- `update of` e non `update` secco: la riga di richieste_contatto nasce senza
-- member_id e lo riceve dopo, quando PerfectGym ha risposto — ed e' proprio quel
-- momento che puo' unire due utenti che sembravano diversi.
drop trigger if exists utente_assegna on public.eventi_email;
create trigger utente_assegna before insert or update of email, member_id
  on public.eventi_email for each row
  execute function public.assegna_utente('utente_id','email','member_id','nome','cognome','telefono','member_type');

drop trigger if exists utente_assegna on public.richieste_prova;
create trigger utente_assegna before insert or update of email, lead_id
  on public.richieste_prova for each row
  execute function public.assegna_utente('utente_id','email','lead_id','nome','cognome','cellulare,telefono','');

drop trigger if exists utente_assegna on public.richieste_contatto;
create trigger utente_assegna before insert or update of email, member_id
  on public.richieste_contatto for each row
  execute function public.assegna_utente('utente_id','email','member_id','nome','cognome','cellulare,telefono','member_type');

drop trigger if exists utente_assegna on public.richieste_help_desk;
create trigger utente_assegna before insert or update of email, user_id
  on public.richieste_help_desk for each row
  execute function public.assegna_utente('utente_id','email','user_id','first_name','last_name','','');

drop trigger if exists utente_assegna on public.chat_conversazioni;
create trigger utente_assegna before insert or update of email, member_id
  on public.chat_conversazioni for each row
  execute function public.assegna_utente('utente_id','email','member_id','','','','');

drop trigger if exists utente_assegna on public.chat_lead;
create trigger utente_assegna before insert or update of email, member_id, pgm_member_id, pgm_lead_id
  on public.chat_lead for each row
  execute function public.assegna_utente('utente_id','email','pgm_member_id,member_id,pgm_lead_id','nome','cognome','telefono,cellulare','');

drop trigger if exists utente_assegna on public.chat_ticket;
create trigger utente_assegna before insert or update of email, member_id
  on public.chat_ticket for each row
  execute function public.assegna_utente('utente_id','email','member_id','nome','cognome','telefono','');

drop trigger if exists utente_assegna_invitante on public.richieste_referral;
create trigger utente_assegna_invitante before insert or update of invitante_email, invitante_member_id
  on public.richieste_referral for each row
  execute function public.assegna_utente('utente_invitante_id','invitante_email','invitante_member_id','invitante_nome','invitante_cognome','','');

drop trigger if exists utente_assegna_amico on public.richieste_referral;
create trigger utente_assegna_amico before insert or update of amico_email
  on public.richieste_referral for each row
  execute function public.assegna_utente('utente_amico_id','amico_email','','amico_nome','amico_cognome','amico_cellulare','');
