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
 * conoscere il club per una settimana con l'esperienza Premium. Il form è
 * quello che genera già il lead; l'attività di provenienza viaggia nel
 * parametro `medium`, e resterà come contesto quando al posto del form ci sarà
 * il modal.
 */
const TRIAL_FORM = 'https://automazione.n8ndevelop.it/form/40cc4d53-8515-4657-b6ae-6bb0fa1acf77';

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
  const medium = ctx.activity ?? (ctx.source.replace(/^\//, '') || 'home');
  return {
    label: TRIAL.label,
    micro: TRIAL.micro,
    href: `${TRIAL_FORM}?source=SitoWeb&medium=${encodeURIComponent(medium)}`,
    /** Il form è esterno: si apre in una scheda nuova finché è un form. */
    external: true,
    attrs: ctaAttrs('trial', TRIAL.intent, ctx),
  };
}

/**
 * Le CTA che chiedono di parlare con una persona — «Parla con noi», «Prenota
 * una telefonata», «Prenota un appuntamento in sede» — aspettano il modal
 * contatto. Finché `available` è `false` non vanno in pagina: una CTA senza
 * destinazione è peggio di una CTA che non c'è. Quando il modal esiste, si
 * mette `true` qui e i punti che la prevedono la mostrano.
 */
export const TALK = {
  available: false,
  label: 'Parla con noi',
  intent: 'contact',
} as const;

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
