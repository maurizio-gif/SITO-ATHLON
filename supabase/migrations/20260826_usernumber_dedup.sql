-- UserNumber (il campo pubblico "number" di PerfectGym) come terza chiave di
-- deduplica per l'anagrafica unica, dopo pgm_member_id ed email_norm.
--
-- La colonna utenti.pgm_numero_utente esiste gia' in produzione -- aggiunta fuori
-- banda da un'altra automazione di sync PerfectGym, non presente in nessun file
-- di supabase/migrations/ prima di questo -- e finora era solo informativa (il
-- numero che il personale usa per riconoscere la persona). Qui diventa anche una
-- chiave di deduplica: la si riusa invece di aggiungere una seconda colonna per
-- lo stesso campo PerfectGym, che sarebbe esattamente la confusione che si vuole
-- evitare tenendo pgm_member_id (l'Id interno) e number (il numero pubblico)
-- distinti.
--
-- Progetto Supabase: app-athlon (kdbcwwpdazvtmjolybdm).
-- Da eseguire dopo 20260823d_visite_utente.sql.


-- ---------------------------------------------------------------------------
-- utenti.pgm_numero_utente: da informativa a chiave di deduplica
-- ---------------------------------------------------------------------------
-- `if not exists`: la colonna c'e' gia' in produzione, ma un ambiente nuovo che
-- riesegue tutte le migrazioni da zero non ce l'ha ancora.
alter table public.utenti add column if not exists pgm_numero_utente text;

comment on column public.utenti.pgm_numero_utente is
  'Numero tessera PerfectGym ("Numero dell''utente", es. 101000007): il numero che il personale usa per riconoscere la persona, e da questa migrazione anche la terza e piu'' debole chiave di deduplica -- dopo pgm_member_id ed email_norm. Arriva dal link di una newsletter (?UserNumber=) o dal campo "number" che la verifica su PerfectGym restituisce comunque, qualunque sia stata la chiave di ricerca.';

create unique index if not exists utenti_pgm_numero_utente_key
  on public.utenti (pgm_numero_utente) where pgm_numero_utente is not null;


-- ---------------------------------------------------------------------------
-- trova_o_crea_utente(): terza sezione di ricerca, la piu' debole
-- ---------------------------------------------------------------------------
-- Nuovo parametro in coda, default null: non rompe le chiamate posizionali
-- esistenti (repopolamento compreso).
--
-- `create or replace` con una firma diversa crea un secondo overload invece di
-- sostituire quello vecchio (Postgres distingue le funzioni per nome+tipi degli
-- argomenti): la versione a 8 argomenti va tolta esplicitamente, o resta morta
-- e la stessa logica di deduplica finisce descritta in due posti.
drop function if exists public.trova_o_crea_utente(text, text, text, text, text, text, text, timestamptz);

create or replace function public.trova_o_crea_utente(
  p_email             text,
  p_pgm_id            text default null,
  p_nome              text default null,
  p_cognome           text default null,
  p_telefono          text default null,
  p_member_type       text default null,
  p_fonte             text default null,
  p_momento           timestamptz default null,
  p_pgm_numero_utente text default null
) returns uuid language plpgsql set search_path = public, pg_temp as $$
declare
  v_email  text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_pgm    text := nullif(btrim(coalesce(p_pgm_id, '')), '');
  v_nome   text := nullif(btrim(coalesce(p_nome, '')), '');
  v_cogn   text := nullif(btrim(coalesce(p_cognome, '')), '');
  v_tel    text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_tipo   text := nullif(btrim(coalesce(p_member_type, '')), '');
  v_numero text := nullif(btrim(coalesce(p_pgm_numero_utente, '')), '');
  v_id     uuid;
begin
  if v_email is null and v_pgm is null and v_numero is null then return null; end if;
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

  -- 3. Il numero utente di PerfectGym per ultimo: piu' debole delle prime due,
  --    perche' arriva da un link che puo' essere inoltrato o aperto da un
  --    dispositivo condiviso -- non da un gestionale che parla di se' (l'id) ne'
  --    da un'email digitata dalla persona.
  if v_id is null and v_numero is not null then
    select id into v_id from utenti where pgm_numero_utente = v_numero limit 1;
  end if;

  if v_id is null then
    begin
      insert into utenti (email, pgm_member_id, pgm_member_type, nome, cognome, telefono,
                          primo_contatto, ultimo_contatto, prima_fonte, ultima_fonte, tocchi,
                          pgm_numero_utente)
      values (v_email, v_pgm, v_tipo, v_nome, v_cogn, v_tel,
              p_momento, p_momento, p_fonte, p_fonte, 1,
              v_numero)
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
      if v_id is null and v_numero is not null then
        select id into v_id from utenti where pgm_numero_utente = v_numero limit 1;
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
      email             = coalesce(u.email, v_email),
      pgm_member_id     = coalesce(u.pgm_member_id, v_pgm),
      pgm_member_type   = coalesce(u.pgm_member_type, v_tipo),
      pgm_numero_utente = coalesce(u.pgm_numero_utente, v_numero),
      nome              = coalesce(u.nome,     v_nome),
      cognome           = coalesce(u.cognome,  v_cogn),
      telefono          = coalesce(u.telefono, v_tel),
      primo_contatto    = least(coalesce(u.primo_contatto, p_momento), p_momento),
      ultimo_contatto   = greatest(coalesce(u.ultimo_contatto, p_momento), p_momento),
      prima_fonte       = case when u.primo_contatto is null or p_momento <  u.primo_contatto
                               then p_fonte else u.prima_fonte end,
      ultima_fonte      = case when u.ultimo_contatto is null or p_momento >= u.ultimo_contatto
                               then p_fonte else u.ultima_fonte end,
      tocchi            = u.tocchi + 1,
      aggiornato_il     = now()
    where u.id = v_id;
  exception when unique_violation then
    -- Una delle chiavi uniche (id PerfectGym o numero utente) e' finita nel
    -- frattempo su un'altra riga. Si aggiorna tutto il resto e si lascia dov'e':
    -- un duplicato lo si sistema a mano, una richiesta perduta no.
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
-- assegna_utente(): un ottavo argomento, il numero utente
-- ---------------------------------------------------------------------------
-- TG_ARGV[7] oltre la lunghezza dichiarata dal trigger risolve a NULL in
-- PL/pgSQL, e primo_valore(r, NULL) ritorna NULL per costruzione: i trigger non
-- toccati da questa migrazione restano corretti senza essere ricreati.
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
      v_momento,
      public.primo_valore(r, TG_ARGV[7])    -- numero utente PerfectGym
    );
  exception when others then
    raise warning 'assegna_utente su % non e'' riuscito: %', TG_TABLE_NAME, sqlerrm;
    v_id := null;
  end;
  NEW := jsonb_populate_record(NEW, jsonb_build_object(TG_ARGV[0], v_id));
  return NEW;
