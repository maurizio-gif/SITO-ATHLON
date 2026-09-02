import { PG } from './cta';
import { countLessons, getBand } from './planning';

/**
 * I due piani di abbonamento: nomi, attività comprese, opzioni e prezzi.
 *
 * Stavano dentro `abbonamenti.astro`, e ci sono rimasti finché li leggeva solo
 * quella pagina. Ora li leggono in tre: la pagina, i dati strutturati delle
 * offerte e `/llms.txt`. Un prezzo scritto in tre posti è un prezzo che prima o
 * poi diverge in due, quindi sta qui.
 */
/**
 * La riga che spiega ogni attività compresa, per il modale dietro i chip
 * «attività incluse». La leggono la pagina abbonamenti e la landing /promo:
 * stessa attività, stessa spiegazione, un posto solo.
 */
/**
 * L'età minima per le attività degli adulti, tutte quante.
 *
 * Non è un dettaglio di una sola disciplina: è la soglia sotto la quale il
 * palinsesto adulti non è accessibile, **nuoto libero compreso**. È il caso che
 * arriva più spesso in chat — «posso portare mio figlio in piscina a nuotare?»
 * — e la risposta è no: sotto i tredici anni si passa dalla Scuola Nuoto
 * Bambini, che è un corso con un istruttore in vasca, non un accesso libero.
 *
 * Sta nei dati e non in una pagina perché deve finire nella KB
 * dell'assistente insieme a ogni attività per adulti: una regola che vive in
 * un solo punto è una regola che il bot non trova quando gli serve.
 */
export const ETA_MINIMA_ADULTI = {
  anni: 13,
  /** Dove va chi è sotto la soglia: non un rifiuto, un'alternativa. */
  alternativa: 'la Scuola Nuoto Bambini, fino ai 13 anni',
} as const;

