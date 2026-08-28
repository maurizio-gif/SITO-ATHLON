-- I campi che il webhook porta **davvero**, letti dal payload e non dall'export.
--
-- `20260827_pgm_sync_utente.sql` era modellato su `pgm_import_grezzo`, cioe' su
-- un export CSV. Poi il connettore n8n e' tornato disponibile, si e' letto il
-- workflow «ATHLON: User Modified > SPOKI - SuperAgent» e una sua esecuzione
-- vera, e il set di campi e' risultato un altro. Questo file corregge la
-- differenza. Il metodo e' quello che conta: **un campo si aggiunge dopo averlo
-- visto in un payload, non dopo averlo immaginato.**
--
-- Cosa dice il payload vero. Il webhook e' povero:
--
--   {"event":"UserModified","triggeredDate":"...","data":{
--      "modificationType":"Updated","userId":39120,
--      "user":{"userId":…,"userNumber":"…","userFirstName":"…","userLastName":"…",
--              "userPhone":"+39…","userEmail":null,"birthDate":"2023-10-01"},
--      "homeClubId":1,"userType":"Guest"}}
--
-- I dati ricchi li prende il nodo `GET MEMBER` dall'OData di PerfectGym, con
-- `$expand=customAttributes,contracts,memberBalance,familyParents,familyChildren`:
--
--   firstName secondName lastName number phoneNumber email personalId sex
--   birthdate consultantId referralCode memberType isActive isDeleted
--   isForeigner isPaymentInProgress emailVerificationStatus
--   phoneNumberVerificationStatus citizenshipId homeClubId createdDate version id
--   + customAttributes[] contracts[] memberBalance{} familyParents[] familyChildren[]
--
-- Tre conseguenze, e la prima e' una rinuncia.
--
-- **Nessun campo di indirizzo esiste su quell'entita'.** `citta`,
-- `pgm_indirizzo`, `pgm_cap`, `pgm_paese`, piu' `pgm_fonte`, `pgm_piva` e
-- `pgm_raccomandato_da`, che il file precedente aveva aggiunto sulla fede
-- dell'export, da questa strada non si riempiono. Le colonne **restano**: non
-- sono vuote, contengono i dati dell'import (`citta` ne ha 13 345), e
-- cancellarle butterebbe quel lavoro. Sono documentate come non alimentate dal
-- webhook, che e' l'unica cosa onesta da scrivere.
--
-- **`referralCode` non e' `pgm_raccomandato_da`.** E' il codice *di* questa
-- persona, non chi l'ha invitata: sono i due versi opposti dello stesso invito, e
-- metterli nella stessa colonna sarebbe un dato falso.
--
-- **`consultantId` e' un id, non un nome.** L'export dava «Valentina», il webhook
-- da' `3`. Due colonne, non una: `pgm_consulente` resta il nome, il numero va in
-- `pgm_consulente_id`.

alter table public.utenti add column if not exists pgm_version            bigint;
alter table public.utenti add column if not exists pgm_attivo             boolean;
alter table public.utenti add column if not exists pgm_cancellato         boolean;
alter table public.utenti add column if not exists pgm_secondo_nome       text;
alter table public.utenti add column if not exists pgm_consulente_id      integer;
alter table public.utenti add column if not exists pgm_email_verificata   text;
alter table public.utenti add column if not exists pgm_telefono_verificato text;
alter table public.utenti add column if not exists pgm_codice_referral    text;
alter table public.utenti add column if not exists pgm_club_id            integer;
alter table public.utenti add column if not exists pgm_straniero          boolean;
alter table public.utenti add column if not exists pgm_saldo              numeric;
alter table public.utenti add column if not exists pgm_saldo_negativo_da  timestamptz;
alter table public.utenti add column if not exists pgm_consensi           jsonb;
alter table public.utenti add column if not exists pgm_genitore_member_id text;

comment on column public.utenti.pgm_version is
  'Il numero di concorrenza di PerfectGym (campo `version` su Members). E'' la guardia contro i webhook fuori ordine: misurato, ne arrivano quattro nello stesso secondo, e senza questo confronto l''ultimo a scrivere vincerebbe anche portando dati piu'' vecchi. Un aggiornamento con version minore di quella in riga viene saltato e registrato.';
comment on column public.utenti.pgm_attivo is 'isActive su PerfectGym.';
comment on column public.utenti.pgm_cancellato is
  'isDeleted su PerfectGym. Una scheda cancellata sul gestionale non e'' una riga da cancellare qui: le richieste agganciate restano, e questa colonna dice di non trattarla come viva.';