end $$;


-- ---------------------------------------------------------------------------
-- Le colonne sorgente sulle tabelle dei tre flussi toccati da UserNumber
-- ---------------------------------------------------------------------------
-- Popolate da n8n col campo `number` che la verifica restituisce (chat, i
-- contatti) o da `userNumber` gia' noto (il referral, solo per l'invitante --
-- l'amico non passa mai da un UserNumber: la sua verifica in mandaInvito() usa
-- sempre la sua email).
alter table public.richieste_contatto add column if not exists pgm_numero_utente text;
alter table public.chat_lead          add column if not exists pgm_numero_utente text;
alter table public.richieste_referral add column if not exists invitante_pgm_numero_utente text;

comment on column public.richieste_contatto.pgm_numero_utente is
  'Numero utente PerfectGym: dal link UserNumber della newsletter, o dal campo "number" che la verifica restituisce comunque. Fonte per utenti.pgm_numero_utente via assegna_utente().';
comment on column public.chat_lead.pgm_numero_utente is
  'Numero utente PerfectGym: dal link UserNumber della newsletter, o dal campo "number" che la verifica restituisce comunque. Fonte per utenti.pgm_numero_utente via assegna_utente().';
comment on column public.richieste_referral.invitante_pgm_numero_utente is
  'Numero utente PerfectGym di chi invita: dal link UserNumber della newsletter, o dal campo "number" che la verifica restituisce comunque. Fonte per utenti.pgm_numero_utente via assegna_utente(). L''amico non ha equivalente: la sua verifica usa sempre la sua email.';


-- ---------------------------------------------------------------------------
-- I tre trigger da ricreare con l'ottavo argomento
-- ---------------------------------------------------------------------------
drop trigger if exists utente_assegna on public.richieste_contatto;
create trigger utente_assegna before insert or update of email, member_id, pgm_numero_utente
  on public.richieste_contatto for each row
  execute function public.assegna_utente('utente_id','email','member_id','nome','cognome','cellulare,telefono','member_type','pgm_numero_utente');

drop trigger if exists utente_assegna on public.chat_lead;
create trigger utente_assegna before insert or update of email, member_id, pgm_member_id, pgm_lead_id, pgm_numero_utente
  on public.chat_lead for each row
  execute function public.assegna_utente('utente_id','email','pgm_member_id,member_id,pgm_lead_id','nome','cognome','telefono,cellulare','','pgm_numero_utente');

drop trigger if exists utente_assegna_invitante on public.richieste_referral;
create trigger utente_assegna_invitante before insert or update of invitante_email, invitante_member_id, invitante_pgm_numero_utente
  on public.richieste_referral for each row
  execute function public.assegna_utente('utente_invitante_id','invitante_email','invitante_member_id','invitante_nome','invitante_cognome','','','invitante_pgm_numero_utente');

-- utente_assegna_amico resta invariato: l'amico non passa mai da un UserNumber.


-- ---------------------------------------------------------------------------
-- visite_pagina.usernumber: il tracciamento del percorso, non la deduplica
-- ---------------------------------------------------------------------------
-- Deliberatamente non collegata a utenti.pgm_numero_utente con una foreign key:
-- il percorso di una visita anonima non deve dipendere dal fatto che quella
-- visita abbia mai attivato una verifica.
alter table public.visite_pagina add column if not exists usernumber text;

comment on column public.visite_pagina.usernumber is
  'Numero utente PerfectGym gia'' noto durante questa visita (dal link della newsletter o da una verifica riuscita in un''altra pagina), per tracciare il percorso. Non e'' una chiave di deduplica e non e'' agganciata a utenti: una visita anonima resta tale.';

create index if not exists visite_pagina_usernumber_idx
  on public.visite_pagina (usernumber) where usernumber is not null;
