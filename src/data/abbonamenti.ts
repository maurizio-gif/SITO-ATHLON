import { PG } from './cta';

/**
 * I due piani di abbonamento: nomi, attività comprese, opzioni e prezzi.
 *
 * Stavano dentro `abbonamenti.astro`, e ci sono rimasti finché li leggeva solo
 * quella pagina. Ora li leggono in tre: la pagina, i dati strutturati delle
 * offerte e `/llms.txt`. Un prezzo scritto in tre posti è un prezzo che prima o
 * poi diverge in due, quindi sta qui.
 */
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
