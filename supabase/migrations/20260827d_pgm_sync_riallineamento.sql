-- Il riallineamento: le 38 586 schede di PerfectGym dentro `utenti`, in blocco.
--
-- Il webhook «User Modified» tiene in pari **le schede che qualcuno modifica**.
-- Non dice niente sulle altre, e sono la maggioranza: 29 241 righe in `utenti`
-- vengono dall'import CSV del 24/08/2026 e, di quelle, sette avevano una
-- `pgm_version`. Cioe' il sync era vivo e l'anagrafica ferma. Questo file
-- aggiunge la strada che le prende tutte, una volta.
--
-- **Non e' un secondo mapping.** Il workflow del riallineamento chiama la stessa
-- `pgm_aggiorna_utente(jsonb)` del webhook, con le stesse chiavi: due funzioni
-- che scrivono la stessa tabella divergono, e la seconda divergenza non la vede
-- nessuno finche' una colonna non resta vuota su una sola delle due strade.
-- Quello che si aggiunge qui e' come **chiamarla 38 586 volte** senza fare
-- 38 586 richieste HTTP, e come non riempire il registro di copie.
--
-- Tre cose, e ognuna risponde a un numero misurato.
--
-- **`pgm_aggiorna_utenti(jsonb)`: un array, una richiesta.** Una pagina di 500
-- schede sarebbero 500 chiamate REST; cosi' e' una. Il ciclo sta in Postgres,
-- ogni riga nel suo blocco `exception`, quindi una scheda malformata non porta
-- via le altre 499. Torna il conteggio per esito, che e' quello che serve a chi
-- guarda il workflow girare.
--
-- **`origine`, e il grezzo che non si conserva.** Ogni chiamata lascia una riga
-- in `pgm_sync_log`, e le righe del webhook conservano la scheda intera: e'
-- il motivo per cui si e' scoperto il nome di `enterDate`. Su 38 586 schede
-- quella scelta diventa una copia dell'anagrafica dentro il registro -- decine
-- di megabyte di dati personali che non servono a nessuno, contro la regola di
-- questo progetto sul non accumulare dati di terzi senza scopo. Quindi il
-- grezzo si conserva **solo per il webhook**: al riallineamento resta la riga
-- con l'esito, che e' il dato diagnostico, e `origine` dice quale strada era.
-- Per la stessa ragione il workflow non manda `grezzo` affatto: senza questa
-- riga finirebbe anche in `utenti.pgm_payload`, cioe' 38 586 schede intere
-- dentro la tabella che si voleva alleggerire.
--
-- **La `version` fa da freno da sola.** Chi e' gia' in pari -- le schede che il
-- webhook ha toccato oggi -- ha la stessa version, quindi esce come `duplicato`
-- senza riscrivere niente. Il riallineamento e' percio' **rieseguibile**: la
-- seconda passata costa le chiamate e non le scritture, e questa e' la
-- proprieta' che permette di rifarlo senza pensarci quando l'anagrafica cresce.

begin;

alter table public.pgm_sync_log
  add column if not exists origine text;

update public.pgm_sync_log set origine = 'webhook' where origine is null;

alter table public.pgm_sync_log
  alter column origine set default 'webhook';

comment on column public.pgm_sync_log.origine is
  'webhook | riallineamento. Quale strada ha chiamato la funzione. Il grezzo si conserva solo per `webhook`: al riallineamento sarebbe una copia dell''anagrafica dentro il registro.';

create index if not exists pgm_sync_log_origine_idx
  on public.pgm_sync_log (origine, ricevuto_il desc);

-- Un array di schede in una richiesta sola. Il timeout e' della funzione e non
-- del ruolo: 500 upsert in sequenza stanno sotto i due secondi misurati, ma il
-- limite di PostgREST e' otto e non e' il posto dove scoprirlo.
create or replace function public.pgm_aggiorna_utenti(p_righe jsonb)
returns jsonb language plpgsql
set search_path = public, pg_temp
set statement_timeout = '180s' as $fn$
declare
  v_riga   jsonb;
  v_ris    jsonb;
  v_esito  text;
  v_conti  jsonb := '{}'::jsonb;
  v_quante integer := 0;
begin
  if jsonb_typeof(p_righe) <> 'array' then
    return jsonb_build_object('quante', 0, 'esiti', '{}'::jsonb,
                              'errore', 'p_righe deve essere un array di schede');
  end if;

  for v_riga in select value from jsonb_array_elements(p_righe) loop
    v_quante := v_quante + 1;
    -- Un blocco per riga: `pgm_aggiorna_utente` non solleva mai per come e'
    -- scritta, ma questa e' la rete che tiene se un domani lo facesse -- una
    -- scheda storta non deve portarsi via il resto della pagina.
    begin
      v_ris := public.pgm_aggiorna_utente(v_riga);
      v_esito := coalesce(v_ris->>'esito', 'ignoto');
    exception when others then
      v_esito := 'errore';
    end;
    v_conti := jsonb_set(v_conti, array[v_esito],
                         to_jsonb(coalesce((v_conti->>v_esito)::integer, 0) + 1), true);
  end loop;

  return jsonb_build_object('quante', v_quante, 'esiti', v_conti);
end;
$fn$;

comment on function public.pgm_aggiorna_utenti(jsonb) is
  'Chiama pgm_aggiorna_utente su ogni elemento dell''array e torna il conteggio per esito. Esiste per il riallineamento: una pagina di 500 schede in una richiesta invece di 500. Ogni riga nel suo blocco exception, quindi una scheda storta non porta via la pagina.';

