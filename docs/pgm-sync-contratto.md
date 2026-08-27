# Il sync PerfectGym → Supabase: il contratto

Il workflow n8n **`ATHLON: User Modified > SPOKI - SuperAgent`**
(`yNCKG3tXTPC8NmSj`) riceve il webhook `User Modified` di PerfectGym per parlare
a Spoki. Da settembre 2026 scrive anche su Supabase, chiamando
`pgm_aggiorna_utente(jsonb)` — definita in
`supabase/migrations/20260827_pgm_sync_utente.sql` e
`20260827b_pgm_sync_campi_reali.sql`, dove sta il perché di ogni scelta.

Questo file è la sola cosa che tiene insieme i due lati, perché **il workflow non
sta in questo repository**: se il mapping qui sotto e il Code node divergono, non
lo dice nessun errore — si vede da una colonna che resta vuota.

## Com'è fatto il ramo

```
Webhook ─ GET MEMBER ─ Solo Scadenza Certificato ─ GET CONTRACTS ─ GET Agreements ─ GET Access ─┬─ CONTATTO A SPOKI
                                                                                                └─ Prepara Supabase ─ Supabase utenti
```

**In parallelo a Spoki e dopo `GET Access`**, e le due cose sono deliberate.
Dopo, perché a quel punto tutte e quattro le chiamate OData sono state fatte e i
dati sono in mano. In parallelo, e **secondo nell'array delle connessioni**,
perché Spoki deve partire per primo e non deve poter essere fermato: i due nodi
nuovi portano `onError: continueRegularOutput`, l'HTTP anche `neverError` e
`retryOnFail` (3 tentativi, 1 s). Vale la regola dei form — perdere una riga è
brutto, impedire un WhatsApp è peggio.

Il webhook risponde subito («Workflow got started»), quindi il ramo in più non
costa latenza a nessuno.

## Dove stanno i dati (e non è dove sembra)

**Il webhook è povero.** Payload vero, da un'esecuzione reale:

```json
{"event":"UserModified","triggeredDate":"2026-08-27T15:40:30Z",
 "data":{"modificationType":"Updated","userId":39120,
   "user":{"userId":39120,"userNumber":"101025828",
           "userFirstName":"…","userLastName":"…","userPhone":"+39…",
           "userEmail":null,"birthDate":"2023-10-01"},
   "homeClubId":1,"userType":"Guest"}}
```

Due cose da sapere: `userType` arriva **in inglese** (`Guest`), come il sito, non
come l'export CSV che diceva `Ospite`; e `userEmail` **può essere null** — nel
payload sopra lo è, perché è un bambino del 2023 e i bambini non hanno un
indirizzo.

**I dati ricchi li prende `GET MEMBER`** dall'OData, con
`$expand=customAttributes,contracts,memberBalance,familyParents,familyChildren`:

```
firstName secondName lastName number phoneNumber email personalId sex birthdate
consultantId referralCode memberType isActive isDeleted isForeigner
isPaymentInProgress emailVerificationStatus phoneNumberVerificationStatus
citizenshipId homeClubId createdDate version id
+ customAttributes[] contracts[] memberBalance{} familyParents[] familyChildren[]
```

Attenzione a due differenze di forma che sono trappole: il webhook scrive
`birthDate`, l'OData `birthdate` (minuscola); e i nomi sono `userFirstName` da
una parte, `firstName` dall'altra. Il Code node unisce i due vocabolari, con
`GET MEMBER` che ha la precedenza perché è la fonte più completa.

**Cosa il webhook non porta, e va saputo:** nessun campo di indirizzo esiste su
quell'entità. `citta`, `pgm_indirizzo`, `pgm_cap`, `pgm_paese`, `pgm_fonte`,
`pgm_piva` e `pgm_raccomandato_da` restano popolati solo dall'import CSV del
24/08/2026 e da questa strada non si aggiornano. Aggiornarli vuole un'altra
chiamata, che non è in questo lavoro.

## La chiave è `userId`, e il motivo sta nei bambini

L'aggancio prova tre chiavi, in quest'ordine di forza:

1. **`pgm_member_id`** (= `userId` di PerfectGym) — sempre per prima
2. `pgm_numero_utente`
3. `email_norm` — per ultima

**L'email non può essere la chiave, e il dato reale lo dimostra.** Il member
39122 è un ragazzo del 2012 con `email: null`, legato all'account del genitore
(39088): se la deduplica passasse dall'indirizzo, quella persona non sarebbe
agganciabile affatto. Con `userId` viene creata, riconosciuta e aggiornata come
tutte le altre. È la stessa regola già scritta in `CLAUDE.md` — «lo dice il
gestionale, non chi compila».