export const activityInfo: Record<string, { title: string; body: string; href?: string }> = {
  'Gym Floor': {
    title: 'Gym Floor',
    /* **«Accesso libero» non è mai stato il nome giusto, e in chat è diventato
       un errore**: l'assistente ha risposto che la sala «si entra quando vuoi,
       senza prenotazione» e che con lo Smart ci si allena da soli. La sessione
       si prenota come una lezione, e prenotandola si sceglie la fascia.

       **E la fascia Con Assistenza è supervisione, non allenamento seguito**:
       c'è un assistente di sala che tiene d'occhio tutta la sala, risponde a
       chi chiede e aiuta a scegliere fra i trenta piani dell'app. Chi vuole
       qualcuno che segua solo lui prende una seduta di personal training —
       promettere l'una e dare l'altra è il modo di far arrivare una persona
       delusa alla prima sessione. */
    body:
      '400 mq di sala aperta dalle 6:00 alle 22:00: area cardio Matrix 4.0 con macchinari connessi all\'app, area isotonica, area funzionale Ziva con rig da 8 metri, manubri fino a 50 kg e area cavi e carico libero. 30 piani di allenamento già disponibili sulla tua App, con Assistenza di Sala (quando prenoti trovi indicato gli orari con Assistenza). Per essere seguiti individualmente ci sono le sedute di personal training, che si prenotano e si acquistano a parte.',
    href: '/gym-floor',
  },
  'Nuoto Libero Assistito': {
    title: 'Nuoto Libero Assistito',
    /* A bordo vasca ci sono due figure, non una: Tecnici Federali — gli
       stessi istruttori della Scuola Nuoto — e Assistenti Bagnanti, entrambi
       per tutta la durata del turno. Lo dice /nuoto-libero (intro e punti):
       ridurlo al solo bagnino sottostima chi c'è davvero a bordo vasca. */
    body:
      'Nuoto libero nella vasca da 25 metri a 5 corsie, con Tecnici Federali e Assistenti Bagnanti sempre a bordo vasca, per tutta la durata del turno. Corsie divise per ritmo, temperatura costante fra 28 °C e 28,5 °C.',
    href: '/nuoto-libero',
  },
  'Athlon TV': {
    title: 'Athlon TV',
    body:
      'La piattaforma di allenamenti on demand inclusa nell\'abbonamento: sessioni da seguire quando vuoi, anche da casa, direttamente dall\'app Athlon Club.',
    href: '/athlon-tv',
  },
  'Corsi Fitness': {
    title: 'Corsi Fitness',
    body:
      'Oltre 80 corsi a settimana in due sale dedicate: attività aerobiche, olistiche e di tonificazione, più HIIT in Sala B. Prenoti dall\'app a partire da 3 giorni prima.',
    href: '/corsi-fitness',
  },
  'Group Reformer': {
    title: 'Group Reformer',
    body:
      'Pilates Reformer in piccoli gruppi da 10 persone con istruttore dedicato, nella nuova Sala C da 80 mq. Lavoro su postura, forza e mobilità.',
    href: '/reformer',
  },
  'Aqua Fitness': {
    title: 'Aqua Fitness',
    body:
      'Allenamento cardio a basso impatto in acqua, su due vasche: Aqua Aerobic, Aqua Soft, Aqua Tonic e Hydrobike nella vasca piccola, a una temperatura fra 30 °C e 30,5 °C; l’Aqua Training si svolge invece in vasca grande, sempre fra 28 °C e 28,5 °C. Ideale anche per chi cerca un carico dolce sulle articolazioni.',
    href: '/aqua-fitness',
  },
  'Scuola Nuoto Adulti': {
    title: 'Scuola Nuoto Adulti',
    /* Il numero di lezioni viene dal planning, non è scritto a mano: cambia
       da solo quando cambia il palinsesto, come in [corso].astro. */
    body:
      `Corsi su tre livelli — base, intermedio e avanzato — con istruttori federali: ${countLessons(getBand('scuola-nuoto-adulti'))} lezioni a settimana tra cui scegliere, senza limiti di frequenza. Prenoti quando vuoi, negli orari del tuo livello.`,
    href: '/scuola-nuoto-adulti',
  },
  'Corso Gestanti': {
    title: 'Corso Gestanti',
    /* In Vasca Grande, in sospensione: lo dice il planning (Aqua Gestanti,
       Vasca Grande) e non la vasca piccola più calda delle altre lezioni
       in appoggio dell'Aqua Fitness. */
    body:
      'Attività in acqua pensata per la gravidanza, in vasca alta e in sospensione: il peso è sostenuto dall\'acqua, per un lavoro a basso impatto sulle articolazioni. Lavoro dolce su respirazione, mobilità e scarico del peso.',
    href: '/gestanti',
  },
};

