/**
 * Il programma «invita un amico», in un posto solo.
 *
 * Viene dal form `REFERRAL ATHLON` ospitato su n8n: sei pagine di form trigger,
 * due chiamate a PerfectGym, una riga su Airtable, un messaggio WhatsApp via
 * Spoki e una email. Le domande stavano dentro le pagine del modulo e i numeri
 * dentro l'HTML dei suoi campi, quindi per sapere quanto costa il pass o cosa
 * comprende bisognava aprire l'automazione. Adesso stanno qui.
 *
 * ## Le due regole, e da dove vengono
 *
 * **Chi invita deve essere socio.** Un guest o un lead non ha un abbonamento da
 * cui far partire un invito, e il voucher che riceve in premio si usa su un
 * abbonamento. Nel flusso vecchio era uno `Switch` su
 * `memberType contains 'Member'`.
 *
 * **Chi è invitato non deve essere socio.** Il pass è per chi non frequenta.
 * Chi ha già fatto una prova in passato — in PerfectGym è `Guest` — **può
 * riceverne un'altra**: confermato dal club, ed è quello che il flusso su n8n
 * fa oggi. Va detto perché il messaggio di rifiuto di quel flusso promette il
 * contrario — «è già stato nostro iscritto o ha già attivato una prova» — e
 * quel messaggio qui è stato riscritto per dire quello che il controllo fa
 * davvero.
 *
 * Le due domande le risponde `eSocio()` in `data/contatto.ts`, dai due lati.
 */

/** Dove finisce l'invito completo: Airtable, WhatsApp e la mail all'amico. */
export const WEBHOOK_REFERRAL = 'https://automazione.n8ndevelop.it/webhook/athlon-referral';

/**
 * Il pass che l'amico riceve, e non è il Guest Pass del listino.
 *
 * Sul sito il Guest Pass costa €19 con il codice `GOLD7`. Questo costa €5 — il
 * solo badge di accesso — e ha un codice suo. **Sono due offerte diverse con lo
 * stesso nome**, e i €14 di differenza sono esattamente il valore dell'invito:
 * è il motivo per cui questa pagina esiste. Tenere qui il prezzo e il codice
 * separati da quelli di `abbonamenti.ts` è deliberato, non una duplicazione da
 * accorpare: il giorno che il club cambia il listino del Guest Pass, questo non
 * deve seguirlo per errore.
 */
export const PASS = {
  giorni: 7,
  /** Quello che l'amico paga: il badge di accesso, una volta sola. */
  prezzo: '5',
  codice: 'REFATHLON',
  /** Il listino, per dire quanto vale l'invito. */
  prezzoPieno: '19',
} as const;

/** Il premio a chi invita, quando l'amico si iscrive. */
export const VOUCHER = {
  valore: '50',
  /** Cosa si può farne. Non è un rimborso in denaro. */
  uso: 'sul tuo abbonamento',
} as const;

/**
 * Cosa comprende il pass. Le stesse sette voci del form vecchio, che è il
 * palinsesto Premium: il pass apre tutto il club, non una parte.
 */
export const COMPRESO = [
  'Gym Floor',
  'Corsi Fitness',
  'Aqua Fitness',
  'Nuoto Libero Assistito',
  'Scuola Nuoto Adulti',
  'Corso Gestanti',
  'Group Reformer',
] as const;

/**
 * La liberatoria, parola per parola dal form vecchio.
 *
 * **Non si riscrive per farla più breve.** Qui chi invita dichiara di avere
 * l'autorizzazione a comunicare i dati di un'altra persona, e quella
 * dichiarazione è la base giuridica del trattamento: è il testo che il club ha
 * scelto, e ritoccarlo per ragioni di stile cambia cosa la persona ha
 * dichiarato. L'unica modifica rispetto all'originale è il link, che nel form
 * n8n era scritto per esteso e qui è un'ancora alla pagina del sito.
 */
export const LIBERATORIA =
  'Proseguendo con l’invio del modulo dichiaro di aver informato la persona segnalata e di ' +
  'essere autorizzato/a a comunicarne i dati a Point 2000 S.S.D. a r.l. ai fini del programma ' +
  '“Referral”. Confermo che la persona segnalata è maggiorenne o che, in caso di minore, ' +
  'dispongo dell’autorizzazione del genitore/tutore. Prendo atto che Point 2000 S.S.D. a r.l. ' +
  'utilizzerà i dati esclusivamente per un primo contatto informativo e per la gestione del ' +
  'programma “Referral”, nel rispetto dell’informativa privacy. L’utente segnalante manleva ' +
  'Point 2000 S.S.D. a r.l. da qualsiasi responsabilità derivante dalla comunicazione di dati ' +
  'effettuata senza idonea autorizzazione.';

/**
 * Come arriva l'invito all'amico. Due canali, e si dicono entrambi nella
 * schermata finale: chi invita vuole sapere che è partito davvero, e «gli
 * abbiamo scritto» senza dire dove non è una conferma.
 */
export const CANALI = ['email', 'WhatsApp'] as const;
