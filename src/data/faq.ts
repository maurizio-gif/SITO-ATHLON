/**
 * Le domande frequenti del sito, in un registro solo.
 *
 * Chi legge le pagine delle attività non è ancora iscritto: la domanda è «mi
 * trovo bene qui?», non «cosa succede se salto una lezione». Le risposte quindi
 * restano brevi e scritte per rassicurare, ma **stanno in piedi da sole**: non
 * mandano più a leggere la procedura completa nella scheda dell'Help Desk.
 *
 * Prima lo facevano — un link in coda a ogni risposta con una scheda associata
 * — ed è stata una scelta deliberata quanto quella di adesso, per la ragione
 * opposta: si temeva che il testo della procedura, con termini e conseguenze,
 * spaventasse chi sta ancora decidendo. Il prezzo di quella scelta era un altro
 * problema, uguale e contrario: mandare fuori da athlonroma.it, verso il wiki
 * dell'Help Desk, chi non ha ancora deciso di entrare. Ora **il fatto più utile
 * della scheda entra nella risposta stessa** — uno o due, non l'intera
 * procedura — e il link sparisce. Non è ricopiare la scheda: è scegliere, da
 * quello che dice, la frase che una persona che sta ancora valutando vorrebbe
 * sapere adesso.
 *
 * **Perché un registro e non un array per pagina.** Perché è così che è nato, e
 * si è rotto: la stessa domanda esisteva fino a nove volte, e le copie
 * divergevano una alla volta. Il certificato medico si doveva mandare «entro
 * 15 giorni» su due pagine, «entro 2 settimane dalla prima lezione» su altre
 * due e «entro le prime due settimane» su venti; la sospensione era gratuita e
 * immediata sui corsi fitness e costava 15 € con dieci giorni di preavviso
 * sugli abbonamenti; e sul certificato per la lezione singola due pagine si
 * contraddicevano apertamente. Nessuna di quelle righe era sbagliata quando è
 * stata scritta.
 *
 * Come sta insieme adesso:
 *
 *  - **una voce, un argomento**, con un `id` stabile. Le pagine la citano, non
 *    la riscrivono;
 *  - **i numeri arrivano da `data/regole.ts`** e i prezzi da
 *    `data/abbonamenti.ts`: qui non si scrive una cifra a mano;
 *  - **i tag `attivita`** sono gli stessi di `data/activities.ts` che taggano
 *    schede, eventi e sezioni del regolamento: sono ciò che permette a una
 *    pagina di chiedere «le domande che riguardano il gym floor» e a
 *    `/kb.json` di dire all'assistente su quali pagine vive una risposta.
 *
 * Quello che resta scritto nelle pagine è solo ciò che è davvero di quella
 * pagina — i prezzi del personal training, i percorsi Start Up della sala — e
 * le risposte che interpolano numeri del planning, che senza quel contesto non
 * si possono comporre.
 */
import { CERTIFICATO, PRENOTAZIONE, finestraDisdetta, termineCertificato } from './regole';
import { SOSPENSIONE, GUEST_PASS } from './abbonamenti';

export interface FaqEntry {
  q: string;
  /** Può contenere HTML in linea: link e grassetto. */
  a: string;
}

export type VoceFaq = FaqEntry;

/** Una voce del registro: come `VoceFaq`, ma con un nome per essere citata. */
export interface VoceRegistro extends VoceFaq {
  id: string;
  /** Attività a cui si applica; vuoto = tutte. Vocabolario in `activities.ts`. */
  attivita?: string[];
}

/**
 * Le domande che vivono su più pagine.
 *
 * Ordinate per argomento, non per pagina: l'ordine in pagina lo decide la
 * pagina, elencando gli id che vuole.
 */