export const plans = [
  {
    id: 'smart',
    /* Il badge diceva «Autonomia» e il claim «Allenati in autonomia», ed è la
       riga da cui la chat ha dedotto che in sala si sta da soli. In sala il
       trainer c'è: quello che lo Smart lascia fuori è il palinsesto dei corsi,
       non l'assistenza. */
    badge: 'Sala e vasca',
    name: 'Smart',
    claim: 'Sala e vasca, quando vuoi.',
    desc: 'Gym Floor e Nuoto Libero Assistito tutti i giorni, più Athlon TV: prenoti la sessione, scegli se allenarti con il trainer in sala o per conto tuo, e costruisci la tua routine fra sala e vasca senza dipendere dal palinsesto dei corsi.',
    activities: ['Gym Floor', 'Nuoto Libero Assistito', 'Athlon TV'],
    options: [
      {
        title: 'Annuale',
        sub: 'Pagamento mensile',
        note: 'Rinnovo automatico annuale · disdetta via email entro 10 giorni dalla fine dell\'abbonamento',
        savings: 'Risparmio €138 vs Flex',
        amount: '75',
        period: '€/mese',
        href: `${PG}/Registration/Start?clubID=1&PaymentPlanId=263`,
      },
      {
        title: 'Annuale',
        sub: 'Pagamento unico',
        note: 'Rinnovo automatico annuale · disdetta via email entro 10 giorni dalla fine dell\'abbonamento',
        savings: 'Risparmio €438 vs Flex annuo',
        amount: '750',
        period: '€/anno',
        href: `${PG}/Registration/Start?clubID=1&PaymentPlanId=264`,
      },
      {
        title: 'Mensile',
        sub: 'Flex, senza vincoli',
        note: 'Minimo 1 mese · disdetta via App entro 10 giorni dalla fine del mese',
        amount: '99',
        period: '€/mese',
        href: `${PG}/Registration/Start?clubID=1&PaymentPlanId=254`,
      },
    ],
  },
  {
    id: 'premium',
    badge: 'Consigliato · Tutto il club',
    name: 'Premium',
    claim: 'Vivi tutto il club.',
    desc: 'Corsi fitness, Group Reformer, Aqua Fitness, Scuola Nuoto Adulti e Corso Gestanti, oltre a Gym Floor, nuoto libero e Athlon TV: entri nel palinsesto completo e scegli ogni settimana cosa fare.',
    activities: [
      'Gym Floor',
      'Corsi Fitness',
      'Group Reformer',
      'Aqua Fitness',
      'Scuola Nuoto Adulti',
      'Nuoto Libero Assistito',
      'Corso Gestanti',
      'Athlon TV',
    ],
    options: [
      {
        title: 'Annuale',
        sub: 'Pagamento mensile',
        note: 'Rinnovo automatico annuale · disdetta via email entro 10 giorni dalla fine dell\'abbonamento',
        savings: 'Risparmio €288 vs Flex',
        amount: '95',
        period: '€/mese',
        href: `${PG}/Registration/Start?clubID=1&PaymentPlanId=252`,
      },
      {
        title: 'Annuale',
        sub: 'Pagamento unico',
        note: 'Rinnovo automatico annuale · disdetta via email entro 10 giorni dalla fine dell\'abbonamento',
        savings: 'Risparmio €488 vs Flex annuo',
        amount: '950',
        period: '€/anno',
        href: `${PG}/Registration/Start?clubID=1&PaymentPlanId=249`,
      },
      {
        title: 'Mensile',
        sub: 'Flex, senza vincoli',
        note: 'Minimo 1 mese · disdetta via App entro 10 giorni dalla fine del mese',
        amount: '119',
        period: '€/mese',
        href: `${PG}/Registration/Start?clubID=1&PaymentPlanId=253`,
      },
    ],
  },
];

/**
 * La sospensione: illimitata, a pagamento, un mese solare per volta.
 *
 * È il dato che toglie la paura di firmare un annuale — «e se mi fermo?» — e
 * per questo compare in tre punti: le schede dei piani sulla landing della
 * promo, la nota sotto il listino e la f.a.q. degli abbonamenti. Il prezzo sta
 * qui, così non diverge fra i tre.
 */
