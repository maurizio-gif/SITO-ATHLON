/**
 * Il vocabolario del form «Contattaci», in un posto solo.
 *
 * Il form nasce dai 55 nodi di `CONTATTACI - ATHLON` su n8n, dove le domande
 * stavano dentro le pagine del form ospitato: una tendina qui, uno switch là,
 * e per sapere cosa chiede il modulo bisognava aprire l'automazione. Ora le
 * domande sono del sito, e stanno qui — le schermate del modal e la logica del
 * client leggono da questo file, così cambiare un'opzione è cambiare una riga
 * e non tre punti che divergono al primo ritocco.
 *
 * Le cinque macro-attività sono le stesse della tendina «Per quale attività hai
 * bisogno di informazioni?», e restano cinque perché sono cinque percorsi di
 * iscrizione diversi, non cinque etichette: l'adulto scrive una richiesta, il
 * baby nuoto vuole il bambino e il genitore, la scuola nuoto vuole anche il
 * livello in acqua. È la ramificazione che l'automazione fa oggi, e il form la
 * deve fare prima — chiedere a un genitore di pallanuoto quale corso fitness
 * gli interessa è la domanda che fa chiudere la pagina.
 */
import { ACTIVITY_TAGS } from './activities';

/** L'endpoint che verifica l'email su PerfectGym: lo stesso del form di prova. */
export const WEBHOOK_VERIFICA = 'https://automazione.n8ndevelop.it/webhook/athlon-verifica-iscritto';

/**
 * L'endpoint che riceve la richiesta completa.
 *
 * Nuovo, e non quello del form n8n di oggi: `CONTATTACI - ATHLON` parte da un
 * Form Trigger e i suoi nodi leggono i campi con le etichette in italiano —
 * `$json['Il tuo indirizzo email']`. Un webhook che riceve JSON non può
 * riusarlo, e riscriverlo sopra spegnerebbe il form vecchio nel momento del
 * salvataggio. I due convivono finché questo sito non è pubblicato.
 */
export const WEBHOOK_CONTATTO = 'https://automazione.n8ndevelop.it/webhook/athlon-contatto-compilato';

/* Il calendario e i suoi indirizzi non stanno più qui: sono in
   `data/calendly.ts`, perché i posti che lo usano sono tre — questo form,
   quello della prova e l'assistente in chat — e la logica dell'embed è in
   `lib/calendario.client.js`. */

/** Il portale, per chi risulta già registrato: reset password e accesso. */
export const PORTALE = {
  reset: 'https://athlon.perfectgym.com/ClientPortal2/#/ForgotPassword',
  login: 'https://athlon.perfectgym.com/ClientPortal2/#/Login',
} as const;

/**
 * Se questa email ha già un account sul portale.
 *
 * Sta qui e non dentro un form perché la usano in due — «contattaci» e il
 * controllo davanti ai pulsanti d'iscrizione — e sarà la stessa ovunque si
 * aggiunga un passo «verifica l'email». Una regola come questa scritta in due
 * posti è una regola che a un certo punto risponde in due modi.
 *
 * **Lo decide `memberType`, non `stato`.** L'automazione distingue quattro
 * valori: `Member` e `Guest` hanno un account, `Lead` e l'assenza no — un Lead
 * è un contatto e non una persona che può fare login. `stato` invece unisce
 * Lead e Guest sotto `esiste`, quindi non basta.
 *
 * Il ripiego su `stato === 'iscritto'` copre una versione del webhook che non
 * mandi `memberType`: riconosce solo il Member, cioè tratta un Guest come uno
 * senza account. È il verso giusto in cui sbagliare — chi ha un account e viene
 * mandato a registrarsi lo scopre subito e fa il reset, mentre chi non ce l'ha
 * e viene mandato al login resta fuori senza capire perché.
 */
export function haGiaAccount(esito: { memberType?: string; stato?: string }): boolean {
  if (esito.memberType) return /member|guest/i.test(esito.memberType);
  return esito.stato === 'iscritto';
}

/** La scheda con le modalità di preiscrizione: la chiusura del ramo junior. */
export const PREISCRIZIONI = '/wikiathlon/snb/preiscrizioni-nuoto';

/** Quale percorso segue la richiesta dopo la macro-attività. */
export type Ramo = 'adulti' | 'baby' | 'junior';

export interface Macro {
  id: string;
  /** L'etichetta breve, quella del pulsante. */
  label: string;
  /** La riga sotto: chi è, e per quale età. Era fra parentesi nella tendina. */
  nota: string;
  ramo: Ramo;
  /** `gruppoAttivita` nel payload, come nei form degli altri club. */
  gruppo: 'adulti' | 'junior';
}

