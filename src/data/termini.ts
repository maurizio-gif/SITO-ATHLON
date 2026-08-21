/**
 * Termini e Condizioni del Club — testo contrattuale.
 *
 * Il contenuto in `termini.json` è estratto dal documento ufficiale
 * "Termini e Condizioni Athlon Club — Aprile 2026" e va trattato come testo di
 * contratto: si aggiorna sostituendolo, non riscrivendolo a pezzi. Le uniche
 * cose aggiunte qui sono i titoli di navigazione delle clausole che nel
 * documento non ne avevano uno, e i tag attività per sezione.
 *
 * **Il testo pubblicato è di nuovo identico a quello sottoscritto.** La versione
 * di Agosto 2025 portava cinque emendamenti — elencati allora in
 * `MODIFICHE_DOPO_PDF` — fatti per allineare il contratto a ciò che il club
 * applicava davvero. Il documento di Aprile 2026 **non li ha recepiti**, e
 * pubblicare il contratto verbatim ha quindi voluto dire rimetterli come stanno
 * nel documento firmato. Quello che ne resta aperto sta in
 * `DISALLINEAMENTI_COL_SITO` qui sotto: sono contraddizioni fra il contratto e
 * altre pagine di questo sito, e si chiudono da una parte o dall'altra — non
 * riscrivendo di nuovo il contratto da qui.
 *
 * Due consumatori, una fonte: la pagina /regolamento e il box dell'Help Desk, che
 * indicizza ogni clausola e ci linka direttamente con l'ancora.
 *
 * La numerazione salta la sezione 5: è così nel documento originale, e in un
 * testo contrattuale i riferimenti non si rinumerano.
 */
import raw from './termini.json';
import { WATER_ACTIVITIES } from './activities';

export interface Clausola {
  /** Numero come nel contratto: "7.7", "2.1.3". */
  id: string;
  titolo: string;
  testo: string;
}

export interface SezioneTermini {
  numero: string;
  titolo: string;
  clausole: Clausola[];
  /** Attività a cui la sezione si applica; vuoto = tutte. */
  attivita: string[];
}

/**
 * Le sezioni del contratto ricalcano quasi uno a uno le attività del club, ed è
 * quello che permette all'Help Desk di rispondere con la clausola giusta a chi
 * ha scelto "Scuola Nuoto Bambini" invece di "Gym Floor".
 */
const ATTIVITA_PER_SEZIONE: Record<string, string[]> = {
  '1': [], // sottoscrizione: vale per chiunque
  '2': [], // obblighi dell'utente
  '3': [], // pagamento
  '4': ['scuola-nuoto-bambini'],
  '6': ['nuoto-agonistico', 'pallanuoto'],
  '7': [
    'gym-floor',
    'corsi-fitness',
    'group-reformer',
    'nuoto-libero',
    'aqua-fitness',
    'scuola-nuoto-adulti',
    'gestanti',
  ],
  '8': ['baby-nuoto'],
  '9': ['personal-training'],
  '10': [], // lezioni singole e pacchetti: qualunque attività
  '11': ['scuola-nuoto-bambini'],
};

export const TERMINI: SezioneTermini[] = (raw as Omit<SezioneTermini, 'attivita'>[]).map((s) => ({
  ...s,
  attivita: ATTIVITA_PER_SEZIONE[s.numero] ?? [],
}));

/** Versione del documento, come sul PDF firmato. */
export const TERMINI_VERSIONE = 'Aprile 2026';

/**
 * Gli unici due punti in cui il testo pubblicato non è identico al documento, e
 * sono due refusi del documento stesso: la 8.4 apre con «lLa prenotazione» e il
 * titolo della 1.4 dice «Bagde Accesso». Non sono differenze di contenuto e non
 * si riproducono; se il documento verrà corretto, questa lista si svuota.
 */
export const SCOSTAMENTI_DAL_DOCUMENTO = [
  { clausole: ['8.4'], cosa: 'Corretto il refuso iniziale «lLa prenotazione».' },
  { clausole: ['1.4'], cosa: 'Corretto il refuso «Bagde» nel titolo di navigazione.' },
] as const;

/**
 * Dove il contratto di Aprile 2026 e il resto del sito dicono cose diverse.
 *
 * Non è una lista di cose da sistemare qui dentro: il contratto è il contratto,
 * e va pubblicato com'è. È la lista di ciò che qualcuno deve decidere — o si
 * riemette il documento, o si correggono le pagine che lo contraddicono.
 * Finché resta aperta, una persona che legge due pagine di questo sito trova
 * due risposte diverse alla stessa domanda.
 *
 * Tutti e tre i punti erano già stati sanati sul testo di Agosto 2025 e sono
 * tornati indietro con il documento nuovo, che non li ha recepiti.
 */
export const DISALLINEAMENTI_COL_SITO = [
  {
    clausole: ['7.6', '8.4'],
    contratto: 'Il blocco dopo le mancate disdette dura 4 giorni.',
    sito: 'Le schede dell’Help Desk dicono 3 giorni, in quattro punti fra `generali/prenotazioni` e `generali/prenotazioni-problemi`.',
    nota: 'Tre è quanto risultava applicare il sistema. Il contratto è l’unico a dirne quattro.',
  },
  {
    clausole: ['4.1', '7.1', '10.1', '11.1'],
    contratto: 'Il certificato medico non agonistico va inviato prima dell’inizio dell’attività; la 10.1 non dà un termine.',
    sito: '`generali/certificato-medico` concede 14 giorni dall’inizio dell’attività.',
    nota: 'La 6.2 non c’entra e resta com’è: riguarda il certificato AGONISTICO, dove la visita deve precedere l’attività per legge.',
  },
  {
    clausole: ['4.3', '7.6', '8.4'],
    contratto: 'Le clausole rimandano a wiki.athlonroma.it, e la 7.6 e la 8.4 dichiarano vincolante ciò che è pubblicato lì.',
    sito: 'Il wiki è dentro questo sito da quando è stato rifatto, e vive su www.athlonroma.it/wikiathlon.',
    nota: 'I redirect per quel sottodominio stanno in `vercel.json` ma non sono attivi finché il dominio non è agganciato al progetto: fino a quel giorno le clausole rimandano a un indirizzo che non risponde.',
  },
] as const;

/** Anchor: i punti non sono validi in un id usato con :target. */
export const anchorClausola = (id: string) => `c${id.replace(/\./g, '-')}`;
export const urlClausola = (id: string) => `/regolamento#${anchorClausola(id)}`;

export const clausole = (): (Clausola & { sezione: SezioneTermini })[] =>
  TERMINI.flatMap((s) => s.clausole.map((c) => ({ ...c, sezione: s })));

/** Quante clausole compongono il documento — la pagina lo dice in apertura. */
export const totaleClausole = () => clausole().length;

/** Sezioni che riguardano l'acqua, per i rimandi dal planning e dalle news. */
export const SEZIONI_ACQUA = TERMINI.filter((s) =>
  s.attivita.some((a) => WATER_ACTIVITIES.includes(a))
).map((s) => s.numero);