export const SOSPENSIONE = {
  prezzo: '15',
  /** Il preavviso, in giorni, rispetto al primo del mese. */
  preavviso: 10,
  scheda: '/wikiathlon/adulti/sospensione/',
  /**
   * A che cosa si applica, che è la parte che mancava e che la scheda invece
   * dice in cima: «valido per abbonamenti Adulti acquistati dal 1 Settembre
   * 2021 e abbonamenti Baby Nuoto». I quindici euro non valgono per gli altri
   * corsi dei bambini, e un assistente che non lo sa promette a un genitore una
   * cosa che alla cassa non esiste.
   */
  valePer: 'gli abbonamenti Adulti acquistati dal 1 settembre 2021 e gli abbonamenti Baby Nuoto',
  /** I corsi che non la hanno, per nome: sono la domanda che arriva. */
  nonValePer: ['Scuola Nuoto Bambini', 'Nuoto Agonistico', 'Pallanuoto'],
  /**
   * La sospensione per inabilità **degli adulti e del Baby Nuoto**: gratuita,
   * per inidoneità documentata di almeno sessanta giorni continuativi, e con il
   * recupero che parte da due mesi (sotto i due mesi non si recupera nulla).
   * Sta nella stessa scheda di quella a pagamento, perché la scheda le mette a
   * confronto in una tabella — che è il modo in cui si smette di confonderle.
   */
  inabilita: {
    giorni: 60,
    recuperoMesiMinimo: 2,
    scheda: '/wikiathlon/adulti/sospensione/',
  },
  /**
   * E il regime dei corsi in vasca dei bambini, che è **un'altra cosa** e non
   * una variante: Scuola Nuoto Bambini, Nuoto Agonistico e Pallanuoto non hanno
   * la sospensione a pagamento, e quella per inidoneità funziona in modo
   * diverso — durante la sospensione la quota mensile **resta dovuta**, il
   * ristoro è un credito di almeno due mensilità pagate da usare entro sei mesi
   * dalla fine del corso, e la sospensione è alternativa al recupero delle
   * lezioni, non cumulabile con esso (punti 4.7, 4.10 e 6.7).
   *
   * Questo blocco nasce da una risposta sbagliata del 28/08: a un Premium
   * Mensile Flex — un adulto — l'assistente ha dato i quindici euro giusti e poi
   * il credito di «almeno 2 mensilità utilizzabile entro 6 mesi dalla fine del
   * corso», che è la regola della scuola nuoto. I due regimi vivevano in due
   * schede diverse senza che nessuna delle due dichiarasse il proprio perimetro,
   * e il modello li ha impastati. Ora il perimetro è un dato, e il `kb.json` ne
   * fa due voci separate che si nominano a vicenda.
   */
  junior: {
    giorni: 60,
    creditoMensilita: 2,
    creditoEntroMesi: 6,
    scheda: '/wikiathlon/snb/sospensione/',
    valePer: ['Scuola Nuoto Bambini', 'Nuoto Agonistico', 'Pallanuoto'],
  },
} as const;

/**
 * Il Guest Pass: la prova del club. Sette giorni, un prezzo, un requisito e un
 * codice — gli stessi dati che la pagina abbonamenti mostra nel suo blocco e che
 * la sezione «Provali tutti» dei corsi fitness ripete.
 */
export const GUEST_PASS = {
  giorni: 7,
  prezzo: '19',
  codice: 'GOLD7',
  /** Riservato a chi non ha avuto un abbonamento Athlon da quest'anno in poi. */
  dal: 2021,
} as const;

/**
 * Cosa si prova con il Guest Pass, e perché è una lista **derivata**.
 *
 * Il Pass è un Premium di sette giorni: il suo perimetro non è una lista sua, è
 * quella del Premium. Riscriverla qui vorrebbe dire poterla cambiare in un
 * posto solo dei due, e scoprirlo dal giorno in cui l'assistente promette
 * un'attività che il Pass non apre — che è esattamente l'errore già capitato
 * col Baby Nuoto, in piccolo e in una sola conversazione.
 *
 * La legge chi lo propone: `/prova`, la voce «Guest Pass» della knowledge base
 * e, da lì, l'assistente in chat, che ha l'obbligo di elencarle tutte quando lo
 * propone. Un'attività aggiunta al Premium entra in tutti e tre da sola.
 */
export const ATTIVITA_GUEST_PASS: readonly string[] =
  plans.find((p) => p.id === 'premium')?.activities ?? [];

