/**
 * Le mini survey del club, in un posto solo.
 *
 * Sono otto questionari brevi — tre giudizi, un NPS, e una nota che compare
 * **solo** quando il giudizio non è buono — raggiungibili da `/surveys/` (il
 * menu) e uno per uno da `/surveys/<slug>/`. L'indirizzo per slug è il punto:
 * una survey si manda in una newsletter, si stampa in un QR accanto agli
 * spogliatoi, si incolla in una risposta del desk. Un menu che non si può
 * saltare sarebbe un passaggio in più fra la persona e la domanda.
 *
 * ## Perché mini, e perché tante
 *
 * Un questionario lungo su tutto il club raccoglie poche risposte e non dice
 * dove intervenire: la media di dodici domande è un numero solo. Otto survey da
 * tre domande dicono *quale* cosa non va, e ognuna si compila in venti secondi
 * — che è il tempo che ha in mano una persona ferma davanti alla reception.
 *
 * ## L'NPS c'è in tutte, ed è la domanda che decide la recensione
 *
 * Le stelle misurano il servizio, l'NPS misura la disposizione a parlarne — che
 * è esattamente quello che una recensione su Google è. Ripeterlo in ogni survey
 * costa una riga a chi ne compila due e in cambio rende i temi confrontabili
 * («sugli spogliatoi promotori 20%, sulle lezioni 70%»), che è la ragione per
 * cui esistono otto pagine invece di una.
 *
 * ## La nota si chiede solo sotto la soglia
 *
 * Stessa regola del voto alla chat: chi dà il massimo ha già detto quello che
 * pensa, e un campo di testo dopo un voto alto è un compito in più che abbassa
 * la percentuale di chi risponde. Sotto la soglia la domanda invece è quella
 * utile — «cosa potevamo fare meglio» — e chi la legge sa già su cosa.
 *
 * ## L'email è facoltativa, e quasi sempre non si digita
 *
 * Le tre strade, in ordine di precedenza: il parametro `email` o `UserNumber`
 * nel link (una newsletter sa a chi sta scrivendo), l'email che il browser
 * ricorda (`emailNota.ts`, consenso funzionale), e in ultimo il campo. Se resta
 * vuoto la risposta parte lo stesso: un giudizio anonimo vale, e un campo
 * obbligatorio davanti a una survey volontaria è il punto in cui si chiude la
 * pagina. Il `vid` la aggancia comunque a una visita.
 */

/** Il webhook n8n che scrive la risposta su Supabase (`sondaggi_risposte`). */
export const WEBHOOK_SONDAGGIO =
  'https://automazione.n8ndevelop.it/webhook/athlon-sondaggio';

/**
 * Dove mandiamo chi è contento.
 *
 * È la forma `writereview` con il Place ID della scheda del club, non un link
 * alla scheda: apre il riquadro della recensione già pronto invece di lasciare
 * la persona su una pagina dove la recensione va cercata. Un passaggio in meno
 * su un'azione che è già un favore.
 */
export const RECENSIONE_GOOGLE =
  'https://search.google.com/local/writereview?placeid=ChIJxwtVpgxkLxMRdzofCeJVsYU';

/**
 * Le due soglie che aprono la richiesta di recensione, in OR.
 *
 * NPS ≥ 9 è il promotore per definizione; la media ≥ 4,5 su 5 copre chi non ha
 * risposto all'NPS ma ha dato tutte cinque stelle meno una. **In OR e non in
 * AND**: chiedere entrambe vorrebbe dire non chiedere la recensione a chi ha
 * dato 5, 5, 4 e un 9 — cioè a un promotore vero, per un decimale.
 *
 * Il verso in cui si sbaglia è deliberato: meglio non chiedere una recensione a
 * qualcuno che l'avrebbe scritta, che chiederla a chi ha appena detto che gli
 * spogliatoi sono sporchi. Il primo errore costa una recensione, il secondo la
 * scrive.
 */
export const SOGLIA = { nps: 9, media: 4.5 } as const;

/** La domanda dell'NPS, identica in tutte le survey: è quello che la rende confrontabile. */
export const NPS = {
  testo: 'Quanto è probabile che consigli Athlon a un amico o a un collega?',
  minimo: 'Per niente probabile',
  massimo: 'Estremamente probabile',
} as const;

/** L'etichetta delle cinque stelle, letta dagli screen reader e dal `title`. */
export const STELLE = [
  'Per niente',
  'Poco',
  'Abbastanza',
  'Molto',
  'Moltissimo',
] as const;

export type Survey = {
  /** L'ultimo pezzo dell'indirizzo: `/surveys/<slug>/`. Non si cambia una volta stampato su un QR. */
  slug: string;
  /** Il titolo della pagina e del pulsante nel menu. */
  titolo: string;
  /** L'occhiello sopra il titolo, e la riga sotto il pulsante nel menu. */
  eyebrow: string;
  /** Una riga: cosa stiamo chiedendo, e perché. Sta in una riga su un telefono da 390px. */
  intro: string;
  /** Tre giudizi a stelle. Tre e non cinque: è una mini survey. */
  domande: { id: string; testo: string }[];
};

/**
 * Gli otto temi.
 *
 * **Tre domande a testa è un tetto, non una media.** Alla quarta la survey
 * smette di essere quella cosa che si compila in coda alla reception e diventa
 * un questionario, e un questionario lo compila chi ha già deciso di
 * lamentarsi — cioè il campione peggiore che si possa raccogliere.
 *
 * Le domande sono scritte **su fatti osservabili** e non su impressioni: «gli
 * spogliatoi li hai trovati puliti» ha una risposta, «come giudichi l'igiene
 * del club» ha un'opinione. Il secondo tipo di domanda produce medie che non si
 * possono usare per decidere niente.
 */
