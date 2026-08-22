/**
 * Contenuti delle pagine delle singole attività: i quindici corsi fitness e le
 * tre attività in acqua.
 *
 * Testi, claim e foto vengono dalle pagine del sito precedente (post Elementor
 * 4255–10140). Qui c'è solo ciò che è proprio della pagina: quello che si può
 * già leggere altrove non viene ricopiato.
 *
 *  - orari: dal planning (`lezioni` elenca i nomi con cui il corso compare in
 *    palinsesto, e `LessonSchedule` li cerca lì);
 *  - video e barre delle caratteristiche: dalla scheda lezione del planning
 *    (`planning-lessons.json`), la stessa che apre il modale sugli orari.
 *
 * Così modificando il planning cambiano insieme /planning, /corsi-fitness e
 * queste quindici pagine. `stats` e `video` qui dentro esistono solo per i due
 * casi in cui la scheda lezione non c'è, perché il corso non è in palinsesto
 * questo mese.
 *
 * Tre corsi — Balli di Gruppo, Ginnastica Dolce e Ginnastica Posturale — nel
 * backup hanno una pagina vuota: nessun testo, nessuna foto, nessun video. Per
 * loro il testo è la descrizione della scheda lezione, che è nostra e
 * verificata, e non un testo inventato per riempire la pagina.
 */
import { getLessonCard, type LessonStat } from './planning';

const U = '/wp-content/uploads';

export interface VarianteCorso {
  /**
   * Il modo in cui il corpo sta in acqua: in appoggio, in sospensione, in
   * sella. Serve solo all'Aqua Fitness, dove le cinque lezioni si somigliavano
   * tutte perché la differenza vera — l'altezza dell'acqua e l'attrezzo — era
   * scritta in una nota e non ordinava niente. È un'etichetta di orientamento
   * sopra le stesse schede: nessuna lezione cambia nome e nessuna card è
   * duplicata. `LessonSchedule` e il planning non lo vedono.
   */
  gruppo?: string;
  /** Un dato pratico della lezione, es. l'altezza dell'acqua. */
  nota?: string;
  /** Nome della variante, es. "HBX Boxing". Nei corsi singoli è null. */
  nome: string | null;
  /** Ancora, per linkare la variante da fuori: /hbx#boxing. */
  id?: string;
  testo: string;
  /** Nome in palinsesto: da qui arrivano video e barre. */
  lezione?: string;
  /** Solo quando la scheda lezione non esiste. */
  video?: string;
  stats?: LessonStat[];
  poster?: string;
  /**
   * Il punto focale del poster, come `object-position`, per la stessa ragione
   * per cui ce l'ha la hero: il riquadro delle caratteristiche è quadrato e una
   * foto verticale ci entra ritagliata al centro, che su una foto di studio è
   * il fondo bianco sopra le teste. Vale solo dove il poster è una foto e non
   * il primo fotogramma di un video.
   */
  fuoco?: string;
}

export interface SimileCorso {
  /** Slug del corso da consigliare. */
  slug: string;
  /** Perché piacerà a chi frequenta questo corso: il motivo, non uno slogan. */
  perche: string;
}

export interface Corso {
  slug: string;
  /** Titolo della hero. */
  nome: string;
  /** L'occhiello sopra il titolo. Default: "Corso Fitness". */
  eyebrow?: string;
  /** Titolo della sezione di apertura. Default: "Che cos'è {nome}". */
  titoloIntro?: string;
  /** Occhiello della sezione di apertura. Default "Il corso". */
  eyebrowIntro?: string;
  /** Fascia del planning da cui leggere orari e abbonamenti. Default: corsi-fitness. */
  banda?: string;
  /** Categoria del calendario sul portale. Default: 1, i corsi fitness. */
  categoria?: number;
  /**
   * Come si chiama una singola seduta. Default "lezione": il nuoto libero non ha
   * lezioni ma turni, e chiamarli lezioni farebbe capire un'altra cosa.
   */
  unita?: { s: string; p: string };
  /**
   * Come nominare l'attività dentro le domande delle f.a.q. Default "il corso di
   * {nome}", che però non va per il nuoto libero.
   */
  faqSoggetto?: string;
  /** Il claim sotto il titolo, come nell'originale. */
  claim?: string;
  hero: string;
  /**
   * `object-position` della hero: dove sta il soggetto nella foto.
   *
   * Su mobile la hero è verticale e la foto è orizzontale, quindi resta in campo
   * circa un terzo della larghezza: senza questo, il ritaglio prende il centro
   * geometrico e taglia fuori chi si allena. Il secondo valore tiene il soggetto
   * nella metà alta, perché la metà bassa è coperta dal titolo.
   */
  fuoco: string;
  /** Il testo di apertura, un capoverso per elemento. */
  intro: string[];
  varianti: VarianteCorso[];
  /** Nomi con cui il corso compare nel planning. Vuoto se non è in palinsesto. */
  lezioni: string[];
  /** Cosa serve portare: dalle f.a.q. dell'originale. Ammette HTML. */
  attrezzatura?: string;
  /**
   * I punti che la pagina originale elencava a parte — i vantaggi del nuoto
   * libero, il funzionamento della scuola nuoto. Il titolo è facoltativo:
   * senza, resta il numero.
   */
  punti?: { titolo?: string; testo: string }[];
  /**
   * Un elenco puntato dentro la sezione di apertura, quando la pagina originale
   * ne aveva uno lungo: gli obiettivi della lezione per gestanti sono sette, e
   * come blocchi numerati sarebbero stati una parata.
   */
  elenco?: { titolo: string; voci: string[] };
  /**
   * Risposta alla domanda "è adatto a chi comincia adesso?". Il valore di
   * default vale per i corsi in cui l'istruttore adatta l'esercizio, ma non per
   * il nuoto libero, che richiede un livello: là la risposta va sostituita, non
   * aggiunta, o la pagina si contraddice.
   */
  faqAdatto?: string;
  /**
   * La formula della lezione singola, quando è quella che conta più
   * dell'abbonamento: sostituisce la scheda del piano in "quello che ti serve
   * sapere".
   */
  singola?: { prezzo: string; testo: string };
  /** Risposta su misura alla domanda "è compreso nell'abbonamento?". */
  faqCompreso?: string;
  /**
   * L'etichetta della CTA di esplorazione: «Vedi gli orari» va bene per un
   * corso, non per il nuoto libero (dove contano le corsie) né per la scuola
   * nuoto (dove contano i livelli).
   */
  ctaOrari?: string;
  /**
   * Una CTA di orientamento nell'hero, dove la pagina risponde davvero alla
   * domanda: l'Aqua Fitness manda ai tre modi di stare in acqua. Resta
   * un'esplorazione — diventerà una richiesta quando dietro ci sarà il modal.
   */
  ctaOrienta?: { label: string; href: string };
  /** Domande in più rispetto alle cinque comuni a tutte le attività. */
  faqExtra?: { q: string; a: string; scheda?: string; rimando?: string }[];
  /**
   * Tre corsi affini, in ordine di vicinanza. Le affinità sono quelle reali —
   * stesso tipo di lavoro (forza, controllo, coreografia, combattimento), stesso
   * ritmo o stesso attrezzo — non i corsi che si vogliono spingere.
   */
  simili: SimileCorso[];
  /**
   * Il tag title. Default: "{nome} Roma Talenti – Corso Fitness | Athlon Club",
   * che per le attività in acqua sarebbe sbagliato.
   */
  titolo?: string;
  /** Meta description. */
  descrizione: string;
}

