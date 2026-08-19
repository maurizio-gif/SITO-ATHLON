/**
 * L'attivazione del Guest Pass sul portale: dove si incolla il codice e i sei
 * passi per arrivarci. Vive qui perché la stessa lista compare in due posti —
 * il modal della prova (`ProvaModal.astro`) e la landing `/attiva` che si
 * manda via email e WhatsApp a chi il codice ce l'ha già — e i due non devono
 * poter divergere il giorno in cui il portale cambia un passaggio.
 */
import { PG } from './cta';

/** Dove si incolla il codice: la registrazione del portale, non la home. */
export const REGISTRAZIONE = `${PG}/#/Registration`;

/** I sei passi dell'attivazione, gli stessi dell'email e del WhatsApp che manda n8n. */
export const PASSI_ATTIVAZIONE = [
  'Clicca su <strong>Abbonamenti</strong>',
  'Scegli una categoria e clicca su <strong>Ho un codice promozionale</strong>',
  'Clicca su <strong>Avanti</strong> e scegli il giorno di inizio del Pass',
  'Nel riepilogo trovi il pagamento di <strong>19 €</strong>',
  'Accetta il regolamento, firma e clicca su <strong>Attiva Abbonamento</strong>',
  'Inserisci il metodo di pagamento: carta o conto corrente',
];
