/**
 * L'email che il visitatore ci ha già dato, ricordata nel suo browser.
 *
 * Il form della prova si compila una volta: è lì che l'email entra. Tutti gli
 * altri — l'assistente, «contattaci», il ticket dell'Help Desk — si possono
 * compilare più volte, e ognuno riparte chiedendo l'email. Il passo resta,
 * perché è la porta del controllo su PerfectGym: da lì il sito sa se hai già
 * un'anagrafica e salta tutto il resto. Quello che si toglie è la **digitazione**.
 *
 * ## Tre scelte che meritano una riga
 *
 * **Nel browser e non sul server.** Sarebbe stato possibile chiedere a n8n «di
 * chi è il `vid` X?» e riavere nome, email e telefono. Non si fa: sarebbe una
 * consultazione di dati personali senza autenticazione, con chiave scelta dal
 * client — chi legge o indovina un `vid` tira fuori la scheda. Qui il dato non
 * esce e non rientra: resta sul dispositivo che l'aveva già digitato.
 *
 * **Categoria `functional`, non `advertisement`.** Ricordare un campo che hai
 * compilato per non richiedertelo è comodità, non profilazione, e la differenza
 * è concreta: i funzionali li accetta molta più gente della pubblicità. Il
 * `vid` resta sotto advertisement, perché quello serve a riattaccare una
 * richiesta a una persona.
 *
 * **Niente precompilazione sul totem.** Il club ha un dispositivo condiviso
 * vero: il pannello in ingresso. Lì ricordare l'email vorrebbe dire mostrare
 * quella dell'ultimo visitatore al prossimo, che è una fuga di dati con
 * l'aspetto di una gentilezza. Si riconosce dalla forma dello schermo, con le
 * stesse tre condizioni che usa tutto il resto del sito.
 *
 * ## Come si usa
 *
 * Il campo che vuole la precompilazione porta `data-email-nota`. Chi conferma
 * un'email — cioè chi la manda alla verifica e non prende un errore — chiama
 * `window.athlonRicordaEmail(email)`.
 *
 * ## L'email nell'URL non è un ricordo, è un'informazione più specifica
 *
 * Un link con `?email=mario.rossi@…` — una campagna, un invito, un follow-up
 * mandato dal desk — dice chi sta per arrivare meglio di qualunque cosa il
 * browser ricordi. `daUrl()` la legge e vince sempre su `localStorage`,
 * **anche sul totem**: un indirizzo nell'URL non è il residuo di chi è
 * passato prima, è l'informazione con cui quel link è stato costruito.
 *
 * `window.athlonEmailConosciuta()` è la funzione che i quattro flussi con un
 * passo "email → verifica su PerfectGym → ramo" (prova, contattaci,
 * iscrizione, l'assistente) chiamano per **saltare** quel passo: se
 * conosciamo già l'email — dall'URL, da un altro form di questa visita o da
 * un invio precedente ricordato nel browser — non la precompilano soltanto,
 * la mandano da sole alla verifica. Una volta che qualcuno l'ha data, in
 * qualunque forma sul sito, nessun altro form gliela richiede più:
 * `leggi()` è la stessa funzione che `precompila()` usa per riempire un
 * campo vuoto, qui riusata per decidere se il passo va saltato del tutto.
 * `daUrl()` resta la versione più stretta — il solo parametro nell'indirizzo
 * di questa pagina — per chi ha bisogno di distinguere le fonti.
 *
 * **E resta per tutta la visita, non solo sulla pagina che porta il
 * parametro.** Il sito è statico e multipagina: chi arriva su `?email=…` e
 * clicca un link interno si ritrova su un URL pulito, e senza questa riga
 * l'informazione sarebbe persa — esattamente il problema del `vid` che
 * `attribuzione.ts` risolve allo stesso modo. La prima pagina che vede il
 * parametro lo scrive in `sessionStorage`; quelle dopo, senza il parametro,
 * lo trovano lì. Come il `sid`: dura la sessione, non serve un consenso — è
 * necessario al servizio che la persona ha già chiesto cliccando quel link,
 * non profilazione.
 *
 * ## Due memorie, e solo la seconda passa dal consenso
 *
 * Questa è la riga che è costata un giro di correzioni. `athlon_email` in
 * `localStorage` è **funzionale**: sopravvive alla chiusura del browser, e
 * ricordarsi un indirizzo fra una visita e l'altra è una comodità che si
 * chiede. Ma la scrittura passa da `quandoConsentito('functional', …)`, e da
 * quando la chiave CookieYes è tornata attiva quella coda **non si svuota
 * finché il visitatore non accetta**: chi non tocca il banner digitava
 * l'email nella prova e se la ritrovava richiesta identica in «contattaci»,
 * perché `localStorage` era rimasto vuoto e la scrittura in attesa.
 *
 * L'email digitata poco fa e portata a un altro form **nella stessa visita**
 * però non è quella memoria: è la stessa cosa della sessione della chat, che
 * il sito classifica già come **necessaria** — lo stato del servizio che la
 * persona ha chiesto, dura la sessione, non profila, e bloccarlo rompe il
 * servizio invece di proteggerlo. Quindi `ricorda()` scrive **subito** in
 * `sessionStorage`, senza consenso, e in `localStorage` solo quando il
 * consenso funzionale arriva. Chi rifiuta i funzionali non viene più
 * riconosciuto domani; oggi, dentro la sua visita, non gli si richiede tre
 * volte lo stesso indirizzo.
 *
 * **Tranne sul totem.** Lì la persona dopo non è la stessa, e se il
 * `sessionStorage` sopravvivesse fra un visitatore e il successivo — la
 * scheda del browser non si chiude da sola — l'email di chi è passato prima
 * finirebbe scritta per chi viene dopo: lo stesso rischio per cui `leggi()`
 * non legge `localStorage` lì. `daUrl()` sul totem vede solo il parametro
 * della pagina corrente, mai quello scritto da una pagina precedente.
 */
