/**
 * Il gate dell'email davanti al listino.
 *
 * Ogni comando che significa «portami agli abbonamenti» — la pastiglia
 * dell'header, «Iscriviti ora» in home, «Vedi gli abbonamenti» in fondo alle
 * pagine delle attività, e anche i link dentro il testo che scorre, la nota di
 * `/personal-training` e le frasi «fanno parte dello stesso club» — chiede
 * l'indirizzo prima di aprire `/abbonamenti`. **La forma del link non decide
 * niente, la destinazione sì**: chi clicca «guarda quali comprende il tuo
 * abbonamento» sta andando al listino come chi preme un pulsante, e le
 * eccezioni sono quelle dichiarate nel `CLAUDE.md` — i pannelli che l'email
 * l'hanno appena chiesta, e la pagina stessa.
 * Serve a due cose insieme: dare un contatto al desk mentre l'interesse è vivo,
 * e non chiedere due volte la stessa cosa a chi arriva in fondo — l'esito della
 * verifica viaggia fino al pulsante «Iscriviti» del listino.
 *
 * **L'email è obbligatoria per proseguire dal comando, non per vedere la
 * pagina.** `/abbonamenti` resta pubblica e indicizzata: chi arriva da Google,
 * da un LLM o digitando l'indirizzo vede il listino come sempre. Il gate è un
 * attrito sul percorso interno, non un controllo d'accesso — e questa
 * distinzione è deliberata: un listino dietro un modulo è un listino che i
 * motori non leggono.
 */

/**
 * Il webhook che raccoglie la richiesta: `INFO ABBONAMENTI - SUPABASE`.
 *
 * Scrive su `richieste_info_abbonamenti` prima di ogni altra cosa, qualifica
 * l'opportunità su `statoNucleo`, crea il lead su PerfectGym solo per chi non
 * ha nessuna anagrafica, e a quello — e a nessun altro — manda l'email di
 * riepilogo.
 */
import { suTotem } from '../scripts/totem';

export const WEBHOOK_INFO =
  'https://automazione.n8ndevelop.it/webhook/athlon-info-abbonamenti';

/** Dove porta il gate quando non lo dice il pulsante che l'ha aperto. */
export const LISTINO = '/abbonamenti/';

/**
 * Dove il gate lascia quello che ha appena scoperto, per il passo dopo.
 *
 * **Nella sessione e non nello storage, ed è la ragione per cui non aspetta il
 * consenso ai cookie.** Questo è lo stato del servizio che la persona ha
 * chiesto — ha digitato quell'indirizzo *per fare questo percorso*, e tenerlo
 * finché il percorso non è finito è erogare il servizio, non ricordarsi di lei.
 * È la stessa categoria della sessione della chat e del passo dell'Help Desk.
 *
 * Il ricordo fra una visita e l'altra è un'altra cosa e ha un'altra regola:
 * lo fa `scripts/emailNota.ts`, sotto consenso **funzionale**. I due convivono,
 * e chi rifiuta i funzionali non perde niente dentro la sua visita.
 */
const CHIAVE = 'athlon_gate_abbonamenti';

export interface EsitoGate {
  email: string;
  memberType?: string;
  stato?: string;
  statoNucleo?: string;
  memberId?: string;
  nome?: string;
  cognome?: string;
  telefono?: string;
}

/**
 * Mette da parte l'esito della verifica per il passo successivo.
 *
 * **Sul totem non si ricorda niente**, ed e' la stessa regola di
 * `emailNota.ts` e della chat: il pannello all'ingresso e' un dispositivo
 * condiviso vero, e li' tenere l'indirizzo in sessione vorrebbe dire mostrare
 * a chi arriva dopo quello di chi e' passato prima. Il prezzo e' che al desk
 * la stessa persona si vede richiedere l'email sul listino, ed e' il verso
 * giusto in cui sbagliare.
 */
export function ricorda(esito: EsitoGate): void {
  if (suTotem()) return;
  try {
    sessionStorage.setItem(CHIAVE, JSON.stringify(esito));
  } catch (e) {
    /* Sessione non scrivibile (navigazione privata su certi browser, quota
       piena): il percorso funziona lo stesso, si rifà la verifica al passo
       dopo. Un pannello che si rompe perché non può ricordare sarebbe peggio
       della domanda ripetuta. */
  }
}

/** Quello che il gate ha scoperto in questa sessione, se c'è. */
export function ricordato(): EsitoGate | null {
  try {
    const grezzo = sessionStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const esito = JSON.parse(grezzo);
    return esito && esito.email ? esito : null;
  } catch (e) {
    return null;
  }
}

/** Sul totem la persona dopo non eredita l'indirizzo di quella prima. */
export function dimentica(): void {
  try {
    sessionStorage.removeItem(CHIAVE);
  } catch (e) {}
}