Il nucleo si tiene **sul figlio**, non sul genitore: `familyParents[0].id` va in
`pgm_genitore_member_id` e l'uuid risolto in `genitore_id`. Una riga, una chiave
esterna. Il verso opposto non ha bisogno di una colonna — i figli di una persona
sono `where genitore_id = <lei>`; `pgm_figli` è solo il conteggio che PerfectGym
dichiara, utile per accorgersi di un nucleo incompleto.

E l'upsert su quella chiave fa il suo lavoro: i **quattro** webhook che PerfectGym
manda per una modifica sola producono **una** riga in `utenti`. Le quattro righe
stanno in `pgm_sync_log`, che è un registro di chiamate e non un'anagrafica —
vedi la sezione sui duplicati.

## Le chiavi che la funzione legge

Almeno una fra `member_id`, `numero_utente` e `email` deve esserci: senza, la
chiamata finisce in `pgm_sync_log` come `scartato-senza-chiave`.

| chiave | da | colonna |
| --- | --- | --- |
| `member_id` | `m.id` → `u.userId` | `pgm_member_id` |
| `numero_utente` | `m.number` → `u.userNumber` | `pgm_numero_utente` |
| `email` | `m.email` → `u.userEmail` | `email` |
| `nome`, `cognome` | `m.firstName`/`lastName` → `u.userFirstName`/`userLastName` | `nome`, `cognome` |
| `secondo_nome` | `m.secondName` | `pgm_secondo_nome` |
| `telefono` | `m.phoneNumber` → `u.userPhone` | `telefono` |
| `member_type` | `m.memberType` → `d.userType` | `pgm_member_type` (normalizzato) |
| `stato_abbonamento` | `contratto.status` | `pgm_stato_abbonamento` |
| `data_nascita` | `m.birthdate` → `u.birthDate` | `data_nascita` |
| `registrato_il` | `m.createdDate` | `pgm_registrato_il` |
| `codice_fiscale` | `m.personalId` | `codice_fiscale` |
| `sesso` | `m.sex` | `pgm_sesso` |
| `version` | `m.version` | `pgm_version` |
| `attivo`, `cancellato`, `straniero` | `m.isActive`, `isDeleted`, `isForeigner` | `pgm_attivo`, `pgm_cancellato`, `pgm_straniero` |
| `consulente_id` | `m.consultantId` | `pgm_consulente_id` |
| `codice_referral` | `m.referralCode` | `pgm_codice_referral` |
| `club_id` | `m.homeClubId` → `d.homeClubId` | `pgm_club_id` |
| `email_verificata`, `telefono_verificato` | i due `…VerificationStatus` | omonime |
| `saldo`, `saldo_negativo_da` | `m.memberBalance.*` | `pgm_saldo`, `pgm_saldo_negativo_da` |
| `figli` | `m.familyChildren.length` | `pgm_figli` |
| `genitore_member_id` | `m.familyParents[0].id` | `pgm_genitore_member_id` (+ `genitore_id` risolto) |
| `consensi` | `MemberAgreementAnswers` → `{"1": true}` | `pgm_consensi` |
| `ultima_visita` | `MemberClubVisits[0].enterDate` | `pgm_ultima_visita` |
| `grezzo` | webhook + scheda + visita | va nel log e in `pgm_payload` |

Quattro regole che il Code node non deve rompere.

**Un campo assente non è un campo svuotato.** Non mandare una chiave lascia la
colonna com'era. Quindi un webhook parziale non fa danni — ma **per svuotare un
campo non basta ometterlo**: dal sync non si cancella, ed è deliberato.

**`stato` si può omettere.** Se manca, la funzione lo deriva da `member_type` +
`stato_abbonamento` per rispettare `utenti_pgm_stato_check` (`lead | guest |
member | ex-member`). Quella derivazione è un'ipotesi: va corretta il giorno che
si vede un contratto con uno stato fuori dall'elenco.

**`tocchi`, `primo_contatto`, `ultimo_contatto`, `prima_fonte` e `ultima_fonte`
non si toccano**, e la funzione non le nomina affatto — verificato su
`pg_get_functiondef`. Contano quante volte una *persona* ha lasciato un dato al
sito; un'anagrafica modificata dal desk non è la persona.

**`version` è la guardia sull'ordine.** Misurato: quattro webhook nello stesso
secondo. Un aggiornamento con `version` minore di quella già in riga viene
saltato e registrato come `saltato-versione-vecchia`.

## I duplicati: quattro webhook per una modifica

Misurato: alle 16:50:36 sono arrivate **quattro chiamate per lo stesso member in
240 ms, tutte con la stessa `version`**. Non era una modifica ripetuta quattro
volte — era una modifica notificata quattro volte.

