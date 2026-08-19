/**
 * Termini e Condizioni del Club — testo contrattuale.
 *
 * Il contenuto in `termini.json` è estratto dal PDF ufficiale
 * "Termini e Condizioni Athlon — Agosto 2025" e va trattato come testo di
 * contratto: si aggiorna sostituendolo, non riscrivendolo a pezzi. Le uniche
 * cose aggiunte qui sono i titoli di navigazione delle clausole che nel PDF non
 * ne avevano uno, e i tag attività per sezione.
 *
 * A quella regola c'è oggi una deroga, dichiarata in `MODIFICHE_DOPO_PDF` qui
 * sotto: alcune clausole sono state emendate per allinearle a ciò che il club
 * applica davvero. **Finché il PDF non viene riemesso, il testo pubblicato non
 * è più identico a quello sottoscritto** — leggere quella lista prima di
 * toccare qualsiasi cosa qui dentro.
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
export const TERMINI_VERSIONE = 'Agosto 2025';

/**
 * Le modifiche apportate al testo **dopo** l'estrazione dal PDF di Agosto 2025.
 *
 * Esistono perché il contratto e ciò che il club fa davvero si erano allontanati
 * su due punti, e il sito li raccontava in un terzo modo ancora. Sanare il sito
 * lasciando il contratto com'era avrebbe solo spostato la contraddizione.
 *
 * **Il PDF firmato non cambia da qui.** Finché non viene riemesso, quello che
 * `/regolamento` pubblica non è più identico a quello che gli iscritti hanno
 * sottoscritto — che è un miglioramento solo se il documento segue. Questa lista
 * è ciò che serve a chi lo riemette per sapere cosa cambiare, e va svuotata
 * quando il nuovo PDF arriva e `termini.json` viene rigenerato da quello.
 */
export const MODIFICHE_DOPO_PDF = [
  {
    clausole: ['7.6', '8.4'],
    cosa: 'Blocco delle prenotazioni dopo le mancate disdette: da 4 a 3 giorni.',
    perche:
      'Tre è quanto applica il sistema, ed è quanto la scheda dell’Help Desk e il planning dicono da sempre. Il contratto era l’unico a dirne quattro.',
  },
  {
    clausole: ['4.1', '7.1', '10.1', '11.1'],
    cosa: 'Certificato medico non agonistico: entro 14 giorni dall’inizio dell’attività.',
    perche:
      'Il contratto lo chiedeva prima dell’inizio, il sito concedeva una finestra — quindici giorni in due punti, due settimane in altri quattro. La tolleranza dei quattordici giorni è quella vera e ora è scritta uguale ovunque. La 10.1 un termine non ce l’aveva affatto.',
  },
  {
    clausole: ['6.2'],
    cosa: 'Lasciata invariata: resta «prima dell’inizio dell’attività».',
    perche:
      'È l’unica che riguarda il certificato AGONISTICO, per il settore agonistico e la pallanuoto. Lì la visita deve precedere l’attività e non è una scelta del club: concedere una finestra sarebbe stato un errore, non un allineamento.',
  },
  {
    clausole: ['4.3', '7.6', '8.4'],
    cosa: 'Gli indirizzi delle schede citate passano da wiki.athlonroma.it a www.athlonroma.it.',
    perche:
      'Il wiki è dentro questo sito da quando è stato rifatto. Le clausole 7.6 e 8.4 dichiarano vincolante ciò che è pubblicato a quell’indirizzo, e la 4.3 ci fa decorrere un preavviso: un contratto che rimanda a un dominio dismesso rende inesigibile la parte che ci rimanda.',
  },
  {
    clausole: ['8.4'],
    cosa: 'Corretto il refuso iniziale «lLa prenotazione».',
    perche: 'Errore di trascrizione dal PDF, non una differenza di contenuto.',
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
