-- `utenti` si aggiorna da PerfectGym a ogni webhook, e non solo all'import.
--
-- Fino a oggi l'anagrafica veniva da un import unico: `pgm_import_grezzo`, 29 160
-- righe, 41 colonne, tutte con `importato_il` al **24/08/2026** e mai piu'
-- toccate. E' lo snapshot che ha popolato `utenti`, e la sua data e' l'argomento
-- di questo file: un CRM la cui anagrafica e' ferma a un giorno dice al desk
-- cose che non sono piu' vere. Il campo che invecchia piu' in fretta e'
-- `ultima_visita`, ed e' anche quello che al desk serve di piu'.
--
-- Da qui il sync: il webhook «User Modified» di PerfectGym, che il workflow n8n
-- «ATHLON: User Modified > SPOKI - SuperAgent» riceve gia' per parlare a Spoki,
-- scrive anche qui. Il contratto e' `pgm_aggiorna_utente(jsonb)` in fondo.
--
-- **La regola di scrittura e' l'opposto di quella dei form, ed e' deliberato.**
-- `trova_o_crea_utente()` riempie i buchi e non sovrascrive, perche' il primo
-- dato di una persona e' quello che ha scritto lei e una riga di referral porta
-- il nome dell'amico come lo ha digitato un terzo. Qui parla il gestionale di
-- se stesso: «User Modified» significa «questo dato e' cambiato», quindi il dato
-- nuovo vince. Passare da `trova_o_crea_utente()` darebbe un sync che sembra
-- funzionare e non aggiorna quasi niente -- 29 210 righe su 29 237 hanno gia' un
-- nome, e per quelle il `coalesce(u.nome, nuovo)` non fa nulla. La differenza fra
-- le due funzioni e' l'ordine degli argomenti del coalesce, e vale tutto.
--
-- **Un campo assente non e' un campo svuotato.** Il dato nuovo vince solo quando
-- c'e': una chiave mancante o vuota lascia la colonna com'era. Senza questa
-- regola un webhook parziale -- PerfectGym ne manda di parziali -- cancellerebbe
-- meta' anagrafica, e il modo in cui lo scopriremmo sarebbe il desk che non
-- trova piu' un numero di telefono.
--
-- **Il sync non e' un contatto.** Non muove `tocchi`, `primo_contatto`,
-- `ultimo_contatto`, `prima_fonte` ne' `ultima_fonte`: quelle colonne contano
-- quante volte una **persona** ha lasciato un dato al sito, e un'anagrafica
-- modificata dal desk non e' la persona. Gonfiarle falserebbe l'imbuto di
-- `email_tutte` e l'ordine di `utente_attivita`. Il sync ha la sua colonna,
-- `pgm_sincronizzato_il`.

------------------------------------------------------------------------------
-- 1. Le sette colonne che esistevano in produzione e non qui
------------------------------------------------------------------------------
-- Aggiunte dalla dashboard e mai scritte in una migrazione: il repo ne
-- dichiarava 18, la produzione ne aveva 25. E' la deriva che il file di
-- `20260826_usernumber_dedup.sql` aveva gia' sanato per `pgm_numero_utente`, e
-- si sana allo stesso modo -- `if not exists`, cosi' la migrazione e' innocua
-- dove le colonne ci sono gia' ed e' completa dove si riparte da zero.

alter table public.utenti add column if not exists pgm_stato             text;
alter table public.utenti add column if not exists pgm_registrato_il     timestamptz;
alter table public.utenti add column if not exists pgm_stato_abbonamento text;
alter table public.utenti add column if not exists data_nascita          date;
alter table public.utenti add column if not exists codice_fiscale        text;
alter table public.utenti add column if not exists citta                 text;
alter table public.utenti add column if not exists genitore_id           uuid references public.utenti(id) on delete set null;