/**
 * Le cinque scelte del primo passo.
 *
 * Gli `id` sono quelli di `activities.ts` dove esiste una corrispondenza —
 * `baby-nuoto`, `scuola-nuoto-bambini`, `pallanuoto`, `nuoto-agonistico` —
 * così la richiesta arriva a n8n con la stessa parola che il sito usa per
 * taggare articoli, eventi e planning. `adulti` non è un'attività ma il loro
 * insieme, e lì l'attività precisa la chiede il passo dopo.
 */
export const MACRO: Macro[] = [
  {
    id: 'adulti',
    label: 'Adulti',
    nota: 'Dai 13 anni: sala pesi, corsi, reformer, acqua, nuoto libero.',
    ramo: 'adulti',
    gruppo: 'adulti',
  },
  {
    id: 'baby-nuoto',
    label: 'Baby Nuoto',
    nota: 'Dai 3 mesi ai 3 anni, in acqua con un genitore.',
    ramo: 'baby',
    gruppo: 'junior',
  },
  {
    id: 'scuola-nuoto-bambini',
    label: 'Scuola Nuoto Bambini',
    nota: 'Nati dal 2012 al 2022.',
    ramo: 'junior',
    gruppo: 'junior',
  },
  {
    id: 'nuoto-agonistico',
    label: 'Nuoto Agonistico ASI',
    nota: 'Chi già nuota e vuole gareggiare.',
    ramo: 'junior',
    gruppo: 'junior',
  },
  {
    id: 'pallanuoto',
    label: 'Pallanuoto',
    nota: 'Squadre giovanili, dai gruppi propedeutici in su.',
    ramo: 'junior',
    gruppo: 'junior',
  },
];

export const MACRO_BY_ID: Record<string, Macro> = Object.fromEntries(
  MACRO.map((m) => [m.id, m])
);

/**
 * Le attività fra cui scegliere nel ramo adulti.
 *
 * Derivate da `ACTIVITY_TAGS` e non riscritte: è la regola del progetto —
 * le attività escono da `activities.ts` e da lì popolano Tina, la validazione
 * e l'Help Desk. Una lista a mano qui sarebbe la sesta copia, e la prima a
 * restare indietro.
 *
 * Nota una differenza voluta rispetto alla tendina di n8n, che ne elencava
 * sette: qui ce ne sono otto, perché `ACTIVITY_TAGS` include il **personal
 * training**, che il club vende e che ha una pagina sua. Ometterlo dal form
 * dei contatti significherebbe che l'unica richiesta che non si può fare è
 * quella del servizio più caro.
 */
export const ATTIVITA_ADULTI = ACTIVITY_TAGS.filter((a) => a.audience === 'adulti');

/**
 * Le tre domande sul livello in acqua, per la scuola nuoto e per chi arriva
 * dall'agonistico o dalla pallanuoto.
 *
 * Servono alla direzione tecnica per assegnare il corso senza una prova in
 * vasca, ed è il motivo per cui il form le fa: sono le stesse tre di oggi, con
 * le stesse parole. La prima è facoltativa perché lo era — un genitore che non
 * sa dire se «un corso» conta può passare oltre invece di indovinare.
 */
export const DOMANDE_LIVELLO = [
  {
    id: 'haFrequentato',
    label: 'Ha mai frequentato un corso di nuoto?',
    obbligatoria: false,
  },
  {
    id: 'saNuotare',
    label: 'Sa nuotare senza ausili (braccioli, ciambella)?',
    obbligatoria: true,
  },
  {
    id: 'stileLibero',
    label: 'Sa eseguire correttamente lo stile libero completo?',
    obbligatoria: true,
  },
] as const;

/**
 * Il testo del consenso, parola per parola quello del form n8n di oggi.
 *
 * Sta qui e non nel markup perché compare in due schermate — i dati
 * dell'adulto e i dati del genitore — e due copie di una frase di consenso che
 * divergono sono un problema che non si vede finché non lo chiede qualcuno.
 */
export const CONSENSO_PRIVACY =
  'Ho letto l’informativa e acconsento al trattamento dei miei dati da parte di Point 2000 SSDrl per rispondere a questa richiesta.';

export const CONSENSO_MARKETING =
  'Voglio ricevere comunicazioni su corsi, promozioni e novità del club. Posso revocare quando voglio.';
