/**
 * Le CTA del sito, in un posto solo.
 *
 * Serve a due cose. La prima è pratica: la destinazione della prova stava
 * scritta a mano in quattro file diversi, con due percorsi differenti per la
 * stessa offerta, e cambiarla voleva dire cercarla in giro. La seconda è che
 * la prossima fase sostituirà «vai al form esterno» con «apri il modal»: da
 * qui si cambia una funzione e cambiano tutte le CTA del sito.
 *
 * Sei categorie, che descrivono cosa vuole la persona e non cosa vende il club:
 *
 *  - `explore`  guardare e capire, senza lasciare niente in cambio;
 *  - `resolve`  ha una domanda precisa e vuole la risposta;
 *  - `trial`    provare: un solo prodotto, il Guest Pass Premium;
 *  - `talk`     parlare con una persona;
 *  - `buy`      comprare, ora;
 *  - `member`   è già iscritto e vuole usare il club.
 *
 * Una CTA che porta a un'ancora della stessa pagina è `explore`, non `resolve`:
 * diventerà `resolve` quando dietro ci sarà il modal che risponde davvero.
 */

export type CtaKind = 'explore' | 'resolve' | 'trial' | 'talk' | 'buy' | 'member';

/** Portale PerfectGym e app: le due destinazioni che esistono da sempre. */
export const PG = 'https://athlon.perfectgym.com/ClientPortal2';
export const APP = 'https://onelink.to/athlon';

/**
 * La prova è un prodotto solo, trasversale: il Guest Pass Premium, sette
 * giorni. Non esiste «prova la Gym Floor» o «prova il Reformer» — esiste
 * conoscere il club per una settimana con l'esperienza Premium.
 *
 * Dietro c'era un form ospitato da n8n, aperto in una scheda nuova. Ora c'è
 * `ProvaModal.astro`, che sta nel Layout e intercetta ogni comando con
 * `data-cta="trial"`: la persona non lascia più la pagina da cui è partita, e
 * l'attività di provenienza gliela leggiamo dal markup invece di passarla in
 * query string.
 *
 * L'`href` qui sotto è il ripiego per chi non ha JavaScript, e per il click
 * con il tasto centrale che apre una scheda: porta alla sezione Guest Pass
 * degli abbonamenti, dove ci sono lo stesso codice e lo stesso prezzo. Non è
 * più un indirizzo esterno — il percorso della prova vive dentro al sito.
 */
const TRIAL_FALLBACK = '/abbonamenti#guest-pass';

export const TRIAL = {
  label: 'Prova Athlon',
  /** Da usare dove serve dire cosa accade, non a ogni pulsante. */
  micro: '7 giorni Premium per conoscere il club.',
  intent: 'trial',
} as const;

/** Da dove arriva la persona: l'attività e la pagina. */
export interface CtaContext {
  /** Slug dell'attività, come in `activities.ts`. Assente sulle pagine generali. */
  activity?: string;
  /** Il percorso della pagina di partenza, es. `/reformer`. */
  source: string;
}

/**
 * Gli attributi che ogni CTA di intento porta con sé. Non fanno tracking:
 * mettono nel markup il contesto che il modal della prossima fase leggerà
 * senza doverlo chiedere di nuovo alla persona.
 */
export function ctaAttrs(kind: CtaKind, intent: string, ctx: CtaContext) {
  return {
    'data-cta': kind,
    'data-cta-intent': intent,
    ...(ctx.activity ? { 'data-cta-activity': ctx.activity } : {}),
    'data-cta-source': ctx.source,
  };
}

/** La CTA di prova: etichetta, destinazione temporanea e contesto. */
export function trialCta(ctx: CtaContext) {
  return {
    label: TRIAL.label,
    micro: TRIAL.micro,
    href: TRIAL_FALLBACK,
    /** Il modal è nel sito: niente scheda nuova, niente `target`. */
    external: false,
    attrs: ctaAttrs('trial', TRIAL.intent, ctx),
  };
}

/**
 * «Contattaci»: mettersi in contatto con una persona del club.
 *
 * Va al modulo contatti n8n, lo stesso che raccoglie le richieste dei corsi
 * junior. I parametri riproducono la convenzione già in uso: `source=SitoWeb`
 * minuscolo e `Medium` con la maiuscola, con un valore che dice **quale**
 * pulsante è stato premuto — `PulsanteContattaci`, come `PulsanteBabyNuoto` per
 * il baby nuoto. Da qui la richiesta si distingue dalle altre senza guardare
 * altro.
 *
 * Quando il modal contatto esisterà — lascia un messaggio · prenota una
 * telefonata · prenota un appuntamento in sede — si cambia `href` qui e
 * cambiano tutti i punti del sito. L'intento è già `contact`, e la pagina di
 * partenza viaggia nel markup, quindi il modal sa da dove arriva la persona
 * senza chiederlo.
 */
const CONTACT_FORM = 'https://automazione.n8ndevelop.it/form/a4283d20-5832-46a3-9d88-df3561060e12';

export const TALK = {
  label: 'Contattaci',
  href: `${CONTACT_FORM}?source=SitoWeb&Medium=PulsanteContattaci`,
  intent: 'contact',
} as const;

/** La CTA di contatto: etichetta, destinazione e contesto di partenza. */
export function talkCta(ctx: CtaContext) {
  return {
    label: TALK.label,
    href: TALK.href,
    /** Il modulo è esterno: si apre in una scheda nuova finché è un form. */
    external: true,
    attrs: ctaAttrs('talk', TALK.intent, ctx),
  };
}

/**
 * «Iscriviti»: comprare. Porta agli abbonamenti e non direttamente al portale,
 * perché la registrazione su PerfectGym parte da un `PaymentPlanId` — un piano
 * preciso, con il suo prezzo e la sua durata. Da un pulsante generico dell'header
 * non si può scegliere al posto della persona: prima si guardano i due piani e
 * le loro opzioni, poi «Iscriviti a Smart» o «Iscriviti a Premium» apre la
 * registrazione di quel piano.
 */
export const JOIN = {
  label: 'Iscriviti',
  href: '/abbonamenti',
  intent: 'membership',
} as const;

export function joinCta(ctx: CtaContext) {
  return {
    label: JOIN.label,
    href: JOIN.href,
    attrs: ctaAttrs('buy', JOIN.intent, ctx),
  };
}

/** Gli intenti che il modal della prossima fase dovrà saper gestire. */
export const INTENTS = {
  trial: 'trial',
  /** «Trova il corso giusto per te», «Trova il tuo allenamento in acqua». */
  classFinder: 'class_finder',
  /** «Trova il corso giusto per tuo figlio», «Trova il turno». */
  juniorInfo: 'junior_info',
  /** «Richiedi la prova di inserimento»: pallanuoto e nuoto agonistico. */
  insertionTrial: 'insertion_trial',
  /** «Hai bisogno di aiuto a scegliere?» sugli abbonamenti. */
  membershipAdvice: 'membership_advice',
  /** «Trova il percorso giusto per te» sulla scuola nuoto adulti. */
  swimLevel: 'swim_level',
  /** «Parla con noi», da qualunque pagina. */
  contact: 'contact',
} as const;
