/**
 * Il contenuto di `/privacy`.
 *
 * Sta in un file di dati e non nella pagina perché è di due nature diverse, e
 * mescolarle sarebbe il modo di sbagliare entrambe:
 *
 *  - **la parte tecnica** — cosa il sito scrive nel browser, quali form ci
 *    sono, dove finiscono i dati — è verificabile dal codice, e va tenuta in
 *    pari col codice. Se un giorno si aggiunge un identificativo o un servizio
 *    terzo, si aggiorna qui;
 *  - **l'informativa** è un documento del club, non del sito: la scrive chi ne
 *    risponde. Finché `INFORMATIVA` è vuota la pagina lo dice, invece di far
 *    finta.
 *
 * Vale qui la regola di `club.ts`: **un dato inventato è peggio di un dato
 * assente**. Nessuna finalità, nessun termine di conservazione e nessuna base
 * giuridica plausibile-ma-non-verificata. Solo ciò che il repository sa.
 */
import { CLUB } from './club';

/** Chi risponde del trattamento, con i soli dati che il repository ha. */
export const TITOLARE = {
  ragioneSociale: 'Point 2000 Srl Società Sportiva Dilettantistica',
  nomeCommerciale: CLUB.brand,
  email: CLUB.email,
};

export interface Voce {
  chiave: string;
  dove: string;
  cosa: string;
  durata: string;
  categoria: 'necessario' | 'marketing';
}

/**
 * Cosa il sito scrive nel browser di chi lo visita, per intero.
 *
 * Non sono cookie in senso tecnico — sono `localStorage` e `sessionStorage` —
 * ma la regola che li governa è la stessa: è archiviazione nel terminale, e
 * quella che non serve al servizio richiesto va chiesta.
 *
 * L'elenco corrisponde a `scripts/attribuzione.ts`, `lib/chatAssistente.client.js`
 * e `components/clublife/HelpDesk.astro`. Toccare uno di quelli senza toccare
 * questo elenco vuol dire un'informativa che descrive un altro sito.
 */
export const STORAGE: Voce[] = [
  {
    chiave: 'athlon_vid',
    dove: 'localStorage',
    cosa: 'Un identificativo casuale del browser, senza dati personali dentro. Serve a riconoscere una richiesta che arriva dalla stessa persona quando torna, anche con un indirizzo email diverso.',
    durata: 'Finché non si svuota il browser',
    categoria: 'marketing',
  },
  {
    chiave: 'athlon_utm',
    dove: 'sessionStorage',
    cosa: 'La campagna da cui la visita è arrivata (parametri utm_*, gclid, fbclid), letta una volta al primo tocco.',
    durata: 'La sessione del browser',
    categoria: 'marketing',
  },
  {
    chiave: 'athlon:assistente:sessione',
    dove: 'sessionStorage',
    cosa: "L'identificativo della conversazione con l'assistente, perché una risposta sappia cosa è stato chiesto prima.",
    durata: 'La sessione del browser',
    categoria: 'necessario',
  },
  {
    chiave: 'athlon:helpdesk',
    dove: 'sessionStorage',
    cosa: 'Il punto a cui si è arrivati nel box delle domande frequenti, per non ricominciare da capo cambiando pagina.',
    durata: 'La sessione del browser',
    categoria: 'necessario',
  },
];

export interface Destinatario {
  nome: string;
  dominio: string;
  perche: string;
  /**
   * Esiste solo quando il banner c'è. Elencare Cookiebot fra i destinatari
   * mentre il banner non è attivo sarebbe scrivere una cosa falsa in
   * un'informativa, che è il posto peggiore dove scriverne una.
   */
  soloConBanner?: boolean;
}

/**
 * I servizi di terzi che ricevono dati, o che possono scriverne, quando si usa
 * il sito. Corrisponde agli endpoint in `lib/provaForm.client.js` e
 * `lib/chatAssistente.client.js` e agli `iframe` del sito.
 */
export const DESTINATARI: Destinatario[] = [
  {
    nome: 'n8n (automazione del club)',
    dominio: 'automazione.n8ndevelop.it',
    perche:
      "Riceve i dati del modulo «prova gratuita» e dell'assistente: nome, cognome, email, cellulare, l'attività di interesse e, se acconsentito, l'attribuzione della campagna.",
  },
  {
    nome: 'Calendly',
    dominio: 'calendly.com',
    perche:
      "Prenotazione del richiamo telefonico. Il link arriva precompilato con i dati già lasciati e con la conversazione avuta con l'assistente.",
  },
  {
    nome: 'PerfectGym',
    dominio: 'athlon.perfectgym.com',
    perche: 'Il portale del club: registrazione, abbonamenti, prenotazione delle lezioni.',
  },
  {
    nome: 'Google Tag Manager e Google Maps',
    dominio: 'googletagmanager.com, google.com',
    perche:
      'Gestione dei tag di misurazione e la mappa della sede in fondo a ogni pagina.',
  },
  {
    nome: 'Vimeo',
    dominio: 'player.vimeo.com',
    perche:
      'I video di Athlon TV e delle pagine delle attività, richiesti in modalità «do not track».',
  },
  {
    nome: 'MPSkin',
    dominio: 'my.mpskin.com',
    perche: 'Il tour virtuale della struttura.',
  },
  {
    nome: 'Cookiebot',
    dominio: 'consent.cookiebot.com',
    perche: 'Raccoglie e conserva la scelta sui cookie, e la ripresenta a ogni visita.',
    soloConBanner: true,
  },
];

export interface Sezione {
  titolo: string;
  /** Capoversi. Ammettono HTML per i soli link. */
  corpo: string[];
}

/**
 * L'informativa vera e propria.
 *
 * Vuota di proposito: il testo è quello del club — c'è già su athlonroma.it in
 * WordPress — e va incollato qui, non riscritto a memoria. Finché è vuota la
 * pagina esiste, ospita la parte tecnica e la dichiarazione dei cookie, e dice
 * al lettore che il documento completo è in arrivo con l'indirizzo a cui
 * chiederlo. Che è meno di quello che serve, ma è vero — e soprattutto non è il
 * 404 che c'era prima, linkato dal footer di ogni pagina.
 */
export const INFORMATIVA: Sezione[] = [];