export const REGISTRO: VoceRegistro[] = [
  {
    id: 'certificato',
    q: 'Serve il certificato medico?',
    /* Sì anche per la lezione singola: è un obbligo di legge e la clausola 10.1
       lo impone esplicitamente per lezioni singole e pacchetti. Prima
       personal-training diceva il contrario. */
    a: `Sì, il certificato di idoneità all'attività sportiva <strong>non agonistica</strong>: deve riportare che hai fatto almeno una volta nella vita l'elettrocardiogramma (ECG), e può rilasciarlo il tuo medico curante, un medico sportivo o un medico della Federazione Medico Sportiva Italiana. Si invia in formato digitale, non serve più il cartaceo. Serve anche se prenoti e paghi una singola lezione: è un obbligo di legge, non una condizione dell'abbonamento.`,
  },
  {
    id: 'certificato-junior',
    q: 'Serve il certificato medico?',
    /* Variante vera, non una divergenza: sotto i sei anni il certificato non
       serve, e per il Baby Nuoto non serve mai. */
    a: `Per i bambini dai ${CERTIFICATO.etaMinima} anni compiuti sì: serve il certificato di idoneità all'attività sportiva non agonistica — lo rilascia il pediatra o il medico di famiglia — da inviare in formato digitale ${termineCertificato()}. Sotto quell'età non è richiesto. Per le attività agonistiche (pallanuoto, nuoto agonistico) serve invece il certificato agonistico, rilasciato solo da un medico sportivo.`,
    attivita: ['scuola-nuoto-bambini', 'pallanuoto', 'nuoto-agonistico'],
  },
  {
    id: 'frequenza-agonistica',
    q: 'La frequenza agli allenamenti settimanali è obbligatoria?',
    a: 'No, la frequenza non è obbligatoria. Si suggerisce però un impegno settimanale di 2 giorni: sotto quella soglia la progressione si ferma.',
    attivita: ['pallanuoto', 'nuoto-agonistico'],
  },
  {
    id: 'convocazioni',
    q: 'Quali sono i criteri delle convocazioni a gare e manifestazioni?',
    a: 'La convocazione è un’attestazione di merito e un momento di crescita per l’atleta: ogni atleta avrà la possibilità di confrontarsi quando il tecnico responsabile lo riterrà opportuno.',
    attivita: ['pallanuoto', 'nuoto-agonistico'],
  },
  {
    id: 'prenotazione-come',
    q: 'Come si prenota una lezione?',
    /* «A partire da», non «fino a»: la finestra si apre a 72 ore dalla lezione.
       Metà del sito diceva il contrario, che è la regola opposta. */
    a: `Dall'app Athlon Club o dal portale web, a partire da ${PRENOTAZIONE.anticipoGiorni} giorni prima della lezione (${PRENOTAZIONE.anticipoOre} ore) e resta aperta finché la lezione non comincia: puoi prenotare anche all'ultimo momento, non c'è un termine anticipato. I posti sono limitati — massimo ${PRENOTAZIONE.attiveCorsi} prenotazioni attive insieme per Corsi Fitness, Aqua Fitness e Scuola Nuoto Adulti, ${PRENOTAZIONE.attiveReformer} per il Group Reformer — e se un corso è pieno puoi iscriverti in lista d'attesa: se qualcuno disdice, subentri in ordine cronologico.`,
  },
  {
    id: 'disdetta-lezione',
    q: 'Se non posso venire, entro quando disdico?',
    a: `Puoi disdire ${finestraDisdetta()}: quel margine serve a dare tempo a chi è in lista d'attesa di essere avvisato e prendere il tuo posto. Dopo quel termine non si può più disdire, nemmeno passando dal desk. Se avevi acquistato una lezione singola e disdici in tempo, ti viene riaccreditata per una nuova prenotazione.`,
  },
  {
    id: 'no-show',
    q: 'Cosa succede se non mi presento o disdico in ritardo?',
    a: `Se non disdici e non sei presente per più di <strong>${PRENOTAZIONE.noShowSoglia} volte in ${PRENOTAZIONE.noShowFinestraGiorni} giorni</strong>, la prenotazione viene bloccata per ${PRENOTAZIONE.noShowBloccoGiorni} giorni. È l'unico modo per tenere liberi i posti di chi vuole allenarsi.`,
  },
  {
    id: 'lista-attesa',
    q: "Come funziona la lista d'attesa?",
    a: `Se il corso è al completo puoi iscriverti in lista d'attesa: quando un prenotato disdice, la lista scorre in ordine cronologico e chi subentra riceve un'email, fino a ${PRENOTAZIONE.disdettaOreGruppo} ora dall'inizio. Attenzione: la lista d'attesa occupa uno slot come una prenotazione confermata.`,
  },
  {
    id: 'prenotazioni-attive',
    q: 'Quante prenotazioni attive posso avere insieme?',
    a: `Massimo <strong>${PRENOTAZIONE.attiveCorsi}</strong> per Corsi Fitness, Aqua Fitness e Scuola Nuoto Adulti; <strong>${PRENOTAZIONE.attiveReformer}</strong> per il Group Reformer, che si prenota una lezione per volta.`,
  },
  {
    id: 'sospensione',
    q: 'Se poi devo fermarmi, posso sospendere?',
    /* Le sospensioni sono a pagamento, illimitate e con preavviso: corsi-fitness
       le dava gratuite, immediate e una sola. */
    a: `Sì, quante volte vuoi, a <strong>${SOSPENSIONE.prezzo} €</strong> al mese: si richiede dal portale, alla voce Abbonamenti → Sospensioni, almeno ${SOSPENSIONE.preavviso} giorni prima e parte sempre dal primo del mese successivo — il tempo sospeso non lo perdi, si aggiunge in fondo all'abbonamento. Se il motivo è un infortunio o una malattia documentata, la sospensione è invece gratuita, con una durata minima di due mesi.`,
  },
  {
    id: 'disdetta-abbonamento',
    q: 'Come disdico il rinnovo automatico?',
    a: `I mensili si disdicono dalla tua area riservata, alla voce Abbonamenti → Disdici rinnovo automatico — per la Formula 12 l'effetto parte solo dopo i 12 mesi di impegno iniziale. Gli annuali via email, almeno ${SOSPENSIONE.preavviso} giorni prima della scadenza. In entrambi i casi lo fai da solo, senza passare dalla segreteria. Se poi ti iscrivi di nuovo, si paga una nuova quota di attivazione.`,
  },
  {
    id: 'guest-pass',
    q: 'Posso provare prima di iscrivermi?',
    /* Il prezzo e il requisito ci vanno: la formulazione di prima — «puoi
       richiedere un Guest Pass Premium di una settimana» — lasciava credere a
       una prova gratuita, e chi è già stato iscritto lo scopriva alla fine.

       Il perimetro è quello dichiarato esplicitamente, non solo quello che si
       deduce da `plans`: un assistente che legge «accesso a tutto il club» lo
       intende alla lettera e propone il Guest Pass anche per un corso per
       bambini, che non c'è mai stato dentro — il Pass è un Premium di sette
       giorni e il Premium è il listino degli adulti. Senza questa riga la
       prova di un corso junior si scopre sbagliata dopo che è stata proposta,
       non prima. */
    a: `Sì, con il <strong>Guest Pass Premium</strong>: ${GUEST_PASS.giorni} giorni con accesso a tutto il club a <strong>${GUEST_PASS.prezzo} €</strong>. È riservato a chi non ha e non ha mai avuto un abbonamento Athlon dal ${GUEST_PASS.dal} in poi. Se te lo manda un socio che ti invita, hai 30 giorni di tempo per attivarlo da quando ricevi l'invito. In alternativa puoi prenotare e pagare una singola lezione, senza quota di attivazione. <strong>Vale solo per le attività degli adulti</strong>: non comprende i corsi per bambini né il personal training. Per un corso per bambini che vende anche la lezione singola — come il Baby Nuoto — la prova è prenotare e pagare quella lezione, non il Guest Pass.`,
  },
  {
    id: 'pagamenti',
    q: 'Come posso pagare?',
    a: `Con carta di credito o di debito, oppure con addebito diretto sul conto corrente (IBAN): non si accettano contanti, POS in reception, bonifico o voucher regionali. L'addebito è automatico alla scadenza, così non devi ricordartene, e puoi cambiare il metodo associato al contratto quando vuoi dal portale.`,
  },
];