/**
 * Gli accessi singoli, e il perché stanno qui e non nella pagina.
 *
 * Erano scritti a mano dentro `abbonamenti.astro`, e per questo la KB
 * dell'assistente non li aveva mai visti: a «avete carnet di accessi?» il bot
 * rispondeva che i corsi stanno «solo negli abbonamenti», che è falso e manda
 * via una persona che voleva pagare. Un listino che vive nel markup di una
 * pagina è un listino che esiste per chi apre quella pagina e per nessun altro.
 *
 * Il carnet, quello, davvero non c'è: non si comprano pacchetti di ingressi
 * prepagati. Si prenota e si paga una lezione alla volta — che è la cosa che
 * serve sapere, e che va detta al posto di un «no».
 */
/**
 * La quota di attivazione contrattuale (clausola 3.1): una tantum, e si paga
 * per **ogni** abbonamento attivato — il secondo abbonamento di una famiglia
 * la paga come il primo. Comprende il badge di accesso e l'attivazione
 * dell'account, e si versa di nuovo se si disdice e più avanti si torna.
 *
 * Viveva scritta a mano in `abbonamenti.astro` e in `preiscrizioni-nuoto.md`,
 * quindi la pagina la diceva e il `kb.json` no: a «quanto è la quota che si
 * paga al momento dell'iscrizione?» l'assistente ha risposto — correttamente,
 * per la regola 2 — che il dato non era nella sua documentazione. Un numero
 * che una pagina stampa e i dati non hanno è un numero che l'assistente non
 * può dire.
 *
 * Non si applica alla lezione singola, che è il modo di entrare senza
 * abbonarsi: là c'è il solo badge di `SINGOLI.badge`.
 */
/**
 * La data di inizio la sceglie chi si iscrive, fino a **14 giorni avanti**.
 *
 * È il fatto che mancava, e la sua assenza ha prodotto il peggior consiglio che
 * questa chat abbia dato: il 30 agosto, a una persona che chiedeva «se mi
 * iscrivo oggi risparmio?», l'assistente ha risposto «conviene aspettare
 * domani» — cioè ha allontanato un'iscrizione già decisa, per otto euro di
 * pro-rata che si era anche calcolato da solo.
 *
 * Non l'aveva inventato: la scheda `adulti/pro-rata-durata-minima` chiudeva con
 * «se puoi scegliere, far partire l'abbonamento il 1° del mese semplifica
 * tutto», e la stessa frase stava nella f.a.q. della promo. Detta senza dire
 * **come** si sceglie, quella riga si legge in un modo solo: aspetta.
 *
 * Il come è questo: ci si iscrive oggi e si imposta la data di inizio nel
 * contratto. Quindi non c'è niente da rimandare, e non c'è nessun risparmio da
 * inseguire — si paga da quando si comincia, e basta.
 *
 * Il numero vive in tre posti e due non sono evitabili: qui è la fonte, e le
 * due copie stanno in `pro-rata-durata-minima.md` e in `promo.md`, che sono
 * contenuti di Tina e non possono importare TypeScript. Vale la regola di
 * `ATTIVAZIONE.quota`: il giorno che cambia vanno aggiornati tutti e tre.
 */
export const DATA_INIZIO = {
  /** Giorni di anticipo massimo fra iscrizione e inizio dell'abbonamento. */
  giorniMax: '14',
  testo:
    "Iscrivendoti scegli tu la data di inizio dell'abbonamento: può essere lo stesso giorno oppure una data futura, fino a 14 giorni dopo l'iscrizione. Quindi non c'è un momento più conveniente di un altro per iscriversi — paghi da quando parte l'abbonamento, non da quando firmi. Se fai partire l'abbonamento a mese iniziato la prima quota copre solo i giorni che restano; se lo fai partire il 1° del mese non c'è pro-rata. In tutti e due i casi ti iscrivi quando vuoi e imposti la data che preferisci in fase di iscrizione.",
} as const;

export const ATTIVAZIONE = {
  /** Euro, una tantum, per ogni abbonamento attivato. */
  quota: '50',
  comprende: "il badge di accesso e l'attivazione dell'account",
} as const;