L'anagrafica era giusta (una riga sola), ma il registro pesava quattro volte
tanto: ogni riga conserva il grezzo, cioè la scheda intera, quindi la stessa
persona finiva scritta quattro volte per una modifica. A regime sono centinaia di
copie al giorno di dati personali che non servono a nessuno.

**La `version` uguale è il segnale che non c'è niente di nuovo.** Se il gestionale
dice «questa scheda è alla versione X» e X è quella che abbiamo già, l'update
riscriverebbe gli stessi valori. Quindi si salta, e si registra una riga leggera
con esito `duplicato` e **senza grezzo**: il conteggio resta — sapere che ne
arrivano quattro è diagnostico, e il giorno che diventassero otto si vede — il
peso no.

**Con un'eccezione, e non è un dettaglio.** `Members.version` non cambia quando
qualcuno entra in palestra: l'ultima visita viene da `MemberClubVisits`, un'altra
entità. Quindi a parità di version quel campo **può essere più fresco**, ed è il
solo che si aggiorna anche su un duplicato — e solo in avanti. Senza questa
eccezione la deduplica avrebbe fatto perdere gli accessi al club, cioè
esattamente il dato per cui il sync esiste.

## `enterDate`, e come si è trovato

`MemberClubVisits` ha questa forma — letta dal `grezzo` di un'esecuzione vera,
non dalla documentazione:

```json
{"id":1008055,"clubId":1,"version":67294516,"memberId":4782,"isDeleted":false,
 "readerName":"NUOTO","enterDate":"2026-05-27T14:16:19+02:00",
 "leaveDate":"2026-05-28T02:31:19+02:00"}
```

Il campo è **`enterDate`**. La prima stesura del Code node provava sette nomi
plausibili — fra cui `entranceDate`, sbagliato di due lettere — e quindi la
colonna restava vuota **senza dare errore**, che è il modo peggiore di sbagliare:
un sync che scrive tutto tranne un campo sembra un sync che funziona.

Il nome vero si è letto da `pgm_sync_log.payload->'visita'`, che sta lì
esattamente per questo. È il motivo per cui il grezzo si conserva:

```sql
select payload->'visita' from pgm_sync_log
 where payload->'visita' <> '{}'::jsonb
 order by ricevuto_il desc limit 5;
```

Quando il nome giusto si è saputo, il dato già ricevuto **non si è aspettato dal
prossimo webhook**: si è recuperato dal log, che è la seconda ragione per cui il
grezzo esiste.

```sql
update public.utenti u
   set pgm_ultima_visita = public.pgm_a_timestamp(l.payload->'visita'->>'enterDate')
  from public.pgm_sync_log l
 where l.utente_id = u.id
   and l.payload->'visita'->>'enterDate' is not null
   and u.pgm_ultima_visita is null;
```

`leaveDate` e `readerName` (il tornello: `NUOTO`, …) arrivano nella stessa
risposta e oggi non hanno una colonna. Restano nel grezzo: il giorno che servono
si promuovono da lì, senza chiedere niente a PerfectGym.

## Come si verifica

```sql
select * from pgm_sync_esiti;   -- quante chiamate per esito, con l'ultima
select * from pgm_freschezza;   -- quanta anagrafica il sync ha toccato
```

Gli esiti possibili: `creato`, `aggiornato`, `duplicato`, `saltato-versione-vecchia`, `aggiornato-email-in-conflitto`, `scartato-senza-chiave`, `errore`.

`pgm_sync_esiti` è il primo posto da guardare. `scartato-senza-chiave` che cresce
= il mapping ha perso una chiave; `errore` che cresce = il `motivo_scarto` porta
il messaggio di Postgres.

E un limite per costruzione: **«User Modified» non arriva per chi nessuno
modifica.** Il sync tiene fresco chi si muove, non tutti; `pgm_freschezza`
misura quanti restano fermi all'import. Coprire anche loro vuole un giro
periodico sull'OData, che non è questo lavoro.

## Sulle bozze n8n

`update_workflow` **non pubblica**: crea una versione e la lascia lì. Le
esecuzioni manuali girano la bozza, il webhook di produzione la versione attiva —
quindi si può provare un nodo, vederlo scrivere, ed essere convinti che sia vivo
mentre non lo è. Dopo ogni modifica va chiamato `publish_workflow`, e il
controllo è `versionId == activeVersionId` in `get_workflow_details`.

E prima di pubblicare va confrontata `activeVersion.nodes` con `nodes`: le
versioni sono istantanee, non diff, quindi pubblicare la propria modifica
pubblica anche le bozze di chi è passato prima.
