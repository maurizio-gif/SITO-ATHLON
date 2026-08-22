/**
 * Il registro di ogni pagina vista, non solo di chi compila un modulo.
 *
 * Le tabelle `richieste_*` e `eventi_email` contengono solo chi è arrivato in
 * fondo a un modulo. Per sapere «quanti accessi» e «quanti mi hanno lasciato
 * dei dati» serve anche il numeratore che manca: ogni caricamento di pagina,
 * con lo stesso `vid`/`sid` di `scripts/attribuzione.ts`, verso la tabella
 * `visite_pagina` (vedi `supabase/migrations/20260822_tracciamento_completo.sql`)
 * e la vista `visitatori` che la aggrega.
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
 * cambiare è solo l'etichetta, e il nodo `Normalizza` del workflow la rilegge
 * con `JSON.parse` quando arriva come stringa.
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
 * `window.athlonNoTrack()` dice cosa vede il browser adesso.
 */
const URL = 'https://automazione.n8ndevelop.it/webhook/athlon-visita-pagina';

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

function manda(): void {
  try {
    if (escluso()) return;

    const w = window as unknown as {
      athlonGetUtm?: () => Record<string, string>;
      athlonGetVid?: () => string;
      athlonGetSid?: () => string;
      athlonVidStabile?: () => boolean;
    };
    /* Prima `athlonGetVid()`, poi `athlonVidStabile()`: è la prima a scrivere
       nello storage quando il consenso c'è, e la seconda legge il risultato. */
    const idVisitatore = w.athlonGetVid ? w.athlonGetVid() : null;
    const corpo = JSON.stringify({
      vid: idVisitatore,
      /* Senza consenso pubblicitario il vid qui sopra vale una pagina sola:
         va detto, o chi conta i visitatori unici conta le pagine. */
      vidStabile: w.athlonVidStabile ? w.athlonVidStabile() : false,
      sid: w.athlonGetSid ? w.athlonGetSid() : null,
      pagina: location.pathname + location.search,
      referrer: document.referrer || null,
      titolo: document.title || null,
      utm: w.athlonGetUtm ? w.athlonGetUtm() : {},
    });
    /* `text/plain` e non `application/json`: vedi il blocco in testa al file.
       Il contenuto resta JSON, ed è il nodo `Normalizza` a rileggerlo. */
    const blob = new Blob([corpo], { type: 'text/plain;charset=UTF-8' });
    if (navigator.sendBeacon && navigator.sendBeacon(URL, blob)) return;
    /* Browser senza sendBeacon, o coda piena: un fetch con keepalive è il
       ripiego, non la strada principale — non aspetta risposta e non blocca
       niente se fallisce. Stesso content-type, per non avere due formati da
       gestire dall'altra parte. */
    fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: corpo,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Un pageview mancato non deve mai rompere la pagina che lo genera. */
  }
}

(window as unknown as { athlonNoTrack: () => boolean }).athlonNoTrack = () => {
  try {
    return localStorage.getItem(KEY_NOTRACK) === '1';
  } catch {
    return false;
  }
};

manda();

export {};