/**
 * I corsi junior a stagione — Scuola Nuoto Bambini, Pallanuoto, Nuoto
 * Agonistico — si vendono in una sola forma: l'abbonamento **mensile**.
 *
 * Il numero vive qui e non solo nella tabella di `snb/preiscrizioni-nuoto.md`,
 * che e' contenuto di Tina e quindi non arriva alla chat: prima di questa
 * costante l'assistente sapeva che i corsi sono mensili e non sapeva quanto
 * costano, che e' il modo in cui una domanda di prezzo finisce senza risposta.
 * Il Baby Nuoto non e' qui: la sua adesione sta in `junior.ts`, con la lezione
 * singola, perche' e' l'unico corso per bambini che si compra anche a lezione.
 */
export const JUNIOR_MENSILE = {
  valePer: ['Scuola Nuoto Bambini', 'Pallanuoto', 'Nuoto Agonistico'],
  voci: [
    { nome: 'Monosettimanale', prezzo: '89' },
    { nome: 'Bisettimanale', prezzo: '109' },
    { nome: 'Agonistico / Pallanuoto', prezzo: '119' },
  ],
  /** Il rinnovo, punto 4.11 delle condizioni contrattuali. */
  rinnovo: 'automatico il giorno 1 di ogni mese',
  proRata:
    'nei mesi di apertura e chiusura della stagione (inizio 14/09, fine 20/06) si paga la quota proporzionale ai giorni effettivi',
  scheda: '/wikiathlon/snb/preiscrizioni-nuoto/',
} as const;

/**
 * La preiscrizione, e questa costante esiste per una domanda sola: «ci sono
 * sconti?».
 *
 * Le scontistiche dei corsi junior non sono una promozione che va e viene: sono
 * legate alla finestra in cui si sceglie il turno per la stagione successiva, e
 * fuori da quella finestra **non esistono**. Detto senza la finestra, «c'e' uno
 * sconto del 15%» e' un prezzo dichiarato piu' basso del vero — il verso
 * sbagliato in cui sbagliare, perche' si scopre alla cassa.
 */
export const PREISCRIZIONE = {
  /** Ogni anno, e sono le stesse date per tutti e tre i corsi. */
  finestra: 'dal 1 maggio al 31 luglio di ogni anno',
  sconto: '15',
  /** Cosa si sconta: la formula stagionale, che si compra solo li'. */
  su: "l'abbonamento stagionale",
  valePer: ['Scuola Nuoto Bambini', 'Pallanuoto', 'Nuoto Agonistico'],
} as const;

export const SINGOLI = {
  /** Il badge, una tantum: si paga la prima volta e poi mai più. */
  badge: '5',
  voci: [
    { nome: 'Gym Floor', nota: 'Accesso 90 minuti', prezzo: '20' },
    { nome: 'Corso Fitness', nota: '85+ corsi tra cui scegliere', prezzo: '22' },
    { nome: 'Aqua Fitness', nota: 'Aqua Gym, Hydrobike, Gestanti', prezzo: '22' },
    { nome: 'Nuoto Libero Assistito', nota: 'Sessione 60 minuti', prezzo: '20' },
    { nome: 'Scuola Nuoto Adulti', nota: 'Base, Intermedio, Avanzato', prezzo: '22' },
    { nome: 'Group Reformer', nota: 'Gruppi da 10 con istruttore', prezzo: '25' },
  ],
} as const;

/**
 * Il personal training: pacchetti mensili sopra un abbonamento attivo, e la
 * seduta singola, che è l'unica cosa del club aperta anche a chi non è iscritto.
 */
export const PERSONAL = {
  pacchetti: [
    { etichetta: '2 sedute al mese', prezzo: '80' },
    { etichetta: '4 sedute al mese', prezzo: '140' },
    { etichetta: '8 sedute al mese', prezzo: '280' },
  ],
  singolaIscritti: '45',
  singolaEsterni: '55',
} as const;