------------------------------------------------------------------------------
-- 2. Le colonne nuove, scelte sul dato reale e non sul possibile
------------------------------------------------------------------------------
-- Ogni colonna qui sotto esiste in `pgm_import_grezzo` con un popolamento
-- misurato: e' la prova che PerfectGym quel campo lo ha davvero, e quanto
-- spesso. Percentuali sulle 29 160 righe dell'import.
--
-- Restano fuori di proposito:
--   `eta` e `giorni_come_membro`, che si calcolano da `data_nascita` e
--   `pgm_registrato_il` -- ricopiati sarebbero sbagliati il giorno dopo;
--   i campi contrattuali (piano, saldo, date, quota), che stanno in
--   `pgm_contratti`: una persona ha piu' contratti e in `utenti` ce ne starebbe
--   uno solo, cioe' il primo o l'ultimo a caso;
--   `perfect_member`, che vale `1,00` o `4,00` e di cui non sappiamo il
--   significato. Un dato inventato e' peggio di un dato assente.

alter table public.utenti add column if not exists pgm_ultima_visita       timestamptz;
alter table public.utenti add column if not exists pgm_consulente          text;
alter table public.utenti add column if not exists pgm_sesso               text;
alter table public.utenti add column if not exists pgm_paese               text;
alter table public.utenti add column if not exists pgm_indirizzo           text;
alter table public.utenti add column if not exists pgm_cap                 text;
alter table public.utenti add column if not exists pgm_figli               integer;
alter table public.utenti add column if not exists pgm_nucleo              text;
alter table public.utenti add column if not exists pgm_fonte               text;
alter table public.utenti add column if not exists pgm_consenso_biometrico boolean;
alter table public.utenti add column if not exists pgm_raccomandato_da     text;
alter table public.utenti add column if not exists pgm_piva                text;
alter table public.utenti add column if not exists pgm_sincronizzato_il    timestamptz;
alter table public.utenti add column if not exists pgm_payload             jsonb;

comment on column public.utenti.pgm_ultima_visita is
  'Ultimo accesso al club secondo PerfectGym (30% sull''import). E'' il dato che invecchia piu'' in fretta e la ragione per cui questo sync esiste: dall''import del 24/08 e'' fermo.';
comment on column public.utenti.pgm_consulente is
  'Il consulente PerfectGym che segue la persona (77%). Serve al desk per sapere a chi passare una richiesta.';
comment on column public.utenti.pgm_sesso is 'Female | Male | Other, come lo scrive PerfectGym (78%).';
comment on column public.utenti.pgm_paese is
  'Paese dell''indirizzo (100%). Quasi sempre Italy, ma i 30 esteri contano: sono quelli per cui il prefisso E.164 di validaTelefono() non e'' +39.';
comment on column public.utenti.pgm_figli is
  'Quanti figli il nucleo ha su PerfectGym (100%, da 0 a 6). Con pgm_nucleo e genitore_id e'' come si ricostruisce un nucleo familiare.';
comment on column public.utenti.pgm_nucleo is 'Elenco del nucleo familiare come lo scrive PerfectGym (24%).';
comment on column public.utenti.pgm_fonte is
  'La fonte secondo PerfectGym: Web | Crm | Internet (100%). **Non e'' prima_fonte/ultima_fonte**, che sono l''attribuzione del sito (richieste_prova, chat_lead, ...): sono due concetti diversi e scriverli nella stessa colonna cancellerebbe l''attribuzione.';
comment on column public.utenti.pgm_sincronizzato_il is
  'Quando il webhook di PerfectGym ha aggiornato questa riga. Deliberatamente separata da ultimo_contatto: un sync non e'' un contatto della persona.';
comment on column public.utenti.pgm_payload is
  'L''ultimo payload normalizzato ricevuto, per intero. Serve a non dover richiedere a PerfectGym un campo che oggi non promuoviamo a colonna: lo storico completo sta in pgm_sync_log.';

------------------------------------------------------------------------------
-- 3. `pgm_member_type` aveva due vocabolari, e uno non fa match
------------------------------------------------------------------------------
-- Stato prima di questa migrazione:
--   Ospite 14 242, Membro 10 326, Lead 4 596  <- l'import del 24/08, in italiano
--   Member 15, Guest 7                        <- il sito, live, in inglese
--
-- `haGiaAccount()` (src/data/contatto.ts) decide con `/member|guest/i`, e
-- **«Membro» non contiene «member»**: su un valore italiano quel test e' falso,
-- quindi un socio risulterebbe senza account e verrebbe mandato a registrarsi --
-- il guaio che il lavoro su /abbonamenti aveva chiuso. Oggi non morde, perche'
-- quella funzione legge la risposta OData del webhook e non questa colonna; ma
-- da quando il sync scrive qui, una colonna a vocabolario misto e' una domanda
-- a cui nessuna query puo' rispondere con sicurezza.
--
-- Quindi una sola lingua, l'inglese, che e' quella che il sito confronta. La
-- conversione e' deterministica e reversibile: Ospite<->Guest, Membro<->Member.

