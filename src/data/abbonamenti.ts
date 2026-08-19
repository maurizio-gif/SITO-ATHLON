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
