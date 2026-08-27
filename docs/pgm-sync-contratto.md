# Il sync PerfectGym → Supabase: il contratto

Il workflow n8n **`ATHLON: User Modified > SPOKI - SuperAgent`** riceve il webhook
`User Modified` di PerfectGym per parlare a Spoki. Da qui in poi scrive anche su
Supabase, chiamando `pgm_aggiorna_utente(jsonb)` — definita in
`supabase/migrations/20260827_pgm_sync_utente.sql`, che è dove sta il perché di
ogni scelta.

Questo file è la sola cosa che tiene insieme i due lati, perché **il workflow non
sta in questo repository**: se il mapping qui sotto e il Code node divergono, non
lo dice nessun errore — si vede da una colonna che resta vuota.

## Perché le chiavi sono le nostre e non quelle di PerfectGym

I nomi dei campi di PerfectGym cambiano fra l'export CSV, l'OData e il webhook:
lo stesso tipo utente è `Membro` nell'export e `Member` nell'API. Se la funzione
Postgres parlasse la loro lingua, ogni cambio del gestionale sarebbe una
migrazione del database. Così è un Code node da riscrivere.

**Il ramo Supabase va in parallelo a quello Spoki, non prima.** Vale la regola di
`athlon-contatto-compilato`: un nodo che scrive non deve poter fermare il resto
del workflow. La funzione non solleva mai — ogni errore diventa una riga in
`pgm_sync_log` — ma il parallelo è la seconda rete.

## Le chiavi che la funzione legge

Tutte facoltative, tranne che **almeno una fra `member_id`, `numero_utente` e
`email` deve esserci**: senza, non c'è niente da agganciare e la chiamata finisce
in `pgm_sync_log` come `scartato-senza-chiave`.

| chiave | colonna | note |
| --- | --- | --- |
| `member_id` | `pgm_member_id` | la chiave di aggancio più forte |
| `numero_utente` | `pgm_numero_utente` | seconda |
| `email` | `email` | terza. **Sovrascrive**: vedi il paragrafo in fondo |
| `nome`, `cognome` | `nome`, `cognome` | |
| `telefono` | `telefono` | E.164 se possibile; `telefono_norm` è calcolata |
| `member_type` | `pgm_member_type` | normalizzato a `Member` / `Guest` / `Lead` |
| `stato` | `pgm_stato` | normalizzato a `lead`/`guest`/`member`/`ex-member` |
| `stato_abbonamento` | `pgm_stato_abbonamento` | come lo scrive PerfectGym |
| `registrato_il` | `pgm_registrato_il` | |
| `data_nascita` | `data_nascita` | |
| `codice_fiscale` | `codice_fiscale` | |
| `citta`, `indirizzo`, `cap`, `paese` | `citta`, `pgm_indirizzo`, `pgm_cap`, `pgm_paese` | |
| `ultima_visita` | `pgm_ultima_visita` | il dato per cui il sync esiste |
| `consulente` | `pgm_consulente` | |
| `sesso` | `pgm_sesso` | |
| `figli` | `pgm_figli` | accetta anche `"2,00"` |
| `nucleo` | `pgm_nucleo` | |
| `fonte` | `pgm_fonte` | **non** `prima_fonte`/`ultima_fonte` |
| `consenso_biometrico` | `pgm_consenso_biometrico` | accetta `Sì`/`No` |
| `raccomandato_da` | `pgm_raccomandato_da` | |
| `piva` | `pgm_piva` | |
| `grezzo` | — | il payload originale, va nel log così com'è |

Tre regole che il Code node non deve rompere.

**Un campo assente non è un campo svuotato.** Non mandare una chiave, o mandarla
vuota, lascia la colonna com'era. Quindi un webhook parziale non fa danni — ma
significa anche che **per svuotare un campo non basta ometterlo**: oggi non c'è
modo di cancellare un dato dal sync, ed è deliberato.

**`stato` si può omettere.** Se manca o non è uno dei quattro valori ammessi, la
funzione lo deriva da `member_type` più `stato_abbonamento`: Lead → `lead`,
Guest → `guest`, Member → `member`, e Member con abbonamento terminato →
`ex-member`. Quella derivazione è un'ipotesi sui valori di PerfectGym e va
corretta il giorno che si legge il payload vero.

