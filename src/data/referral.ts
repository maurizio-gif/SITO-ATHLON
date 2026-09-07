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
 * **Chi è invitato dev'essere nuovo davvero**, ed è la regola che il 07/09/2026
 * ha cambiato verso. Prima diceva che chi aveva già fatto una prova — in
 * PerfectGym un `Guest` — poteva riceverne un'altra, «confermato dal club»:
 * adesso il club dice il contrario, e l'amico non deve aver **mai** avuto un
 * Guest Pass ne' un abbonamento Athlon da `GUEST_PASS.dal`. E' lo stesso
 * perimetro del Guest Pass di listino, portato sull'invito: due porte per la
 * stessa prima settimana non possono avere due soglie diverse.
 *
 * **Il controllo automatico e' piu' largo di questa regola, e va saputo.**
 * `Amico e socio?` su n8n guarda un campo solo — `memberType`, e scarta i
 * `Member` — perche' «ha gia' avuto un Guest Pass» e «ha avuto un abbonamento
 * dal 2021» non stanno in quel campo: stanno nei contratti, che quel flusso non
 * legge. Quindi la condizione e' **dichiarata**, come lo e' gia' quella del
 * Guest Pass di listino, e chi la verifica davvero e' il desk. Il verso in cui
 * si sbaglia e' scelto: un invito di troppo si riconcilia, un amico idoneo
 * rifiutato da un controllo approssimativo non torna.
 *
 * La domanda su chi invita la risponde `eSocio()` in `data/contatto.ts`.
 */

import { GUEST_PASS } from './abbonamenti';

/**
 * Quanti amici si possono invitare in una volta.
 *
 * Tre, e il numero sta qui perché lo dicono in quattro posti: la landing, i tre
 * blocchi del modulo, l'etichetta del pulsante e il conteggio nel client. Uno
 * era il flusso vecchio, e costringeva a rifare tutto il percorso per il secondo
 * amico — chi ne ha due in mente ne invita uno. Illimitati sarebbero una lista
 * di indirizzi comprati, non amici: il programma vive sul fatto che chi invita
 * conosce chi riceve.
 *
 * Non è un tetto sulla vita del socio: finito un invito se ne può fare un altro.
 */
export const AMICI = 3;

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
 * C'è un premio anche per l'amico, se dopo la prova si iscrive — ed è per
 * questo che non è un numero come `VOUCHER`.
 *
 * È concreto: non paga la quota di attivazione, gli stessi €50 del voucher
 * di chi lo ha invitato. Ma il club non lo vuole rivelare a chi sta ancora
 * decidendo se provare — lo comunica lo staff a fine settimana, quando
 * richiama per sapere com'è andata, non il sito né la chat. Quindi qui non
 * c'è una cifra da esportare: solo questa frase, generica di proposito, che
 * va usata così com'è nei testi pubblici e nella scheda che alimenta la
 * chat — mai completata con «cioè» o con un importo. Il giorno che il club
 * decide di dirlo subito, il vantaggio si trasforma in un secondo `VOUCHER`
 * con un valore vero, e questa frase si toglie da tutti i posti dove è
 * scritta a mano (non solo qui: `content/servizi/invita-i-tuoi-amici.md` e
 * `content/articles/generali/referral-guest-pass.md` non possono importare
 * questo modulo, quindi la ripetono in chiaro).
 *
 * **Le condizioni invece si dicono, e sono le sole cose di questo vantaggio che
 * si dichiarano prima.** Sono due e vanno insieme: iscriversi **entro la
 * scadenza del pass**, e far partire l'abbonamento **dal giorno dopo** quella
 * scadenza — la settimana di prova e il primo mese si toccano, senza un giorno
 * di buco in mezzo. Tacere *cosa* e' il vantaggio resta la scelta del club;
 * tacere *come si ottiene* sarebbe un'altra cosa: e' un'offerta che si perde
 * facendo una cosa ragionevole, cioe' aspettare qualche giorno prima di
 * iscriversi, e chi la perde lo scopre quando non c'e' piu'.
 *
 * **La seconda condizione e' quella che si dimentica**, ed e' la ragione per
 * cui non basta dire «entro la scadenza»: la data di inizio dell'abbonamento
 * si sceglie durante l'iscrizione (vedi `DATA_INIZIO`), quindi e' una cosa che
 * la persona fa, non una che le capita. Detta a meta', il vantaggio si perde
 * con l'iscrizione fatta nei tempi giusti.
 */
export const VANTAGGIO_AMICO =
  'ci sarà un vantaggio anche per lui, a due condizioni: che si iscriva entro la ' +
  'scadenza del pass e che faccia partire l’abbonamento dal giorno dopo, senza ' +
  'buchi. Glielo dice lo staff quando lo richiama per sapere com’è andata';

/**
 * Chi puo' ricevere l'invito, in una frase sola e in un posto solo.
 *
 * Stava scritta a mano in tre punti — la landing, la scheda del servizio, il
 * markdown del wiki — e quando la regola e' cambiata quei tre punti dicevano
 * ancora la versione vecchia. Adesso la landing e il modal la leggono da qui;
 * i due markdown non possono importare TypeScript e restano copie dichiarate,
 * come per `VANTAGGIO_AMICO`.
 *
 * L'anno si legge da `GUEST_PASS.dal` e non si riscrive: e' lo stesso
 * perimetro del Pass di listino, e il giorno che il club lo sposta si sposta
 * una volta sola.
 */
export const IDONEITA_AMICO =
  'chi inviti non deve avere un abbonamento in corso né aver già avuto un Guest ' +
  `Pass o un abbonamento Athlon dal ${GUEST_PASS.dal}: il pass è la prima settimana ` +
  'di chi il club non lo conosce';

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
