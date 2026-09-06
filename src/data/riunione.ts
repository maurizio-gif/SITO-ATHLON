/**
 * La presentazione della riunione dello staff — contenuto e note del relatore.
 *
 * Sta qui e non dentro la pagina perché la leggono in due: le slide
 * (`/riunione-staff`) e la vista relatore (`/riunione-staff/relatore`). Due
 * copie dello stesso testo divergerebbero al primo ritocco fatto la sera prima.
 *
 * **È una pagina di servizio, non una pagina del club.** `noindex`, fuori dalla
 * sitemap, fuori da `llms.txt`, fuori dal menu e dal footer, e senza il guscio
 * del sito: niente header, niente footer, niente chat, niente banner. Va
 * cancellata quando la riunione è passata — pagina, dati e riga della sitemap.
 *
 * I numeri dell'offerta **non si scrivono qui**: li legge la pagina dalle stesse
 * fonti che alimentano `llms.txt` (`planning.ts`, `corsi.ts`, `junior.ts`,
 * `trainer.ts`). Un numero ricopiato in una slide è un numero che il giorno del
 * cambio di palinsesto dice una cosa che il sito smentisce due schermate dopo.
 *
 * Regola di forma, e vale come vincolo: **massimo cinque righe per slide**, e
 * ogni riga sta in una decina di parole. Lo schermo è un pannello da 82" letto
 * da due a cinque metri: la slide è un appiglio, il discorso lo fa la persona.
 * Un blocco che non ci sta si spezza in due slide, non si stringe.
 */

/** Chi parla: governa il colore dell'indicatore e la somma dei tempi. */
export type Parte = 'maurizio' | 'valentina';

export type Slide = {
  /** Il tipo decide la forma della slide, non il suo contenuto. */
  tipo: 'sezione' | 'punti' | 'numero' | 'numeri' | 'citazione' | 'ruolo' | 'schema';
  parte: Parte;
  /** La sezione corrente, stampata in basso insieme al numero di slide. */
  sezione: string;
  /** L'occhiello sopra il titolo, nella stessa forma del resto del sito. */
  occhiello?: string;
  titolo: string;
  /** Le righe di contenuto: mai più di cinque. */
  righe?: string[];
  /** `numero`: la cifra grande, e cosa vuol dire. */
  cifra?: string;
  cifraNota?: string;
  /** `numeri`: la griglia di dati. Il valore lo passa la pagina, dai dati veri. */
  dati?: { valore: string; cosa: string }[];
  /** `schema`: i blocchi affiancati (i concorrenti, l'organigramma). */
  blocchi?: { titolo: string; nota?: string }[];
  /**
   * Il filmato d'archivio dietro la slide, se ce n'è uno.
   *
   * Muto, in ciclo, senza comandi: è scenografia, non un video da guardare.
   * `inizio` sono i secondi da cui parte — un filmato lungo non comincia dalla
   * sigla, e questo comincia sotto una frase che dura venti secondi.
   */
  video?: { vimeo: string; inizio?: number };
  /** Il blocco del discorso che comincia qui, e quanto dovrebbe durare. */
  blocco?: { titolo: string; minuti: number };
  /** Indicazioni per chi parla: stanno nella vista relatore, mai sulla slide. */
  nota?: string;
};

