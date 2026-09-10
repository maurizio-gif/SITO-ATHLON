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
  /**
   * I giudizi a stelle, da cinque a sette. Ognuno controlla **una promessa
   * scritta sul sito**, e l'`id` è il nome con cui quella risposta finisce su
   * Supabase e nel pannello: non si rinomina, o le risposte vecchie e le nuove
   * smettono di essere la stessa colonna.
   */
  domande: { id: string; testo: string }[];
  /**
   * La pagina dove quella promessa sta scritta, mostrata in fondo alla survey.
   *
   * È il raccordo nel verso che di solito manca: chi risponde vede cosa
   * avevamo dichiarato, e chi tocca quella pagina trova qui le domande che la
   * controllano. Se un giorno il link non esistesse più, la survey lo direbbe
   * — un rimando morto in fondo a un questionario è visibile, a differenza di
   * una domanda che ha smesso di corrispondere a quello che promettiamo.
   */
  fonte?: { testo: string; href: string };
};

/**
 * Gli otto temi.
 *
 * ## Ogni domanda controlla una promessa che abbiamo fatto
 *
 * Questa è la regola che governa l'elenco, e da cui si scrive la prossima
 * domanda. Il sito dichiara un perimetro preciso — «assistenza bagnino sempre
 * presente», «prenoti dall'app a partire da 3 giorni prima», «se qualcosa
 * cambia lo sai prima», «gruppi da 10 persone con istruttore dedicato», «i
 * brevetti aggiornati circa ogni due mesi» — e una survey che non chiede
 * proprio di quelle cose misura la simpatia, non il servizio. Una domanda
 * generica («com'è la piscina») produce una media che non si può usare per
 * decidere niente; «l'acqua era alla temperatura giusta» dice se abbiamo
 * mantenuto un numero che abbiamo scritto noi.
 *
 * **E il raccordo va nei due versi.** Se scrivendo una domanda ci si accorge
 * che una cosa che facciamo non è scritta da nessuna parte, si scrive prima
 * sulla pagina e poi la si chiede; se una risposta dice che una promessa non
 * regge, la pagina va cambiata prima della domanda. Il campo `fonte` tiene i
 * due lati agganciati: chi risponde vede dove l'avevamo dichiarata, e chi
 * tocca quella pagina trova qui la domanda che la controlla.
 *
 * ## Da cinque a sette, e il numero lo decide l'attività
 *
 * Tre erano poche: bastavano a dire che un tema non andava, non a dire *cosa*.
 * Sette è il tetto, e vale la ragione di prima al contrario — oltre, la survey
 * smette di essere quella cosa che si compila in coda alla reception e diventa
 * un questionario, che compila solo chi ha già deciso di lamentarsi. Quanti
 * dipende da quante promesse quel tema porta: la piscina ne ha sette perché
 * dichiariamo temperatura, corsie, bagnino e turni; la reception cinque.
 *
 * Le domande restano scritte **su fatti osservabili**: «gli spogliatoi li hai
 * trovati puliti» ha una risposta, «come giudichi l'igiene del club» ha
 * un'opinione.
 */
