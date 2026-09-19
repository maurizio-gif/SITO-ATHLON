/**
 * La prova di inserimento di nuoto agonistico e pallanuoto, in un posto solo.
 *
 * Le pagine dei due corsi dicono da sempre «prova di inserimento obbligatoria:
 * valutazione del livello tecnico prima dell'ammissione», e il pulsante che lo
 * chiedeva apriva il modulo contatti — cioè una richiesta di informazioni, che
 * poi qualcuno al desk trasformava in un appuntamento al telefono. In mezzo
 * c'era il caso che fa perdere tempo a tutti: chi si presenta a una prova
 * agonistica senza saper nuotare. Non è colpa di nessuno, è una domanda che
 * nessuno aveva fatto.
 *
 * Quindi il modulo la fa, una alla volta, e prima del calendario:
 *
 *   categoria → «sa fare questo?» × n → ┬ tutti sì → date → dati → prenotato
 *                                       └ un no    → scuola nuoto, e finisce qui
 *
 * **Un solo «no» chiude il ramo della prova.** Non è severità: il livello
 * minimo di ognuno di questi corsi è scritto sulla pagina come un elenco di
 * prove che si devono saper eseguire, e chi non ne esegue una non è al livello
 * di quel gruppo. A chi si ferma qui il modulo non dice «no»: dice qual è il
 * percorso giusto — la scuola nuoto della sua età — e come iscriversi.
 *
 * I requisiti vengono dai livelli B2, B3 e B4 di `junior.ts`, che è dove il
 * club li ha scritti; qui diventano domande, perché un elenco di sigle non è
 * una cosa a cui un genitore possa rispondere.
 */

import { CRM } from './appuntamento';
import { getJunior } from './junior';

/**
 * Il pannello a cui chiedere le date e su cui prenotare.
 *
 * In sviluppo è quello locale, e non è una comodità: `CRM` è il dominio di
 * produzione, e le due rotte delle prove ci arrivano solo quando il pannello
 * viene pubblicato. Finché non lo è, `astro dev` chiede le date a un indirizzo
 * che risponde 404 e il passo del giorno mostra «non riusciamo a leggere le
 * date disponibili» — cioè il calendario non compare, e sembra un difetto del
 * modulo mentre è un difetto dell'anteprima.
 *
 * Vale solo per queste due rotte, che sono le uniche nuove. Serve che il
 * pannello gira sulla 3000 (`npm run dev` nel suo repository): le sue
 * intestazioni CORS ammettono già `http://localhost:<porta>`.
 */
const PANNELLO = import.meta.env.DEV ? 'http://localhost:3000' : CRM;

/** Le sessioni libere di una categoria. Il pannello le conta in tempo reale. */
export const API_SESSIONI = `${PANNELLO}/api/prove-nuoto/slot`;

/** La presa della prova: occupa il posto e la scrive nella sezione Prove nuoto. */
export const API_PRENOTA = `${PANNELLO}/api/prove-nuoto`;

/**
 * Il webhook che manda le tre email: la conferma al genitore, e l'avviso al
 * desk e alla direzione tecnica del nuoto.
 *
 * Uno nuovo e non `WEBHOOK_CONTATTO`, al contrario dell'appuntamento
 * telefonico. La ragione è che qui le email non sono una variante della stessa
 * cosa: la conferma di una prova porta il giorno, l'ora, cosa portare in
 * borsa e quale certificato medico serve, e l'avviso interno porta il
 * questionario per esteso — che è il documento su cui l'allenatore decide se
 * scendere in vasca. Infilare tutto questo nel workflow dei contatti avrebbe
 * voluto dire un quinto ramo dentro un'automazione che ne ha già quattro.
 */
export const WEBHOOK_PROVA_NUOTO = 'https://automazione.n8ndevelop.it/webhook/athlon-prova-nuoto';

/** La verifica dell'email su PerfectGym: la stessa degli altri moduli. */
export { WEBHOOK_VERIFICA } from './contatto';

