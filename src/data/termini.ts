/**
 * Termini e Condizioni del Club — testo contrattuale.
 *
 * Il contenuto in `termini.json` è estratto dal PDF ufficiale
 * "Termini e Condizioni Athlon — Agosto 2025" e va trattato come testo di
 * contratto: si aggiorna sostituendolo, non riscrivendolo a pezzi. Le uniche
 * cose aggiunte qui sono i titoli di navigazione delle clausole che nel PDF non
 * ne avevano uno, e i tag attività per sezione.
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
