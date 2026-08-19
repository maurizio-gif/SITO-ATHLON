/**
 * Le domande frequenti del sito, in un registro solo.
 *
 * Chi legge le pagine delle attività non è ancora iscritto: la domanda è «mi
 * trovo bene qui?», non «cosa succede se salto una lezione». Le risposte quindi
 * sono brevi, trasparenti sull'essenziale e scritte per rassicurare — mentre la
 * procedura, con termini e conseguenze, resta nella scheda dell'Help Desk, che
 * è scritta per chi è già dentro. Il testo della scheda non viene ricopiato di
 * proposito: era il modo più rapido per riempire la sezione, ed era anche il
 * modo più rapido per spaventare qualcuno che sta ancora decidendo.
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
 *  - **ogni voce dichiara la sua scheda** dell'Help Desk, e il link in coda lo
 *    compone `faqConSchede` leggendo il titolo dalla scheda stessa. Rinominarla
 *    aggiorna tutte le pagine che la citano, e un id inesistente fa fallire la
 *    build invece di pubblicare un link rotto;
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
import { getCollection } from 'astro:content';
import { CERTIFICATO, PRENOTAZIONE, finestraDisdetta, termineCertificato } from './regole';
import { SOSPENSIONE, GUEST_PASS } from './abbonamenti';

export interface FaqEntry {
  q: string;
  /** Può contenere HTML in linea: link e grassetto. */
  a: string;
}

