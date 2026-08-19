/**
 * Le regole del club in numeri: i fatti che il sito ripete in più punti.
 *
 * Nascono da un guasto vero. Il termine per il certificato medico era scritto in
 * sei posti e diceva tre cose diverse — «15 giorni» nella scheda dell'Help Desk e
 * su due pagine, «2 settimane dalla prima lezione» sugli abbonamenti, «le prime
 * due settimane» sui corsi — mentre il termine è uno solo: quattordici giorni.
 * Nessuno di quei sei punti era sbagliato quando è stato scritto; sono diventati
 * sbagliati separatamente, che è il modo normale in cui un numero ricopiato
 * diverge.
 *
 * Quindi: **un fatto, una costante.** Le risposte e le pagine compongono la
 * frase, il numero lo leggono da qui. Se cambia la regola si cambia una riga di
 * questo file e cambia tutto il sito.
 *
 * Due cose che qui **non** stanno, per non creare una seconda casa allo stesso
 * dato: i prezzi e le condizioni degli abbonamenti — compresi `SOSPENSIONE` e
 * `GUEST_PASS` — vivono in `data/abbonamenti.ts`, che è già la loro unica
 * sorgente; e il testo contrattuale sta in `data/termini.json`, che si aggiorna
 * sostituendolo, non riscrivendolo a pezzi.
 *
 * Dove il contratto e la prassi del club divergono, qui c'è la prassi e la
 * divergenza è annotata: il sito deve dire quello che il club fa davvero, e la
 * differenza col PDF firmato è una cosa da sanare al prossimo aggiornamento del
 * documento, non da nascondere dietro un numero scelto a caso.
 */

/**
 * Il certificato di idoneità sportiva non agonistica.
 *
 * Quattordici giorni **dall'inizio dell'attività**, non dalla prima lezione né
 * dall'iscrizione: sono momenti diversi e la pagina abbonamenti diceva il
 * secondo.
 *
 * Il contratto (clausole 4.1, 6.2, 7.1, 10.1, 11.1) chiede invece il certificato
 * *prima* dell'inizio dell'attività. La finestra di quattordici giorni è la
 * tolleranza che il club applica davvero.
 */
export const CERTIFICATO = {
  giorni: 14,
  /** Sotto questa età non serve. */
  etaMinima: 6,
  /** Durata del rinnovo temporaneo che il desk inserisce a chi ha la visita già fissata. */
  rinnovoTemporaneoGiorni: 14,
  scheda: 'generali/certificato-medico',
} as const;

/**
 * Prenotazioni, disdette e conseguenze delle mancate disdette.
 *
 * Il blocco dopo le mancate disdette è di **3 giorni**, che è quanto dicono la
 * scheda e il planning ed è la regola applicata. Le clausole 7.6 e 8.4 ne
 * scrivono 4: divergenza nota, da sanare sul contratto.
 *
 * Le due finestre di disdetta sono entrambe vere e non intercambiabili — un'ora
 * per una lezione di gruppo, due per una individuale (clausola 10.3) — e il
 * personal training è per definizione nel secondo caso.
 */
export const PRENOTAZIONE = {
  /** Quanto in anticipo si può prenotare. */
  anticipoGiorni: 3,
  anticipoOre: 72,
  /** Entro quanto si disdice, secondo il tipo di lezione. */
  disdettaOreGruppo: 1,
  disdettaOreIndividuale: 2,
  /** Oltre quante assenze non disdette, nella finestra qui sotto, scatta il blocco. */
  noShowSoglia: 2,
  noShowFinestraGiorni: 30,
  noShowBloccoGiorni: 3,
  /** Quante prenotazioni si possono tenere aperte insieme. */
  attiveCorsi: 3,
  attiveReformer: 1,
  scheda: 'generali/prenotazioni',
} as const;

/* ---- Frasi ricorrenti ---------------------------------------------------
   Solo quelle che comparivano già identiche in più pagine: una frase composta
   qui è una frase che non si può riscrivere per sbaglio in modo diverso
   altrove. Tutto il resto lo scrive la voce delle f.a.q., che ha un tono suo. */

/** «entro 14 giorni dall'inizio dell'attività» */
export const termineCertificato = () =>
  `entro ${CERTIFICATO.giorni} giorni dall'inizio dell'attività`;

/** «fino a 3 giorni prima (72 ore)» */
export const finestraPrenotazione = () =>
  `fino a ${PRENOTAZIONE.anticipoGiorni} giorni prima (${PRENOTAZIONE.anticipoOre} ore)`;

/**
 * La finestra di disdetta, che dipende dal tipo di lezione. Senza argomento dà
 * la forma completa, perché è quella corretta ovunque non si sappia di quale
 * delle due si parla.
 */
export const finestraDisdetta = (tipo?: 'gruppo' | 'individuale') => {
  const g = `${PRENOTAZIONE.disdettaOreGruppo} ora`;
  const i = `${PRENOTAZIONE.disdettaOreIndividuale} ore`;
  if (tipo === 'gruppo') return `fino a ${g} dall'inizio della lezione`;
  if (tipo === 'individuale') return `fino a ${i} dall'inizio della seduta`;
  return `fino a ${g} dall'inizio per le lezioni di gruppo e ${i} per quelle individuali`;
};
