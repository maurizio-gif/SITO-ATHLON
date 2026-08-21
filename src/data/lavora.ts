/**
 * Le posizioni aperte di `/lavora`.
 *
 * Sta qui e non nel CMS per la stessa ragione dei prezzi: la pagina le elenca e
 * il form le offre nella tendina, e da due posti diversi divergerebbero — con
 * il risultato che qualcuno si candida a un ruolo che l'elenco non mostra più.
 * Aggiungere una posizione è aggiungere una voce a questo array.
 *
 * **Un annuncio inventato è peggio di un annuncio assente**, e qui più che
 * altrove: manda una persona a scrivere una lettera per un posto che non
 * esiste. Se non sai se una posizione è ancora aperta, toglila — la pagina
 * regge benissimo l'elenco vuoto, perché la candidatura spontanea resta.
 */

export interface Posizione {
  /** Va nel database e nel valore della tendina: minuscolo, con i trattini. */
  id: string;
  titolo: string;
  /** «Full time», «Part time», «Collaborazione a partita IVA»… */
  impegno?: string;
  /** Dove si lavora dentro il club: «Piscina», «Sala pesi», «Reception». */
  area?: string;
  /** Due o tre righe: cosa fa questa persona, non l'elenco dei doveri. */
  descrizione: string;
  /** Quello che serve davvero. Un requisito in più è un candidato in meno. */
  requisiti?: string[];
}

/**
 * Vuoto finché il club non passa gli annunci veri.
 *
 * La forma di una voce, per chi la aggiunge:
 *
 * ```ts
 * {
 *   id: 'istruttore-sala',
 *   titolo: 'Istruttore di sala',
 *   impegno: 'Part time',
 *   area: 'Sala pesi',
 *   descrizione: 'Segui chi si allena in sala…',
 *   requisiti: ['Diploma ISEF o laurea in Scienze Motorie', 'Disponibilità serale'],
 * }
 * ```
 */
export const POSIZIONI: Posizione[] = [];

/**
 * La voce che c'è sempre, anche quando l'elenco è pieno: un club assume anche
 * fuori dagli annunci, e chi si presenta prima che il posto si apra è
 * esattamente la persona che si vorrebbe avere in archivio.
 */
export const SPONTANEA = {
  id: 'spontanea',
  titolo: 'Candidatura spontanea',
} as const;

/** Il tetto del curriculum, in byte. Lo stesso dell'allegato dell'Help Desk. */
export const CV_MAX_BYTE = 5 * 1024 * 1024;

/** Cosa accetta il campo del curriculum. PDF in testa, che è quello giusto. */
export const CV_TIPI = '.pdf,.doc,.docx,application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Il webhook n8n che salva su Supabase e manda il curriculum al club. */
export const ENDPOINT_CANDIDATURA =
  'https://automazione.n8ndevelop.it/webhook/athlon-candidatura';
