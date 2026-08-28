/**
 * L'appuntamento telefonico prenotabile dal sito, in un posto solo.
 *
 * Sostituisce Calendly per il richiamo: gli orari non li decide più un
 * servizio esterno, li serve il pannello — che è l'unico posto che sa cosa c'è
 * già in agenda. Gli eventi Calendly restano in `data/calendly.ts` finché il
 * passaggio non è completo.
 *
 * Il sito è statico e non ha chiavi: come per n8n, questi sono indirizzi
 * pubblici che rispondono senza autenticazione. Quello degli slot restituisce
 * soltanto orari — che sono già pubblici per chiunque apra il form — e quello
 * della presa accetta una prenotazione per volta, con un tetto giornaliero per
 * indirizzo.
 */

/** Il pannello, che è dove vive l'agenda. */
const CRM = 'https://crm.athlonroma.it';

/** Gli orari ancora liberi nei prossimi sette giorni. */
export const API_SLOT = `${CRM}/api/prenotazioni/slot`;

/** La presa dell'appuntamento: occupa lo slot e lo scrive in agenda. */
export const API_PRENOTA = `${CRM}/api/prenotazioni`;

/**
 * Il webhook che crea il lead su PerfectGym.
 *
 * È lo stesso dei contatti, e non uno nuovo: per n8n una richiesta di
 * richiamo è una richiesta di contatto con un appuntamento già preso, e
 * duplicare il workflow avrebbe voluto dire due posti in cui aggiornare le
 * regole di PerfectGym. Il payload porta `tipoRichiesta: 'appuntamento'` e i
 * campi dell'appuntamento, così di là si riconosce.
 */
export { WEBHOOK_CONTATTO as WEBHOOK_APPUNTAMENTO, WEBHOOK_VERIFICA } from './contatto';

/**
 * Di cosa si parla: obbligatorio, ed è la ragione per cui la chiamata serve a
 * qualcosa. Una telefonata senza sapere l'argomento è tempo buttato per tutti
 * e due.
 *
 * La durata dello slot non si dice a chi prenota, ed è una scelta: dichiarare
 * «dieci minuti» trasforma una conversazione in un cronometro, e chi ha una
 * domanda lunga rinuncia a farla. La durata la sa il pannello, che è quello
 * che deve incastrare gli appuntamenti.
 */
export const ETICHETTA_OGGETTO = 'Di cosa vuoi parlare?';

export const AIUTO_OGGETTO =
  'Bastano poche parole: abbonamenti, scuola nuoto per un figlio, orari di una attività…';

/** I titoli delle due fasce, per raggruppare gli orari senza elencarli tutti di fila. */
export const ETICHETTE_FASCIA = {
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
} as const;