create or replace function public.pgm_tipo_utente_norm(p_tipo text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select case
    when p_tipo is null or btrim(p_tipo) = '' then null
    when btrim(lower(p_tipo)) in ('membro', 'member')       then 'Member'
    when btrim(lower(p_tipo)) in ('ospite', 'guest')        then 'Guest'
    when btrim(lower(p_tipo)) in ('lead', 'contatto')       then 'Lead'
    -- Un valore che non conosciamo passa com'e': meglio un'etichetta strana e
    -- visibile che una riga svuotata in silenzio.
    else btrim(p_tipo)
  end;
$$;

comment on function public.pgm_tipo_utente_norm(text) is
  'Porta il tipo utente PerfectGym al vocabolario inglese che il sito confronta (Member | Guest | Lead). L''export CSV lo scrive in italiano, l''API in inglese: senza questa funzione la stessa colonna ha due lingue e /member|guest/i non fa match su «Membro».';

update public.utenti
   set pgm_member_type = public.pgm_tipo_utente_norm(pgm_member_type)
 where pgm_member_type is not null
   and pgm_member_type <> public.pgm_tipo_utente_norm(pgm_member_type);

comment on column public.utenti.pgm_member_type is
  'Lead | Guest | Member, sempre in inglese (vedi pgm_tipo_utente_norm). E'' il campo che decide chi puo'' fare login: haGiaAccount() ed eSocio() in src/data/contatto.ts lo confrontano con /member|guest/i e /member/i.';

------------------------------------------------------------------------------
-- 4. Le conversioni difensive
------------------------------------------------------------------------------
-- Un webhook non e' un CSV: manda date in formati diversi, numeri come stringhe,
-- booleani come «Si'». Un cast diretto solleverebbe, e un errore qui fermerebbe
-- l'aggiornamento di tutta la riga -- vale la regola dei form: perdere un campo
-- e' brutto, perdere la riga e' peggio. Quindi ogni conversione che puo'
-- fallire restituisce null invece di sollevare.

create or replace function public.pgm_a_timestamp(p_valore text)
returns timestamptz language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_valore is null or btrim(p_valore) = '' then return null; end if;
  return btrim(p_valore)::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.pgm_a_data(p_valore text)
returns date language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_valore is null or btrim(p_valore) = '' then return null; end if;
  return btrim(p_valore)::date;
exception when others then
  return null;
end;
$$;

create or replace function public.pgm_a_int(p_valore text)
returns integer language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_valore is null or btrim(p_valore) = '' then return null; end if;
  -- Via il separatore decimale: l'export scrive «1,00» dove intende 1.
  return floor(replace(btrim(p_valore), ',', '.')::numeric)::integer;
exception when others then
  return null;
end;
$$;

create or replace function public.pgm_a_bool(p_valore text)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select case
    when p_valore is null or btrim(p_valore) = '' then null
    when btrim(lower(p_valore)) in ('si', 'sì', 'yes', 'true', 't', '1')  then true
    when btrim(lower(p_valore)) in ('no', 'false', 'f', '0')             then false
    else null
  end;
$$;

------------------------------------------------------------------------------
-- 5. `pgm_stato` ha un vincolo, e non e' `pgm_member_type` con un'altra faccia
------------------------------------------------------------------------------
-- Trovato provando la funzione, non leggendola: `utenti_pgm_stato_check` ammette
-- solo `lead | guest | ex-member | member`, e un valore fuori da quell'elenco fa
-- fallire l'INSERT -- con lui tutto il webhook, Spoki compreso, perche' girano
-- nello stesso workflow. Il primo test e' morto su `stato: 'iscritto'`.
--
-- E' una colonna diversa da `pgm_member_type`: quella e' l'etichetta che
-- PerfectGym da' alla persona, questa e' il ciclo di vita, e divide i Member in
-- `member` (3 585) ed `ex-member` (6 743). Il vincolo e' una regola del club e
-- non si allarga per far passare il sync: si normalizza prima di scrivere.
--
-- **Quando non si riesce a normalizzare, null.** A valle il `coalesce` lascia
-- allora la colonna com'era: meglio uno stato non aggiornato che un webhook che
-- fallisce, e la derivazione qui sotto e' un'ipotesi sui valori di PerfectGym
-- che va corretta il giorno che si vede il payload vero.

create or replace function public.pgm_stato_norm(
  p_stato       text,
  p_tipo        text default null,
  p_abbonamento text default null
) returns text language sql immutable set search_path = public, pg_temp as $$
  select case
    -- Se il chiamante manda gia' uno dei quattro, vince lui.
    when btrim(lower(coalesce(p_stato, ''))) in ('lead','guest','member','ex-member')
      then btrim(lower(p_stato))
    -- Altrimenti si deriva dal tipo, che e' il dato che PerfectGym manda sempre.
    when public.pgm_tipo_utente_norm(p_tipo) = 'Lead'  then 'lead'
    when public.pgm_tipo_utente_norm(p_tipo) = 'Guest' then 'guest'
    when public.pgm_tipo_utente_norm(p_tipo) = 'Member'
      then case
             when btrim(lower(coalesce(p_abbonamento, '')))
                  in ('terminato','terminated','ended','expired','concluso')
               then 'ex-member'
             else 'member'
           end
    else null
  end;
$$;

comment on function public.pgm_stato_norm(text, text, text) is
  'Porta lo stato al vocabolario di utenti_pgm_stato_check (lead | guest | member | ex-member). Un valore gia'' valido passa; altrimenti si deriva dal tipo utente, e per un Member l''abbonamento terminato lo fa ex-member. Null quando non e'' derivabile: a valle il coalesce lascia allora la colonna com''era, invece di far fallire il webhook su un vincolo.';

------------------------------------------------------------------------------
-- 6. Il registro: gli scarti si contano come i successi
------------------------------------------------------------------------------
-- Una riga per **ogni** webhook considerato, compresi quelli che non agganciano
-- nessuno. E' la regola del referral e di `email_bozze`: le chiamate che non
-- producono niente e non lasciano traccia non si possono contare ne' spiegare, e
-- un sync silenzioso che sbaglia sembra un sync che funziona.

create table if not exists public.pgm_sync_log (
  id             uuid primary key default gen_random_uuid(),
  ricevuto_il    timestamptz not null default now(),
  utente_id      uuid references public.utenti(id) on delete set null,
  pgm_member_id  text,
  -- aggiornato | creato | aggiornato-email-in-conflitto
  -- scartato-senza-chiave | errore
  esito          text not null,
  motivo_scarto  text,
  payload        jsonb
);

comment on table public.pgm_sync_log is
  'Una riga per ogni webhook «User Modified» ricevuto, scarti compresi. Serve a rispondere a «il sync sta funzionando?», che senza registro e'' una domanda senza risposta: un webhook che non aggancia nessuno non lascerebbe traccia da nessuna parte.';
comment on column public.pgm_sync_log.esito is
  'aggiornato | creato | aggiornato-email-in-conflitto | scartato-senza-chiave | errore. Il terzo non e'' un errore: l''email nuova era gia'' di un''altra riga, quindi si e'' tenuta la vecchia e il resto e'' stato aggiornato.';

create index if not exists pgm_sync_log_ricevuto_il_idx on public.pgm_sync_log (ricevuto_il desc);
create index if not exists pgm_sync_log_utente_id_idx   on public.pgm_sync_log (utente_id) where utente_id is not null;
create index if not exists pgm_sync_log_esito_idx       on public.pgm_sync_log (esito);

-- RLS attiva e zero policy, come ogni tabella di questo progetto: solo la
-- service key passa, e quella sta solo in n8n.
alter table public.pgm_sync_log enable row level security;

------------------------------------------------------------------------------
-- 7. Il contratto con n8n
------------------------------------------------------------------------------
-- **Le chiavi sono le nostre, non quelle di PerfectGym.** La traduzione la fa un
-- Code node nel workflow, e la ragione e' che i nomi dei campi di PerfectGym
-- cambiano fra l'export CSV, l'OData e il webhook: se questa funzione parlasse
-- la loro lingua, ogni cambio del gestionale sarebbe una migrazione. Cosi' e' un
-- nodo da riscrivere.
--
-- Chiavi lette (tutte facoltative tranne l'esigenza di averne una identificante):
--   member_id, numero_utente, email            <- le tre chiavi di aggancio
--   nome, cognome, telefono, member_type
--   stato, stato_abbonamento, registrato_il
--   data_nascita, codice_fiscale, citta
--   ultima_visita, consulente, sesso, paese, indirizzo, cap,
--   figli, nucleo, fonte, consenso_biometrico, raccomandato_da, piva
--   grezzo                                     <- il payload originale, per il log
--
-- L'aggancio segue l'ordine di forza gia' stabilito in trova_o_crea_utente():
-- l'id PerfectGym, poi il numero utente, poi l'email. Qui il numero utente viene
-- **prima** dell'email e non dopo, ed e' l'unica differenza: la' l'email era
-- digitata dalla persona e il numero arrivava da un link inoltrabile, qui li
-- manda entrambi il gestionale e il numero e' il suo, non un indirizzo che puo'
-- essere condiviso in famiglia.

create or replace function public.pgm_aggiorna_utente(p_dati jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare
  v_id       uuid;
  v_esito    text;
  v_conflitto boolean := false;

  v_member   text := nullif(btrim(coalesce(p_dati->>'member_id', '')), '');
  v_numero   text := nullif(btrim(coalesce(p_dati->>'numero_utente', '')), '');
  v_email    text := nullif(btrim(coalesce(p_dati->>'email', '')), '');
  v_nome     text := nullif(btrim(coalesce(p_dati->>'nome', '')), '');
  v_cognome  text := nullif(btrim(coalesce(p_dati->>'cognome', '')), '');
  v_telefono text := nullif(btrim(coalesce(p_dati->>'telefono', '')), '');
  v_tipo     text := public.pgm_tipo_utente_norm(p_dati->>'member_type');
  v_abb      text := nullif(btrim(coalesce(p_dati->>'stato_abbonamento', '')), '');
  -- Normalizzato, non letto: la colonna ha un check e un valore fuori elenco
  -- farebbe fallire tutto il webhook. Vedi la sezione 5.
  v_stato    text := public.pgm_stato_norm(p_dati->>'stato', p_dati->>'member_type',
                                           p_dati->>'stato_abbonamento');
  v_regil    timestamptz := public.pgm_a_timestamp(p_dati->>'registrato_il');
  v_nascita  date    := public.pgm_a_data(p_dati->>'data_nascita');
  v_cf       text := nullif(btrim(coalesce(p_dati->>'codice_fiscale', '')), '');
  v_citta    text := nullif(btrim(coalesce(p_dati->>'citta', '')), '');
  v_visita   timestamptz := public.pgm_a_timestamp(p_dati->>'ultima_visita');
  v_cons     text := nullif(btrim(coalesce(p_dati->>'consulente', '')), '');
  v_sesso    text := nullif(btrim(coalesce(p_dati->>'sesso', '')), '');
  v_paese    text := nullif(btrim(coalesce(p_dati->>'paese', '')), '');
  v_ind      text := nullif(btrim(coalesce(p_dati->>'indirizzo', '')), '');
  v_cap      text := nullif(btrim(coalesce(p_dati->>'cap', '')), '');
  v_figli    integer := public.pgm_a_int(p_dati->>'figli');
  v_nucleo   text := nullif(btrim(coalesce(p_dati->>'nucleo', '')), '');
  v_fonte    text := nullif(btrim(coalesce(p_dati->>'fonte', '')), '');
  v_bio      boolean := public.pgm_a_bool(p_dati->>'consenso_biometrico');
  v_racc     text := nullif(btrim(coalesce(p_dati->>'raccomandato_da', '')), '');
  v_piva     text := nullif(btrim(coalesce(p_dati->>'piva', '')), '');
begin
  -- Senza una chiave non c'e' niente da agganciare, e la chiamata va comunque
  -- registrata: se gli scarti diventano tanti, il difetto e' nel mapping del
  -- Code node, non qui, e senza il log non lo si vedrebbe.
  if v_member is null and v_numero is null and v_email is null then
    insert into public.pgm_sync_log (esito, motivo_scarto, payload)
    values ('scartato-senza-chiave',
            'Il payload non porta ne'' member_id, ne'' numero_utente, ne'' email.',
            coalesce(p_dati->'grezzo', p_dati));
    return jsonb_build_object('esito', 'scartato-senza-chiave', 'utente_id', null);
  end if;

  if v_member is not null then
    select id into v_id from public.utenti where pgm_member_id = v_member limit 1;
  end if;
  if v_id is null and v_numero is not null then
    select id into v_id from public.utenti where pgm_numero_utente = v_numero limit 1;
  end if;
  if v_id is null and v_email is not null then
    select id into v_id from public.utenti where email_norm = lower(v_email) limit 1;
  end if;

  -- Non trovata: la si crea. Un Lead nato su PerfectGym e mai passato dal sito
  -- non e' in `utenti`, e tenerlo fuori vorrebbe dire un'anagrafica che il
  -- gestionale conosce e il CRM no.
  --
  -- Ma **le colonne del contatto restano vuote**: `tocchi` a zero,
  -- `primo_contatto` e `prima_fonte` null. Questa persona non ci ha contattati,
  -- e scrivere «primo contatto: oggi» la farebbe comparire nell'imbuto fra chi
  -- ha compilato qualcosa.
  if v_id is null then
    begin
      insert into public.utenti (
        pgm_member_id, pgm_numero_utente, email, nome, cognome, telefono,
        pgm_member_type, pgm_stato, pgm_stato_abbonamento, pgm_registrato_il,
        data_nascita, codice_fiscale, citta,
        pgm_ultima_visita, pgm_consulente, pgm_sesso, pgm_paese, pgm_indirizzo,
        pgm_cap, pgm_figli, pgm_nucleo, pgm_fonte, pgm_consenso_biometrico,
        pgm_raccomandato_da, pgm_piva, pgm_sincronizzato_il, pgm_payload
      ) values (
        v_member, v_numero, v_email, v_nome, v_cognome, v_telefono,
        v_tipo, v_stato, v_abb, v_regil,
        v_nascita, v_cf, v_citta,
        v_visita, v_cons, v_sesso, v_paese, v_ind,
        v_cap, v_figli, v_nucleo, v_fonte, v_bio,
        v_racc, v_piva, now(), p_dati
      ) returning id into v_id;

      insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, payload)
      values (v_id, v_member, 'creato', coalesce(p_dati->'grezzo', p_dati));
      return jsonb_build_object('esito', 'creato', 'utente_id', v_id);
    exception when unique_violation then
      -- Due webhook della stessa persona nello stesso istante: l'altro ha vinto
      -- la corsa fra la SELECT e questa INSERT. Si rilegge la sua riga.
      v_id := null;
      if v_member is not null then
        select id into v_id from public.utenti where pgm_member_id = v_member limit 1;
      end if;
      if v_id is null and v_numero is not null then
        select id into v_id from public.utenti where pgm_numero_utente = v_numero limit 1;
      end if;
      if v_id is null and v_email is not null then
        select id into v_id from public.utenti where email_norm = lower(v_email) limit 1;
      end if;
      if v_id is null then
        insert into public.pgm_sync_log (pgm_member_id, esito, motivo_scarto, payload)
        values (v_member, 'errore',
                'Collisione su una chiave unica e riga non ritrovata dopo il conflitto.',
                coalesce(p_dati->'grezzo', p_dati));
        return jsonb_build_object('esito', 'errore', 'utente_id', null);
      end if;
    end;
  end if;

  -- **`coalesce(nuovo, vecchio)` e non `coalesce(vecchio, nuovo)`**, ed e' la
  -- riga che distingue questa funzione da trova_o_crea_utente(): il dato del
  -- gestionale vince quando c'e', e quando non c'e' non cancella niente.
  begin
    update public.utenti u set
      email                   = coalesce(v_email,    u.email),
      pgm_member_id           = coalesce(v_member,   u.pgm_member_id),
      pgm_numero_utente       = coalesce(v_numero,   u.pgm_numero_utente),
      nome                    = coalesce(v_nome,     u.nome),
      cognome                 = coalesce(v_cognome,  u.cognome),
      telefono                = coalesce(v_telefono, u.telefono),
      pgm_member_type         = coalesce(v_tipo,     u.pgm_member_type),
      pgm_stato               = coalesce(v_stato,    u.pgm_stato),
      pgm_stato_abbonamento   = coalesce(v_abb,      u.pgm_stato_abbonamento),
      pgm_registrato_il       = coalesce(v_regil,    u.pgm_registrato_il),
      data_nascita            = coalesce(v_nascita,  u.data_nascita),
      codice_fiscale          = coalesce(v_cf,       u.codice_fiscale),
      citta                   = coalesce(v_citta,    u.citta),
      pgm_ultima_visita       = coalesce(v_visita,   u.pgm_ultima_visita),
      pgm_consulente          = coalesce(v_cons,     u.pgm_consulente),
      pgm_sesso               = coalesce(v_sesso,    u.pgm_sesso),
      pgm_paese               = coalesce(v_paese,    u.pgm_paese),
      pgm_indirizzo           = coalesce(v_ind,      u.pgm_indirizzo),
      pgm_cap                 = coalesce(v_cap,      u.pgm_cap),
      pgm_figli               = coalesce(v_figli,    u.pgm_figli),
      pgm_nucleo              = coalesce(v_nucleo,   u.pgm_nucleo),
      pgm_fonte               = coalesce(v_fonte,    u.pgm_fonte),
      pgm_consenso_biometrico = coalesce(v_bio,      u.pgm_consenso_biometrico),
      pgm_raccomandato_da     = coalesce(v_racc,     u.pgm_raccomandato_da),
      pgm_piva                = coalesce(v_piva,     u.pgm_piva),
      pgm_sincronizzato_il    = now(),
      pgm_payload             = p_dati,
      aggiornato_il           = now()
    where u.id = v_id;
    v_esito := 'aggiornato';
  exception when unique_violation then
    -- L'email nuova e' gia' di un'altra riga. `email_norm` e' generata da
    -- `email` con un indice unico parziale, quindi la collisione arriva da qui e
    -- da nessun altro posto. Si tiene la vecchia e si aggiorna tutto il resto:
    -- rifiutare l'intero webhook per un indirizzo duplicato butterebbe anche i
    -- venti campi che non c'entrano niente.
    v_conflitto := true;
    update public.utenti u set
      pgm_member_id           = coalesce(v_member,   u.pgm_member_id),
      pgm_numero_utente       = coalesce(v_numero,   u.pgm_numero_utente),
      nome                    = coalesce(v_nome,     u.nome),
      cognome                 = coalesce(v_cognome,  u.cognome),
      telefono                = coalesce(v_telefono, u.telefono),
      pgm_member_type         = coalesce(v_tipo,     u.pgm_member_type),
      pgm_stato               = coalesce(v_stato,    u.pgm_stato),
      pgm_stato_abbonamento   = coalesce(v_abb,      u.pgm_stato_abbonamento),
      pgm_registrato_il       = coalesce(v_regil,    u.pgm_registrato_il),
      data_nascita            = coalesce(v_nascita,  u.data_nascita),
      codice_fiscale          = coalesce(v_cf,       u.codice_fiscale),
      citta                   = coalesce(v_citta,    u.citta),
      pgm_ultima_visita       = coalesce(v_visita,   u.pgm_ultima_visita),
      pgm_consulente          = coalesce(v_cons,     u.pgm_consulente),
      pgm_sesso               = coalesce(v_sesso,    u.pgm_sesso),
      pgm_paese               = coalesce(v_paese,    u.pgm_paese),
      pgm_indirizzo           = coalesce(v_ind,      u.pgm_indirizzo),
      pgm_cap                 = coalesce(v_cap,      u.pgm_cap),
      pgm_figli               = coalesce(v_figli,    u.pgm_figli),
      pgm_nucleo              = coalesce(v_nucleo,   u.pgm_nucleo),
      pgm_fonte               = coalesce(v_fonte,    u.pgm_fonte),
      pgm_consenso_biometrico = coalesce(v_bio,      u.pgm_consenso_biometrico),
      pgm_raccomandato_da     = coalesce(v_racc,     u.pgm_raccomandato_da),
      pgm_piva                = coalesce(v_piva,     u.pgm_piva),
      pgm_sincronizzato_il    = now(),
      pgm_payload             = p_dati,
      aggiornato_il           = now()
    where u.id = v_id;
    v_esito := 'aggiornato-email-in-conflitto';
  end;

  insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload)
  values (v_id, v_member, v_esito,
          case when v_conflitto
               then 'L''email ' || coalesce(v_email, '(vuota)') ||
                    ' e'' gia'' di un''altra riga: tenuta la precedente, aggiornato il resto.'
               else null end,
          coalesce(p_dati->'grezzo', p_dati));

  return jsonb_build_object('esito', v_esito, 'utente_id', v_id);

-- La rete sotto tutto: qualunque errore non previsto diventa una riga di log col
-- messaggio di Postgres dentro, invece di risalire al chiamante. Un payload
-- malformato non deve poter fermare il webhook -- ne' il ramo Spoki, che gira
-- nello stesso workflow. E' la stessa scelta di `assegna_utente()`: un aggancio
-- mancato si ricalcola, una chiamata perduta no.
exception when others then
  begin
    insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload)
    values (v_id, v_member, 'errore', left(coalesce(sqlerrm, 'errore senza messaggio'), 500),
            coalesce(p_dati->'grezzo', p_dati));
  exception when others then
    null;  -- Se non si riesce nemmeno a loggare, si esce zitti: mai bloccare.
  end;
  return jsonb_build_object('esito', 'errore', 'utente_id', v_id,
                            'motivo', left(coalesce(sqlerrm, ''), 500));