export const CORSI: Corso[] = [
  {
    slug: 'antigravity',
    nome: 'Antigravity®',
    claim: 'Yoga e pilates, appesi a un’amaca.',
    hero: `${U}/2024/08/WM_07842-1-scaled.jpg`,
    fuoco: '72% 38%',
    intro: [
      'Antigravity Fitness® è una disciplina innovativa che unisce yoga, pilates e acrobatica, utilizzando un tessuto sospeso al soffitto per creare un’esperienza di allenamento unica. Questo “tessuto”, simile a un’amaca, sostiene il corpo, permettendo di eseguire tecniche di sospensione che alleviano la pressione sulle articolazioni e favoriscono l’allungamento muscolare.',
      'Le posizioni si eseguono dentro e sopra il tessuto, in appoggio o in sospensione, e si lavora su flessibilità, forza ed equilibrio. In sospensione il peso del corpo è sostenuto dall’amaca, non dalle articolazioni.',
    ],
    varianti: [{ nome: null, testo: '', lezione: 'Antigravity', poster: `${U}/2024/08/DSC08475-scaled.jpg` }],
    lezioni: ['Antigravity'],
    attrezzatura:
      'Abbigliamento sportivo aderente, un asciugamano personale e acqua. Le lezioni si fanno a piedi nudi o con calzini antiscivolo.',
    simili: [
      { slug: 'pilates', perche: 'Lo stesso lavoro di controllo e di centro, a terra sul tappetino.' },
      { slug: 'yoga', perche: 'Posizioni, respirazione e allungamento, senza l’amaca.' },
      { slug: 'motr', perche: 'Un altro attrezzo che unisce pilates, equilibrio e mobilità.' },
    ],
    descrizione:
      'Antigravity Fitness® ad Athlon Club Roma Talenti: yoga, pilates e acrobatica in sospensione su amaca. Orari, caratteristiche della lezione e come prenotare.',
  },
  {
    slug: 'balli-di-gruppo',
    nome: 'Balli di Gruppo',
    claim: 'Coreografie semplici, in gruppo.',
    hero: `${U}/2024/08/balli-di-gruppo.jpg`,
    fuoco: '61% 34%',
    intro: [
      'Lezione di gruppo a ritmo di musica, con coreografie semplici da seguire: si balla insieme, si allena la coordinazione e si fa attività cardiovascolare senza accorgersene.',
      'È fra i corsi più frequentati da chi non ama la sala pesi e vuole muoversi divertendosi. Non serve saper ballare: i passi si imparano in lezione, e ogni sessione riprende da dove si era arrivati.',
    ],
    varianti: [{ nome: null, testo: '', lezione: 'Balli di Gruppo', poster: `${U}/2024/08/balli-di-gruppo.jpg` }],
    lezioni: ['Balli di Gruppo'],
    attrezzatura: 'Abbigliamento sportivo e scarpe da ginnastica pulite, un asciugamano personale e acqua.',
    simili: [
      { slug: 'gpcoreo', perche: 'Ancora coreografia e musica, con la tecnica della danza dentro l’allenamento.' },
      { slug: 'booty-workout', perche: 'Passi di danza e musica, con più lavoro su cosce e glutei.' },
      { slug: 'ginnastica-dolce', perche: 'Se ti piace il gruppo ma cerchi un ritmo più tranquillo.' },
    ],
    descrizione:
      'Balli di gruppo ad Athlon Club Roma Talenti: coreografie semplici, musica e lavoro cardiovascolare. Orari della settimana e come prenotare.',
  },
  {
    slug: 'body-pump',
    nome: 'Body Pump®',
    claim: 'Bilanciere, carichi leggeri, tante ripetizioni.',
    hero: `${U}/2024/08/WM_07735-scaled.webp`,
    fuoco: '50% 40%',
    intro: [
      'Un allenamento per tutto il corpo che sviluppa la resistenza muscolare, scolpisce i muscoli, migliora la stabilità, gli addominali, la densità ossea ed il metabolismo.',
      'Istruttori formati nelle ultime tecniche di insegnamento guidano i partecipanti attraverso un mix di esercizi di rinforzo muscolare, indicazioni tecniche ben precise ed incoraggiamenti. Il tutto a ritmo di una super musica, per permettere a tutti di superare i propri limiti e di essere molto più motivati ed efficaci rispetto a quando ci si allena soli nella zona pesi.',
      'Benefici: sviluppa muscoli tonici ed atletici, migliora il metabolismo e riduce la massa grassa.',
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Les Mills Body Pump', poster: `${U}/2024/08/DSC08297-2-1-scaled.jpg` },
    ],
    /* Il nome in palinsesto è "Body Pump" (senza "Les Mills davanti"): è quello
       che decide gli orari di questa pagina — vedi `slots` in `[corso].astro`.
       Il video e la descrizione della sezione "Caratteristiche" restano
       agganciati a "Les Mills Body Pump" sopra, che è la chiave scritta in
       `planning-lessons.json`; l'alias in `planning.ts` (`LESSON_ALIASES`)
       fa combaciare le due forme per il modal del planning. */
    lezioni: ['Body Pump'],
    attrezzatura: 'Abbigliamento sportivo e scarpe adeguate, un asciugamano personale e acqua.',
    simili: [
      { slug: 'strenght', perche: 'Sempre bilanciere, programmato sulla forza invece che sulla resistenza.' },
      { slug: 'body-sculpt', perche: 'Tonificazione a circuito, con manubri e step oltre al bilanciere.' },
      { slug: 'calisthenics', perche: 'La stessa forza, usando il peso del corpo al posto dei carichi.' },
    ],
    descrizione:
      'Body Pump® ad Athlon Club Roma Talenti: il corso di tonificazione con bilanciere di Les Mills. Caratteristiche della lezione e orari.',
  },
  {
    slug: 'body-sculpt',
    nome: 'Body Sculpt',
    claim: 'Tonificazione a corpo libero e con piccoli attrezzi.',
    hero: `${U}/2024/07/AdobeStock_199850289-scaled.jpeg`,
    fuoco: '50% 28%',
    intro: [
      'Body Sculpt è un allenamento a circuito completo, progettato per scolpire, rafforzare e riequilibrare il corpo in modo efficace e sostenibile. Questa disciplina combina esercizi a corpo libero con l’uso mirato di bilancieri, step e manubri, stimolando tutti i gruppi muscolari in una sola sessione.',
      'L’obiettivo di Body Sculpt è migliorare la postura, la coordinazione e la capacità aerobica, attraverso un lavoro progressivo che aumenta la tonicità muscolare e il controllo del movimento. È l’allenamento ideale per chi desidera un corpo armonioso, forte e ben definito, ritrovando equilibrio e benessere fisico.',
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Body Sculpt', poster: `${U}/2024/07/AdobeStock_276132391-scaled.jpeg` },
    ],
    lezioni: ['Body Sculpt'],
    attrezzatura: 'Abbigliamento sportivo e scarpe adeguate, un asciugamano personale e acqua.',
    simili: [
      { slug: 'body-pump', perche: 'La stessa tonificazione, tutta con il bilanciere e a tempo di musica.' },
      { slug: 'booty-workout', perche: 'Se vuoi concentrare il lavoro sulla parte bassa del corpo.' },
      { slug: 'calisthenics', perche: 'Circuito a corpo libero, con un’intensità più alta.' },
    ],
    descrizione:
      'Body Sculpt ad Athlon Club Roma Talenti: circuito con bilancieri, step e manubri per tonificare tutto il corpo. Orari e caratteristiche.',
  },
  {
    slug: 'booty-workout',
    nome: 'Booty Workout',
    claim: 'Cinquanta minuti a tempo, per gambe e glutei.',
    hero: `${U}/2024/08/Giulia-Pagliaccia-75-1-scaled.jpg`,
    fuoco: '60% 44%',
    intro: [
      'Il Booty Workout è un allenamento dinamico ispirato al popolare format americano Booty Barre, che combina esercizi cardiovascolari e metabolici con elementi di danza, yoga e pilates.',
      'Progettato per scolpire e tonificare i muscoli di cosce e glutei, questo workout è l’ideale per chi desidera bruciare calorie e migliorare la propria forma fisica in modo divertente ed efficace. Perfetto per chi vuole ottenere un “booty” tonico e definito, il Booty Workout è un mix energizzante che trasforma ogni sessione in un’esperienza di fitness completa e coinvolgente.',
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Booty Workout', poster: `${U}/2024/08/Giulia-Pagliaccia-79-scaled.jpg` },
    ],
    lezioni: ['Booty Workout'],
    attrezzatura:
      'Abbigliamento sportivo e scarpe adeguate, un asciugamano personale e acqua. È richiesto l’acquisto di <a href="https://amzn.eu/d/8AcPnRe" target="_blank" rel="noopener">questi elastici</a>, che userai a ogni lezione.',
    simili: [
      { slug: 'gpcoreo', perche: 'Danza e fitness insieme, con una coreografia da seguire.' },
      { slug: 'body-sculpt', perche: 'Tonificazione su tutto il corpo, non solo su cosce e glutei.' },
      { slug: 'yoga', perche: 'Yogassè nasce dalla stessa idea: sbarra, danza e mobilità.' },
    ],
    descrizione:
      'Booty Workout ad Athlon Club Roma Talenti: allenamento per cosce e glutei ispirato al Booty Barre. Orari della settimana e cosa portare.',
  },
  {
    slug: 'calisthenics',
    nome: 'Calisthenics',
    claim: 'Usa il tuo corpo',
    hero: `${U}/2024/08/IMG_0075-scaled-1.webp`,
    fuoco: '78% 44%',
    intro: [
      'Allenamento a corpo libero che utilizza il proprio peso corporeo come mezzo per migliorare la forza, la mobilità articolare, la resistenza, l’equilibrio e di conseguenza la forma fisica in generale.',
      'Il Calisthenics racchiude l’insieme dei movimenti eseguiti in maniera ritmica con sovraccarico naturale — piegamenti, sit-up, trazioni alla sbarra, planche — o con un’attrezzatura base, aventi come fulcro il CORE, stabilizzatore di ogni posizione e punto di connessione tra tutti i piani di azione del corpo. Una lezione ad alta intensità, dinamica e divertente ma adatta a tutti i livelli di fitness.',
    ],
    varianti: [{ nome: null, testo: '', lezione: 'Calisthenics', poster: `${U}/2024/08/IMG_0075-scaled-1.webp` }],
    lezioni: ['Calisthenics'],
    attrezzatura: 'Abbigliamento sportivo e scarpe adeguate, un asciugamano personale e acqua.',
    simili: [
      { slug: 'strenght', perche: 'La stessa ricerca di forza, con i pesi e una progressione programmata.' },
      { slug: 'hbx', perche: 'Alta intensità e attrezzi funzionali, in small group.' },
      { slug: 'body-pump', perche: 'Se vuoi aggiungere il carico esterno al lavoro a corpo libero.' },
    ],
    descrizione:
      'Calisthenics ad Athlon Club Roma Talenti: allenamento a corpo libero su forza, mobilità e core. Orari e caratteristiche della lezione.',
  },
  {
    slug: 'difesa-personale',
    nome: 'Difesa Personale',
    claim: 'Jeet Kune Do e PFS',
    hero: `${U}/2025/11/ATHLON1-scaled.jpg`,
    fuoco: '45% 36%',
    intro: [
      'Il JKD non insegna tecniche superiori, ma sviluppa un combattimento efficace e attributi superiori. Non ci sono tecniche superiori nelle arti marziali, bensì metodi di allenamento superiori. L’obiettivo è quello di usare una tecnica per il più breve tempo possibile, finché la portata o la situazione non cambia, richiedendo un’altra tecnica, possibilmente di un’altra arte marziale.',
      'Mediante il Jeet Kune Do e la PFS (Progressive Fighting System) si imparerà ad utilizzare non solo braccia e gambe, ma anche oggetti di uso quotidiano, bastoni, coltelli.',
      'È un percorso che prevede insegnamenti base come coordinazione e resistenza, che serviranno per imparare gli attributi fondamentali quali footwork, sensibilità e velocità, utili per il corretto studio delle tecniche.',
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Difesa Personale', poster: `${U}/2025/11/ATHLON1-scaled.jpg` },
    ],
    lezioni: ['Difesa Personale'],
    attrezzatura:
      'Guantoni da boxe o MMA — le prime lezioni li forniamo noi, poi è consigliato l’acquisto — bastoni da kali filippino, coltello da studio, caschetto, protezioni per le tibie e conchiglia.',
    simili: [
      { slug: 'hbx', perche: 'HBX Boxing porta le tecniche del pugilato dentro un allenamento funzionale.' },
      { slug: 'calisthenics', perche: 'Il condizionamento a corpo libero che serve a reggere le tecniche.' },
      { slug: 'strenght', perche: 'Forza e potenza: la base fisica di qualsiasi tecnica.' },
    ],
    descrizione:
      'Corso di difesa personale ad Athlon Club Roma Talenti: Jeet Kune Do e Progressive Fighting System. Orari, attrezzatura e caratteristiche.',
  },
  {
    slug: 'ginnastica-dolce',
    nome: 'Ginnastica Dolce',
    claim: 'Ritmo lento, articolazioni al centro.',
    hero: `${U}/2024/08/Ginnastica-Dolce-Athlon.jpg`,
    fuoco: '48% 38%',
    intro: [
      'Lezione a bassa intensità dedicata a mobilità articolare, tonificazione leggera e respirazione. Il lavoro è progressivo e sempre adattabile: ogni esercizio ha una versione più semplice, e l’istruttore la propone quando serve.',
      'È il corso giusto per riprendere a muoversi dopo una pausa lunga, per chi cerca un’attività costante senza sovraccarichi, e per chi affianca alla palestra un percorso di recupero.',
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Ginnastica Dolce', poster: `${U}/2024/08/Ginnastica-Dolce-Athlon.jpg` },
    ],
    lezioni: ['Ginnastica Dolce'],
    attrezzatura: 'Abbigliamento comodo, scarpe da ginnastica, un asciugamano personale e acqua.',
    simili: [
      { slug: 'ginnastica-posturale', perche: 'Lo stesso ritmo, con il lavoro mirato su postura e allungamento.' },
      { slug: 'pilates', perche: 'Un passo più strutturato, restando a bassa intensità.' },
      { slug: 'balli-di-gruppo', perche: 'Muoversi a tempo di musica, sempre senza sovraccarichi.' },
    ],
    descrizione:
      'Ginnastica dolce ad Athlon Club Roma Talenti: mobilità articolare e tonificazione leggera, a bassa intensità. Orari della settimana.',
  },
  {
    slug: 'ginnastica-posturale',
    nome: 'Ginnastica Posturale',
    claim: 'Un’ora sul controllo della postura.',
    hero: `${U}/2024/08/P1160261-1536x865.jpg`,
    fuoco: '62% 44%',
    intro: [
      'Lavoro mirato su postura, allungamento e rinforzo dei muscoli profondi del tronco, con esercizi lenti e controllati. L’obiettivo non è la fatica: è ritrovare mobilità dove si è perduta e sciogliere le tensioni che vengono dalle ore alla scrivania o in auto.',
      'La lezione è adatta a tutte le età e a tutti i livelli. Se hai un problema specifico segnalalo all’istruttore all’inizio della lezione: gli esercizi si adattano.',
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Ginnastica Posturale', poster: `${U}/2024/08/P1160261-1536x865.jpg` },
    ],
    lezioni: ['Ginnastica Posturale'],
    attrezzatura: 'Abbigliamento comodo, un asciugamano personale e acqua. Si lavora sul tappetino, a piedi nudi o con calzini antiscivolo.',
    simili: [
      { slug: 'pilates', perche: 'Gli stessi principi, con una progressione più tecnica.' },
      { slug: 'ginnastica-dolce', perche: 'Mobilità e tonificazione leggera, ancora più graduali.' },
      { slug: 'motr', perche: 'Lo stesso lavoro di controllo, con l’aiuto dell’attrezzo.' },
    ],
    descrizione:
      'Ginnastica posturale ad Athlon Club Roma Talenti: allungamento, mobilità e rinforzo del core con esercizi controllati. Orari e caratteristiche.',
  },
  {
    slug: 'gpcoreo',
    nome: 'GP Coreo',
    claim: 'La tecnica della danza, dentro un allenamento.',
    hero: `${U}/2025/11/ATHLON65-scaled.jpg`,
    fuoco: '45% 38%',
    intro: [
      'Quando la dinamica del fitness incontra l’armonia della danza nasce GP Coreo: un format dinamico e coinvolgente pensato per chi desidera allenarsi divertendosi e ballando. La lezione si ispira alle basi della tecnica di “barre” della danza, rielaborate in chiave moderna, fluida e accessibile a tutti.',
      'Il risultato è un allenamento completo e cardiovascolare che migliora coordinazione, tono muscolare e resistenza. Durante la lezione viene costruita una coreografia guidata, sempre diversa, semplice da seguire e allenante, che permette di esprimersi in modo naturale e armonioso.',
      'GP Coreo è la scelta ideale per chi cerca un’attività fitness originale, motivante e capace di unire tecnica, musica ed energia in un’unica esperienza.',
    ],
    varianti: [{ nome: null, testo: '', lezione: 'GP Coreo', poster: `${U}/2025/03/ATHLON87-scaled.jpg` }],
    lezioni: ['GP Coreo'],
    attrezzatura: 'Abbigliamento sportivo, calzini antiscivolo, un asciugamano personale e acqua.',
    simili: [
      { slug: 'balli-di-gruppo', perche: 'Ballare in gruppo, senza la parte tecnica della sbarra.' },
      { slug: 'booty-workout', perche: 'Sbarra e danza, con il focus su cosce e glutei.' },
      { slug: 'yoga', perche: 'Yogassè: la stessa fusione di danza e yoga.' },
    ],
    descrizione:
      'GP Coreo ad Athlon Club Roma Talenti: danza e fitness in un’unica lezione, con coreografia guidata. Orari e caratteristiche del corso.',
  },
  {
    slug: 'hbx',
    nome: 'HBX',
    claim: 'Sacco, guantoni e lavoro a intervalli. Fusion o Boxing.',
    hero: `${U}/2024/08/WM_08286-1-scaled.jpg`,
    fuoco: '79% 44%',
    intro: [
      'HBX — Human Body Exercise — è il risultato delle ultime ricerche scientifiche mondiali ed è approvato da diverse Federazioni Olimpiche. Con una partnership con i migliori esperti dell’allenamento, della nutrizione e del coaching, HBX consente di offrire una vera experience ed un accompagnamento senza eguali, in small group, con risultati reali e quantificabili, migliorando in tal modo la salute e le performance.',
      'Ad Athlon HBX si declina in due lezioni diverse: puoi frequentarle entrambe, sono comprese nello stesso abbonamento.',
    ],
    varianti: [
      {
        nome: 'HBX Boxing',
        id: 'boxing',
        lezione: 'HBX Boxing',
        poster: `${U}/2025/03/Athlon166-scaled.jpg`,
        testo:
          'HBX Boxing è un programma di allenamento che combina le tecniche del pugilato con esercizi funzionali ad alta intensità, offrendo un’esperienza completa e dinamica. Questa lezione integra l’uso di attrezzi come sacchi da boxe e battle rope, creando un mix equilibrato tra forza, resistenza e coordinazione. Adatto a tutti i livelli di fitness, HBX Boxing mira a migliorare la performance fisica globale, aumentando la potenza muscolare, l’agilità e la velocità.',
      },
      {
        nome: 'HBX Fusion',
        id: 'fusion',
        lezione: 'HBX Fusion',
        poster: `${U}/2024/08/DSC08480-scaled.jpg`,
        testo:
          'HBX Fusion è un programma di allenamento che combina esercizi funzionali, movimenti naturali e tecniche di alta intensità per offrire un workout completo e dinamico. Questa lezione integra l’uso di attrezzi come kettlebell, battle rope e TRX, creando un mix equilibrato tra forza, resistenza e mobilità. Adatto a tutti i livelli di fitness, mira a migliorare la performance fisica globale, aumentando la coordinazione, l’agilità e la potenza muscolare.',
      },
    ],
    lezioni: ['HBX Boxing', 'HBX Fusion'],
    attrezzatura:
      'Abbigliamento sportivo e scarpe adeguate, un asciugamano personale e acqua. Per HBX Boxing i guantoni: le prime lezioni te li forniamo noi, poi ne consigliamo l’acquisto.',
    simili: [
      { slug: 'strenght', perche: 'Se di HBX ti piace la parte di forza, qui è tutto il programma.' },
      { slug: 'calisthenics', perche: 'Alta intensità a corpo libero, con lo stesso spirito.' },
      { slug: 'difesa-personale', perche: 'Se il tuo preferito è Boxing, qui si passa alla tecnica.' },
    ],
    descrizione:
      'HBX ad Athlon Club Roma Talenti: Boxing e Fusion, allenamento funzionale in small group approvato da diverse Federazioni Olimpiche.',
  },
  {
    slug: 'motr',
    nome: 'Motr®',
    claim: 'Un attrezzo instabile, tre discipline in una lezione.',
    hero: `${U}/2024/08/MOTR_1.jpg`,
    fuoco: '38% 40%',
    intro: [
      'Un allenamento completo in 50 minuti: cardio, equilibrio e tonificazione. Il protocollo di lavoro unisce i principi di tre diversi workout in un unico attrezzo — pilates, yoga e potenziamento muscolare.',
      'Gli esercizi di allineamento, equilibrio, controllo del core e gli schemi di movimento funzionali variano facilmente e sono adatti a qualsiasi livello di fitness.',
    ],
    varianti: [{ nome: null, testo: '', lezione: 'MOTR®', poster: `${U}/2024/08/motr-1.jpg` }],
    lezioni: ['MOTR®'],
    attrezzatura: 'Abbigliamento sportivo, un asciugamano personale e acqua. Si lavora con calzini antiscivolo.',
    simili: [
      { slug: 'pilates', perche: 'Gli stessi principi, a terra sul tappetino.' },
      { slug: 'ginnastica-posturale', perche: 'Controllo e mobilità, con un ritmo più lento.' },
      { slug: 'antigravity', perche: 'Un altro attrezzo che cambia il modo di lavorare sul corpo.' },
    ],
    descrizione:
      'Motr® ad Athlon Club Roma Talenti: pilates, yoga e potenziamento in un unico attrezzo, in 50 minuti. Orari e caratteristiche della lezione.',
  },
  {
    slug: 'pilates',
    nome: 'Pilates',
    claim: 'Matwork e Matwork 4.1: due lezioni sul tappetino.',
    hero: `${U}/2024/08/IMG_2499-scaled.jpg`,
    fuoco: '32% 40%',
    intro: [
      'Il nostro programma di Pilates è strutturato per sviluppare forza funzionale, flessibilità articolare, equilibrio dinamico e coordinazione neuromuscolare. Attraverso una serie di esercizi che integrano movimenti precisi e controllati, questo metodo lavora sui muscoli profondi del core, migliorando la stabilità del tronco e la postura globale. Ogni sessione combina esercizi di mobilizzazione della colonna vertebrale, allungamento attivo e rafforzamento muscolare per un corpo tonico e allineato.',
      'Sul tappetino ci sono due lezioni, comprese nello stesso abbonamento: il Pilates Matwork, che lavora sul controllo a bassa intensità, e Matwork 4.1, che prende gli stessi esercizi e li organizza in sequenze più dinamiche. Le barre qui sotto misurano la differenza.',
    ],
    varianti: [
      {
        nome: 'Pilates Matwork',
        id: 'matwork',
        lezione: 'Pilates Matwork',
        poster: `${U}/2024/08/IMG_2547-1-scaled.jpg`,
        testo:
          'Si lavora a bassa intensità, con la respirazione guidata dall’istruttore e un numero contenuto di ripetizioni per esercizio: conta come si esegue il movimento, non quante volte. La lezione tiene insieme mobilizzazione della colonna, allungamento attivo e rafforzamento dei muscoli profondi del core.',
      },
      {
        nome: 'Matwork 4.1',
        id: 'matwork-41',
        lezione: 'Mat 4.1',
        poster: `${U}/2026/08/Matwork-41-Athlon.jpg`,
        fuoco: '50% 74%',
        testo:
          'Matwork 4.1 prende alcuni esercizi del metodo Pilates e li porta su un piano più dinamico e funzionale: sequenze precise e progressive che, lezione dopo lezione, si legano in un flow. Si lavora insieme su forza, stabilità, mobilità, flessibilità e controllo motorio, e quello che migliora è la qualità del movimento. È accessibile a tutti e stimolante per chiunque: una lezione intensa e coinvolgente, con una sfida nuova ogni volta.',
      },
    ],
    /* In palinsesto Matwork 4.1 è scritto «Mat 4.1», che è come il club lo
       abbrevia nella griglia. Ci sono entrambe le forme perché il nome è la
       chiave con cui questa pagina trova i suoi orari: se un mese venisse
       scritto per intero, la tabella si svuoterebbe in silenzio. */
    lezioni: ['Pilates Matwork', 'Mat 4.1', 'Matwork 4.1'],
    attrezzatura:
      'Abbigliamento sportivo aderente, un asciugamano personale e acqua. Si lavora sul tappetino, a piedi nudi o con calzini antiscivolo.',
    simili: [
      { slug: 'motr', perche: 'Gli stessi principi, con un attrezzo che aggiunge equilibrio e resistenza.' },
      { slug: 'ginnastica-posturale', perche: 'Se cerchi soprattutto postura e allungamento.' },
      { slug: 'yoga', perche: 'Respirazione e mobilità, con la parte mentale in primo piano.' },
    ],
    descrizione:
      'Pilates ad Athlon Club Roma Talenti: Matwork e Matwork 4.1, fra controllo del movimento e sequenze dinamiche. Orari e caratteristiche delle lezioni.',
  },
  {
    slug: 'strenght',
    nome: 'Strength Development™',
    claim: 'Dimentica il volume. Costruisci forza che serve davvero',
    hero: `${U}/2025/08/2024-SEPT-ADIDAS-X-LES-MILLS-FW24-BERLIN-STRENGTH-IMAGE-3-scaled.jpg`,
    fuoco: '62% 38%',
    intro: [
      'Un programma inedito per sviluppare la forza in tutte le sue forme. LES MILLS Strength Development™ è pensato per chi vuole costruire forza vera, migliorare la potenza e accrescere la propria capacità atletica, grazie a un approccio scientifico e progressivo all’allenamento con i pesi.',
      'Ogni lezione è strutturata sui principi fondamentali dell’allenamento di forza: movimenti controllati e consapevoli, esercizi funzionali, training specifico per il core.',
      'Aspettati un miglioramento concreto in termini di forza, potenza e forma fisica generale. È un percorso perfetto per chi cerca risultati reali senza diventare “troppo grosso”: il focus è sulla performance e sul benessere, non sul volume. Ideale sia per chi inizia a sollevare pesi sia per chi vuole portare il proprio allenamento a un livello superiore.',
    ],
    varianti: [
      {
        nome: null,
        testo: '',
        lezione: 'Strength Development',
        poster: `${U}/2025/08/2024-SEPT-ADIDAS-X-LES-MILLS-FW24-BERLIN-STRENGTH-IMAGE-6-scaled.jpg`,
      },
    ],
    lezioni: ['Strength Development'],
    attrezzatura: 'Abbigliamento sportivo e scarpe adeguate, un asciugamano personale e acqua.',
    simili: [
      { slug: 'body-pump', perche: 'Sempre bilanciere, con più ritmo e più ripetizioni.' },
      { slug: 'hbx', perche: 'Forza applicata in small group, con attrezzi funzionali.' },
      { slug: 'calisthenics', perche: 'Forza a corpo libero: si completano bene.' },
    ],
    descrizione:
      'Les Mills Strength Development™ ad Athlon Club Roma Talenti: forza, potenza e capacità atletica con i pesi. Orari e caratteristiche.',
  },
  {
    slug: 'yoga',
    nome: 'Yoga',
    claim: 'Hatha, Power e Yogassè: tre lezioni diverse.',
    hero: `${U}/2024/07/AdobeStock_137057659-scaled.jpeg`,
    fuoco: '42% 42%',
    intro: [
      'Benvenuto nel nostro angolo dedicato al benessere attraverso lo yoga. Offriamo tre pratiche diverse: l’Hatha Yoga, che equilibra corpo e mente con posizioni e respirazione; il Power Yoga, un allenamento dinamico per aumentare forza e resistenza; e lo Yogassè, una fusione di yoga, barre e danza che favorisce rilassamento e flessibilità.',
      'Sono tutte comprese nello stesso abbonamento: puoi provarle e scegliere quella che ti somiglia di più.',
    ],
    varianti: [
      {
        nome: 'Hatha Yoga',
        id: 'hatha',
        lezione: 'Hatha Yoga',
        poster: `${U}/2024/08/Yoga-Athlon.jpg`,
        testo:
          'L’Hatha Yoga è una pratica tradizionale che unisce asana (posizioni fisiche), pranayama (tecniche di respirazione) e meditazione per promuovere l’equilibrio tra corpo e mente. Questa forma di yoga si concentra sull’esecuzione delle posizioni in modo controllato e sostenuto, favorendo la forza e la flessibilità muscolare, oltre a migliorare la postura e la consapevolezza corporea. Le sessioni sono adatte a tutti i livelli, con un ritmo più lento e l’opportunità di esplorare le posizioni in profondità.',
      },
      {
        nome: 'Power Yoga',
        id: 'power',
        lezione: 'Power Yoga',
        poster: `${U}/2025/03/Athlon193-scaled.jpg`,
        testo:
          'Il Power Yoga è una forma dinamica e intensa di yoga che combina forza, flessibilità e resistenza in un unico allenamento. Questo stile moderno, ispirato all’Ashtanga yoga, si focalizza su una sequenza fluida di posizioni eseguite in sincronia con una respirazione controllata, favorendo la connessione tra movimento e respiro. Ogni sessione aumenta la frequenza cardiaca e stimola il metabolismo, ed è ideale per chi desidera migliorare la tonificazione muscolare.',
      },
      {
        nome: 'Yogassè',
        id: 'yogasse',
        lezione: 'Yogassè',
        poster: `${U}/2024/08/IMG_2547-1-scaled.jpg`,
        testo:
          'Yogassè unisce elementi di yoga, barre fit, danza e GP Coreo. La lezione comincia con movimenti alla sbarra, prosegue con esercizi di mobilità e chiude con una coreografia che combina asana dello yoga dinamico, transizioni e passi della danza contemporanea.',
      },
    ],
    lezioni: ['Hatha Yoga', 'Power Yoga', 'Yogassè'],
    attrezzatura:
      'Abbigliamento comodo, un asciugamano personale e acqua. Si pratica a piedi nudi sul tappetino; il materassino lo trovi in sala.',
    simili: [
      { slug: 'pilates', perche: 'Centro, respiro e controllo, con un lavoro più muscolare.' },
      { slug: 'antigravity', perche: 'Le stesse posizioni, sostenute da un’amaca.' },
      { slug: 'gpcoreo', perche: 'Se il tuo preferito è Yogassè, qui c’è tutta la parte di danza.' },
    ],
    descrizione:
      'Yoga ad Athlon Club Roma Talenti: Hatha Yoga, Power Yoga e Yogassè, tutti compresi nello stesso abbonamento. Orari e caratteristiche.',
  },
  {
    slug: 'aqua-fitness',
    nome: 'Aqua Fitness',
    ctaOrienta: { label: 'Trova il tuo allenamento in acqua', href: '#lezioni' },
    eyebrow: 'Athlon Aqua',
    claim: 'L’acqua è l’attrezzo.',
    titoloIntro: 'Ti spinge indietro a ogni movimento',
    eyebrowIntro: 'Perché in acqua',
    banda: 'aqua-fitness',
    categoria: 4,
    faqSoggetto: 'l’Aqua Fitness',
    hero: `${U}/2025/03/Athlon95-scaled.jpg`,
    fuoco: '50% 35%',
    intro: [
      'L’acqua oppone resistenza al movimento e allo stesso tempo riduce il carico del peso corporeo: si spinge contro qualcosa in tutte le direzioni, e le articolazioni lavorano scaricate. È la ragione per cui la stessa vasca ospita una lezione ad alta intensità e una a ritmo lento.',
      'Cinque lezioni, tre modi di stare in acqua: in appoggio sul fondo, in sospensione nella vasca grande o in sella alla bike. Le trovi tutte qui sotto, con l’altezza dell’acqua di ciascuna.',
    ],
    varianti: [
      {
        nome: 'Aqua Aerobic',
        gruppo: 'In appoggio',
        id: 'aqua-aerobic',
        lezione: 'Aqua Aerobic',
        poster: `${U}/2025/03/Athlon99-scaled.jpg`,
        nota: 'Altezza dell’acqua 120 cm',
        testo:
          'Movimenti aerobici a ritmo di musica, con i piedi che toccano il fondo. Si lavora su resistenza cardiovascolare, coordinazione e tonificazione: la resistenza dell’acqua rende più impegnativo ogni gesto, e allo stesso tempo tiene scaricate le articolazioni.',
      },
      {
        nome: 'Aqua Tonic',
        gruppo: 'In appoggio',
        id: 'aqua-tonic',
        lezione: 'Aqua Tonic',
        poster: `${U}/2025/03/Athlon99-scaled.jpg`,
        nota: 'Altezza dell’acqua 120 cm',
        testo:
          'La lezione in appoggio più intensa: tonificazione, resistenza e forza, con tutti i gruppi muscolari coinvolti. Ogni movimento richiede un impegno maggiore per la resistenza dell’acqua, senza sovraccaricare le articolazioni.',
      },
      {
        nome: 'Aqua Soft',
        gruppo: 'In appoggio',
        id: 'aqua-soft',
        lezione: 'Aqua Soft',
        poster: `${U}/2024/08/acquasoft1.jpg`,
        nota: 'Altezza dell’acqua 120 cm',
        testo:
          'Ritmo lento e basso impatto, sempre con i piedi sul fondo: esercizi fluidi che lavorano su mobilità articolare e tonificazione. È la lezione in appoggio meno intensa delle tre.',
      },
      {
        nome: 'Aqua Training',
        gruppo: 'In sospensione',
        id: 'aqua-training',
        lezione: 'Aqua Training',
        /* La scheda del planning non ha ancora il video: resta quello della
           pagina originale. */
        video: 'https://www.athlonroma.it/wp-content/uploads/2024/11/AQUA-TRAINING-1.mp4',
        poster: `${U}/2024/11/aqua-training.jpg`,
        nota: 'Vasca grande, altezza da 140 a 250 cm',
        testo:
          'In vasca grande, dove i piedi non toccano: si lavora in sospensione con andature e tecniche di nuoto, e il corpo lavora anche per restare in assetto. È la lezione in acqua più impegnativa, su resistenza aerobica, forza e potenza.',
      },
      {
        nome: 'Hydrobike',
        gruppo: 'In sella',
        id: 'hydrobike',
        lezione: 'Hydrobike',
        poster: `${U}/2025/03/Athlon126-scaled.jpg`,
        nota: 'Lezioni da 45 minuti · altezza dell’acqua 120 cm',
        testo:
          'Quarantacinque minuti in sella a una bike immersa in acqua. L’acqua frena ogni pedalata: il lavoro è sugli arti inferiori e sul sistema cardio-circolatorio, con la barra della cardio più alta di tutte le lezioni in vasca.',
      },
    ],
    lezioni: ['Aqua Aerobic', 'Aqua Soft', 'Aqua Training', 'Aqua Tonic', 'Hydrobike'],
    attrezzatura:
      'Costume da piscina e cuffia. Per l’Hydrobike sono consigliate scarpette chiuse, tipo da scoglio.',
    simili: [
      { slug: 'nuoto-libero', perche: 'Sempre in acqua, ma al tuo ritmo, con i tecnici a bordo vasca.' },
      { slug: 'scuola-nuoto-adulti', perche: 'Se vuoi imparare a nuotare o sistemare la tecnica.' },
      { slug: 'ginnastica-dolce', perche: 'A terra, con lo stesso rispetto per le articolazioni.' },
    ],
    titolo: 'Aqua Fitness e Hydrobike a Roma Talenti | Athlon Club',
    descrizione:
      'Aqua Fitness ad Athlon Club Roma Talenti: Aqua Aerobic, Aqua Soft, Aqua Training, Aqua Tonic e Hydrobike. Orari della settimana e caratteristiche delle lezioni.',
  },
  {
    slug: 'nuoto-libero',
    nome: 'Nuoto Libero Assistito',
    eyebrow: 'Nuoto',
    claim: 'Libero di nuotare. Mai lasciato a te stesso.',
    titoloIntro: 'Il nuoto libero, secondo Athlon',
    eyebrowIntro: 'Il sistema',
    ctaOrari: 'Vedi corsie e orari',
    banda: 'nuoto-libero',
    categoria: 5,
    unita: { s: 'turno', p: 'turni' },
    faqSoggetto: 'il nuoto libero',
    hero: `${U}/2025/03/Athlon88-scaled.jpg`,
    fuoco: '36% 40%',
    intro: [
      'A bordo vasca trovi Tecnici Federali, per tutta la durata del turno. Sotto, la vasca da 25 metri con cinque corsie, tutti i giorni della settimana, e la capienza di ogni corsia definita in anticipo: il turno che prenoti è il tuo.',
      'Per allenarsi, per perfezionare la tecnica, per rilassarsi oppure per sfidare gli amici in gara. Siamo in Via Ugo Ojetti, a Talenti, vicino a Montesacro, Bufalotta e Porta di Roma.',
    ],
    punti: [
      { titolo: 'Prenoti il turno', testo: 'Da app o dall’area riservata, a partire da tre giorni prima.' },
      { titolo: 'Trovi la corsia con posto', testo: 'Corsie a capienza controllata: quanti posti restano lo vedi mentre prenoti.' },
      { titolo: 'C’è un tecnico a bordo vasca', testo: 'Assistenza continua di Tecnici Federali e Assistenti Bagnanti.' },
      { titolo: 'Puoi avere un programma', testo: 'Possibilità di avere un programma di allenamento personalizzato per ogni esigenza.' },
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Nuoto Libero', poster: `${U}/2025/03/Athlon85-scaled.jpg` },
    ],
    lezioni: ['Nuoto Libero'],
    attrezzatura: 'Costume da piscina e cuffia.',
    faqAdatto:
      'Serve un livello natatorio intermedio: stile libero e dorso. Se non ci sei ancora non è un problema — si parte dalla <a href="/scuola-nuoto-adulti">Scuola Nuoto Adulti</a>, e al nuoto libero si passa quando gli istruttori lo ritengono il momento giusto.',
    simili: [
      { slug: 'aqua-fitness', perche: 'Le lezioni in acqua, con l’istruttore che guida il lavoro.' },
      { slug: 'scuola-nuoto-adulti', perche: 'Se stile libero e dorso non sono ancora sicuri, si comincia da qui.' },
      { slug: 'ginnastica-posturale', perche: 'Allungamento e mobilità: il complemento a terra di chi nuota molto.' },
    ],
    titolo: 'Nuoto Libero Assistito in piscina a Roma Talenti | Athlon Club',
    descrizione:
      'Nuoto Libero Assistito ad Athlon Club Roma Talenti: vasca da 25 metri, 5 corsie, tecnici federali a bordo vasca. Orari e come si prenota.',
  },
  {
    slug: 'scuola-nuoto-adulti',
    nome: 'Scuola Nuoto Adulti',
    eyebrow: 'Scuola Nuoto Athlon',
    claim: 'Impari con un metodo. Ti alleni con i tuoi tempi.',
    titoloIntro: 'Il livello lo assegniamo noi. L’orario lo scegli tu.',
    eyebrowIntro: 'Come funziona',
    ctaOrari: 'Vedi livelli e orari',
    banda: 'scuola-nuoto-adulti',
    categoria: 7,
    faqSoggetto: 'la Scuola Nuoto Adulti',
    hero: `${U}/2025/03/Athlon86-scaled.jpg`,
    fuoco: '62% 40%',
    intro: [
      'Si impara a nuotare a qualsiasi età, e la Scuola Nuoto di Athlon è attiva dal 1973: quello che è cambiato è come ci si organizza.',
      'Il livello lo assegnano gli istruttori dopo averti visto in acqua. Dentro quel livello prenoti quando ti serve, dall’app, senza un giorno fisso da rispettare per tutta la stagione.',
    ],
    punti: [
      {
        titolo: 'Ti vediamo in acqua',
        testo:
          'Gli istruttori ti assegnano il livello: Base, Intermedio o Avanzato. Non è un test da superare, è il punto da cui parti.',
      },
      {
        titolo: 'Prenoti i turni del tuo livello',
        testo:
          'Dentro il tuo livello prenoti in autonomia, nei giorni e negli orari che preferisci, senza limiti e in pochi secondi dallo smartphone.',
      },
      {
        titolo: 'Passi al livello dopo quando sei pronto',
        testo:
          'Lo dicono gli istruttori che ti hanno in acqua. E alla Scuola Nuoto Adulti si entra anche a metà stagione: i corsi non si fermano.',
      },
    ],
    varianti: [
      { nome: null, testo: '', lezione: 'Scuola Nuoto', poster: `${U}/2025/03/Athlon89-scaled.jpg` },
    ],
    lezioni: ['Scuola Nuoto'],
    attrezzatura: 'Costume da piscina e cuffia.',
    faqAdatto:
      'Sì, e il punto di partenza lo stabiliamo noi: gli istruttori ti vedono in acqua e ti assegnano il livello — Base, Intermedio o Avanzato. Da lì prenoti liberamente i turni del tuo livello, e passi al successivo quando gli istruttori lo ritengono il momento giusto.',
    faqExtra: [
      {
        q: 'I corsi di nuoto per adulti durano tutto l’anno?',
        a: 'Sì: la Scuola Nuoto Athlon non si ferma mai ed è sempre possibile iscriversi, anche a metà stagione.',
      },
      {
        q: 'Come funzionano i livelli della Scuola Nuoto Adulti?',
        a: 'I corsi sono divisi in <strong>Base, Intermedio e Avanzato</strong>. Il livello lo assegnano gli istruttori dopo averti visto in acqua, e da quel momento prenoti liberamente i turni del tuo livello.',
      },
    ],
    simili: [
      { slug: 'nuoto-libero', perche: 'Quando il livello c’è, la vasca è tua: ti alleni quando vuoi.' },
      { slug: 'aqua-fitness', perche: 'Attività in acqua senza dover nuotare.' },
      { slug: 'ginnastica-dolce', perche: 'A terra e a bassa intensità, per chi riprende a muoversi.' },
    ],
    titolo: 'Scuola Nuoto Adulti a Roma Talenti | Athlon Club',
    descrizione:
      'Scuola Nuoto Adulti ad Athlon Club Roma Talenti: corsi Base, Intermedio e Avanzato, prenotazione libera nei turni del tuo livello. Orari e come funziona.',
  },
  {
    slug: 'gestanti',
    nome: 'Corso Gestanti',
    eyebrow: 'Athlon Aqua',
    claim: 'Cinquanta minuti in cui l’acqua ti tiene su.',
    titoloIntro: 'Come funziona la lezione',
    eyebrowIntro: 'L’attività',
    ctaOrari: 'Vedi giorno e orario',
    banda: 'aqua-fitness',
    categoria: 4,
    hero: `${U}/2024/08/gestanti-ok.jpg`,
    fuoco: '50% 30%',
    faqSoggetto: 'il corso gestanti',
    intro: [
      'Attività motoria in acqua per future mamme, per il raggiungimento del loro benessere psico-fisico e di quello del bambino. Un metodo facile per stare in movimento durante tutta la gravidanza, lasciandosi sostenere dall’acqua.',
      'La lezione dura 50 minuti e si svolge sotto la supervisione dell’istruttrice: le mamme si dedicano a una respirazione profonda che aiuta a sentire se stesse e migliora il contatto con il bambino.',
    ],
    elenco: {
      titolo: 'Gli obiettivi della lezione',
      voci: [
        'Miglioramento della circolazione sanguigna e linfatica, per prevenire e attenuare ritenzione idrica, edemi e gonfiori',
        'Presa di coscienza e controllo della posizione corretta di bacino, dorso e spalle',
        'Allentamento di eventuali tensioni cervicali, dorsali e lombari',
        'Controllo e miglioramento della capacità respiratoria',
        'Mantenimento e miglioramento del tono muscolare e dell’elasticità generale',
        'Rilassamento profondo',
        'Socializzazione: momenti di incontro e confronto fra future mamme che vivono la stessa esperienza',
      ],
    },
    varianti: [{ nome: null, testo: '', lezione: 'Aqua Gestanti' }],
    lezioni: ['Aqua Gestanti'],
    attrezzatura: 'Costume da piscina e cuffia, un asciugamano personale e ciabatte.',
    singola: {
      prezzo: '22',
      testo:
        'Prenoti e paghi volta per volta, senza vincoli e senza quota di attivazione: vieni quando ti va e quando ti senti bene, che in gravidanza è l’unica cosa che si può programmare davvero.',
    },
    faqCompreso:
      'Puoi prenotare e pagare la <strong>singola lezione a 22 €</strong>, volta per volta, senza vincoli e senza quota di attivazione: è la formula più adatta a una gravidanza. Se hai un abbonamento che comprende l’Aqua Fitness, il corso è già incluso.',
    faqAdatto:
      'Sì, la lezione è pensata per tutta la gravidanza e l’istruttrice adatta gli esercizi al trimestre e a come ti senti. Confrontati sempre con il tuo ginecologo prima di iniziare: è l’unico che conosce la tua situazione.',
    simili: [
      { slug: 'aqua-fitness', perche: 'Dopo il parto, per tornare a muoverti senza carico sulle articolazioni.' },
      { slug: 'baby-nuoto', perche: 'Dai 3 mesi del bambino, in acqua con te: la vasca la conosci già.' },
      { slug: 'ginnastica-posturale', perche: 'A terra, per la postura e la schiena.' },
    ],
    titolo: 'Corso Gestanti in piscina a Roma Talenti | Athlon Club',
    descrizione:
      'Corso gestanti in acqua ad Athlon Club Roma Talenti: 50 minuti di ginnastica dolce in piscina per le future mamme, con istruttrice. Orari e come prenotare.',
  },
];

