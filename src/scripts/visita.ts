/**
 * Quello che il sito registra da solo: ogni pagina vista, e i gesti che non
 * lasciano altra traccia.
 *
 * Le tabelle `richieste_*` e `eventi_email` contengono solo chi è arrivato in
 * fondo a un modulo. Qui sotto ci sono i due gradini prima:
 *
 *  - **`visite_pagina`** — un caricamento di pagina, con lo stesso `vid`/`sid`
 *    di `scripts/attribuzione.ts`. È la risposta a «quanti accessi».
 *  - **`eventi_interazione`** — un gesto compiuto in pagina che non è né un
 *    caricamento né un invio: oggi l'apertura dell'assistente. Misura
 *    l'intenzione che non arriva in fondo, e prima non lasciava traccia da
 *    nessuna parte.
 *
 * `window.athlonEvento(tipo, extra)` manda il secondo, e lo manda **in due
 * posti insieme**: la riga su Supabase e l'evento nel `dataLayer`, da cui GTM
 * costruisce il tag GA4. Una chiamata sola perché contare due volte lo stesso
 * gesto in due modi diversi è il modo di ritrovarsi due numeri che non
 * tornano — e perché l'esclusione qui sotto deve valere per entrambi.
 *
 * Nel `dataLayer` si spinge **sempre**, anche senza consenso: è GTM a decidere
 * se il tag parte, ed è il Consent Mode a dirglielo (vedi `scripts/consenso.ts`).
 * Un `push` non è un tag. È la stessa forma dei `lead_submit` che i form già
 * mandano.
 *
 * ## Il corpo è `text/plain`, e non è un dettaglio: è la ragione per cui prima
 * non arrivava niente
 *
 * La prima stesura mandava un `Blob` con `type: 'application/json'`, che sembra
 * la scelta ovvia — il webhook riceve JSON. In produzione non è arrivata **una
 * riga**, per due ragioni che si sommano e che non danno errore:
 *
 *  - `application/json` non è un content-type «semplice», quindi il browser
 *    manda prima un preflight `OPTIONS`. Misurato: il POST non parte mai.
 *  - e il preflight non si può nemmeno accontentare, perché `sendBeacon`
 *    spedisce con credentials mode `include`: in quel caso un
 *    `Access-Control-Allow-Origin: *` — che è esattamente quello che risponde
 *    il webhook n8n con `allowedOrigins: '*'` — è **vietato dalla specifica**.
 *    Misurato anche questo, contro un server che il preflight lo gestiva.
 *
 * `text/plain` è uno dei tre content-type che non fanno scattare il preflight,
 * quindi il POST parte e basta. Il corpo resta la stessa stringa JSON: a
 * cambiare è solo l'etichetta, e i nodi `Normalizza` dei due workflow la
 * rileggono con `JSON.parse`.
 *
 * **E il guasto era silenzioso**, che è la parte da ricordare: `sendBeacon()`
 * restituisce `true` quando ha *accodato* la richiesta, non quando è arrivata.
 * Il ripiego qui sotto (`if (…sendBeacon(…)) return`) non è quindi mai scattato,
 * e in console non compariva niente perché nessuno guardava. Per verificare
 * questo percorso non basta controllare che `sendBeacon` venga chiamato con il
 * payload giusto — bisogna guardare che il POST **arrivi**, da un'origine
 * diversa, come fa un browser vero.
 *
 * ## Il consenso, e chi non vuole essere contato
 *
 * Come `athlon_utm`, non passa dal consenso: `vid`/`sid` restano quelli che
 * `attribuzione.ts` già decide (vid degradato a una pagina sola senza
 * consenso pubblicitario, sid sempre presente perché non identifica nessuno
 * da solo). Il beacon non aggiunge un secondo cancello di consenso sopra un
 * dato che quel modulo ha già deciso come trattare.
 *
 * Chi lavora al sito, però, non è un visitatore: le sue prove falserebbero i
 * numeri che il sito serve a leggere. Da qui l'esclusione, che si accende una
 * volta per dispositivo aprendo una pagina qualsiasi con `?athlon-notrack=1`
 * e resta finché non si svuota il browser (o si apre `?athlon-notrack=0`).
 * `window.athlonNoTrack()` dice cosa vede il browser adesso. Vale per le
 * pagine, per gli eventi **e per il `dataLayer`**: un'esclusione che lascia
 * passare metà dei segnali non esclude niente.
 */
const URL_VISITA = 'https://automazione.n8ndevelop.it/webhook/athlon-visita-pagina';
const URL_EVENTO = 'https://automazione.n8ndevelop.it/webhook/athlon-evento';

const KEY_NOTRACK = 'athlon_notrack';
const PARAM_NOTRACK = 'athlon-notrack';