/**
 * L'anagrafica e il nucleo familiare: il genitore, e sotto di lui il minore.
 *
 * È **il webhook della chat**, non uno nuovo, ed è la cosa importante di questa
 * riga. Dentro `chat-athlon-dati` c'è già tutto il percorso che serve qui, e non
 * è banale: se il genitore non è a sistema lo crea (`Crm2/AddLead` o
 * `Members/AddGuestMember`), poi `GET FAMIGLIA` legge i `familyChildren` del
 * suo `memberId`, `Confronta figli` cerca il minore **per nome e cognome** —
 * senza distinguere maiuscole e accenti, che è il criterio con cui un genitore
 * direbbe «è lui» — e solo se non c'è lo aggiunge al nucleo con
 * `parentMemberId`. Riscriverlo qui avrebbe voluto dire una seconda
 * implementazione della stessa regola contro lo stesso gestionale, e due
 * implementazioni divergono al primo caso strano.
 *
 * Il payload è quello che manda la chat, con `ambito: 'junior'`: il modulo delle
 * prove è per definizione un percorso junior — chi fa la prova è un minore e
 * chi la prenota è suo genitore.
 *
 * Due cose che il workflow pretende, e che quindi il modulo deve chiedere:
 * la data di nascita **del minore** sempre (`AddGuestMember` vuole
 * `birthDate`), e quella **del genitore** solo quando il genitore va creato,
 * cioè quando la verifica non ha restituito un `memberId`.
 */
export const WEBHOOK_ANAGRAFICA = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-dati';

// ---------------------------------------------------------------------------
// Dove va chi non è al livello
// ---------------------------------------------------------------------------

/**
 * Il ramo «non idoneo» non è un vicolo cieco, ed è la sua ragione d'essere: un
 * genitore che scopre che il figlio non è pronto per l'agonistica ha appena
 * scoperto anche di cercare un corso di nuoto, e in quel momento sa già di
 * volerlo. Mandarlo su una pagina generica sarebbe farglielo cercare di nuovo.
 *
 * Due destinazioni e non una: la pagina dice **cos'è** il corso, l'articolo del
 * Wiki dice **come si fa** a iscriversi — prezzi, modalità, procedura della
 * stagione — che è la domanda immediatamente successiva.
 */
export const SCUOLA_NUOTO = {
  pagina: '/scuola-nuoto-bambini',
  iscrizione: '/wikiathlon/snb/preiscrizioni-nuoto',
  babyNuoto: '/baby-nuoto',
} as const;

// ---------------------------------------------------------------------------
// Le categorie, e i requisiti letti dalla pagina
// ---------------------------------------------------------------------------

/**
 * I requisiti **non stanno scritti qui**: si leggono da `junior.ts`, dal campo
 * `livello` del corso — la stessa fonte che stampa «Livello minimo richiesto
 * B2 · Dorso, Stile libero, Gambe rana» sulla scheda che il genitore ha appena
 * letto.
 *
 * È il punto di questo file, e viene da un errore: la prima versione ricopiava
 * l'elenco a mano, e nel ricopiarlo ci aveva aggiunto tre prove che il club non
 * chiede da nessuna parte — le virate, i venticinque metri di fila, l'acqua
 * alta. Un questionario che filtra le persone non può contenere un requisito
 * che la pagina non dichiara: chi si vede rifiutare la prova non lo troverebbe
 * scritto in nessun posto, e chi la ottiene avrebbe dichiarato cose che
 * nessuno gli chiederà.
 *
 * Quindi la sola cosa che sta qui è **come si chiede** una voce del livello.
 * Se un giorno il programma tecnico cambia una voce, la domanda cambia con lui,
 * e se ne introduce una senza frase il sito **non compila** — che è il modo
 * giusto di accorgersene, invece di offrire una prova con un requisito in meno.
 */
const FRASI: Record<string, { domanda: string; aiuto?: string }> = {
  Dorso: { domanda: 'Sa nuotare a dorso?' },
  'Stile libero': { domanda: 'Sa nuotare a stile libero?' },
  'Gambe rana': {
    domanda: 'Sa eseguire le gambe a rana?',
    aiuto: 'La gambata a rana, anche solo con la tavoletta fra le mani.',
  },
  Rana: { domanda: 'Sa nuotare a rana?' },
  /* La bilaterale si nomina **nella domanda**, non solo nell'aiuto: è l'unica
     cosa che distingue questo requisito dal «Stile libero» del B2, e un
     genitore che leggesse solo «sa nuotare a stile libero?» risponderebbe sì
     per un figlio che respira sempre dallo stesso lato. */
  'Stile libero bilaterale': {
    domanda: 'Sa nuotare a stile libero respirando da entrambi i lati, cioè con la respirazione bilaterale?',
    aiuto: 'Un respiro a destra, uno a sinistra, alternati.',
  },
  'Rana completa': {
    domanda: 'Sa nuotare a rana completa?',
    aiuto: 'Braccia e gambe coordinate, non solo la gambata.',
  },
  Delfinizzazione: {
    domanda: 'Sa fare la delfinizzazione?',
    aiuto: 'L’ondulazione del corpo a delfino, di solito dopo il tuffo o la virata.',
  },
  'Subacquea 10 m': { domanda: 'Sa fare una subacquea di 10 metri?' },
};