-- E la stessa funzione del webhook, con dentro le due righe che il
-- riallineamento chiede: `origine` nel registro, e il grezzo conservato solo per
-- il webhook. Tutto il resto e' identico a 20260827c -- l'ordine delle chiavi, la
-- guardia sulla version, il coalesce che non cancella, le colonne del contatto
-- che non si toccano.

create or replace function public.pgm_aggiorna_utente(p_dati jsonb)
returns jsonb language plpgsql set search_path = public, pg_temp as $fn$
declare
  -- `origine` e' una chiave di controllo e non un dato: non finisce in nessuna
  -- colonna di `utenti`. Serve a due cose -- dire nel registro quale strada ha
  -- chiamato, e decidere se conservare il grezzo. Assente vuol dire webhook,
  -- perche' e' la strada che c'era prima di questa riga.
  v_orig      text := coalesce(nullif(btrim(coalesce(p_dati->>'origine', '')), ''), 'webhook');
  v_log       jsonb := case when v_orig = 'webhook'
                            then coalesce(p_dati->'grezzo', p_dati) else null end;
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
    insert into public.pgm_sync_log (esito, motivo_scarto, payload, origine)
    values ('scartato-senza-chiave',
            'Il payload non porta ne'' member_id, ne'' numero_utente, ne'' email.',
            v_log, v_orig);
    return jsonb_build_object('esito', 'scartato-senza-chiave', 'utente_id', null);
  end if;

  -- L'ordine delle chiavi e' quello di forza, e la prima e' quella del
  -- gestionale: i bambini non hanno un'email, quindi l'email non puo' essere la
  -- chiave. Verificato sul dato vero -- il member 39122, quattordici anni, nessun
  -- indirizzo, agganciato al genitore 39088.
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

  -- Fuori ordine: un webhook piu' vecchio di quello gia' scritto non sovrascrive.
  if v_id is not null and v_version is not null and v_ver_riga is not null
     and v_version < v_ver_riga then
    insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload, origine)
    values (v_id, v_member, 'saltato-versione-vecchia',
            'version ' || v_version || ' < ' || v_ver_riga || ' gia'' in riga.',
            v_log, v_orig);
    return jsonb_build_object('esito', 'saltato-versione-vecchia', 'utente_id', v_id);
  end if;

  -- Duplicato: stessa version, quindi niente di nuovo sulla scheda. Riga leggera
  -- e senza grezzo. L'unica cosa che si aggiorna comunque e' l'ultima visita,
  -- perche' viene da un'altra entita' e a parita' di version puo' essere piu'
  -- fresca -- e solo in avanti.
  if v_id is not null and v_version is not null and v_ver_riga is not null
     and v_version = v_ver_riga then
    if v_visita is not null then
      update public.utenti u
         set pgm_ultima_visita = v_visita,
             pgm_sincronizzato_il = now()
       where u.id = v_id
         and (u.pgm_ultima_visita is null or v_visita > u.pgm_ultima_visita);
    end if;
    insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, origine)
    values (v_id, v_member, 'duplicato',
            'Stessa version (' || v_version || ') gia'' in riga: niente di nuovo sulla scheda.', v_orig);
    return jsonb_build_object('esito', 'duplicato', 'utente_id', v_id);
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

      insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, payload, origine)
      values (v_id, v_member, 'creato', v_log, v_orig);
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
        insert into public.pgm_sync_log (pgm_member_id, esito, motivo_scarto, payload, origine)
        values (v_member, 'errore',
                'Collisione su una chiave unica e riga non ritrovata dopo il conflitto.',
                v_log, v_orig);
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

  insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload, origine)
  values (v_id, v_member, v_esito,
          case when v_conflitto
               then 'L''email ' || coalesce(v_email, '(vuota)') ||
                    ' e'' gia'' di un''altra riga: tenuta la precedente, aggiornato il resto.'
               else null end,
          v_log, v_orig);

  return jsonb_build_object('esito', v_esito, 'utente_id', v_id);

exception when others then
  begin
    insert into public.pgm_sync_log (utente_id, pgm_member_id, esito, motivo_scarto, payload, origine)
    values (v_id, v_member, 'errore', left(coalesce(sqlerrm, 'errore senza messaggio'), 500),
            v_log, v_orig);
  exception when others then
    null;
  end;
  return jsonb_build_object('esito', 'errore', 'utente_id', v_id,
                            'motivo', left(coalesce(sqlerrm, ''), 500));
end;
$fn$;

comment on function public.pgm_aggiorna_utente(jsonb) is
  'Aggiorna `utenti` dal webhook «User Modified» di PerfectGym. Aggancia per pgm_member_id, poi numero utente, poi email -- in quest''ordine, perche'' i bambini non hanno un''email. Il dato del gestionale vince quando c''e'' e non cancella quando manca; salta le version piu'' vecchie (fuori ordine) e le version uguali (duplicati: PerfectGym ne manda quattro per modifica), tranne l''ultima visita, che viene da un''altra entita'' e puo'' essere piu'' fresca a parita'' di version. Non muove tocchi ne'' le colonne del contatto, perche'' un sync non e'' una persona che ci scrive. Non solleva mai: ogni errore diventa una riga in pgm_sync_log. La chiave `origine` non e'' un dato e non finisce in nessuna colonna: dice quale strada ha chiamato e, fuori dal webhook, tiene il grezzo fuori dal registro.';

comment on column public.pgm_sync_log.esito is
  'creato | aggiornato | duplicato | saltato-versione-vecchia | aggiornato-email-in-conflitto | scartato-senza-chiave | errore. `duplicato` non e'' un problema: PerfectGym manda quattro webhook per una modifica sola e i tre in piu'' non portano niente di nuovo -- quelle righe non conservano il grezzo, per non scrivere la stessa anagrafica quattro volte.';

commit;