comment on column public.utenti.pgm_consulente_id is
  'consultantId: un id, non un nome. pgm_consulente resta il nome che veniva dall''export CSV; il webhook da'' solo l''id, e scriverlo in una colonna documentata come nome sarebbe un dato falso.';
comment on column public.utenti.pgm_email_verificata is
  'emailVerificationStatus (None | ...). Dice se l''indirizzo e'' stato confermato: serve a sapere quanto fidarsi di un''email prima di scriverci.';
comment on column public.utenti.pgm_telefono_verificato is 'phoneNumberVerificationStatus.';
comment on column public.utenti.pgm_codice_referral is
  'referralCode: il codice di questa persona, non chi l''ha invitata. Non e'' pgm_raccomandato_da, che e'' l''altro verso e da questa strada non arriva.';
comment on column public.utenti.pgm_saldo is 'memberBalance.currentBalance.';
comment on column public.utenti.pgm_saldo_negativo_da is
  'memberBalance.negativeBalanceSince: da quando la persona e'' in rosso. E'' il segnale che al desk serve prima di proporre un rinnovo.';
comment on column public.utenti.pgm_consensi is
  'Le risposte agli agreement come {"1": true}, da MemberAgreementAnswers. Un oggetto e non un booleano perche'' non sappiamo quale agreement sia il numero 1: chiamarlo consenso_biometrico sarebbe inventare l''etichetta.';
comment on column public.utenti.pgm_genitore_member_id is
  'L''id PerfectGym del genitore, da familyParents[0]. Si conserva grezzo perche'' il genitore puo'' non essere ancora in `utenti` -- padre e figlio arrivano nello stesso istante, li crea lo stesso form -- e allora genitore_id si risolve al giro dopo invece di restare perso.';

comment on column public.utenti.pgm_figli is
  'Quanti figli il nucleo ha su PerfectGym. Dal webhook e'' familyChildren.length, che e'' strutturato; l''import dava childrenCount.';
comment on column public.utenti.pgm_nucleo is
  'Elenco del nucleo come stringa, dall''export CSV. Il webhook non la alimenta: da la'' arrivano familyParents/familyChildren strutturati, che finiscono in pgm_genitore_member_id e pgm_figli.';
comment on column public.utenti.pgm_indirizzo is
  'Dall''export CSV. Il webhook non lo porta: l''entita'' OData Members non ha campi di indirizzo. Per aggiornarlo serve un''altra chiamata, che non e'' in questo lavoro.';
comment on column public.utenti.pgm_paese is
  'Dall''export CSV. Il webhook non lo porta (vedi pgm_indirizzo).';
comment on column public.utenti.pgm_fonte is
  'Web | Crm | Internet, dall''export CSV. Il webhook non lo porta. Non e'' prima_fonte/ultima_fonte, che sono l''attribuzione del sito.';

create index if not exists utenti_pgm_genitore_member_id_idx
  on public.utenti (pgm_genitore_member_id) where pgm_genitore_member_id is not null;

------------------------------------------------------------------------------
-- `version` e' bigint, e la conversione anche
------------------------------------------------------------------------------
-- Sul payload vero vale 71 155 530 e sale: e' un contatore globale
-- dell'istanza PerfectGym. Leggerlo con `pgm_a_int`, che restituisce `integer`
-- (limite 2 147 483 647), avrebbe funzionato per anni e poi avrebbe cominciato a
-- restituire null in silenzio -- cioe' **la guardia sull'ordine si sarebbe spenta
-- senza dirlo**, che e' il modo peggiore di rompersi.

create or replace function public.pgm_a_bigint(p_valore text)
returns bigint language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_valore is null or btrim(p_valore) = '' then return null; end if;
  return floor(replace(btrim(p_valore), ',', '.')::numeric)::bigint;
exception when others then
  return null;
end;
$$;

comment on function public.pgm_a_bigint(text) is
  'Come pgm_a_int ma su bigint: serve a `version` di PerfectGym, che e'' un contatore globale gia'' a otto cifre e destinato a superare il limite di integer.';

------------------------------------------------------------------------------
-- Lo stato ammesso, e da dove si deriva
------------------------------------------------------------------------------
-- `utenti_pgm_stato_check` ammette solo lead | guest | member | ex-member, e su
-- 29 237 righe la divisione e' guest 14 242, ex-member 6 743, lead 4 592,
-- member 3 585. Il webhook non manda quel vocabolario, manda `userType`
-- (Guest/Member/Lead) e lo stato del contratto: la derivazione sta qui, ed e'
-- **un'ipotesi sui valori di PerfectGym** -- va corretta il giorno che si vede
-- un contratto con uno stato diverso da quelli elencati.

