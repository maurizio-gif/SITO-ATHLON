/**
 * Termini e Condizioni del Club — testo contrattuale.
 *
 * Il contenuto in `termini.json` è estratto dal documento ufficiale
 * "Termini e Condizioni Athlon Club — Aprile 2026" e va trattato come testo di
 * contratto: si aggiorna sostituendolo, non riscrivendolo a pezzi. Le uniche
 * cose aggiunte qui sono i titoli di navigazione delle clausole che nel
 * documento non ne avevano uno, e i tag attività per sezione.
 *
 * **Il testo pubblicato non è identico a quello sottoscritto**, e le differenze
 * stanno in `MODIFICHE_DOPO_DOCUMENTO` qui sotto. Sono le stesse tre che la
 * versione di Agosto 2025 portava già e che il documento di Aprile 2026 non ha
 * recepito: il club ha confermato che la regola applicata è quella del sito, non
 * quella scritta nel documento, quindi il sito pubblica la regola vera.
 *
 * **Finché il documento non viene riemesso, quella lista è il debito.** Va letta
 * prima di toccare qualsiasi cosa qui dentro, e va svuotata il giorno che un
 * documento nuovo la recepisce e `termini.json` viene rigenerato da quello.
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
 * Le differenze fra il testo pubblicato e il documento di Aprile 2026.
 *
 * Tre di contenuto e due refusi. Le tre di contenuto sono decisioni del club,
 * prese perché il documento e la pratica si erano allontanati: in ognuna il
 * sito pubblica **la regola che il club applica davvero**, e il documento è
 * quello rimasto indietro. Sanare il sito lasciando il documento com'era
 * avrebbe solo spostato la contraddizione.
 *
 * Questa lista è ciò che serve a chi riemette il documento per sapere cosa
 * cambiare. Non si allunga senza una decisione del club: una clausola non si
 * riscrive da qui perché suona meglio.
 */
export const MODIFICHE_DOPO_DOCUMENTO = [
  {
    clausole: ['7.6', '8.4'],
    cosa: 'Blocco delle prenotazioni dopo le mancate disdette: da 4 a 3 giorni.',
    perche:
      'Tre è quanto applica il sistema, ed è quanto le schede dell’Help Desk dicono in quattro punti. Il documento è l’unico a dirne quattro.',
  },
  {
    clausole: ['4.1', '7.1', '10.1', '11.1'],
    cosa: 'Certificato medico NON agonistico: entro 14 giorni dall’inizio dell’attività.',
    perche:
      'Il documento lo chiede prima dell’inizio, e la 10.1 non dà nessun termine; la tolleranza dei quattordici giorni è quella vera ed è quella che `generali/certificato-medico` dichiara. Ora è scritta uguale in tutti e quattro i punti.',
  },
  {
    clausole: ['6.2'],
    cosa: 'Lasciata invariata: resta «prima dell’inizio dell’attività».',
    perche:
      'È l’unica che riguarda il certificato AGONISTICO, per il settore agonistico e la pallanuoto. Lì la visita deve precedere l’attività e non è una scelta del club: concedere una finestra sarebbe stato un errore, non un allineamento. Confermato dal club.',
  },
  {
    clausole: ['4.3', '7.6', '8.4'],
    cosa: 'Gli indirizzi citati passano da wiki.athlonroma.it a www.athlonroma.it.',
    perche:
      'Il wiki è dentro questo sito da quando è stato rifatto, e la 7.6 e la 8.4 dichiarano vincolante ciò che è pubblicato a quell’indirizzo. Deciso dal club di citare la destinazione e non il vecchio host.',
    /* **Oggi quel link dà 404, e va saputo.** Misurato: `www.athlonroma.it` è
       ancora il WordPress, che il percorso `/wikiathlon/…` non ha, mentre
       `wiki.athlonroma.it` risponde 200 perché il vecchio sito è ancora in
       piedi. Il verso si invertirà con lo spostamento del dominio — quel giorno
       `www` serve queste pagine e i redirect di `vercel.json` mandano lì anche
       il sottodominio — ma da qui a quel giorno una clausola che dichiara
       vincolante una pagina rimanda a un indirizzo che non risponde.

       Non è un errore da correggere qui: è una ragione in più per fare lo
       spostamento, e la si tiene scritta perché nessuno la scopra da un
       reclamo. */
    nota: 'Il link citato risponde solo dopo lo spostamento del dominio su Vercel.',
  },
  {
    clausole: ['8.4', '1.4'],
    cosa: 'Corretti due refusi del documento: «lLa prenotazione» e «Bagde» nel titolo.',
    perche: 'Errori di trascrizione, non differenze di contenuto.',
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