/** «Stile libero bilaterale» → `stile-libero-bilaterale`. */
function idDa(voce: string): string {
  return voce
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface RequisitoProva {
  /**
   * L'id, che deve combaciare con quello in `lib/proveNuoto.ts` del pannello:
   * è la chiave con cui la rotta verifica che la prenotazione arrivi con tutti
   * i requisiti dichiarati. Lo genera `idDa()` dalla voce del livello, quindi
   * cambia solo se cambia la voce sulla pagina — e in quel caso va cambiato
   * anche di là, altrimenti le prenotazioni tornano un 422.
   */
  id: string;
  /** La domanda, come la legge il genitore. Una cosa sola per domanda. */
  domanda: string;
  /** Cosa vuol dire, quando la domanda usa una parola da piscina. */
  aiuto?: string;
}

export interface CategoriaProva {
  chiave: string;
  nome: string;
  /** La pagina da cui si arriva, per il contesto nel pannello. */
  attivita: 'nuoto-agonistico' | 'pallanuoto';
  /** Le annate del corso, come le scrive la pagina. */
  annate: string;
  /**
   * Lo stesso perimetro di `annate`, ma come numeri: il minimo e il massimo
   * degli anni che quella riga cita. Serve al modulo per controllare la data
   * di nascita che il genitore scrive — i requisiti tecnici dicono se sa
   * nuotare come il gruppo, questo dice se è il gruppo giusto per la sua età,
   * e sono due domande indipendenti: un bambino può saper nuotare benissimo
   * ed essere comunque troppo grande per Acqua Gol.
   *
   * **Derivato da `annate`, mai scritto a mano**: le due forme che i corsi
   * usano — «Nati 2016 · 2017 · 2018» e «Nati dal 2014 al 2018» — hanno in
   * comune solo le cifre, quindi `annoRange()` estrae gli anni dalla stessa
   * stringa che la scheda stampa. Un intervallo scritto a parte diverge il
   * giorno che qualcuno aggiorna `annate` e non si ricorda di questo campo.
   */
  anni: { da: number; a: number };
  /** La sigla del livello minimo: è quella stampata sulla scheda del corso. */
  livello: string;
  /** Giorni e orario della sessione di prova, per esteso. */
  quando: string;
  requisiti: RequisitoProva[];
  /** Quale certificato serve: è la cosa che va portata, non richiesta dopo. */
  certificato: string;
}

/**
 * Gli anni di nascita citati in una riga «Nati …», nella forma che sia:
 * l'elenco (2016 · 2017 · 2018) o l'intervallo (dal 2014 al 2018). In
 * entrambi i casi le uniche cifre a quattro zeri sono anni, quindi il minimo
 * e il massimo delle cifre trovate è il perimetro — senza dover riconoscere
 * quale delle due forme sia.
 */
function annoRange(annate: string): { da: number; a: number } {
  const anni = Array.from(annate.matchAll(/\d{4}/g), (m) => Number(m[0]));
  if (anni.length === 0) {
    throw new Error(`Prove nuoto: non trovo nessun anno di nascita in «${annate}»`);
  }
  return { da: Math.min(...anni), a: Math.max(...anni) };
}

/**
 * Una categoria di prova a partire dal corso vero. `slug` è la pagina, `nome`
 * il corso dentro quella pagina: sono le due chiavi con cui `junior.ts` lo
 * identifica, e sbagliarne una ferma il build invece di dare un questionario
 * vuoto.
 */
function categoriaDa(
  chiave: string,
  slug: 'nuoto-agonistico' | 'pallanuoto',
  nome: string,
  quando: string
): CategoriaProva {
  const corso = getJunior(slug).corsi?.find((c) => c.nome === nome);
  if (!corso) throw new Error(`Prove nuoto: corso «${nome}» non trovato in ${slug}`);
  if (!corso.livello) throw new Error(`Prove nuoto: il corso «${nome}» non dichiara un livello`);

  const annate = corso.sottotitolo ?? '';

  return {
    chiave,
    nome: corso.nome,
    attivita: slug,
    annate,
    anni: annoRange(annate),
    livello: corso.livello.codice,
    quando,
    certificato: corso.certificato ?? 'non agonistica',
    requisiti: corso.livello.voci.map((voce) => {
      const frase = FRASI[voce];
      if (!frase) {
        throw new Error(
          `Prove nuoto: manca la domanda per il requisito «${voce}» (corso ${nome}). ` +
            'Aggiungila a FRASI in data/proveNuoto.ts.'
        );
      }
      return { id: idDa(voce), ...frase };
    }),
  };
}

/**
 * Le quattro categorie. L'unica cosa che questo elenco aggiunge al corso è
 * **quando si fa la prova**: giorni e orario del calendario delle prove, che
 * sono una decisione della stagione e non stanno sulla scheda. Tutto il resto —
 * nome, annate, livello, requisiti, certificato — viene da `junior.ts`.
 */
export const CATEGORIE_PROVA: CategoriaProva[] = [
  categoriaDa('nuoto-agonistico', 'nuoto-agonistico', 'Nuoto Agonistico', 'Lunedì e giovedì, dalle 15:00 alle 15:50'),
  categoriaDa('propaganda', 'nuoto-agonistico', 'Propaganda', 'Lunedì e giovedì, dalle 17:30 alle 18:20'),
  categoriaDa('pallanuoto-u14', 'pallanuoto', 'Under 14', 'Martedì e venerdì, dalle 14:30 alle 15:50'),
  categoriaDa('acquagol', 'pallanuoto', 'Acqua Gol', 'Martedì e venerdì, dalle 16:50 alle 17:40'),
];

/**
 * Le categorie di una pagina: la pagina del nuoto agonistico non deve offrire
 * la pallanuoto, e viceversa. Chi apre il modulo da una CTA generica — la
 * ricerca, una FAQ — le vede tutte e quattro.
 */
export function categorieDi(attivita?: string): CategoriaProva[] {
  if (!attivita) return CATEGORIE_PROVA;
  const filtrate = CATEGORIE_PROVA.filter((c) => c.attivita === attivita);
  return filtrate.length > 0 ? filtrate : CATEGORIE_PROVA;
}

export function categoriaProva(chiave: string): CategoriaProva | undefined {
  return CATEGORIE_PROVA.find((c) => c.chiave === chiave);
}

// ---------------------------------------------------------------------------
// Cosa portare
// ---------------------------------------------------------------------------

/**
 * Cosa portare davvero, e solo quello. Stanno qui perché le dicono in due posti
 * — l'ultima schermata del modulo e l'email di conferma che compone n8n — e due
 * elenchi divergono.
 *
 * **Il certificato medico non è in questo elenco**, ed è una correzione: prima
 * ci stava dentro, e un elenco intitolato «cosa portare» che nomina il
 * certificato dice esattamente il contrario di quello che serve sapere. Per la
 * prova non serve; serve per il corso. Vive in `notaCertificato()`, come frase
 * a sé.
 */
export const COSA_PORTARE = [
  'Costume, cuffia, ciabattine e accappatoio.',
  'Arriva un quarto d’ora prima: il tempo di cambiarsi e di presentarsi all’allenatore.',
] as const;

/**
 * Il certificato medico: **non per la prova, sì per il corso**.
 *
 * È la frase che toglie l'ostacolo sbagliato. Un genitore che legge «serve il
 * certificato medico» accanto a una data rimanda la prenotazione al giorno in
 * cui avrà il certificato — cioè di settimane, e la finestra delle prove dura
 * tre settimane e mezzo. Per salire in vasca una volta, con l'allenatore che
 * guarda, non serve niente; serve per iscriversi, e a quel punto è una cosa da
 * fare, non un ostacolo da superare prima di chiedere.
 *
 * Il tipo lo porta la categoria — `agonistica` o `non agonistica`, dalla scheda
 * del corso — perché sono due certificati diversi e due visite diverse: dirlo
 * adesso fa risparmiare l'errore di prenotare quella sbagliata.
 */
export function notaCertificato(categoria: CategoriaProva): string {
  return (
    'Per la prova il certificato medico non serve: non portarlo non è un problema. ' +
    `Servirà per iscriversi al corso — quello per attività ${categoria.certificato} — ` +
    'e c’è tutto il tempo di farlo dopo.'
  );
}