export const SURVEYS: Survey[] = [
  {
    slug: 'assistenza',
    titolo: 'Assistenza e reception',
    eyebrow: 'Il desk',
    intro: 'Com’è andata l’ultima volta che hai chiesto qualcosa al desk o ci hai scritto.',
    domande: [
      { id: 'cortesia', testo: 'La persona che ti ha risposto è stata cortese e disponibile' },
      { id: 'tempi', testo: 'Hai avuto una risposta in tempi ragionevoli' },
      { id: 'risolto', testo: 'La tua richiesta è stata risolta' },
    ],
  },
  {
    slug: 'lezioni',
    titolo: 'Lezioni e istruttori',
    eyebrow: 'In sala e in acqua',
    intro: 'Le lezioni che segui: chi le tiene, come sono fatte, se sono al tuo livello.',
    domande: [
      { id: 'istruttori', testo: 'Gli istruttori sono preparati e ti seguono' },
      { id: 'livello', testo: 'Le lezioni sono adatte al tuo livello' },
      { id: 'palinsesto', testo: 'Negli orari che ti servono trovi le lezioni che cerchi' },
    ],
  },
  {
    slug: 'pulizia',
    titolo: 'Pulizia e spogliatoi',
    eyebrow: 'Gli ambienti',
    intro: 'Spogliatoi, docce, sale: come li hai trovati l’ultima volta che sei venuto.',
    domande: [
      { id: 'spogliatoi', testo: 'Spogliatoi e docce li hai trovati puliti' },
      { id: 'sale', testo: 'Le sale e gli attrezzi erano in ordine' },
      { id: 'ricambi', testo: 'Aria, temperatura e ricambi erano confortevoli' },
    ],
  },
  {
    slug: 'manutenzione',
    titolo: 'Attrezzature e manutenzione',
    eyebrow: 'Le macchine',
    intro: 'Gli attrezzi della sala e tutto quello che si usa allenandosi.',
    domande: [
      { id: 'funzionanti', testo: 'Gli attrezzi che ti servivano erano funzionanti' },
      { id: 'riparazioni', testo: 'Quando qualcosa si rompe viene riparato in fretta' },
      { id: 'quantita', testo: 'Ce n’è abbastanza anche negli orari di punta' },
    ],
  },
  {
    slug: 'piscina',
    titolo: 'Piscina e acqua',
    eyebrow: 'Le vasche',
    intro: 'L’acqua, le corsie, e come si sta in vasca negli orari in cui vieni.',
    domande: [
      { id: 'acqua', testo: 'L’acqua e la temperatura erano come devono essere' },
      { id: 'corsie', testo: 'Le corsie erano abbastanza libere per allenarti' },
      { id: 'bordo', testo: 'Bordo vasca e spogliatoi della piscina erano in ordine' },
    ],
  },
  {
    slug: 'prenotazioni',
    titolo: 'Prenotazioni e app',
    eyebrow: 'Il portale',
    intro: 'Prenotare una lezione, guardare gli orari, gestire il tuo abbonamento.',
    domande: [
      { id: 'facilita', testo: 'Prenotare una lezione è semplice' },
      { id: 'posti', testo: 'Trovi posto nelle lezioni che vuoi fare' },
      { id: 'informazioni', testo: 'Orari e informazioni sono chiari e aggiornati' },
    ],
  },
  {
    slug: 'junior',
    titolo: 'Corsi bambini',
    eyebrow: 'Per i genitori',
    intro: 'Scuola Nuoto, Baby Nuoto, agonistico: com’è per tuo figlio e per te.',
    domande: [
      { id: 'istruttori', testo: 'Gli istruttori seguono i bambini con attenzione' },
      { id: 'progressi', testo: 'Vedi progressi e ti viene raccontato come va' },
      { id: 'organizzazione', testo: 'Turni, recuperi e comunicazioni sono chiari' },
    ],
  },
  {
    slug: 'generale',
    titolo: 'La tua esperienza in generale',
    eyebrow: 'Tutto il club',
    intro: 'Una domanda su tutto: quanto ti trovi bene ad Athlon.',
    domande: [
      { id: 'aspettative', testo: 'Athlon è all’altezza di quello che ti aspettavi' },
      { id: 'accoglienza', testo: 'Ti senti accolto e a tuo agio nel club' },
      { id: 'valore', testo: 'Quello che ricevi vale quello che paghi' },
    ],
  },
];

/** La survey di uno slug, o `undefined`. La usa `getStaticPaths` e basta. */
export function surveyDi(slug: string): Survey | undefined {
  return SURVEYS.find((s) => s.slug === slug);
}

/**
 * Il giudizio è positivo?
 *
 * **Sta qui e non nel client** perché la stessa regola la riapplica n8n prima
 * di scrivere `positivo` su Supabase: due copie di questa soglia rispondono in
 * due modi al primo ritocco, e il ritocco lo fa chi tocca uno solo dei due
 * posti. Da qui si copia, non si reinventa.
 *
 * `media` è `null` quando non c'è nemmeno una stella, `nps` quando la persona
 * non ha toccato la barra: in tutti e due i casi il confronto è falso, cioè
 * **quando non sappiamo non si chiede la recensione**. È la stessa lista bianca
 * del Guest Pass in chat.
 */
export function giudizioPositivo(media: number | null, nps: number | null): boolean {
  if (nps !== null && nps >= SOGLIA.nps) return true;
  if (media !== null && media >= SOGLIA.media) return true;
  return false;
}