/**
 * I quindici corsi fitness — le classi di sala, non le tre attività in acqua
 * né la ginnastica in gravidanza, che hanno un `eyebrow` proprio e restano
 * fuori (vedi `link.ts` per lo stesso filtro).
 */
export const CORSI_FITNESS = CORSI.filter((c) => !c.eyebrow);

/**
 * Quanti corsi fitness ci sono davvero: non le quindici pagine, ma le lezioni
 * distinte che quelle pagine offrono. Yoga ne ha tre — Hatha, Power, Yogassè —
 * Pilates due, HBX due: ognuna con nome e orario propri nel palinsesto.
 *
 * È il numero che il sito cita ovunque dice «N corsi fitness»: l'header e la
 * home lo leggono da qui, non lo ricontano ciascuno per conto suo. Prima lo
 * facevano — tre liste scritte a mano in tre file, e a un certo punto
 * dicevano 15, 18 e 19 per la stessa domanda. La pagina `/corsi-fitness`
 * enumera queste lezioni per intero, foto e classificazione comprese: quella
 * lista resta scritta a mano perché porta dati che qui non ci sono, ma la sua
 * lunghezza deve restare uguale a questo numero — lo controlla lei stessa al
 * build, per la stessa ragione per cui `planning.ts` controlla che ogni sala
 * abbia il suo colore.
 */
export const NUMERO_CORSI_FITNESS = CORSI_FITNESS.reduce(
  (n, c) => n + Math.max(1, c.varianti.filter((v) => v.nome).length),
  0
);

export function getCorso(slug: string): Corso {
  const c = CORSI.find((x) => x.slug === slug);
  if (!c) throw new Error(`Corso non trovato: ${slug}`);
  return c;
}

/**
 * Video e barre di una variante: la scheda del planning quando c'è, i valori
 * scritti qui quando il corso non è in palinsesto.
 */
export function mediaVariante(v: VarianteCorso) {
  const card = v.lezione ? getLessonCard(v.lezione) : null;
  return {
    video: card?.videoUrl ?? v.video ?? null,
    stats: card?.stats?.length ? card.stats : (v.stats ?? []),
    desc: card?.desc ?? null,
  };
}
