/* I tre corsi a turno fisso li elenca `JUNIOR_MENSILE`, che è già la loro
   sorgente: vedi `LISTA_ATTESA` in fondo. */
import { JUNIOR_MENSILE } from './abbonamenti';

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
} as const;

/* ---- Frasi ricorrenti ---------------------------------------------------
   Solo quelle che comparivano già identiche in più pagine: una frase composta
   qui è una frase che non si può riscrivere per sbaglio in modo diverso
   altrove. Tutto il resto lo scrive la voce delle f.a.q., che ha un tono suo. */

/** «entro 14 giorni dall'inizio dell'attività» */
export const termineCertificato = () =>
  `entro ${CERTIFICATO.giorni} giorni dall'inizio dell'attività`;

/** «a partire da 3 giorni prima (72 ore)», e resta aperta fino alla lezione.
    «A partire da», non «fino a»: la finestra si apre a 72 ore dalla lezione
    e non si richiude prima — è la stessa regola opposta corretta in faq.ts. */
export const finestraPrenotazione = () =>
  `a partire da ${PRENOTAZIONE.anticipoGiorni} giorni prima (${PRENOTAZIONE.anticipoOre} ore) e fino all'inizio della lezione`;

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

/**
 * La lista d'attesa, e **il suo perimetro**, che è la parte che è costata due
 * volte.
 *
 * La lista d'attesa è delle **prenotazioni**: vale per la singola lezione che
 * si prenota, e quando quella è al completo si entra in coda e si subentra se
 * qualcuno disdice. Per **l'iscrizione a un turno** dei corsi a stagione dei
 * bambini non esiste, e non è una dimenticanza del portale: i turni con posto
 * sono tutti visibili, e un turno pieno si sostituisce con un altro turno.
 *
 * Il 31 agosto la chat aveva promesso a una mamma una lista d'attesa per un
 * turno della Scuola Nuoto, e la correzione di allora aveva aggiunto la frase
 * giusta — «la lista d'attesa è delle prenotazioni, non delle iscrizioni» —
 * dentro la f.a.q. che spiega la lista d'attesa. **E non è bastato**, perché
 * nella stessa scheda restavano due passaggi che dicevano il contrario senza
 * dire per chi valgono: il capoverso subito sotto quella frase («Se il corso è
 * al completo puoi iscriverti in lista d'attesa») e la f.a.q. «Il corso è
 * pieno: potete aggiungere un posto?», che chiudeva con «Iscriviti in lista
 * d'attesa, che scorre in ordine cronologico».
 *
 * L'8 settembre (esecuzione 1519819) una mamma con due bambini, 2021 e 2023,
 * ha chiesto se il 2021 potesse essere inserito in un turno al completo. Il
 * modello ha risposto **citando la seconda alla lettera** — norme di sicurezza,
 * rapporto istruttore-allievi, e poi la lista d'attesa — e al turno dopo le ha
 * spiegato il subentro «fino a un'ora dall'inizio della lezione», che è la
 * meccanica della prenotazione applicata a un'iscrizione. Non aveva inventato
 * niente: aveva davanti la frase giusta e due frasi sbagliate, e ha preso
 * quella che rispondeva alla domanda con le parole della domanda.
 *
 * Da qui la costante: **il perimetro è un dato, e lo compongono tutti**. La
 * parola che manda fuori strada è «corso» — nelle regole di prenotazione
 * significa la lezione di quel giorno, per un genitore significa il corso di
 * suo figlio — quindi dove si parla di prenotazioni si dice «lezione», e dove
 * si parla di iscrizioni si dice «turno».
 *
 * I tre corsi si leggono da `JUNIOR_MENSILE.valePer`: sono gli stessi che si
 * vendono a turno fisso e ad abbonamento mensile, e riscriverli qui vorrebbe
 * dire poterli cambiare in un posto solo dei due.
 */
export const LISTA_ATTESA = {
  /**
   * Dove vale: la singola lezione che si prenota. **Il Baby Nuoto è qui**, e non
   * è un'eccezione da ricordare: e' l'unico corso per bambini che non ha
   * un'iscrizione a un turno — si prenota una lezione per volta, come le
   * attivita' degli adulti — quindi la lista d'attesa ce l'ha per costruzione.
   * La riga sotto, `nonValePer`, elenca i corsi *a turno fisso*, ed e' quello
   * che li distingue.
   */
  valePer:
    'la singola lezione che si prenota — corsi fitness, Aqua Fitness, sala pesi, Scuola Nuoto Adulti, Group Reformer, il Baby Nuoto, e i recuperi della Scuola Nuoto Bambini',
  /**
   * Dove non vale: l'iscrizione a un turno dei corsi a stagione dei bambini.
   *
   * Sono `JUNIOR_MENSILE.valePer`, e la coincidenza non e' casuale: sono gli
   * stessi tre che si vendono a **turno fisso** e ad abbonamento mensile, cioe'
   * quelli in cui giorno e ora si scelgono all'iscrizione e restano quelli per
   * la stagione. Dove non c'e' un'iscrizione a un turno non c'e' niente da
   * mettere in coda — ed e' esattamente il motivo per cui il Baby Nuoto sta
   * dall'altra parte.
   */
  nonValePer: JUNIOR_MENSILE.valePer,
  /**
   * Cosa si fa davvero quando un turno è al completo, ed è l'unica risposta
   * vera: non una coda, non una notifica, non un «vi avvisiamo noi». Un rimedio
   * inventato è una promessa che il club non può mantenere e che nessuno
   * scopre finché la stagione non è cominciata senza quel bambino.
   */
  turnoPieno:
    "Il portale mostra **tutti** i turni che hanno ancora posto: se quello che volevi è al completo si sceglie fra gli altri della stessa fascia d'età, e se nessuno va bene si scrive al team. Non c'è nessuna lista d'attesa per l'iscrizione, nessuno viene messo in coda e nessuno riceve una notifica per un posto che si libera.",
  /**
   * Il messaggio che il portale scrive, con le parole con cui appare a
   * schermo: è una chiave di ricerca prima che un sintomo, e senza di lei il
   * modello lo interpreta. L'8 settembre l'ha letto come un blocco sulla
   * scheda — «potrebbe essere il certificato medico che manca o è scaduto» —
   * e ha mandato al team una persona che doveva solo scegliere un altro turno.
   */
  messaggioPortale: 'il gruppo è già al completo',
} as const;

/** «La lista d'attesa è delle prenotazioni, non delle iscrizioni», per esteso. */
export const perimetroListaAttesa = () =>
  `**La lista d'attesa è delle prenotazioni, non delle iscrizioni.** Vale per ${LISTA_ATTESA.valePer}. ` +
  `**Per iscriversi a un turno di ${LISTA_ATTESA.nonValePer.join(', ')} non esiste nessuna lista d'attesa.** ` +
  LISTA_ATTESA.turnoPieno;
