/**
 * Contenuti delle pagine dei corsi per bambini e ragazzi: Baby Nuoto, Scuola
 * Nuoto Bambini, Pallanuoto e Nuoto Agonistico.
 *
 * Sono corsi a frequenza fissa, con turni assegnati e livelli: non si prenotano
 * come una lezione di sala e non si comprano come un abbonamento. Per questo le
 * pagine non parlano di listini — come già facevano quelle vecchie — e portano
 * tutte allo stesso punto: il modulo con cui il genitore chiede turni e costi e
 * riceve le istruzioni per il portale.
 *
 * Chi legge è un genitore, quindi i dati che contano sono espliciti: età, livello
 * minimo richiesto, giorni e orari, quale certificato medico serve, se c'è una
 * prova di inserimento. Tutto viene dalle pagine del sito precedente (post 4275,
 * 4279, 4283, 4285); niente è aggiunto per riempire.
 */
import type { RichiestaFaq } from './faq';

const U = '/wp-content/uploads';

/**
 * Il modulo di preiscrizione è uno per tutti: cambia il valore che ne distingue
 * la provenienza. Il nome del parametro non è uniforme sul sito vecchio — Baby
 * Nuoto usa `Medium`, le altre `medium` — e va riprodotto come era, altrimenti
 * le richieste arrivano senza provenienza.
 */
const FORM = 'https://automazione.n8ndevelop.it/form/a4283d20-5832-46a3-9d88-df3561060e12?source=SitoWeb&';

export interface CorsoStagione {
  nome: string;
  /** Le annate o l'età, come le scrive il club. */
  sottotitolo?: string;
  testo?: string[];
  /** Cosa impara, cosa fa: uno per riga. */
  punti?: string[];
  /** Dati in coppia etichetta/valore: durata, fascia d'età, modalità. */
  dettagli?: { l: string; v: string }[];
  /** Livello minimo richiesto: sigla e prove che deve saper fare. */
  livello?: { codice: string; voci: string[] };
  /** Sessioni disponibili e frequenza attesa. */
  allenamenti?: { l: string; v: string }[];
  orari?: { g: string; o: string }[];
  /** Prova di inserimento, quando è obbligatoria. */
  prova?: string;
  /** Quale dei due certificati serve. */
  certificato?: 'non agonistica' | 'agonistica';
  /**
   * Un blocco in più: l'attività agonistica, l'organizzazione dei turni. Con
   * `punti` diventa un elenco — le informazioni pratiche si leggono a colpo
   * d'occhio, non dentro un capoverso.
   */
  extra?: { titolo: string; testo?: string; punti?: string[] }[];
}

export interface SpazioJunior {
  nome: string;
  testo: string;
  /** Il tour virtuale dell'impianto: si apre a parte, non incorniciato. */
  tour?: string;
}

export interface CorsoJunior {
  slug: string;
  nome: string;
  /** L'occhiello: l'età di accesso. */
  eta: string;
  claim?: string;
  hero: string;
  fuoco: string;
  /**
   * Galleria a scorrimento, quando la pagina ha abbastanza foto per reggerla:
   * è la stessa striscia degli spazi della home, con il suo ingranditore.
   */
  galleria?: { image: string; caption: string }[];
  /** Il valore con cui il modulo distingue la provenienza. */
  medium: string;
  /** Nome del parametro: `medium` per tutte, `Medium` per il Baby Nuoto. */
  mediumParam?: 'medium' | 'Medium';
  /** L'etichetta dei pulsanti. Default: "Richiedi orari e costi". */
  cta?: string;
  /**
   * Cosa chiede quel pulsante, per il modal: informazioni su un corso junior o
   * la prova di inserimento, che per pallanuoto e nuoto agonistico è
   * obbligatoria e fa parte del prodotto.
   */
  ctaIntent?: 'junior_info' | 'insertion_trial';
  /**
   * Il Metodo Athlon: i passaggi che il club fa e può dimostrare. Esiste solo
   * per la Scuola Nuoto Bambini, che è l'attività con un metodo documentato —
   * gruppi definiti in vasca, istruttore assegnato, progressione consultabile,
   * brevetti a fine stagione (`snb/didattica.md`). Non è un elenco di valori:
   * ogni pilastro è una cosa che accade.
   */
  metodo?: {
    eyebrow: string;
    titolo: string;
    sub: string;
    pilastri: { nome: string; titolo: string; testo: string }[];
    rimando?: { label: string; href: string };
  };
  /**
   * Le modalità di adesione, con i prezzi, quando la pagina originale le
   * mostrava: il Baby Nuoto si compra a lezione o a mese, e il genitore vuole
   * sapere quanto costa prima di lasciare i suoi dati. Dove questo campo manca
   * la pagina mostra invece le due vie — portale per chi ha un account, modulo
   * per chi non ce l'ha.
   */
  adesione?: {
    titolo: string;
    /** Solo la cifra: valuta e unità le compone la pagina. */
    prezzo: string;
    /** L'unità, senza preposizione: "lezione", "mese". */
    periodo: string;
    testo: string;
    nota?: string;
    medium: string;
  }[];
  titoloIntro: string;
  intro: string[];
  /** Video della sezione di apertura, quando la pagina originale ne ha uno. */
  video?: string;
  poster?: string;
  /** I quattro numeri della striscia sotto la hero. */
  facts: string[];
  blocchi?: { titolo: string; testo?: string; punti?: string[] }[];
  /** Titolo della sezione dei corsi. */
  titoloCorsi?: string;
  corsi?: CorsoStagione[];
  spazi?: SpazioJunior[];
  /* Id del registro condiviso in `data/faq.ts`, voci scritte qui, o un id con
     la domanda riformulata: le pagine junior chiedono «Serve il certificato per
     la scuola nuoto bambini?», che è come la cerca un genitore. */
  faq: RichiestaFaq[];
  /**
   * Cosa proporre al genitore mentre il figlio è in vasca: qui non vanno altri
   * corsi per bambini — chi legge sta già scegliendo quello — ma le attività che
   * può fare lui nella stessa ora.
   *
   * Il Gym Floor c'è su tutte e quattro le pagine, ed è sempre il primo: è
   * l'unica sala che affaccia sulle piscine, e per un genitore quella vista è
   * la ragione che conta.
   *
   * Niente riferimenti al "mentre lui si allena": gli orari dei corsi dei figli
   * e quelli delle attività per adulti in gran parte non coincidono, e
   * prometterlo sarebbe una promessa che il planning non mantiene.
   */
  simili: { slug: string; perche: string }[];
  titolo: string;
  descrizione: string;
}