export interface VoceFaq extends FaqEntry {
  /** Id della scheda dell'Help Desk, es. 'generali/prenotazioni'. */
  scheda?: string;
  /** Testo del rimando, quando "Tutti i dettagli" non è la frase giusta. */
  rimando?: string;
}

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
    a: `Sì, quello di idoneità all'attività sportiva <strong>non agonistica</strong> — lo rilascia anche il tuo medico di base. Hai tempo ${termineCertificato()}, quindi non è qualcosa da risolvere prima di cominciare. Serve anche se prenoti e paghi una singola lezione: è un obbligo di legge, non una condizione dell'abbonamento.`,
    scheda: CERTIFICATO.scheda,
    rimando: 'Requisiti e modello',
  },
  {
    id: 'certificato-junior',
    q: 'Serve il certificato medico?',
    /* Variante vera, non una divergenza: sotto i sei anni il certificato non
       serve, e per il Baby Nuoto non serve mai. */
    a: `Per i bambini dai ${CERTIFICATO.etaMinima} anni compiuti sì: serve il certificato di idoneità all'attività sportiva non agonistica, da inviare ${termineCertificato()}. Sotto quell'età non è richiesto.`,
    scheda: CERTIFICATO.scheda,
    rimando: 'Requisiti e modello',
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
    a: `Dall'app Athlon Club o dal portale web, a partire da ${PRENOTAZIONE.anticipoGiorni} giorni prima della lezione (${PRENOTAZIONE.anticipoOre} ore). I posti sono limitati, quindi la prenotazione serve a garantirti il posto.`,
    scheda: PRENOTAZIONE.scheda,
    rimando: 'Regole complete',
  },
  {
    id: 'disdetta-lezione',
    q: 'Se non posso venire, entro quando disdico?',
    a: `Puoi disdire ${finestraDisdetta()}. Se avevi acquistato una lezione singola e disdici in tempo, ti viene riaccreditata per una nuova prenotazione — e il posto va a chi è in lista d'attesa.`,
    scheda: PRENOTAZIONE.scheda,
    rimando: 'Tempi e conseguenze',
  },
  {
    id: 'no-show',
    q: 'Cosa succede se non mi presento o disdico in ritardo?',
    a: `Se non disdici e non sei presente per più di <strong>${PRENOTAZIONE.noShowSoglia} volte in ${PRENOTAZIONE.noShowFinestraGiorni} giorni</strong>, la prenotazione viene bloccata per ${PRENOTAZIONE.noShowBloccoGiorni} giorni. È l'unico modo per tenere liberi i posti di chi vuole allenarsi.`,
    scheda: PRENOTAZIONE.scheda,
    rimando: 'Come funziona il blocco',
  },
  {
    id: 'lista-attesa',
    q: "Come funziona la lista d'attesa?",
    a: `Se il corso è al completo puoi iscriverti in lista d'attesa: quando un prenotato disdice, la lista scorre in ordine cronologico e chi subentra riceve un'email, fino a ${PRENOTAZIONE.disdettaOreGruppo} ora dall'inizio. Attenzione: la lista d'attesa occupa uno slot come una prenotazione confermata.`,
    scheda: PRENOTAZIONE.scheda,
    rimando: "Lista d'attesa e limiti",
  },
  {
    id: 'prenotazioni-attive',
    q: 'Quante prenotazioni attive posso avere insieme?',
    a: `Massimo <strong>${PRENOTAZIONE.attiveCorsi}</strong> per Corsi Fitness, Aqua Fitness e Scuola Nuoto Adulti; <strong>${PRENOTAZIONE.attiveReformer}</strong> per il Group Reformer, che si prenota una lezione per volta.`,
    scheda: PRENOTAZIONE.scheda,
    rimando: 'Tutti i limiti',
  },
  {
    id: 'sospensione',
    q: 'Se poi devo fermarmi, posso sospendere?',
    /* Le sospensioni sono a pagamento, illimitate e con preavviso: corsi-fitness
       le dava gratuite, immediate e una sola. */
    a: `Sì, quante volte vuoi, a <strong>${SOSPENSIONE.prezzo} €</strong> al mese. La sospensione parte dal primo del mese e va chiesta almeno ${SOSPENSIONE.preavviso} giorni prima; il tempo sospeso non lo perdi, si aggiunge in fondo all'abbonamento.`,
    scheda: 'adulti/sospensione',
    rimando: 'Come si sospende',
  },
  {
    id: 'disdetta-abbonamento',
    q: 'Come disdico il rinnovo automatico?',
    a: `I mensili si disdicono dalla tua area riservata, alla voce Abbonamenti → Disdici rinnovo automatico. Gli annuali via email, almeno ${SOSPENSIONE.preavviso} giorni prima della scadenza. In entrambi i casi lo fai da solo, senza passare dalla segreteria.`,
    scheda: 'adulti/disdetta-contratti-adulti',
    rimando: 'Termini per ogni tipo di contratto',
  },
  {
    id: 'guest-pass',
    q: 'Posso provare prima di iscrivermi?',
    /* Il prezzo e il requisito ci vanno: la formulazione di prima — «puoi
       richiedere un Guest Pass Premium di una settimana» — lasciava credere a
       una prova gratuita, e chi è già stato iscritto lo scopriva alla fine. */
    a: `Sì, con il <strong>Guest Pass Premium</strong>: ${GUEST_PASS.giorni} giorni con accesso a tutto il club a <strong>${GUEST_PASS.prezzo} €</strong>. È riservato a chi non ha e non ha mai avuto un abbonamento Athlon dal ${GUEST_PASS.dal} in poi. In alternativa puoi prenotare e pagare una singola lezione, senza quota di attivazione.`,
    scheda: 'generali/referral-guest-pass',
    rimando: 'Anche su invito di un amico',
  },
  {
    id: 'pagamenti',
    q: 'Come posso pagare?',
    a: `Con carta di credito o di debito, oppure con addebito diretto sul conto corrente (IBAN). L'addebito è automatico alla scadenza, così non devi ricordartene.`,
    scheda: 'generali/metodo-di-pagamento',
    rimando: 'Metodi accettati',
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
 * Compone la coda di ogni risposta che dichiara una scheda: il rimando, con il
 * titolo letto dalla scheda stessa.
 */
export async function faqConSchede(voci: VoceFaq[]): Promise<FaqEntry[]> {
  const schede = await getCollection('articles', ({ data }) => !data.draft);
  const perId = new Map(schede.map((a) => [a.id, a.data.title]));

  return voci.map(({ q, a, scheda, rimando }) => {
    if (!scheda) return { q, a };

    const titolo = perId.get(scheda);
    if (!titolo) throw new Error(`faqConSchede: la scheda "${scheda}" non esiste`);

    const invito = rimando ?? 'Tutti i dettagli';
    return {
      q,
      a: `${a} <a href="/wikiathlon/${scheda}/">${invito} nella scheda “${titolo}” →</a>`,
    };
  });
}

/** Il caso normale: scegli le voci, e la coda con i rimandi la compone lei. */
export const faqPagina = (voci: RichiestaFaq[]) => faqConSchede(vociFaq(voci));