import { quandoConsentito } from './consenso';
import { suTotem } from './totem';

/** Il ricordo fra una visita e l'altra: `localStorage`, dietro il consenso. */
const CHIAVE = 'athlon_email';
/** L'email di questa visita: `sessionStorage`, come il `sid`, senza consenso. */
const CHIAVE_VISITA = 'athlon_email_visita';

/** Il solo parametro nell'indirizzo di **questa** pagina. */
export function daUrl(): string {
  try {
    const params = new URLSearchParams(location.search);
    const v = (params.get('email') || params.get('Email') || params.get('user_email') || '').trim();
    return v.indexOf('@') > 0 ? v.toLowerCase() : '';
  } catch {
    return '';
  }
}

/** L'email già vista in questa visita, da un link o da un altro form. */
function diQuestaVisita(): string {
  /* Mai sul totem: la persona dopo non è la stessa, e la scheda del browser
     lì non si chiude fra un visitatore e il successivo. */
  if (suTotem()) return '';
  try {
    return sessionStorage.getItem(CHIAVE_VISITA) || '';
  } catch {
    return '';
  }
}

function segnaVisita(email: string): void {
  if (suTotem()) return;
  try {
    sessionStorage.setItem(CHIAVE_VISITA, email);
  } catch {
    /* storage negato: l'email vale per questa pagina sola, e va bene */
  }
}

/**
 * L'email che conosciamo, da qualunque fonte, in ordine di specificità.
 *
 * Esportata come `daUrl()`, per lo stesso motivo: i quattro flussi con un
 * passo email→verifica la importano direttamente (come già fanno con
 * `suTotem` da `totem.ts`), così non dipendono dall'ordine in cui gli script
 * della pagina si caricano.
 */
export function leggi(): string {
  /* L'indirizzo nel link vince su tutto e **vale anche sul totem**: non è il
     residuo di chi è passato prima, è l'informazione con cui quel link è
     stato costruito. Ed entra nella memoria di visita, così sopravvive al
     primo click su un link interno. */
  const url = daUrl();
  if (url) {
    segnaVisita(url);
    return url;
  }
  const visita = diQuestaVisita();
  if (visita) return visita;
  if (suTotem()) return '';
  try {
    return localStorage.getItem(CHIAVE) || '';
  } catch {
    return '';
  }
}

function ricorda(email: string): void {
  const pulita = String(email || '').trim().toLowerCase();
  /* Una validazione minima e non una completa: qui non si accetta o rifiuta un
     indirizzo — quello l'ha già fatto il form — si evita solo di memorizzare
     una stringa che non è un'email. */
  if (!pulita || pulita.indexOf('@') < 1) return;
  if (suTotem()) return;
  /* Subito e senza consenso: dentro la visita è lo stato del servizio che la
     persona ha appena chiesto, come la sessione della chat. Vedi la nota
     «Due memorie» in cima. */
  segnaVisita(pulita);
  /* E fra una visita e l'altra solo con i funzionali: quello è un ricordo, e
     un ricordo si chiede. Se il consenso non arriva mai questa resta in coda,
     ed è giusto così — la visita di oggi è già coperta dalla riga sopra. */
  quandoConsentito('functional', () => {
    try {
      localStorage.setItem(CHIAVE, pulita);
    } catch {
      /* storage negato: il campo resterà da compilare, e va bene */
    }
  });
}

/** Riempie i campi marcati che sono vuoti. Non tocca quelli già compilati. */
function precompila(dove: ParentNode = document): void {
  const email = leggi();
  if (!email) return;
  dove.querySelectorAll<HTMLInputElement>('input[data-email-nota]').forEach((campo) => {
    if (!campo.value) campo.value = email;
  });
}

const w = window as unknown as {
  athlonRicordaEmail: (email: string) => void;
  athlonEmailNota: () => string;
  athlonEmailDaUrl: () => string;
  athlonEmailConosciuta: () => string;
};
w.athlonRicordaEmail = ricorda;
w.athlonEmailNota = leggi;
w.athlonEmailDaUrl = daUrl;
w.athlonEmailConosciuta = leggi;

precompila();

/* I pannelli si chiudono svuotando i campi, e alla riapertura sarebbero vuoti:
   una precompilazione al caricamento coprirebbe solo la prima volta. Riempire
   quando il campo riceve il fuoco copre ogni apertura senza che i quattro form
   debbano sapere che questo file esiste. */
document.addEventListener(
  'focusin',
  (e) => {
    const campo = e.target as HTMLInputElement | null;
    if (campo?.matches?.('input[data-email-nota]') && !campo.value) precompila(campo.parentElement ?? document);
  },
  true
);