export const SLIDE: Slide[] = [
  /* ────────────────────────────  PARTE 1 — MAURIZIO  ──────────────────── */

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Apertura',
    occhiello: 'Athlon Club',
    titolo: 'Riunione staff',
    blocco: { titolo: 'Perché siamo qui', minuti: 2 },
    nota: 'Slide di attesa mentre entrano tutti. Non parlare finché non sono seduti.',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Apertura',
    occhiello: 'Perché siamo qui',
    titolo: 'Non è una comunicazione di servizio',
    righe: [
      'Non ci vediamo tutti insieme da tempo',
      'Oggi è un allineamento, non un aggiornamento',
      'Un obiettivo solo: rendere leggibile fuori quello che siamo già dentro',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Apertura',
    occhiello: 'Ordine del giorno',
    titolo: 'Cosa ci diciamo oggi',
    righe: [
      'Da dove veniamo',
      'Il salto',
      'I tre pilastri',
      'Il mercato che ci aspetta',
      'Come ci organizziamo — e i ruoli, con Valentina',
    ],
  },

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Da dove veniamo',
    occhiello: 'Come eravamo',
    titolo: 'Da dove veniamo',
    /* Il filmato d'archivio sta qui e in nessun altro posto del mazzo: è
       lungo, e messo a girare sotto tutta la presentazione farebbe concorrenza
       a chi parla per un'ora. Su questa slide invece *è* il discorso — mentre
       scorre si racconta il 1973 — e la slide dura quanto serve, perché il
       ciclo non finisce mai e il passaggio avanti lo dà la freccia. */
    video: { vimeo: '30039264', inizio: 0 },
    blocco: { titolo: 'Da dove veniamo', minuti: 5 },
    nota: 'Il filmato parte da solo, muto e in ciclo: parlaci sopra e vai avanti con la freccia quando vuoi. Se la rete non regge resta la slide scura col titolo, che va bene lo stesso. PROVALO IN SALA PRIMA DELLA RIUNIONE.',
  },

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'Dopo il Covid',
    titolo: 'Il salto',
    blocco: { titolo: 'Il salto: cosa è cambiato dopo il Covid', minuti: 7 },
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'Il salto',
    titolo: 'Non è stato un investimento',
    righe: [
      'È stato un cambio di modello',
      'Il salto non l’hanno fatto i soldi',
      'L’hanno fatto razionalità di gestione e strumenti digitali, insieme',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'Il digitale',
    titolo: 'Non è tecnologia per moda',
    righe: [
      'Servizio più puntuale per l’utente',
      'Costi razionalizzati',
      'E proprio grazie a questo, gran parte del personale stabilizzata',
    ],
    nota: 'Il terzo punto è quello che vogliono sentire. Fermati un attimo prima di dirlo.',
  },
  {
    tipo: 'citazione',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'Il punto',
    titolo: 'La razionalizzazione non ha tagliato le persone: le ha rese sostenibili',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'La riorganizzazione',
    titolo: 'Due macro business unit',
    righe: [
      'Adulti e fitness da una parte, junior dall’altra',
      'Nel junior, razionalizzazione centrata sulla scuola nuoto',
      'Con l’agonistica sostenibile accanto',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'La riorganizzazione',
    titolo: 'Stravolta rispetto alla sua storia',
    righe: ['Sala pesi spostata', 'Layout ridisegnato'],
  },
  {
    tipo: 'numero',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'L’investimento',
    titolo: 'Fra finanziamenti e risparmi personali',
    cifra: '2 milioni',
    cifraNota: 'Modello lean e digital. Leggero, non povero',
  },
  {
    tipo: 'citazione',
    parte: 'maurizio',
    sezione: 'Il salto',
    occhiello: 'Perché è raro',
    titolo: 'Nelle società sportive dilettantistiche in Italia questo non è stato fatto',
    righe: ['Siamo un caso a parte'],
  },

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Dove siamo oggi',
    occhiello: 'Il presente',
    titolo: 'Dove siamo oggi',
    blocco: { titolo: 'Dove siamo oggi, e cosa vuol dire', minuti: 3 },
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Dove siamo oggi',
    occhiello: 'Il mio lavoro',
    titolo: 'Athlon è il mio flagship',
    righe: [
      'Da qui è nata la seconda parte del mio lavoro',
      'Consulenza digitale, software custom, formazione',
      'Analisi dei processi in altri club',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Dove siamo oggi',
    occhiello: 'Quello che vedo fuori',
    titolo: 'Giro impianti in Italia e all’estero',
    righe: [
      'Vedo organizzazioni e livelli di stress antitetici ai nostri',
      'Non lo dico per vanto: è la misura di quanto abbiamo costruito',
      'E voi, da dentro, non potete vederlo',
    ],
    nota: 'Guardali in faccia mentre dici l’ultima riga.',
  },
  {
    tipo: 'citazione',
    parte: 'maurizio',
    sezione: 'Dove siamo oggi',
    occhiello: 'Il livello',
    titolo: 'Solidità, impianti, qualità del servizio a 360°',
    righe: ['Livello di una multinazionale, non di un club a gestione familiare'],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Dove siamo oggi',
    occhiello: 'Ma',
    titolo: 'Il terreno del confronto si è spostato',
    righe: [
      'Quando l’impianto era il problema, sistemarlo era il vantaggio',
      'Oggi l’impianto è a posto — anche per chi ci fa concorrenza',
      'Il vantaggio va cercato altrove',
    ],
  },

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'I tre pilastri',
    occhiello: 'Su cosa stiamo in piedi',
    titolo: 'I tre pilastri',
    blocco: { titolo: 'Pilastro 1 — La struttura', minuti: 3 },
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'I tre pilastri',
    occhiello: 'Pilastro 1',
    titolo: 'La struttura',
    righe: [
      'Layout, impiantistica, illuminazione, qualità dell’aria',
      'Sono i capisaldi di una struttura ricettiva, non dettagli estetici',
      'Presidio quotidiano di Gabriele, e collaborazione con tutti voi',
      'Migliora sempre: è un pilastro che non si dichiara finito',
    ],
    nota: 'Cosa chiedo a voi: se qualcosa non funziona, si segnala subito. Un investimento fermo tre giorni per un guasto non detto è un investimento buttato.',
  },
  {
    tipo: 'numeri',
    parte: 'maurizio',
    sezione: 'I tre pilastri',
    occhiello: 'Pilastro 2 — L’offerta',
    titolo: 'Sono numeri, non opinioni',
    blocco: { titolo: 'Pilastro 2 — L’offerta', minuti: 3 },
    nota: 'Questi numeri li legge il sito dal palinsesto vero: sono gli stessi che leggono l’assistente e i motori. Non impararli a memoria, leggili qui.',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'I tre pilastri',
    occhiello: 'Pilastro 2',
    titolo: 'La scuola nuoto, dal 1973',
    righe: [
      'Adulti e bambini, senza interruzione',
      'È la nostra continuità storica',
      'Ed è il nostro tratto meno replicabile',
    ],
  },
  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'Pilastro 3',
    titolo: 'Le persone',
    blocco: { titolo: 'Pilastro 3 — Le persone', minuti: 10 },
    nota: 'È il cuore della riunione. Rallenta: da qui in avanti hai dieci minuti e sono tutti su questo.',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'Perché è decisivo',
    titolo: 'Ho vissuto questo club vuoto',
    righe: [
      'Durante il Covid: quattro mura senza le persone valgono zero',
      'Struttura e offerta si comprano. La comunità no',
      'La comunità siamo noi per primi, e poi chi ci sceglie ogni mese',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'Chi ci sceglie',
    titolo: 'Fascia medio-alta, ma senza ostentazione',
    righe: [
      'Per capacità di spesa e per contesto sociale',
      'Ma viene qui per la sostanza',
      'Il professionista che arriva in ciabatte e pantaloncini',
    ],
  },
  {
    tipo: 'citazione',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'Sul sito, scritto',
    titolo: 'Una sala pesi che non alza mai la voce',
    righe: ['È la nostra linea di condotta, non uno slogan'],
    nota: 'Aggiungi: per questo siete stati scelti anche per le soft skills, non solo per le competenze tecniche.',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'Third space',
    titolo: 'Il terzo spazio, dopo la casa e il lavoro',
    righe: [
      'Qui le persone passano tempo quanto ne passano al lavoro',
      'Devono sentirsi a casa',
      '«A casa» non vuol dire che il cliente ha sempre ragione',
      'Vuol dire che noi siamo sempre gentili e solari',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'In scena',
    titolo: 'Siamo sempre osservati',
    righe: [
      'Anche chi arriva distratto, con le cuffie, e non ci guarda',
      'Noi facciamo parte della qualità del suo servizio',
      'E i genitori dalla balconata ci guardano sempre',
    ],
    nota: 'Questo lo abbiamo condiviso tante volte. Chiudi con: le persone ci osservano anche quando pensiamo di non essere in scena.',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Le persone',
    occhiello: 'Cosa vi chiedo',
    titolo: 'Concretamente',
    righe: [
      'Salutare. Ogni giorno, tutti',
      'Ricordare i nomi e usarli',
      'Salutare anche chi non risponde',
      'Sobrietà nel tono, sempre',
      'Relazione professionale: accoglienza sì, chiacchiera no',
    ],
    nota: 'Sul terzo punto: noi l’abbiamo salutata. Prima o poi entra anche lei in questa positività.',
  },

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Il mercato',
    occhiello: 'Cosa ci aspetta',
    titolo: 'Il mercato si affolla',
    righe: ['Il settore è in una fase positiva. E diventa più affollato'],
    blocco: { titolo: 'Il mercato si affolla', minuti: 4 },
  },
  {
    tipo: 'schema',
    parte: 'maurizio',
    sezione: 'Il mercato',
    occhiello: 'Chi abbiamo intorno',
    titolo: 'Già oggi',
    blocchi: [
      { titolo: 'Virgin Active Talenti', nota: 'Investe e alza gli standard. Competitor serio' },
      { titolo: 'FitActive', nota: 'Piazza Sempione. Low cost puro, 19–29 € al mese' },
      { titolo: 'Anytime Fitness', nota: 'Talenti Village. Medium price' },
      { titolo: 'Piscina comunale', nota: 'Se ne parla da anni. Prima o poi apre' },
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Il mercato',
    occhiello: 'La piscina comunale',
    titolo: 'Sarà solo piscina, e basta così',
    righe: [
      'Struttura nuova, prezzi da impianto comunale',
      'Ma noi abbiamo persone che vengono qui solo per nuotare',
      'Scuola nuoto o nuoto libero: su quel fronte siamo esposti',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Il mercato',
    occhiello: 'Il punto da capire bene',
    titolo: 'Il vecchio vantaggio non c’è più',
    righe: [
      'Hanno un prezzo d’ingresso più aggressivo del nostro',
      'La differenza dobbiamo farla percepire noi',
      'Fino a ieri il vantaggio era essere migliori di impianti vecchi',
      'Oggi siamo un impianto nuovo in un mercato che si è rinnovato',
    ],
  },
  {
    tipo: 'citazione',
    parte: 'maurizio',
    sezione: 'Il mercato',
    occhiello: 'Dove facciamo la differenza',
    titolo: 'Possono comprare i macchinari. Non persone che lavorano insieme da decadi',
    righe: ['Capacità relazionale e staff consolidato. La gestione in team è il fattore differenziante'],
  },

  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'Strumenti e processi',
    titolo: 'Come ci organizziamo',
    blocco: { titolo: 'Strumenti e processi', minuti: 5 },
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'Gli strumenti',
    titolo: 'Il digitale al servizio della comunicazione interna',
    righe: [
      'Il gestionale è in casa dal 2021',
      'Quest’anno abbiamo sviluppato una nostra app interna',
      'La usano il settore nuoto e la segreteria, front e back office',
      'In futuro valuteremo se estenderla, soprattutto sulle prenotazioni',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'A cosa serve davvero',
    titolo: 'Al di là dello strumento',
    righe: [
      'Comunicazione snella e veloce',
      'Definire le regole, e farle rispettare',
      'Sapere se un iscritto ha prenotato, a cosa è iscritto, com’è la sua progressione',
    ],
  },
  {
    tipo: 'citazione',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'Un obiettivo solo',
    titolo: 'Sorprendere l’utente rispetto alle sue aspettative',
    righe: ['Da solo lo strumento non basta: va affiancato al vostro modo di stare con le persone'],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'I processi',
    titolo: 'Una protezione, non una gabbia',
    righe: [
      'Lavorare per processi strutturati tutela prima di tutto voi',
      'Definiscono un perimetro: cosa promettiamo, cosa diamo, fin dove rispondiamo',
      'Sul sito è scritto per filo e per segno. Vi chiedo di leggerlo',
      'Se non conosciamo la promessa, non possiamo difenderla',
    ],
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'Cosa vi chiedo',
    titolo: 'Davanti a chi insiste',
    righe: [
      'Ascoltare sempre, ponderare, spiegare il perché',
      'Mai mandare a quel paese chi ha torto',
      'Mai cedere solo perché insiste',
      'Siete stati scelti anche per questa centratura',
    ],
    nota: 'Ho visto — qui e nei club che seguo — personale lasciato in balia del cliente più insistente. È profondamente sbagliato, e qui non succede.',
  },
  {
    tipo: 'punti',
    parte: 'maurizio',
    sezione: 'Come ci organizziamo',
    occhiello: 'Chiusura',
    titolo: 'Questo è l’imprinting della proprietà',
    righe: [
      'Quello che vi ho dato oggi è la direzione',
      'La gestione operativa quotidiana è di Valentina, club manager',
      'Organigramma, ruoli, chi fa cosa: la declinazione passa da lei',
    ],
    blocco: { titolo: 'Chiusura e passaggio a Valentina', minuti: 2 },
  },
  {
    tipo: 'sezione',
    parte: 'maurizio',
    sezione: 'Chiusura',
    occhiello: 'L’asticella l’abbiamo alzata. Non si riabbassa',
    titolo: 'Gentili, ma organizzati',
    nota: 'Pausa vera. Poi passa la parola a Valentina.',
  },

  /* ────────────────────────────  PARTE 2 — VALENTINA  ─────────────────── */

  {
    tipo: 'sezione',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Parte seconda — Valentina',
    titolo: 'Chi fa cosa',
    blocco: { titolo: 'Perché serve un organigramma', minuti: 2 },
  },
  {
    tipo: 'punti',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Perché serve',
    titolo: 'Non è una piramide di gerarchie',
    righe: [
      'È la mappa di chi decide cosa, e a chi si passa la palla',
      'L’utente riceve una risposta certa da chi è competente a darla',
      'E nessuno di noi resta solo davanti a una decisione che non gli spetta',
      'È la traduzione operativa del perimetro di cui ha parlato Maurizio',
    ],
  },
  {
    tipo: 'schema',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'D’insieme',
    titolo: 'I sei presidi',
    blocchi: [
      { titolo: 'Valentina', nota: 'Club Manager' },
      { titolo: 'Giancarlo', nota: 'Direttore Tecnico Nuoto' },
      { titolo: 'Dario', nota: 'Coordinatore Fitness' },
      { titolo: 'Accoglienza', nota: 'Segreteria' },
      { titolo: 'Manutenzione', nota: 'Impianto' },
      { titolo: 'Claudia', nota: 'Comunicazione' },
    ],
    blocco: { titolo: 'I ruoli', minuti: 10 },
  },
  {
    tipo: 'ruolo',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Club Manager',
    titolo: 'Valentina',
    righe: [
      'Gestione del personale, contratti e retribuzioni',
      'Pianificazione e gestione delle attività del club',
      'In coordinamento con i responsabili dei vari settori',
      'Supporto a Front Office, Back Office e Segreteria Amministrativa',
    ],
  },
  {
    tipo: 'ruolo',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Direttore Tecnico Nuoto',
    titolo: 'Giancarlo',
    righe: [
      'Attività in piscina: Scuola Nuoto e Nuoto Libero',
      'Referente tecnico-didattico per gli utenti',
      'Coordinamento istruttori e assistenza negli spogliatoi',
      'Controllo dell’attrezzatura tecnica del nuoto',
    ],
  },
  {
    tipo: 'ruolo',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Coordinatore Fitness',
    titolo: 'Dario',
    righe: [
      'Coordinamento personale sala pesi',
      'Coordinamento tirocini fitness',
      'Protocolli di allenamento: corsi fitness e sala pesi',
      'Controllo dell’attrezzatura tecnica del fitness',
    ],
  },
  {
    tipo: 'ruolo',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Accoglienza',
    titolo: 'Segreteria',
    righe: [
      'Riferimento per l’utenza: accoglienza e supporto operativo',
      'Gestione del CRM',
    ],
  },
  {
    tipo: 'ruolo',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Impianto',
    titolo: 'Manutenzione',
    righe: [
      'Controllo e manutenzione ordinaria e straordinaria',
      'Approvvigionamento del materiale di base',
      'In coordinamento con l’assistenza spogliatoi',
    ],
  },
  {
    tipo: 'ruolo',
    parte: 'valentina',
    sezione: 'Organigramma',
    occhiello: 'Comunicazione',
    titolo: 'Claudia',
    righe: ['Contenuti e immagine online del club'],
  },

  {
    tipo: 'punti',
    parte: 'valentina',
    sezione: 'Come si mette a terra',
    occhiello: 'Come si mette a terra',
    titolo: 'Chi non sa, chiede',
    righe: [
      'Si chiede al referente del proprio settore',
      'Non si improvvisa una risposta all’utente',
      'Nuoto a Giancarlo. Sala e protocolli a Dario',
    ],
    blocco: { titolo: 'Come si mette a terra', minuti: 4 },
  },
  {
    tipo: 'punti',
    parte: 'valentina',
    sezione: 'Come si mette a terra',
    occhiello: 'Come si mette a terra',
    titolo: 'E poi, in pratica',
    righe: [
      'Guasti e ammanchi: segnalazione immediata a manutenzione',
      'Tutto ciò che riguarda l’utente passa dal CRM',
      'Se non è tracciato, non esiste',
      'Foto e comunicazione esterna: si concordano con Claudia',
      'Contratti, turni, retribuzioni: si parla con Valentina',
    ],
    nota: 'Sui guasti: senza aspettare che se ne accorga qualcun altro. Sulla comunicazione: non si pubblica in autonomia.',
  },
  {
    tipo: 'punti',
    parte: 'valentina',
    sezione: 'Chiusura',
    occhiello: 'Chiusura',
    titolo: 'L’organigramma non riduce la vostra autonomia',
    righe: [
      'La protegge',
      'Perché dice fin dove arriva',
      'E a chi si passa oltre',
    ],
    blocco: { titolo: 'Chiusura', minuti: 2 },
  },
  {
    tipo: 'sezione',
    parte: 'valentina',
    sezione: 'Chiusura',
    occhiello: 'Athlon Club',
    titolo: 'Gentili, ma organizzati',
  },
];