create or replace function public.pgm_stato_norm(
  p_stato       text,
  p_tipo        text default null,
  p_abbonamento text default null
) returns text language sql immutable set search_path = public, pg_temp as $$
  select case
    when btrim(lower(coalesce(p_stato, ''))) in ('lead','guest','member','ex-member')
      then btrim(lower(p_stato))
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
-- La funzione, versione finale
------------------------------------------------------------------------------
-- Rispetto a quella del file precedente cambiano tre cose: la guardia su
-- `version`, i campi nuovi, e `pgm_consensi` che si **fonde** (`||`) invece di
-- sostituirsi -- un webhook che porta l'agreement 2 non deve cancellare l'1.
--
-- Restano identiche le tre regole che contano: il gestionale vince quando il
-- dato c'e' (`coalesce(nuovo, vecchio)`, non il contrario dei form), un campo
-- assente non cancella niente, e `tocchi` con le colonne del contatto non si
-- toccano -- la funzione non le nomina nemmeno.

create or replace function public.pgm_aggiorna_utente(p_dati jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $fn$
declare
  v_id        uuid;
  v_esito     text;
  v_conflitto boolean := false;
  v_ver_riga  bigint;
  v_gen_id    uuid;

  v_member   text := nullif(btrim(coalesce(p_dati->>'member_id', '')), '');
  v_numero   text := nullif(btrim(coalesce(p_dati->>'numero_utente', '')), '');
  v_email    text := nullif(btrim(coalesce(p_dati->>'email', '')), '');
  v_nome     text := nullif(btrim(coalesce(p_dati->>'nome', '')), '');
  v_nome2    text := nullif(btrim(coalesce(p_dati->>'secondo_nome', '')), '');
  v_cognome  text := nullif(btrim(coalesce(p_dati->>'cognome', '')), '');
  v_telefono text := nullif(btrim(coalesce(p_dati->>'telefono', '')), '');
  v_tipo     text := public.pgm_tipo_utente_norm(p_dati->>'member_type');
  v_abb      text := nullif(btrim(coalesce(p_dati->>'stato_abbonamento', '')), '');
  v_stato    text := public.pgm_stato_norm(p_dati->>'stato', p_dati->>'member_type',
                                           p_dati->>'stato_abbonamento');
  v_regil    timestamptz := public.pgm_a_timestamp(p_dati->>'registrato_il');
  v_nascita  date    := public.pgm_a_data(p_dati->>'data_nascita');
  v_cf       text := nullif(btrim(coalesce(p_dati->>'codice_fiscale', '')), '');
  v_visita   timestamptz := public.pgm_a_timestamp(p_dati->>'ultima_visita');
  v_sesso    text := nullif(btrim(coalesce(p_dati->>'sesso', '')), '');
  v_figli    integer := public.pgm_a_int(p_dati->>'figli');
  v_version  bigint  := public.pgm_a_bigint(p_dati->>'version');
  v_attivo   boolean := public.pgm_a_bool(p_dati->>'attivo');
  v_canc     boolean := public.pgm_a_bool(p_dati->>'cancellato');
  v_stran    boolean := public.pgm_a_bool(p_dati->>'straniero');
  v_consid   integer := public.pgm_a_int(p_dati->>'consulente_id');
  v_emailver text := nullif(btrim(coalesce(p_dati->>'email_verificata', '')), '');
  v_telver   text := nullif(btrim(coalesce(p_dati->>'telefono_verificato', '')), '');
  v_refcode  text := nullif(btrim(coalesce(p_dati->>'codice_referral', '')), '');
  v_clubid   integer := public.pgm_a_int(p_dati->>'club_id');
  v_saldo    numeric;
  v_saldoneg timestamptz := public.pgm_a_timestamp(p_dati->>'saldo_negativo_da');
  v_consensi jsonb := case when jsonb_typeof(p_dati->'consensi') = 'object'
                           then p_dati->'consensi' else null end;
  v_genmem   text := nullif(btrim(coalesce(p_dati->>'genitore_member_id', '')), '');
begin
  begin
    v_saldo := nullif(btrim(coalesce(p_dati->>'saldo', '')), '')::numeric;
  exception when others then v_saldo := null;
  end;

  if v_member is null and v_numero is null and v_email is null then
    insert into public.pgm_sync_log (esito, motivo_scarto, payload)
    values ('scartato-senza-chiave',
            'Il payload non porta ne'' member_id, ne'' numero_utente, ne'' email.',
            coalesce(p_dati->'grezzo', p_dati));
    return jsonb_build_object('esito', 'scartato-senza-chiave', 'utente_id', null);
  end if;

  if v_member is not null then
    select id, pgm_version into v_id, v_ver_riga
      from public.utenti where pgm_member_id = v_member limit 1;
  end if;
  if v_id is null and v_numero is not null then
    select id, pgm_version into v_id, v_ver_riga
      from public.utenti where pgm_numero_utente = v_numero limit 1;
  end if;
  if v_id is null and v_email is not null then
    select id, pgm_version into v_id, v_ver_riga
      from public.utenti where email_norm = lower(v_email) limit 1;
  end if;

  if v_id is not null and v_version is not null and v_ver_riga is not null
     and v_version < v_ver_riga then
    insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload)
    values (v_id, v_member, 'saltato-versione-vecchia',
            'version ' || v_version || ' < ' || v_ver_riga || ' gia'' in riga.',
            coalesce(p_dati->'grezzo', p_dati));
    return jsonb_build_object('esito', 'saltato-versione-vecchia', 'utente_id', v_id);
  end if;

  if v_genmem is not null then
    select id into v_gen_id from public.utenti where pgm_member_id = v_genmem limit 1;
  end if;

  if v_id is null then
    begin
      insert into public.utenti (
        pgm_member_id, pgm_numero_utente, email, nome, cognome, telefono,
        pgm_member_type, pgm_stato, pgm_stato_abbonamento, pgm_registrato_il,
        data_nascita, codice_fiscale, pgm_ultima_visita, pgm_sesso, pgm_figli,
        pgm_secondo_nome, pgm_version, pgm_attivo, pgm_cancellato, pgm_straniero,
        pgm_consulente_id, pgm_email_verificata, pgm_telefono_verificato,
        pgm_codice_referral, pgm_club_id, pgm_saldo, pgm_saldo_negativo_da,
        pgm_consensi, pgm_genitore_member_id, genitore_id,
        pgm_sincronizzato_il, pgm_payload
      ) values (
        v_member, v_numero, v_email, v_nome, v_cognome, v_telefono,
        v_tipo, v_stato, v_abb, v_regil,
        v_nascita, v_cf, v_visita, v_sesso, v_figli,
        v_nome2, v_version, v_attivo, v_canc, v_stran,
        v_consid, v_emailver, v_telver,
        v_refcode, v_clubid, v_saldo, v_saldoneg,
        v_consensi, v_genmem, v_gen_id,
        now(), p_dati
      ) returning id into v_id;

      insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, payload)
      values (v_id, v_member, 'creato', coalesce(p_dati->'grezzo', p_dati));
      return jsonb_build_object('esito', 'creato', 'utente_id', v_id);
    exception when unique_violation then
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

  begin
    update public.utenti u set
      email                   = coalesce(v_email,    u.email),
      pgm_member_id           = coalesce(v_member,   u.pgm_member_id),
      pgm_numero_utente       = coalesce(v_numero,   u.pgm_numero_utente),
      nome                    = coalesce(v_nome,     u.nome),
      pgm_secondo_nome        = coalesce(v_nome2,    u.pgm_secondo_nome),
      cognome                 = coalesce(v_cognome,  u.cognome),
      telefono                = coalesce(v_telefono, u.telefono),
      pgm_member_type         = coalesce(v_tipo,     u.pgm_member_type),
      pgm_stato               = coalesce(v_stato,    u.pgm_stato),
      pgm_stato_abbonamento   = coalesce(v_abb,      u.pgm_stato_abbonamento),
      pgm_registrato_il       = coalesce(v_regil,    u.pgm_registrato_il),
      data_nascita            = coalesce(v_nascita,  u.data_nascita),
      codice_fiscale          = coalesce(v_cf,       u.codice_fiscale),
      pgm_ultima_visita       = coalesce(v_visita,   u.pgm_ultima_visita),
      pgm_sesso               = coalesce(v_sesso,    u.pgm_sesso),
      pgm_figli               = coalesce(v_figli,    u.pgm_figli),
      pgm_version             = coalesce(v_version,  u.pgm_version),
      pgm_attivo              = coalesce(v_attivo,   u.pgm_attivo),
      pgm_cancellato          = coalesce(v_canc,     u.pgm_cancellato),
      pgm_straniero           = coalesce(v_stran,    u.pgm_straniero),
      pgm_consulente_id       = coalesce(v_consid,   u.pgm_consulente_id),
      pgm_email_verificata    = coalesce(v_emailver, u.pgm_email_verificata),
      pgm_telefono_verificato = coalesce(v_telver,   u.pgm_telefono_verificato),
      pgm_codice_referral     = coalesce(v_refcode,  u.pgm_codice_referral),
      pgm_club_id             = coalesce(v_clubid,   u.pgm_club_id),
      pgm_saldo               = coalesce(v_saldo,    u.pgm_saldo),
      pgm_saldo_negativo_da   = coalesce(v_saldoneg, u.pgm_saldo_negativo_da),
      pgm_consensi            = coalesce(u.pgm_consensi, '{}'::jsonb) || coalesce(v_consensi, '{}'::jsonb),
      pgm_genitore_member_id  = coalesce(v_genmem,   u.pgm_genitore_member_id),
      genitore_id             = coalesce(v_gen_id,   u.genitore_id),
      pgm_sincronizzato_il    = now(),
      pgm_payload             = p_dati,
      aggiornato_il           = now()
    where u.id = v_id;
    v_esito := 'aggiornato';
  exception when unique_violation then
    v_conflitto := true;
    update public.utenti u set
      pgm_member_id           = coalesce(v_member,   u.pgm_member_id),
      pgm_numero_utente       = coalesce(v_numero,   u.pgm_numero_utente),
      nome                    = coalesce(v_nome,     u.nome),
      pgm_secondo_nome        = coalesce(v_nome2,    u.pgm_secondo_nome),
      cognome                 = coalesce(v_cognome,  u.cognome),
      telefono                = coalesce(v_telefono, u.telefono),
      pgm_member_type         = coalesce(v_tipo,     u.pgm_member_type),
      pgm_stato               = coalesce(v_stato,    u.pgm_stato),
      pgm_stato_abbonamento   = coalesce(v_abb,      u.pgm_stato_abbonamento),
      pgm_registrato_il       = coalesce(v_regil,    u.pgm_registrato_il),
      data_nascita            = coalesce(v_nascita,  u.data_nascita),
      codice_fiscale          = coalesce(v_cf,       u.codice_fiscale),
      pgm_ultima_visita       = coalesce(v_visita,   u.pgm_ultima_visita),
      pgm_sesso               = coalesce(v_sesso,    u.pgm_sesso),
      pgm_figli               = coalesce(v_figli,    u.pgm_figli),
      pgm_version             = coalesce(v_version,  u.pgm_version),
      pgm_attivo              = coalesce(v_attivo,   u.pgm_attivo),
      pgm_cancellato          = coalesce(v_canc,     u.pgm_cancellato),
      pgm_straniero           = coalesce(v_stran,    u.pgm_straniero),
      pgm_consulente_id       = coalesce(v_consid,   u.pgm_consulente_id),
      pgm_email_verificata    = coalesce(v_emailver, u.pgm_email_verificata),
      pgm_telefono_verificato = coalesce(v_telver,   u.pgm_telefono_verificato),
      pgm_codice_referral     = coalesce(v_refcode,  u.pgm_codice_referral),
      pgm_club_id             = coalesce(v_clubid,   u.pgm_club_id),
      pgm_saldo               = coalesce(v_saldo,    u.pgm_saldo),
      pgm_saldo_negativo_da   = coalesce(v_saldoneg, u.pgm_saldo_negativo_da),
      pgm_consensi            = coalesce(u.pgm_consensi, '{}'::jsonb) || coalesce(v_consensi, '{}'::jsonb),
      pgm_genitore_member_id  = coalesce(v_genmem,   u.pgm_genitore_member_id),
      genitore_id             = coalesce(v_gen_id,   u.genitore_id),
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

exception when others then
  begin
    insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload)
    values (v_id, v_member, 'errore', left(coalesce(sqlerrm, 'errore senza messaggio'), 500),
            coalesce(p_dati->'grezzo', p_dati));
  exception when others then
    null;
  end;
  return jsonb_build_object('esito', 'errore', 'utente_id', v_id,
                            'motivo', left(coalesce(sqlerrm, ''), 500));
end;
$fn$;

comment on function public.pgm_aggiorna_utente(jsonb) is
  'Aggiorna `utenti` dal webhook «User Modified» di PerfectGym. Il dato del gestionale vince quando c''e'' (coalesce(nuovo, vecchio)) e non cancella quando manca; salta gli aggiornamenti con `version` piu'' vecchia di quella in riga; non muove tocchi ne'' le colonne del contatto, perche'' un sync non e'' una persona che ci scrive; non solleva mai. Le chiavi del jsonb sono le nostre: la traduzione dai nomi PerfectGym la fa il Code node «Prepara Supabase» nel workflow.';
