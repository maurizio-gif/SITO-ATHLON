/**
 * L'appuntamento telefonico col Direttore Tecnico del nuoto, in un posto solo.
 *
 * Sostituisce l'evento Calendly `athlonclub/nuoto2`, che stava incollato a mano
 * in fondo a tre schede dell'Help Desk — `direzione-tecnica.md`,
 * `didattica.md`, `brevetti.md`. Da fuori è lo stesso calendario del richiamo
 * del desk (`data/appuntamento.ts`): stesso modulo, stessa conferma, stesso
 * promemoria, stesso pulsante «sposta o annulla». Da dentro è un'altra
 * risorsa — il tempo di una persona sola, un'ora al giorno — quindi gli orari
 * li serve un'altra rotta e li scrive un'altra tabella.
 *
 * **I due calendari non si contendono niente**, ed è la ragione per cui esiste
 * questo file invece di un parametro sull'altro: una telefonata del desk alle
 * 15:20 non tocca il Direttore Tecnico, e un tour di quarantacinque minuti non
 * gli chiude l'ora. Sono due agende, come sono due persone.
 */
import { CRM } from './appuntamento';

/** Gli orari ancora liberi del Direttore Tecnico, nei prossimi sette giorni. */
export const API_SLOT_NUOTO = `${CRM}/api/appuntamenti-nuoto/slot`;

/**
 * La presa dell'appuntamento: occupa lo slot, verifica la famiglia su
 * PerfectGym e manda le due email.
 *
 * **Le email non le chiama il sito**, al contrario dell'appuntamento del desk,
 * e non è un'incoerenza da sanare: metà di ciò che quell'email dice — se questa
 * famiglia risulta iscritta, a quale corso, se il bambino è stato agganciato
 * alla sua scheda — nasce *dentro* quella rotta, dopo la prenotazione. Farlo
 * tornare al browser perché lo rigiri a n8n vorrebbe dire far decidere al
 * client cosa si scrive a nuoto@athlonroma.it.
 */
export const API_PRENOTA_NUOTO = `${CRM}/api/appuntamenti-nuoto`;

/** La verifica dell'email: la stessa degli altri form, per non far ridigitare i dati. */
export { WEBHOOK_VERIFICA } from './contatto';

/**
 * Chi può usare questo calendario, detto in pagina prima di qualunque campo.
 *
 * È un servizio **riservato**, e dirlo è la prima cosa che il modulo deve
 * fare: chi non è iscritto e prenota comunque occupa dieci minuti di un'ora che
 * al club serve per le famiglie che ci sono già, e se ne accorge al telefono —
 * che è il momento peggiore.
 *
 * Non è un cancello, però, ed è la scelta dichiarata: il modulo non blocca
 * nessuno. Vale la regola di tutti i form del sito — un appuntamento da
 * riconciliare costa meno di una famiglia iscritta respinta perché il nome del
 * bambino su PerfectGym è scritto in un altro modo, o perché è agganciato
 * all'altro genitore. La verifica la fa il pannello e serve a chi risponde,
 * non a chi chiede.
 */
export const RISERVATO =
  'Il servizio è riservato agli iscritti Athlon: puoi prenotare se tuo figlio è già iscritto a un corso di Scuola Nuoto Bambini, Nuoto Agonistico o Pallanuoto.';

/** Come si presenta il calendario, sopra i giorni. */
export const TITOLO_QUANDO = 'Quando ti chiamiamo?';

export const AIUTO_QUANDO =
  'Il Direttore Tecnico riceve al telefono dal lunedì al venerdì, nel primo pomeriggio. Scegli tu il momento: ti chiamiamo noi.';

/** Il passo del bambino, che nel calendario del desk è quello dell'argomento. */
export const TITOLO_MINORE = 'Di chi parliamo?';

export const AIUTO_MINORE =
  'Nome e cognome di tuo figlio, come sono scritti sulla sua iscrizione: servono al Direttore Tecnico per aprire la sua scheda prima di chiamarti.';