/**
 * L'interruttore di esclusione, letto e scritto sullo stesso dispositivo.
 *
 * `localStorage` e non un cookie: non deve viaggiare in nessuna richiesta, e
 * non riguarda nessuno tranne il browser che ce l'ha. Vale per dispositivo e
 * per browser — chi prova il sito dal telefono e dal computer lo accende due
 * volte, ed è la stessa proprietà che ha l'opt-out di qualunque analytics.
 */
function escluso(): boolean {
  try {
    const params = new URLSearchParams(location.search);
    const scelta = params.get(PARAM_NOTRACK);
    if (scelta === '1' || scelta === 'on') {
      localStorage.setItem(KEY_NOTRACK, '1');
      /* Una conferma serve: senza, non c'è modo di sapere se ha funzionato, e
         un interruttore che non si vede è un interruttore di cui non ci si
         fida. */
      console.info(
        '[Athlon] Le visite da questo browser non vengono più registrate. Per riattivarle: ?athlon-notrack=0'
      );
    } else if (scelta === '0' || scelta === 'off') {
      localStorage.removeItem(KEY_NOTRACK);
      console.info('[Athlon] Le visite da questo browser vengono di nuovo registrate.');
    }
    return localStorage.getItem(KEY_NOTRACK) === '1';
  } catch {
    /* Storage negato (navigazione privata, impostazioni): non si può ricordare
       la scelta, e allora si conta — è la stessa persona di ogni altra visita
       senza storage, non uno di noi. */
    return false;
  }
}

interface Finestra {
  athlonGetUtm?: () => Record<string, string>;
  athlonGetVid?: () => string;
  athlonGetSid?: () => string;
  athlonVidStabile?: () => boolean;
  dataLayer?: unknown[];
}

/** Chi è, quale visita, da dove: la parte comune di ogni cosa che spediamo. */
function contesto() {
  const w = window as unknown as Finestra;
  /* Prima `athlonGetVid()`, poi `athlonVidStabile()`: è la prima a scrivere
     nello storage quando il consenso c'è, e la seconda legge il risultato. */
  const vid = w.athlonGetVid ? w.athlonGetVid() : null;
  return {
    vid,
    /* Senza consenso pubblicitario il vid vale una pagina sola: va detto, o
       chi conta i visitatori unici conta le pagine. */
    vidStabile: w.athlonVidStabile ? w.athlonVidStabile() : false,
    sid: w.athlonGetSid ? w.athlonGetSid() : null,
    pagina: location.pathname + location.search,
    utm: w.athlonGetUtm ? w.athlonGetUtm() : {},
  };
}

/**
 * Il beacon, con il ripiego.
 *
 * `text/plain` per la ragione in testa al file. `sendBeacon` e non `fetch`
 * perché quello che spediamo può essere seguito da una navigazione immediata —
 * un clic che apre un pannello, o un caricamento di pagina — e sopravvivere
 * alla navigazione è il suo scopo.
 */
function spedisci(url: string, corpo: string): void {
  const blob = new Blob([corpo], { type: 'text/plain;charset=UTF-8' });
  if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
  /* Browser senza sendBeacon, o coda piena: un fetch con keepalive è il
     ripiego, non la strada principale — non aspetta risposta e non blocca
     niente se fallisce. Stesso content-type, per non avere due formati da
     gestire dall'altra parte. */
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: corpo,
    keepalive: true,
  }).catch(() => {});
}

function mandaVisita(): void {
  try {
    if (escluso()) return;
    spedisci(
      URL_VISITA,
      JSON.stringify({
        ...contesto(),
        referrer: document.referrer || null,
        titolo: document.title || null,
      })
    );
  } catch {
    /* Un pageview mancato non deve mai rompere la pagina che lo genera. */
  }
}

/**
 * Un gesto: la riga su Supabase e l'evento nel `dataLayer`, insieme.
 *
 * `tipo` è il nome del gesto (`chat_open`), `origine` da quale comando è
 * partito — cioè il `data-cta-source` del pulsante premuto, che il sito mette
 * già nel markup di ogni CTA.
 *
 * Non solleva mai: un evento di misura che rompe il gesto che sta misurando è
 * il peggior baratto possibile.
 */
function evento(tipo: string, origine?: string | null): void {
  try {
    if (!tipo || escluso()) return;
    const c = contesto();
    spedisci(URL_EVENTO, JSON.stringify({ ...c, tipo, origine: origine || null }));

    const w = window as unknown as Finestra;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: tipo, evento_origine: origine || null, evento_pagina: c.pagina });
  } catch {
    /* idem */
  }
}

const w = window as unknown as Finestra & {
  athlonNoTrack: () => boolean;
  athlonEvento: (tipo: string, origine?: string | null) => void;
};

w.athlonNoTrack = () => {
  try {
    return localStorage.getItem(KEY_NOTRACK) === '1';
  } catch {
    return false;
  }
};
w.athlonEvento = evento;

mandaVisita();

export {};