export const JUNIOR: CorsoJunior[] = [
  {
    slug: 'baby-nuoto',
    nome: 'Baby Nuoto',
    eta: 'Dai 3 ai 36 mesi',
    claim: 'In acqua con te, dai tre mesi.',
    cta: 'Registrati per prenotare',
    ctaIntent: 'junior_info',
    /* **Questo pulsante non va al portale, e non è una svista.** L'etichetta
       dice «registrati», quindi la scorciatoia sembra ovvia: mandare al
       `#/Registration` di PerfectGym e far creare l'account da sé. È sbagliato,
       ed è il tipo di errore che si scopre a valle.

       Per prenotare una lezione di baby nuoto servono **due** anagrafiche
       legate: il genitore e il bambino, con il bambino dentro il nucleo
       famigliare del genitore. La registrazione del portale ne crea una sola,
       quella di chi la compila — e un genitore senza il figlio nel nucleo non
       ha niente da prenotare, quindi torna indietro o chiama.

       Le due anagrafiche le crea il form, o meglio l'automazione dietro di
       lui: è il ramo `nucleo` di `athlon-contatto-compilato`, che chiama
       `AddGuestMember` per il genitore e poi di nuovo per il figlio passando il
       `parentMemberId`. Sono le stesse due chiamate che facevano
       `INSERIMENTO GENITORE` e `INSERIMENTO FIGLIO` nel form n8n di prima, ed è
       la ragione per cui quel percorso esiste.

       Chi l'account ce l'ha già arriva comunque dove deve: il form lo riconosce
       dall'email e gli mostra la schermata del reset password, con la nota su
       dove trovare il figlio nel nucleo. */
    hero: `${U}/2024/08/P1160529.jpg`,
    fuoco: '50% 35%',

    medium: 'PulsanteBabyNuoto',
    mediumParam: 'Medium',
    adesione: [
      {
        titolo: 'Lezione singola',
        prezzo: '32',
        periodo: 'lezione',
        testo: 'Scegli di prenotare e pagare una lezione alla volta.',
        nota: 'Non è richiesta quota di attivazione.',
        medium: 'PulsanteLezioneBabyNuoto',
      },
      {
        titolo: 'Mensile',
        prezzo: '89',
        periodo: 'mese',
        testo: 'Possibilità di prenotare in tutti i turni disponibili, senza limiti.',
        nota: 'Quota di attivazione contrattuale una tantum 50 €.',
        medium: 'PulsanteMensileBabyNuoto',
      },
    ],
    titoloIntro: 'Come funziona una lezione',
    /* Il video del club, impaginato accanto al testo come sulla Scuola Nuoto
       Bambini. Le foto della galleria sono fotogrammi di questo stesso video —
       nella libreria del sito vecchio di baby nuoto ce n'erano solo tre — e il
       secondo da cui vengono è nel nome del file. */
    video: `${U}/2025/06/Baby-Nuoto-60.mp4`,
    poster: `${U}/2025/06/baby-nuoto-38s.jpg`,
    galleria: [
      { image: `${U}/2023/11/Baby-Nuoto.jpg`, caption: 'In acqua con mamma' },
      { image: `${U}/2025/06/baby-nuoto-16s.jpg`, caption: 'Con papà' },
      { image: `${U}/2025/06/baby-nuoto-38s.jpg`, caption: 'Il gruppo' },
      { image: `${U}/2025/06/baby-nuoto-44s.jpg`, caption: 'Il percorso di gioco' },
      { image: `${U}/2024/08/P1160529.jpg`, caption: 'Sostenuto dalle mani della mamma' },
      { image: `${U}/2025/06/baby-nuoto-14s.jpg`, caption: 'Il cerchio' },
      { image: `${U}/2025/06/baby-nuoto-24s.jpg`, caption: 'Genitori e bambini' },
      { image: `${U}/2025/06/baby-nuoto-28s.jpg`, caption: 'Il galleggiante' },
      { image: `${U}/2025/06/baby-nuoto-30s.jpg`, caption: 'Verso le braccia di papà' },
      { image: `${U}/2025/06/baby-nuoto-32s.jpg`, caption: 'Gioco libero' },
      { image: `${U}/2024/08/P1120398-scaled.jpg`, caption: 'Con l’istruttrice' },
      { image: `${U}/2025/06/baby-nuoto-48s.jpg`, caption: 'La piscina piccola' },
      { image: `${U}/2025/06/baby-nuoto-54s.jpg`, caption: 'La lezione' },
    ],
    intro: [
      'Il nostro corso di Baby Nuoto è molto più di un semplice avvicinamento all’acqua: è un viaggio che trasforma l’acqua in un ambiente familiare e sicuro per il tuo bambino. Sin dalle prime lezioni il piccolo impara a percepire l’acqua come un elemento naturale e divertente, e questo stimola la sua curiosità e il piacere di esplorare.',
      'Ma non è tutto: è un’esperienza che rafforza il legame con te. Quaranta minuti in cui siete in acqua insieme, con lo staff che vi guida.',
    ],
    facts: [
      'Da 3 a 36 mesi',
      'Lezioni da 40 minuti',
      'Un genitore in acqua con il bambino',
      'Sabato e domenica mattina',
    ],
    blocchi: [
      {
        titolo: 'Il corso',
        testo:
          'Il corso ha carattere ludico-didattico. La durata è di 40 minuti e prevede l’ingresso di un genitore o accompagnatore. I gruppi vengono divisi in base all’età del bambino: per i più piccoli si privilegia il rapporto genitore-bambino, mentre per i più grandi si introducono elementi ludici di gruppo.',
      },
      {
        titolo: 'I benefici',
        punti: [
          'Effetto terapeutico: miglioramento delle capacità respiratorie del bambino',
          'Staff tecnico qualificato, che coordina i movimenti in acqua dei genitori',
          'Effetto psicologico: divertimento, sviluppo dell’individualità, della creatività, del senso di fiducia e di autonomia',
          'Un’esperienza di grande intimità tra bambino e genitore',
        ],
      },
      {
        titolo: 'Cosa prevede',
        punti: [
          'Assistenza negli spogliatoi delle mamme, con personale qualificato',
          'Spogliatoi adiacenti al piano vasca, attrezzati con fasciatoi e box',
          'Temperatura dell’acqua tra 31,5 °C e 32 °C',
          'Possibilità di cambiare l’accompagnatore tra una lezione e l’altra',
          'Una balconata panoramica per assistere alla lezione',
        ],
      },
      {
        titolo: 'Come si accede',
        testo:
          'Tutti i corsi sono a prenotazione: si prenota fino a 3 giorni prima e si disdice entro 1 ora dall’inizio della lezione, da app o da web. Serve un account a nome del genitore con il bambino registrato — e il modulo qui sotto serve proprio a questo.',
      },
    ],
    titoloCorsi: 'I turni',
    corsi: [
      {
        nome: 'Sabato e domenica mattina',
        dettagli: [
          { l: 'Periodo', v: 'Da settembre a luglio, con interruzione nel solo mese di agosto' },
          { l: 'Giorni', v: 'Sabato e domenica mattina' },
          { l: 'Orari', v: '9.40 · 10.20 · 11.00 · 11.40' },
          { l: 'Durata', v: '40 minuti, con un genitore in acqua' },
        ],
      },
    ],
    spazi: [
      {
        nome: 'Piscina piccola',
        testo: 'La nostra piscina 12 × 5 metri dedicata ai più piccoli, con una temperatura tra 31,5 °C e 31,8 °C.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-.98,1.3&ss=115',
      },
      {
        nome: 'Spogliatoio mamme',
        testo: 'Lo spogliatoio dedicato alle mamme, con assistenza dedicata e attrezzato con box e fasciatoi.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-.1,.26&ss=146',
      },
      {
        nome: 'Spogliatoio papà',
        testo: 'Lo spogliatoio dedicato ai papà, attrezzato con box e fasciatoi.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-2.91,-1.06&ss=174',
      },
    ],
    faq: [
      {
        q: 'Serve il certificato medico per il Baby Nuoto?',
        a: 'No: per il Baby Nuoto non è richiesto il certificato medico né altre certificazioni.',
      },
      {
        q: 'A quale età si può cominciare il Baby Nuoto?',
        a: 'Dai 3 mesi in poi. Lo consigliamo fino ai 30 mesi, con un massimo di 36.',
      },
      {
        q: 'Cosa serve portare alla lezione di Baby Nuoto?',
        a: 'Per il bambino un costumino contenitivo — o un pannolino da piscina — e per l’accompagnatore costume e cuffia.',
      },
      {
        q: 'Quanti accompagnatori possono entrare in acqua con il bambino?',
        a: 'Uno solo per bambino. L’accompagnatore può cambiare da una lezione all’altra, ma non durante la stessa lezione.',
      },
      {
        q: 'Come sono organizzati gli spogliatoi?',
        a: 'In tutti gli spogliatoi ci sono box, fasciatoi e phon. In quelli femminili è presente l’assistenza.',
      },
      {
        q: 'A quale temperatura è la vasca del Baby Nuoto?',
        a: 'Durante l’attività di Baby Nuoto la temperatura è tenuta tra 31,5 °C e 31,8 °C.',
        scheda: 'snb/temperature-piscine',
        rimando: 'Tutte le temperature',
      },
      {
        q: 'Se non possiamo venire, come si disdice la lezione?',
        a: 'Puoi disdire entro un’ora dall’inizio della lezione: il prodotto acquistato ti viene riaccreditato e ti permette una nuova prenotazione in futuro.',
      },
      {
        q: 'La prenotazione è sempre necessaria?',
        a: 'Sì, la prenotazione è sempre necessaria: serve a garantire il posto a tutti, in una vasca con numeri controllati. Con la formula mensile puoi prenotare quante lezioni vuoi, senza limiti.',
      },
      {
        q: 'Come si pagano le lezioni e la quota mensile?',
        a: 'Le lezioni si pagano online con carta di pagamento, di debito o di credito. Per la formula mensile puoi scegliere fra carta di pagamento e addebito su conto corrente.',
        scheda: 'generali/metodo-di-pagamento',
        rimando: 'Metodi accettati',
      },
    ],
    simili: [
      { slug: 'gym-floor', perche: 'La sala attrezzi affaccia direttamente sulle piscine: ti alleni con la vasca davanti agli occhi.' },
      { slug: 'reformer', perche: 'Cinquanta minuti in Sala C: centro, postura e controllo, in gruppi da dieci.' },
      { slug: 'aqua-fitness', perche: 'Resti in acqua ma tocca a te: lavoro completo e nessun carico sulle articolazioni.' },
      { slug: 'ginnastica-posturale', perche: 'Per la schiena che ha portato in braccio tutto il giorno.' },
    ],
    titolo: 'Baby Nuoto Roma Talenti – Dai 3 mesi | Athlon Club',
    descrizione:
      'Baby Nuoto ad Athlon Club Roma Talenti, da 3 a 36 mesi: lezioni da 40 minuti con un genitore in acqua, vasca a 31,5 °C, spogliatoi con fasciatoi e assistenza. Richiedi turni e costi.',
  },
  {
    slug: 'scuola-nuoto-bambini',
    nome: 'Scuola Nuoto Bambini',
    eta: 'Scuola Nuoto Athlon · dal 1973',
    claim: 'Prima la passione. Poi i risultati.',
    cta: 'Trova il corso giusto per tuo figlio',
    ctaIntent: 'junior_info',
    hero: `${U}/2024/08/P1120412.jpg`,
    fuoco: '50% 35%',
    medium: 'SNB',
    titoloIntro: 'Dai 3 anni, in acqua senza il genitore',
    intro: [
      'Da oltre 50 anni Athlon è il punto di riferimento per la scuola nuoto bambini a Talenti, in Via Ugo Ojetti, facilmente raggiungibile da Montesacro, Bufalotta e Porta di Roma.',
      'I turni sono divisi per età e i gruppi per livello: dentro lo stesso orario i bambini vengono divisi in più corsi, e per ognuno si stabilisce un percorso didattico individuale. La struttura è stata rinnovata, con spazi dedicati ai bambini e ai genitori.',
    ],
    metodo: {
      eyebrow: 'Il metodo',
      titolo: 'Il Metodo Athlon',
      sub: 'Cinquant’anni di scuola nuoto federale in quattro passaggi. Prima costruiamo il rapporto di tuo figlio con l’acqua; i risultati arrivano da lì.',
      pilastri: [
        {
          nome: 'Inserimento',
          titolo: 'Il gruppo si decide in vasca',
          testo:
            'Gli orari sono divisi per età, e dentro lo stesso orario ci sono più corsi e più istruttori. Il gruppo di tuo figlio si definisce guardandolo nuotare, e l’istruttore viene assegnato definitivamente dopo le prime due settimane.',
        },
        {
          nome: 'Livello',
          titolo: 'Si cambia gruppo senza cambiare orario',
          testo:
            'Se durante la stagione tuo figlio è pronto per il gruppo successivo, passa: l’orario che avevi organizzato resta quello. Per ognuno si stabilisce un percorso didattico individuale.',
        },
        {
          nome: 'Progressione',
          titolo: 'Vedi a che punto è, e cosa gli manca',
          testo:
            'Nel tuo account, alla voce Brevetti, trovi i brevetti raggiunti e le prove necessarie per il livello successivo, aggiornati circa ogni due mesi. Se sei gia’ iscritto e vuoi parlarne con una persona, il Direttore Tecnico si prenota: ti richiamiamo noi.',
        },
        {
          nome: 'Brevetto',
          titolo: 'A fine stagione si chiude il percorso',
          testo:
            'Sessione brevetti a fine maggio: diploma della nostra Scuola Nuoto Federale e libretto aggiornato. Durante l’anno ci sono le gare del Trofeo Athlon, e l’iscrizione è facoltativa.',
        },
      ],
    },
    video: 'https://www.athlonroma.it/wp-content/uploads/2024/11/SCUOLA-NUOTO-BAMBINI-2.mp4',
    poster: `${U}/2024/08/P1120372-scaled.jpg`,
    facts: [
      'Per i nati dal 2013 al 2023',
      'Dal 14 settembre 2026 al 20 giugno 2027',
      'Turni divisi per età, gruppi divisi per livello',
      'Brevetto federale a fine stagione',
    ],
    titoloCorsi: 'I corsi',
    corsi: [
      {
        nome: 'Dai 3 ai 13 anni',
        sottotitolo: 'Stagione 2026/27',
        dettagli: [
          { l: 'Durata corso', v: 'Dal 14 settembre 2026 al 20 giugno 2027' },
          { l: 'Fascia d’età', v: 'Per i nati dal 2023 al 2013' },
          {
            l: 'Turni',
            v: 'Gli orari sono divisi per età. All’interno dello stesso orario i bambini vengono divisi per livello, e per ognuno si stabilisce un percorso didattico individuale',
          },
          { l: 'Progressi', v: 'Visibili sul tuo account nell’app Athlon Club' },
          { l: 'Brevetto', v: 'A fine stagione viene rilasciato il brevetto della nostra Scuola Nuoto Federale' },
          { l: 'Gare', v: 'Durante l’anno si svolgono le gare del Trofeo Athlon di Nuoto: l’iscrizione è facoltativa' },
        ],
        extra: [
          {
            titolo: 'La nostra organizzazione',
            punti: [
              'Assistenza negli spogliatoi garantita da personale qualificato',
              'Dagli 8 anni accesso autonomo allo spogliatoio, senza accompagnatori',
              'Per i più piccoli, spogliatoio dedicato con l’accompagnamento di un genitore',
              'Spogliatoi nuovi e adiacenti al piano vasca',
              'Temperatura dell’acqua e dell’ambiente controllata',
              'Balconata panoramica riservata ai genitori',
            ],
          },
        ],
      },
    ],
    spazi: [
      {
        nome: 'Piscina grande',
        testo: 'La nostra piscina da 25 metri con 5 corsie.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=.65,1.5&ss=126',
      },
      {
        nome: 'Piscina piccola',
        testo: 'La piscina 12 × 5 metri dedicata ai più piccoli, con una temperatura tra 30,3 °C e 30,8 °C.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-.98,1.3&ss=115',
      },
      {
        nome: 'Spogliatoio baby',
        testo: 'Lo spogliatoio dedicato ai più piccoli, con accesso consentito fino agli 8 anni e con accompagnatore.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-.1,.26&ss=146',
      },
      {
        nome: 'Spogliatoio grandi',
        testo: 'Gli spogliatoi dedicati ai bambini dagli 8 anni in poi. Qui non è permesso l’accesso ai genitori.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-2.91,-1.06&ss=174',
      },
      {
        nome: 'Area attesa',
        testo:
          'L’area dedicata all’attesa dei genitori, con TV da 82" per la visione delle piscine, food & beverage e aria condizionata.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-2.98,1.34&ss=86',
      },
      {
        nome: 'Balconata piscine',
        testo: 'Da qui puoi seguire la lezione e vedere i progressi di tuo figlio.',
        tour: 'https://my.mpskin.com/tour/dwg8pjdrkh?play=1&sr=-.02,-1.24&ss=58',
      },
    ],
    faq: [
      /* La prima domanda di un genitore che sta decidendo. Non esiste una lezione
         di prova, e non va inventata: quello che esiste è l'adesione mensile, che
         si disdice di mese in mese — quindi si frequenta un periodo e si smette.
         Il meccanismo è quello del regolamento (punto 4.11): rinnovo il primo del
         mese, disdetta 240 ore prima, cioè dieci giorni. La quota di attivazione
         alla riscrizione è scritta lì e va detta qui, altrimenti «senza vincoli»
         è una promessa che il regolamento non mantiene. */
      {
        q: 'È possibile effettuare una prova?',
        a: 'Sì, e il modo è l’abbonamento stesso: l’adesione è mensile e si rinnova il primo del mese, quindi puoi frequentare un periodo e, se tuo figlio non si trova bene, disdire — non ti leghi alla stagione intera. Per fermarti basta una email a <a href="mailto:disdetta@athlonroma.it">disdetta@athlonroma.it</a> almeno dieci giorni prima del primo del mese. Se più avanti tornate, la quota di attivazione va versata di nuovo.',
        scheda: 'snb/disdetta',
        rimando: 'Come e quando si disdice',
      },
      {
        id: 'certificato-junior',
        q: 'Serve il certificato medico per la scuola nuoto bambini?',
      },
      {
        q: 'Da che età si può cominciare la scuola nuoto?',
        a: 'Dai 30 mesi in poi e fino ai 13 anni. Prima dei 30 mesi c’è il <a href="/baby-nuoto">Baby Nuoto</a>, che si fa in acqua con un genitore.',
      },
      {
        q: 'Posso accompagnare mio figlio nello spogliatoio?',
        a: 'Certamente: abbiamo uno spogliatoio dedicato ai bambini con accompagnatore, e potrai accompagnarlo fino a quando lo riterrai opportuno. È permesso l’accesso a un solo accompagnatore.',
      },
      {
        q: 'Come sono suddivisi i corsi di nuoto per bambini?',
        a: 'I corsi sono suddivisi per fascia d’età. All’interno dello stesso orario sono presenti più corsi: durante la stagione i bambini vengono assegnati al corso più adatto alla loro progressione didattica.',
      },
      {
        q: 'Dove posso attendere mio figlio durante il corso?',
        a: 'Puoi accedere alla balconata sopra le piscine, sostare nella sala d’attesa dedicata in prossimità degli spogliatoi oppure attendere nell’area esterna.',
      },
      {
        q: 'Si possono recuperare le lezioni perse?',
        a: 'Sì, entro i limiti previsti per la stagione. Le regole precise — quante lezioni, in che periodo e come si prenota il recupero — sono nella scheda dell’Help Desk.',
        scheda: 'snb/recuperi-lezioni',
        rimando: 'Come funzionano i recuperi',
      },
    ],
    simili: [
      { slug: 'gym-floor', perche: 'La sala attrezzi affaccia direttamente sulle piscine: ti alleni con la vasca davanti agli occhi.' },
      { slug: 'booty-workout', perche: 'Cinquanta minuti a ritmo di musica, per gambe e glutei.' },
      { slug: 'nuoto-libero', perche: 'La vasca grande, cinque corsie, tutti i giorni della settimana.' },
      { slug: 'reformer', perche: 'Il Pilates sul Reformer, in gruppi da dieci con l’istruttore.' },
    ],
    titolo: 'Scuola Nuoto Bambini Roma Talenti – Dai 3 anni | Athlon Club',
    descrizione:
      'Scuola Nuoto Bambini ad Athlon Club Roma Talenti: dai 3 ai 13 anni, turni divisi per età, gruppi per livello e brevetto federale a fine stagione. Richiedi turni e costi.',
  },
  {
    slug: 'pallanuoto',
    nome: 'Pallanuoto',
    cta: 'Richiedi la prova di inserimento',
    ctaIntent: 'insertion_trial',
    eta: 'Dagli 8 anni in poi',
    claim: 'Nuoto, squadra e tattica di gioco',
    /* Ritaglio della foto originale (1140547): il soffitto occupava il terzo
       alto e sulla hero verticale del mobile spingeva i giocatori sotto il titolo. */
    hero: `${U}/2024/08/1140547-hero.jpg`,
    fuoco: '46% 40%',
    medium: 'PALLANUOTO',
    titoloIntro: 'Una tradizione che comincia nel 1989',
    intro: [
      'La tradizione pallanuotistica di Athlon affonda le radici nel lontano 1989. Da allora, nella nostra piscina di Roma Talenti, abbiamo formato numerosi piccoli campioni, molti dei quali sono arrivati fino alla Nazionale maggiore, grazie alla guida esperta di Gianni Orsini.',
      'La nostra missione è chiara: promuovere il gioco della pallanuoto insegnando ai ragazzi non solo le regole tecniche, ma anche i valori fondamentali dello sport — impegno, dedizione, sacrificio, lavoro di squadra e corretta competizione. La competizione sportiva serve ad accrescere la fiducia in sé stessi, a stimolare la crescita psicofisica e a favorire il lavoro di squadra in un ambiente sano e motivante.',
    ],
    facts: [
      'Dagli 8 anni in poi',
      'Dal 14 settembre 2026 al 20 giugno 2027',
      'Squadra dal 1989',
      'Prova di inserimento obbligatoria',
    ],
    titoloCorsi: 'I corsi della stagione 2026/27',
    corsi: [
      {
        nome: 'Acqua Gol',
        sottotitolo: 'Nati 2016 · 2017 · 2018',
        testo: [
          'Scopri l’emozione della pallanuoto: uno sport che unisce il nuoto alla tattica di gioco, in un ambiente divertente ed energico.',
          'Questo corso è pensato per i più piccoli che vogliono vivere qualcosa di diverso dalla scuola nuoto tradizionale: non solo vasche, ma gioco, squadra e voglia di stare in acqua insieme. Ogni lezione alterna il perfezionamento della tecnica di nuoto all’introduzione progressiva degli elementi base della pallanuoto: i bambini prendono familiarità con il campo di gioco direttamente in acqua, senza la pressione delle competizioni — in questa fase non sono previsti tornei o manifestazioni esterne.',
        ],
        punti: [
          'Consolidano la tecnica di nuoto, continuando a migliorare i movimenti fondamentali',
          'Sviluppano coordinazione e capacità psicofisiche con esercizi dinamici',
          'Imparano i primi fondamentali della pallanuoto giocando e sperimentando',
        ],
        livello: { codice: 'B2', voci: ['Dorso', 'Stile libero', 'Gambe rana'] },
        allenamenti: [
          { l: 'Sessioni disponibili', v: '3 a settimana' },
          { l: 'Frequenza consigliata', v: '2 allenamenti a settimana' },
        ],
        orari: [
          { g: 'Martedì', o: '16:50 – 17:40' },
          { g: 'Mercoledì', o: '16:50 – 17:40' },
          { g: 'Venerdì', o: '16:50 – 17:40' },
        ],
        prova: 'Prova di inserimento obbligatoria: valutazione del livello tecnico prima dell’ammissione al corso.',
        certificato: 'non agonistica',
      },
      {
        nome: 'Under 14',
        sottotitolo: 'Nati 2013 · 2014 · 2015',
        testo: [
          'Dopo i primi approcci è il momento di fare sul serio. Questo corso è il passaggio alla pallanuoto evoluta: un percorso strutturato in cui l’atleta non si limita a imparare, ma inizia a pensare da giocatore — affinando i fondamentali, ampliando il bagaglio tecnico e scoprendo la vera dimensione del gioco di squadra.',
          'Tutto questo in un ambiente positivo e motivante, dove il confronto con i compagni è uno stimolo e i valori sportivi — impegno, lealtà, rispetto — sono il fondamento di ogni allenamento.',
        ],
        punti: [
          'Tecnica più raffinata, con attenzione ai dettagli che fanno la differenza',
          'Consapevolezza tattica, per leggere il gioco e decidere in fretta',
          'Passione sempre più profonda per una disciplina che dà emozioni uniche',
        ],
        livello: { codice: 'B2', voci: ['Dorso', 'Stile libero', 'Gambe rana'] },
        allenamenti: [
          { l: 'Sessioni disponibili', v: '4 a settimana' },
          { l: 'Frequenza consigliata', v: '3 allenamenti a settimana' },
        ],
        orari: [
          { g: 'Martedì', o: '14:30 – 15:50' },
          { g: 'Mercoledì', o: '14:30 – 15:50' },
          { g: 'Venerdì', o: '14:30 – 15:50' },
          { g: 'Sabato', o: '14:30 – 16:00' },
        ],
        prova: 'Prova di inserimento obbligatoria: valutazione del livello tecnico prima dell’ammissione al corso.',
        certificato: 'agonistica',
        extra: [
          {
            titolo: 'Attività agonistica',
            testo:
              'I ragazzi partecipano a manifestazioni e tornei organizzati da enti di promozione sportiva. Le partite si svolgono solitamente la domenica, per conciliare sport e impegni scolastici. Gli atleti vengono tesserati con l’ente di promozione sportiva della manifestazione o del torneo a cui parteciperanno.',
          },
        ],
      },
    ],
    faq: [
      'frequenza-agonistica',
      { id: 'convocazioni', q: 'Quali sono i criteri delle convocazioni a gare, partite e manifestazioni?' },
      {
        q: 'Il kit tecnico è obbligatorio?',
        a: 'Sì: il tesserato ha l’obbligo di indossare il kit istituzionale durante le manifestazioni sportive a cui la società partecipa.',
        scheda: 'snb/kit-tecnico-agonistico',
        rimando: 'Cosa comprende e come si ordina',
      },
      {
        q: 'Dove posso acquistare il kit della pallanuoto?',
        a: 'Dalla tua area riservata, alla voce <strong>Prodotti</strong>. Dopo l’acquisto sarai contattato da un nostro incaricato per le taglie. Il kit tecnico pallanuoto costa 59 € e comprende cuffia in silicone, costume a doppio strato e zaino.',
      },
    ],
    simili: [
      { slug: 'gym-floor', perche: 'La sala attrezzi affaccia direttamente sulle piscine: ti alleni con la vasca davanti agli occhi.' },
      { slug: 'nuoto-libero', perche: 'Quarantaquattro ore di vasca grande a settimana, con i tecnici a bordo vasca.' },
      { slug: 'strenght', perche: 'Forza vera con i pesi, programmata: il corso Les Mills.' },
      { slug: 'hbx', perche: 'Small group ad alta intensità: Boxing o Fusion.' },
    ],
    titolo: 'Pallanuoto per bambini Roma Talenti – Dagli 8 anni | Athlon Club',
    descrizione:
      'Pallanuoto per bambini e ragazzi ad Athlon Club Roma Talenti: corsi Acqua Gol e Under 14, orari, livello richiesto e prova di inserimento. Richiedi turni e costi.',
  },
  {
    slug: 'nuoto-agonistico',
    nome: 'Nuoto Agonistico',
    cta: 'Richiedi la prova di inserimento',
    ctaIntent: 'insertion_trial',
    eta: 'Dagli 8 anni in poi',
    claim: 'Il ponte tra la scuola nuoto e la gara',
    hero: `${U}/2024/08/scuola-nuoto-bambini.jpg`,
    fuoco: '50% 35%',
    medium: 'NuotoAgonistico',
    titoloIntro: 'Dal gruppo alla gara, un passo alla volta',
    intro: [
      'Il corso di nuoto avanzato è il ponte naturale tra la scuola nuoto e il mondo agonistico — il passo successivo per chi vuole alzare l’asticella.',
      'Gli allenamenti sono pensati per perfezionare ogni movimento e tenere viva la passione per l’acqua. Le gare diventano palcoscenici di confronto e crescita personale, dove il cronometro misura i progressi ma non racconta tutto: ciò che si costruisce davvero è la costanza, la dedizione e la mentalità da atleta.',
    ],
    facts: [
      'Dagli 8 anni in poi',
      'Circuito ASI di nuoto',
      '4 tappe regionali da novembre a maggio',
      'Finale nazionale a giugno',
    ],
    blocchi: [
      {
        titolo: 'Attraverso allenamenti e gare, i ragazzi',
        punti: [
          'Affinano la tecnica fino a renderla precisa e fluida',
          'Scoprono nuovi obiettivi, che alimentano la motivazione settimana dopo settimana',
          'Crescono insieme, imparando il valore del rispetto, delle regole e dello spirito di squadra',
        ],
      },
      {
        titolo: 'Il calendario agonistico',
        testo:
          'Il Circuito ASI di Nuoto prevede 4 tappe regionali da novembre a maggio e una finale nazionale a giugno. Gli atleti sono suddivisi per fascia d’età e anno di nascita, con la libertà di iscriversi a una o più gare in base alle proprie ambizioni.',
      },
    ],
    titoloCorsi: 'I corsi della stagione 2026/27',
    corsi: [
      {
        nome: 'Propaganda',
        sottotitolo: 'Nati dal 2014 al 2018',
        testo: [
          'Questo percorso è dedicato a chi ha già frequentato la scuola nuoto e desidera continuare a migliorare, perfezionando le tecniche di base e vivendo l’emozione delle prime gare amatoriali, in un ambiente positivo e motivante.',
          'È garantita la partecipazione alle gare promozionali del Circuito ASI di Nuoto: un’occasione per divertirsi, confrontarsi con altri coetanei in vasca e vivere le prime emozioni da piccoli atleti.',
        ],
        livello: {
          codice: 'B3',
          voci: ['Stile libero bilaterale', 'Rana completa', 'Delfinizzazione', 'Subacquea 10 m'],
        },
        orari: [
          { g: 'Lunedì', o: '17:30 – 18:20' },
          { g: 'Giovedì', o: '17:30 – 18:20' },
          { g: 'Sabato', o: '17:30 – 18:20' },
        ],
        certificato: 'agonistica',
      },
      {
        nome: 'Nuoto Agonistico',
        sottotitolo: 'Nati dal 2008 al 2015',
        testo: [
          'Un’alternativa stimolante alla scuola nuoto avanzata, pensata per chi vuole continuare a crescere migliorando tecnica, resistenza e consapevolezza in acqua.',
          'Qui l’allievo inizia a vivere l’esperienza di far parte di una squadra, apprendendo i fondamentali del nuoto agonistico e partecipando alle gare ufficiali del Circuito ASI.',
        ],
        livello: { codice: 'B4', voci: ['Dorso', 'Stile libero', 'Rana'] },
        allenamenti: [
          { l: 'Sessioni disponibili', v: '4 a settimana' },
          { l: 'Frequenza richiesta', v: '3 allenamenti a settimana' },
        ],
        orari: [
          { g: 'Lunedì', o: '15:00 – 15:50' },
          { g: 'Martedì', o: '15:00 – 15:50' },
          { g: 'Giovedì', o: '15:00 – 15:50' },
          { g: 'Venerdì', o: '15:00 – 15:50' },
        ],
        prova: 'Prova di inserimento obbligatoria: valutazione del livello tecnico prima dell’ammissione al corso.',
        certificato: 'agonistica',
      },
    ],
    faq: [
      'frequenza-agonistica',
      { id: 'convocazioni', q: 'Quali sono i criteri delle convocazioni alle gare e manifestazioni?' },
      {
        q: 'Come funzionano le gare del Circuito ASI?',
        a: 'Quattro tappe regionali da novembre a maggio e la finale nazionale a giugno. Gli atleti sono divisi per fascia d’età e anno di nascita, e si può scegliere a quante gare iscriversi.',
        scheda: 'snb/gare-nuoto',
        rimando: 'Come funzionano le gare',
      },
      {
        q: 'Il kit tecnico è obbligatorio?',
        a: 'Sì: il tesserato ha l’obbligo di indossare il kit istituzionale durante le manifestazioni sportive a cui la società partecipa. Il kit tecnico nuoto agonistico costa 49 € e comprende cuffia in silicone, costume, zaino e maglietta.',
        scheda: 'snb/kit-tecnico-agonistico',
        rimando: 'Cosa comprende e come si ordina',
      },
    ],
    simili: [
      { slug: 'gym-floor', perche: 'La sala attrezzi affaccia direttamente sulle piscine: ti alleni con la vasca davanti agli occhi.' },
      { slug: 'nuoto-libero', perche: 'Corsie dedicate in vasca grande, con l’assistenza dei tecnici federali.' },
      { slug: 'pilates', perche: 'Core, postura e respiro, sul tappetino.' },
      { slug: 'body-sculpt', perche: 'Circuito completo con bilanciere, step e manubri.' },
    ],
    titolo: 'Nuoto Agonistico e Preagonistico Roma Talenti | Athlon Club',
    descrizione:
      'Nuoto agonistico e preagonistico ad Athlon Club Roma Talenti: corsi Propaganda e Agonistico, Circuito ASI, orari e livelli richiesti. Richiedi turni e costi.',
  },
];

export function getJunior(slug: string): CorsoJunior {
  const c = JUNIOR.find((x) => x.slug === slug);
  if (!c) throw new Error(`Corso junior non trovato: ${slug}`);
  return c;
}

/** L'indirizzo del modulo per una pagina, o per uno dei suoi pulsanti. */
export function formDi(c: CorsoJunior, medium = c.medium): string {
  return `${FORM}${c.mediumParam ?? 'medium'}=${medium}`;
}
