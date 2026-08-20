import { PG } from './cta';

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
    body:
      '400 mq di sala accessibile dalle 6:00 alle 22:00: area cardio Matrix 4.0 con macchinari connessi all\'app, area isotonica, area funzionale Ziva con rig da 8 metri, manubri fino a 50 kg e area cavi e carico libero.',
    href: '/gym-floor',
  },
  'Nuoto Libero Assistito': {
    title: 'Nuoto Libero Assistito',
    body:
      'Nuoto libero nella vasca da 25 metri a 5 corsie, con assistenza bagnino sempre presente. Corsie divise per ritmo, temperatura costante fra 28 °C e 28,5 °C.',
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
      'Oltre 80 corsi a settimana in tre sale dedicate: attività aerobiche, olistiche e di tonificazione, HIIT in Sala B e Group Reformer in Sala C. Prenoti dall\'app fino a 3 giorni prima.',
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
      'Allenamento cardio a basso impatto in acqua: Aqua Gym e Hydrobike nella vasca da 12 metri, con temperatura fra 30 °C e 31,8 °C. Ideale anche per chi cerca un carico dolce sulle articolazioni.',
    href: '/aqua-fitness',
  },
  'Scuola Nuoto Adulti': {
    title: 'Scuola Nuoto Adulti',
    body:
      'Corsi su tre livelli — base, intermedio e avanzato — con istruttori federali. Dal primo approccio all\'acqua al perfezionamento dei quattro stili.',
    href: '/scuola-nuoto-adulti',
  },
  'Corso Gestanti': {
    title: 'Corso Gestanti',
    body:
      'Attività in acqua pensata per la gravidanza, seguita da personale specializzato, nella vasca a temperatura più alta. Lavoro dolce su respirazione, mobilità e scarico del peso.',
    href: '/gestanti',
  },
};

export const plans = [
  {
    id: 'smart',
    badge: 'Autonomia',
    name: 'Smart',
    claim: 'Allenati in autonomia.',
    desc: 'Gym Floor e Nuoto Libero Assistito tutti i giorni, più Athlon TV: costruisci la tua routine fra sala e vasca, senza dipendere dal palinsesto dei corsi.',
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
   * L'altra sospensione, che non è la stessa cosa e viene confusa sempre:
   * gratuita, per inidoneità documentata di almeno sessanta giorni. Quella
   * **c'è anche** per i corsi che non hanno quella a pagamento, ed è alternativa
   * al recupero delle lezioni. Senza questa riga la risposta giusta diventa un
   * «no» che è falso per metà.
   */
  inabilita: {
    giorni: 60,
    scheda: '/wikiathlon/snb/preiscrizioni-nuoto/',
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