export const SURVEYS: Survey[] = [
  {
    slug: 'assistenza',
    titolo: 'Informazioni e assistenza',
    eyebrow: 'Trovare risposte',
    intro:
      'Le tre strade per avere una risposta: le pagine del sito, l’assistente virtuale e le persone del club.',
    /* **La promessa sui tempi ora è scritta**, quindi la domanda smette di
       chiedere un'impressione: la scheda «In quanto tempo rispondiamo» dichiara
       poche ore, in genere un'ora negli orari di apertura, e la domanda chiede
       esattamente quello. Prima diceva «in tempi ragionevoli», che è una cosa
       su cui ognuno ha un metro suo.

       **Il perimetro è il servizio intero e non il solo desk**, ed è la
       correzione che questa survey ha ricevuto per prima: chi cerca un orario
       lo cerca sul sito, chi ha una domanda di sera la fa alla chat, chi ha un
       problema scrive allo staff — e sono tre esperienze diverse che il club
       offre come una sola. Chiedere solo dell'ultima misura un canale e ne
       lascia due fuori, compresi i due che rispondono ventiquattr'ore su
       ventiquattro.

       L'ultima domanda è quella che le tiene insieme: tre canali che dicono
       tre cose diverse sono il difetto peggiore di un servizio informativo, e
       nessuna delle prime tre lo farebbe emergere. */
    domande: [
      { id: 'sito', testo: 'Sul sito trovi le informazioni che cerchi, senza doverle chiedere' },
      { id: 'assistente', testo: 'L’assistente virtuale in chat ti ha dato una risposta utile' },
      { id: 'cortesia', testo: 'Le persone del club sono state cortesi e disponibili' },
      { id: 'tempi', testo: 'Quando hai scritto al club, la risposta è arrivata entro poche ore' },
      { id: 'risolto', testo: 'La tua richiesta è stata risolta, non solo presa in carico' },
      { id: 'coerenza', testo: 'Sito, chat e persone del club ti dicono la stessa cosa' },
    ],
    fonte: { testo: 'In quanto tempo rispondiamo', href: '/wikiathlon/generali/tempi-di-risposta/' },
  },
  {
    slug: 'lezioni',
    titolo: 'Lezioni e istruttori',
    eyebrow: 'In sala e in acqua',
    intro: 'Le lezioni che segui: chi le tiene, come sono fatte, se sono al tuo livello.',
    /* «Oltre 80 corsi a settimana in tre sale», «piccoli gruppi da 10 persone
       con istruttore dedicato» (Group Reformer), «istruttori federali», e la
       promessa di `prenotazioni.md`: se un istruttore cambia, lo sai prima. La
       domanda sull'orario dichiarato controlla il planning, che è un dato
       nostro pubblicato. */
    domande: [
      { id: 'istruttori', testo: 'Gli istruttori sono preparati e ti seguono durante la lezione' },
      { id: 'livello', testo: 'Le lezioni sono adatte al tuo livello' },
      { id: 'palinsesto', testo: 'Negli orari che ti servono trovi le lezioni che cerchi' },
      { id: 'puntualita', testo: 'Le lezioni cominciano e finiscono all’orario dichiarato' },
      { id: 'gruppo', testo: 'Il numero di persone in sala ti permette di allenarti bene' },
      { id: 'app-aggiornata', testo: 'Quando una lezione cambia, sull’app lo trovi già aggiornato' },
      { id: 'attrezzature', testo: 'Le attrezzature della lezione sono idonee a quello che si fa' },
    ],
    fonte: { testo: 'Il palinsesto della settimana', href: '/planning/' },
  },
  {
    slug: 'pulizia',
    titolo: 'Pulizia e spogliatoi',
    eyebrow: 'Gli ambienti',
    intro: 'Spogliatoi, docce, sale: come li hai trovati l’ultima volta che sei venuto.',
    /* La scheda dei servizi dichiara spogliatoi rinnovati, separati per
       fitness, nuoto adulti e baby, con docce e postazioni phon incluse e 64
       armadietti per parte: sono quattro cose verificabili una per una, ed è
       il motivo per cui questo tema ha sette domande invece di tre. */
    domande: [
      { id: 'spogliatoi', testo: 'Spogliatoi e docce li hai trovati puliti' },
      { id: 'acqua', testo: 'Nelle docce c’era acqua calda e la pressione era buona' },
      { id: 'armadietti', testo: 'Hai trovato un armadietto libero quando ti serviva' },
      { id: 'phon', testo: 'Le postazioni phon erano funzionanti e sufficienti' },
      { id: 'sale', testo: 'Le sale e gli attrezzi erano in ordine' },
      { id: 'ricambi', testo: 'Aria, temperatura e ricambi erano confortevoli' },
      { id: 'bagni', testo: 'Bagni e materiali di consumo erano riforniti' },
    ],
    fonte: { testo: 'Cosa dichiariamo sugli spogliatoi', href: '/wikiathlon/generali/spogliatoi/' },
  },
  {
    slug: 'manutenzione',
    titolo: 'Attrezzature e manutenzione',
    eyebrow: 'Le macchine',
    intro: 'Gli attrezzi della sala e tutto quello che si usa allenandosi.',
    /* Quello che la pagina della Gym Floor dichiara: 400 mq, area cardio
       Matrix 4.0 connessa all'app, isotonica, funzionale Ziva con rig da 8
       metri, manubri fino a 50 kg. «Connessi all'app» è una promessa precisa —
       riprendi da dove avevi lasciato — e o funziona o no.

       **Sulle riparazioni la domanda è una sola, e chiede il ciclo intero.**
       Prima ce n'erano due — «viene riparato in fretta» e «quando segnali,
       qualcuno se ne occupa» — che raccoglievano lo stesso giudizio due volte,
       e la prima chiedeva di una velocità che il club non dichiara: su un
       pezzo di ricambio i tempi sono del fornitore. Quello che il club
       promette, ed è scritto nella scheda, è che la segnalazione viene presa
       in carico e gestita fino alla risoluzione: quella è la cosa da
       verificare. */
    domande: [
      { id: 'funzionanti', testo: 'Gli attrezzi che ti servivano erano funzionanti' },
      { id: 'riparazioni', testo: 'La tua segnalazione è stata presa in carico e risolta' },
      { id: 'quantita', testo: 'Ce n’è abbastanza anche negli orari di punta' },
      { id: 'app', testo: 'I macchinari collegati all’app registrano davvero i tuoi allenamenti' },
      { id: 'ordine', testo: 'Manubri e dischi si trovano al loro posto' },
    ],
    fonte: { testo: 'Cosa c’è nella Gym Floor', href: '/gym-floor/' },
  },
  {
    slug: 'piscina',
    titolo: 'Piscina e acqua',
    eyebrow: 'Le vasche',
    intro: 'L’acqua, le corsie, e come si sta in vasca negli orari in cui vieni.',
    /* Qui il sito dichiara numeri: vasca da 25 metri a 5 corsie, temperatura
       costante fra 28 e 28,5 °C (30–30,5 nella vasca piccola), corsie divise
       per ritmo, assistenza bagnino **sempre** presente, e capienza di ogni
       corsia definita in anticipo — «il turno che prenoti è il tuo». Sette
       domande perché sono sette promesse, e ognuna è un fatto. */
    domande: [
      { id: 'temperatura', testo: 'L’acqua era alla temperatura giusta' },
      { id: 'pulizia-acqua', testo: 'L’acqua era limpida e l’ambiente in ordine' },
      { id: 'corsie', testo: 'Le corsie erano abbastanza libere per allenarti' },
      { id: 'ritmo', testo: 'La divisione delle corsie per ritmo funziona' },
      { id: 'bagnino', testo: 'L’assistente bagnino era presente e attento' },
      { id: 'turno', testo: 'Il turno che avevi prenotato era disponibile come previsto' },
      { id: 'bordo', testo: 'Bordo vasca e spogliatoio della piscina erano in ordine' },
    ],
    fonte: { testo: 'Vasca, corsie e orari', href: '/nuoto-libero/' },
  },
  {
    slug: 'prenotazioni',
    titolo: 'Prenotazioni e app',
    eyebrow: 'Il portale',
    intro: 'Prenotare una lezione, guardare gli orari, gestire il tuo abbonamento.',
    /* `prenotazioni.md` è la scheda con più promesse esplicite del sito, e
       questa survey le ricalca una per una: la finestra dei 3 giorni aperta
       fino all'inizio della lezione, «il posto è tuo e vedi quante persone ci
       sono», «se qualcosa cambia lo sai prima», e i trenta piani nell'app con
       i macchinari che riprendono da dove avevi lasciato. */
    domande: [
      { id: 'facilita', testo: 'Prenotare una lezione è semplice' },
      { id: 'finestra', testo: 'La finestra dei tre giorni ti basta per organizzarti' },
      { id: 'posti', testo: 'Trovi posto nelle lezioni che vuoi fare' },
      { id: 'disdetta', testo: 'Disdire una prenotazione è altrettanto semplice' },
      { id: 'informazioni', testo: 'Nel portale trovi chiare le informazioni sul tuo abbonamento e sulle scadenze' },
      { id: 'app-aggiornata', testo: 'Quando una lezione cambia o salta, sull’app lo trovi già aggiornato' },
      { id: 'affidabilita', testo: 'L’app funziona senza doverci tornare due volte' },
    ],
    fonte: { testo: 'Come funzionano le prenotazioni', href: '/wikiathlon/generali/prenotazioni/' },
  },
  {
    slug: 'junior',
    titolo: 'Corsi bambini',
    eyebrow: 'Per i genitori',
    intro: 'Scuola Nuoto, Baby Nuoto, agonistico: com’è per tuo figlio e per te.',
    /* Il Metodo Athlon è la promessa più dettagliata del sito, e ognuno dei
       suoi quattro pilastri qui è una domanda: il gruppo deciso in vasca e
       l'istruttore assegnato dopo la prima settimana, il cambio di gruppo senza
       cambiare orario, i brevetti aggiornati **circa ogni due mesi** nel
       proprio account, la sessione di giugno. Più il turno fisso e i
       recuperi, che sono le due cose su cui il desk riceve più domande. */
    domande: [
      { id: 'istruttori', testo: 'Gli istruttori seguono i bambini con attenzione' },
      { id: 'progressi', testo: 'Vedi progressi in tuo figlio, lezione dopo lezione' },
      { id: 'brevetti', testo: 'I brevetti nel tuo account sono aggiornati e li capisci' },
      { id: 'gruppo', testo: 'Tuo figlio è nel gruppo giusto per il suo livello' },
      { id: 'organizzazione', testo: 'Turni, cambi e comunicazioni sono chiari' },
      { id: 'recuperi', testo: 'Recuperare una lezione persa è semplice' },
      { id: 'direttore-tecnico', testo: 'Se hai parlato con il Direttore Tecnico, ti ha saputo aiutare' },
    ],
    fonte: { testo: 'Il Metodo Athlon', href: '/scuola-nuoto-bambini/' },
  },
  {
    slug: 'generale',
    titolo: 'La tua esperienza in generale',
    eyebrow: 'Tutto il club',
    intro: 'Una domanda su tutto: quanto ti trovi bene ad Athlon.',
    /* Le due promesse di listino — cosa comprende il tuo abbonamento e per
       quanto vale — e la trasparenza dichiarata nella dedica del menu: qui si
       controlla se il perimetro che il sito descrive è quello che la persona
       ha trovato, che è la domanda da cui nascono le disdette. */
    domande: [
      { id: 'aspettative', testo: 'Athlon è all’altezza di quello che ti aspettavi' },
      { id: 'accoglienza', testo: 'Ti senti accolto e a tuo agio nel club' },
      { id: 'perimetro', testo: 'Il tuo abbonamento comprende quello che pensavi comprendesse' },
      { id: 'trasparenza', testo: 'Costi, scadenze e condizioni ti sono stati detti con chiarezza' },
      { id: 'orari', testo: 'Gli orari di apertura ti permettono di allenarti quando puoi' },
      { id: 'valore', testo: 'Quello che ricevi vale quello che paghi' },
    ],
    fonte: { testo: 'Cosa comprende ogni abbonamento', href: '/abbonamenti/' },
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