**`tocchi`, `primo_contatto`, `ultimo_contatto`, `prima_fonte` e `ultima_fonte`
non si toccano**, e la funzione non le nomina affatto: contano quante volte una
*persona* ha lasciato un dato al sito, e un'anagrafica modificata dal desk non è
la persona. Il sync ha `pgm_sincronizzato_il`.

## Il Code node

Da mettere fra il webhook e il nodo Supabase. **I nomi a destra sono da
verificare sul payload vero**: qui ci sono i più probabili con i loro ripieghi,
non un contratto con PerfectGym.

```js
// PerfectGym → le chiavi di pgm_aggiorna_utente(jsonb).
// Un valore assente resta assente: la funzione non cancella ciò che non riceve.
const out = [];

for (const item of $input.all()) {
  const u = item.json.user ?? item.json.data ?? item.json;

  const v = (...chiavi) => {
    for (const k of chiavi) {
      const x = k.split('.').reduce((o, p) => (o == null ? o : o[p]), u);
      if (x !== undefined && x !== null && String(x).trim() !== '') return String(x).trim();
    }
    return undefined;
  };

  const dati = {
    member_id:           v('id', 'userId', 'memberId', 'Id'),
    numero_utente:       v('number', 'userNumber', 'memberNumber'),
    email:               v('email', 'emailAddress', 'Email'),
    nome:                v('firstName', 'name', 'FirstName'),
    cognome:             v('lastName', 'surname', 'LastName'),
    telefono:            v('phoneNumber', 'cellPhone', 'mobilePhone', 'phone'),
    member_type:         v('memberType', 'userType', 'type'),
    stato:               v('status', 'userStatus'),
    stato_abbonamento:   v('contractStatus', 'membershipStatus', 'subscriptionStatus'),
    registrato_il:       v('registrationDate', 'createdAt', 'creationDate'),
    data_nascita:        v('birthDate', 'dateOfBirth'),
    codice_fiscale:      v('personalId', 'fiscalCode', 'taxNumber'),
    citta:               v('homeAddress.city', 'address.city', 'city'),
    indirizzo:           v('homeAddress.street', 'address.street', 'street'),
    cap:                 v('homeAddress.zipCode', 'address.zipCode', 'zipCode'),
    paese:               v('homeAddress.country', 'address.country', 'country'),
    ultima_visita:       v('lastVisitDate', 'lastEntrance', 'lastVisit'),
    consulente:          v('consultant', 'salesPerson', 'assignedTo'),
    sesso:               v('gender', 'sex'),
    figli:               v('childrenCount', 'children'),
    nucleo:              v('familyList', 'family'),
    fonte:               v('source', 'leadSource'),
    consenso_biometrico: v('biometricConsent', 'biometricsAgreement'),
    raccomandato_da:     v('recommendedBy', 'referredBy'),
    piva:                v('vatNumber', 'taxId'),
    grezzo:              u,
  };

  // Le chiavi non valorizzate si togliono: mandarle vuote e non mandarle e' la
  // stessa cosa per la funzione, ma un payload pulito si legge nel log.
  for (const k of Object.keys(dati)) if (dati[k] === undefined) delete dati[k];

  if (!dati.member_id && !dati.numero_utente && !dati.email) {
    // Si manda comunque: la funzione lo registra come scartato-senza-chiave, e
    // uno scarto contato e' l'unico modo di accorgersi che il mapping e' rotto.
    dati.grezzo = u;
  }

  out.push({ json: { dati } });
}

return out;
```

Il nodo Supabase che segue è una **RPC** su `pgm_aggiorna_utente` con
`{ "p_dati": {{ JSON.stringify($json.dati) }} }`, e va con
`onError: continueRegularOutput` e `retryOnFail`, come gli altri nodi che
scrivono.

## Come si verifica

```sql
select * from pgm_sync_esiti;     -- quante chiamate per esito
select * from pgm_freschezza;     -- quanta anagrafica il sync ha toccato
```

`pgm_sync_esiti` è il primo posto da guardare. Se `scartato-senza-chiave` cresce,
il mapping del Code node ha perso una chiave; se cresce `errore`, il
`motivo_scarto` porta il messaggio di Postgres.

`pgm_freschezza` risponde alla domanda che resta aperta per costruzione: **«User
Modified» non arriva per chi nessuno modifica.** Il sync tiene fresco chi si
muove, non tutti — l'anagrafica di chi non viene toccato resta a quel giorno.
Coprire anche loro vuole un secondo giro periodico sull'OData, che non è questo
lavoro.