end;
$$;

comment on function public.pgm_aggiorna_utente(jsonb) is
  'Aggiorna `utenti` dal webhook «User Modified» di PerfectGym. Il dato del gestionale vince quando c''e'' (coalesce(nuovo, vecchio)) e non cancella quando manca; non muove tocchi ne'' le colonne del contatto, perche'' un sync non e'' una persona che ci scrive. Non solleva mai: ogni errore diventa una riga in pgm_sync_log. Le chiavi del jsonb sono le nostre: la traduzione dai nomi PerfectGym la fa un Code node in n8n, cosi'' un cambio del gestionale non e'' una migrazione.';

------------------------------------------------------------------------------
-- 8. Come si guarda se sta funzionando
------------------------------------------------------------------------------
-- Due domande, due viste. La prima e' «il sync gira?», e la risposta e' un
-- conteggio per esito: se `scartato-senza-chiave` cresce, il mapping del Code
-- node ha perso una chiave. La seconda e' «quanto e' fresca l'anagrafica?», che
-- e' la domanda da cui e' partito tutto questo file.

create or replace view public.pgm_sync_esiti
with (security_invoker = true) as
  select esito,
         count(*) as chiamate,
         max(ricevuto_il) as ultima,
         count(distinct utente_id) as persone
    from public.pgm_sync_log
   group by esito
   order by chiamate desc;

comment on view public.pgm_sync_esiti is
  'Quante chiamate per esito, con l''ultima. E'' il primo posto da guardare quando si sospetta che il sync non stia scrivendo: `security_invoker` perche'' senza scavalcherebbe la RLS di pgm_sync_log.';

create or replace view public.pgm_freschezza
with (security_invoker = true) as
  select count(*) as utenti_pgm,
         count(pgm_sincronizzato_il) as sincronizzati,
         count(*) - count(pgm_sincronizzato_il) as mai_sincronizzati,
         max(pgm_sincronizzato_il) as sync_piu_recente,
         min(pgm_sincronizzato_il) as sync_piu_vecchio,
         count(*) filter (
           where pgm_sincronizzato_il is not null
             and pgm_sincronizzato_il > now() - interval '30 days'
         ) as sincronizzati_ultimi_30gg
    from public.utenti
   where pgm_member_id is not null;

comment on view public.pgm_freschezza is
  'Quanta anagrafica PerfectGym e'' stata toccata dal sync e quanta e'' ancora ferma all''import del 24/08/2026. Serve a sapere se il webhook copre tutti o solo chi viene modificato spesso -- «User Modified» non arriva per chi nessuno modifica.';