const PER_ID = new Map(REGISTRO.map((v) => [v.id, v]));

/**
 * Una voce del registro, per comporci sopra.
 *
 * Serve quando una pagina deve aggiungere qualcosa di suo alla risposta
 * condivisa e non solo sostituirla — la CTA della prova, per esempio, che porta
 * con sé l'attività di provenienza e quindi non può stare nel registro. Meglio
 * di riscrivere il testo: la parte comune resta una sola.
 */
export function voce(id: string): VoceRegistro {
  const v = PER_ID.get(id);
  if (!v) {
    throw new Error(
      `voce: "${id}" non esiste nel registro. Disponibili: ${REGISTRO.map((x) => x.id).join(', ')}`
    );
  }
  return v;
}

/**
 * Come una pagina chiede una f.a.q.: con l'id di una voce del registro, con una
 * voce scritta lì per lì, o con un id **più i campi da cambiare**.
 *
 * La terza forma serve alle diciannove pagine dei corsi, che chiedono «Serve il
 * certificato medico per il corso di Pilates?» invece che «Serve il certificato
 * medico?» — il nome del corso nella domanda è deliberato, è così che la gente
 * cerca. Cambia la domanda, non la risposta: che è esattamente la divisione che
 * serve, perché la risposta è il pezzo che non deve divergere.
 */
export type RichiestaFaq = string | VoceFaq | ({ id: string } & Partial<VoceFaq>);

/**
 * Le f.a.q. di una pagina, **nell'ordine in cui compariranno**.
 *
 * L'ordine conta più di quanto sembri — la prima domanda è quella che quasi
 * tutti leggono — e spesso quella d'apertura è la specifica della pagina, non
 * una condivisa. Per questo id e voci si mescolano nella stessa lista invece di
 * stare in due argomenti separati, che avrebbero costretto le specifiche a
 * stare tutte in fondo.
 *
 * Un id inesistente ferma la build, come già faceva un id di scheda sbagliato:
 * una f.a.q. che sparisce da una pagina senza che nessuno se ne accorga è
 * peggio di un errore di compilazione.
 */
export function vociFaq(voci: RichiestaFaq[]): VoceFaq[] {
  return voci.map((v) => {
    const id = typeof v === 'string' ? v : 'id' in v ? (v.id as string) : null;
    if (id === null) return v as VoceFaq;

    const voce = PER_ID.get(id);
    if (!voce) {
      throw new Error(
        `vociFaq: la voce "${id}" non esiste nel registro. Disponibili: ${REGISTRO.map((x) => x.id).join(', ')}`
      );
    }
    return typeof v === 'string' ? voce : { ...voce, ...v };
  });
}

/**
 * Il nome resta per non toccare ogni pagina che lo importa, ma non compone più
 * niente: le risposte non hanno più una coda da aggiungere, perché non mandano
 * più fuori da questo sito. Vedi il commento in cima al file.
 */
export async function faqConSchede(voci: VoceFaq[]): Promise<FaqEntry[]> {
  return voci.map(({ q, a }) => ({ q, a }));
}

/** Il caso normale: scegli le voci del registro, o scrivine di nuove. */
export const faqPagina = (voci: RichiestaFaq[]) => faqConSchede(vociFaq(voci));
