/**
 * Il tour registrato al totem, in un posto solo.
 *
 * `/totem/tour` è la pagina che sta aperta sul pannello all'ingresso: chi
 * ha appena girato la struttura con un operatore lascia lì i suoi dati, e da
 * quel modulo nasce una voce **tour** nell'agenda del pannello — con la data,
 * l'ora, e uno stato da chiudere.
 *
 * ## Perché non è il form «Contattaci»
 *
 * Le domande sono le stesse solo in apparenza. `ContattaciModal` esiste per
 * far arrivare una richiesta al desk: chiede di cosa si vuole parlare, si
 * rami­fica su cinque percorsi di iscrizione, e per un genitore raccoglie il
 * bambino con la data di nascita e le tre domande sul livello in acqua. Sono
 * le domande giuste **quando chi risponde non è nella stanza**.
 *
 * Al totem c'è. Il contesto lo ha raccolto l'operatore camminando, e lo
 * scriverà nelle note del tour dal pannello: chiedere qui la richiesta in testo
 * libero vorrebbe dire far digitare a una persona in piedi una cosa che ha
 * appena detto a voce. Quindi restano l'anagrafica e le attività che le
 * interessano — che è l'unica informazione che il totem raccoglie e che nessuna
 * altra tabella ha.
 *
 * ## Cosa parte, e in che ordine
 *
 * Due chiamate, come per l'appuntamento telefonico e per la stessa ragione:
 *
 *   1. `API_TOUR` sul pannello, che scrive la voce in agenda. È la cosa che il
 *      club deve avere: se fallisce, l'operatore lo vede e riprova.
 *   2. `WEBHOOK_CONTATTO` su n8n, che crea il lead su PerfectGym e la riga su
 *      `richieste_contatto`. Se fallisce si prosegue: il tour è registrato, e
 *      un lead da riconciliare a mano costa meno di una visita persa.
 *
 * Il consenso cookie non c'entra e non blocca niente, come in tutti i form del
 * sito: senza, il payload parte senza `vid` e senza UTM.
 */
import { ACTIVITY_TAGS } from './activities';
import { CRM } from './appuntamento';

export { WEBHOOK_VERIFICA, WEBHOOK_CONTATTO } from './contatto';

/**
 * La rotta che scrive il tour in agenda.
 *
 * Nuova e non `/api/prenotazioni`: quella prende uno slot futuro e controlla
 * che sia libero, questa registra una cosa già avvenuta. Passare da lì avrebbe
 * voluto dire chiedere all'agenda il permesso di scrivere un fatto.
 */
export const API_TOUR = `${CRM}/api/tour`;

/**
 * Le attività che si possono spuntare, nei due gruppi della home.
 *
 * Escono da `ACTIVITY_TAGS` e non da un elenco scritto qui: è la stessa lista
 * che tagga articoli, eventi e planning, e che popola la tendina di Tina. Un
 * corso nuovo lì compare qui da solo.
 *
 * **Sono le dodici e non le cinque macro di `contatto.ts`.** Là le cinque
 * scelte sono cinque *percorsi di iscrizione* — l'adulto scrive, il genitore
 * dà il bambino — perché il form deve ramificarsi. Qui non si ramifica
 * niente: la domanda è «cosa ti interessa», la risposta può essere più di una
 * (un genitore che porta il figlio in piscina e intanto guarda la sala pesi è
 * il caso normale al totem), e chi la legge è una persona che quella visita se
 * la ricorda.
 */
export const GRUPPI_ATTIVITA = [
  { id: 'adulti', titolo: 'Per te', voci: ACTIVITY_TAGS.filter((a) => a.audience === 'adulti') },
  { id: 'junior', titolo: 'Per i bambini', voci: ACTIVITY_TAGS.filter((a) => a.audience === 'junior') },
] as const;

/**
 * Il consenso: lo stesso testo di «Contattaci», parola per parola.
 *
 * Non si riscrive più corto perché lo schermo è grande: è la frase su cui una
 * persona acconsente, e due versioni della stessa frase sono due versioni di
 * cosa ha accettato.
 */
export { CONSENSO_PRIVACY, CONSENSO_MARKETING } from './contatto';

/**
 * Quanto resta a schermo la conferma prima che la pagina torni da sola al
 * primo passo.
 *
 * È un totem: la persona dopo esiste davvero, e trovare il nome e l'email di
 * chi è passato prima è lo stesso difetto che `emailNota.ts` evita non
 * precompilando qui e che la chat evita dimenticando dopo tre minuti. Venti
 * secondi perché la conferma va letta — chi ha appena lasciato i suoi dati
 * deve vedere che sono arrivati — e perché l'operatore possa dire «ecco, ci
 * risentiamo noi» prima che lo schermo si azzeri.
 */
export const SECONDI_CONFERMA = 20;
