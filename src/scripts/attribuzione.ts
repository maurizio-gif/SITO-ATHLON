/**
 * Da dove arriva la persona, e chi è la persona che torna.
 *
 * Due cose sole, che il form della prova mette in ogni payload che manda a n8n:
 *
 *  - **UTM e click-id** — presi dalla barra degli indirizzi al primo tocco
 *    della sessione e tenuti lì, così una richiesta inviata tre pagine più in
 *    là resta attribuita alla campagna che l'ha portata. Vince il primo tocco
 *    memorizzato; se non c'è, si ricade sull'URL corrente, altrimenti chi
 *    converte sulla pagina d'arrivo perderebbe l'attribuzione.
 *  - **`vid`** — un identificativo casuale del browser, senza nulla di
 *    personale dentro. Serve a riattaccare la visita all'anagrafica quando la
 *    stessa persona torna e lascia i dati con un'email diversa da quella che
 *    ci aspettavamo.
 *
 * L'insieme è atomico di proposito: o tutto il primo tocco o tutto l'URL
 * corrente, mai un misto, che darebbe la `source` di una campagna e la
 * `campaign` di un'altra.
 *
 * ## Il consenso
 *
 * Leggere i parametri dall'URL non è archiviazione nel terminale e non chiede
 * consenso; **memorizzarli sì**, e il `vid` pure. Da qui la forma di questo
 * file: tutto vive in memoria comunque, e solo la scrittura nello storage
 * aspetta il consenso di marketing.
 *
 * Tre conseguenze, e sono il motivo per cui non basta un `if` intorno alle due
 * `set`:
 *
 *  - **chi accetta dopo non perde niente.** Gli UTM del primo tocco stanno in
 *    memoria da subito; al consenso si travasano nello storage. Senza questo,
 *    accettare alla terza pagina vorrebbe dire attribuire la conversione a
 *    «nessuna campagna», che è il dato sbagliato, non il dato mancante.
 *  - **senza consenso il `vid` vale una pagina sola.** Ne resta uno in memoria,
 *    così il form che parte da questa pagina ha comunque un identificativo con
 *    cui l'automazione può unire i due invii della stessa persona; alla
 *    prossima pagina è un altro, e non è un difetto: un identificativo che non
 *    sopravvive alla navigazione non ricostruisce un percorso.
 *  - **il form non si blocca mai.** `provaForm.client.js` manda il payload
 *    senza attribuzione se queste funzioni non rispondono, e questo non
 *    cambia: il consenso cookie governa cosa si scrive nel browser, non se una
 *    persona può chiedere una prova.
 *
 * Finché `COOKIEYES_KEY` è vuoto non c'è banner, e allora si memorizza come si
 * è sempre fatto: negare il consenso quando nessuno può concederlo perderebbe i
 * dati senza rendere il sito più corretto di un millimetro.
 */

import { COOKIEYES_KEY } from '../data/sito';

const KEY_UTM = 'athlon_utm';
const KEY_VID = 'athlon_vid';

/* ── Consenso ───────────────────────────────────────────────────────────────
   CookieYes, e la categoria che ci riguarda si chiama **advertisement**: non
   `marketing`, che è il nome di un altro fornitore. Le categorie sono
   necessary, functional, analytics, performance, advertisement.

   L'identificatore del browser sta sotto advertisement e non sotto analytics,
   benché serva anche a misurare: viene allegato ai dati di contatto per
   riattaccare una richiesta a una persona, e quello è marketing. Chi accetta
   solo le statistiche non lo riceve, ed è corretto così anche se costa
   attribuzione.

   **Tre segnali e non uno**, e la ragione è dichiarata: il comportamento dello
   script di CookieYes non è verificabile da questo repository — il suo CDN non
   è raggiungibile dall'ambiente in cui il codice viene scritto e provato — così
   la lettura non dipende dall'aver indovinato un nome:

     1. `getCkyConsent()`, se lo espone;
     2. il cookie `cookieyes-consent`, che porta le categorie in chiaro;
     3. un controllo periodico dei due, limitato nel tempo, per il caso in cui
        l'evento si chiami diversamente da come lo aspettiamo.

   Il default è **negato**: se nessuno dei tre dice sì, non si scrive. Un
   fornitore che non risponde non è un consenso.

   Quando l'API sarà confermata su una pagina vera — `window.athlonStatoConsenso()`
   la stampa — il controllo periodico si può togliere. È l'unico pezzo qui che
   esiste per prudenza e non per necessità. */
type Categorie = Record<string, boolean>;

/** Le cinque categorie di CookieYes. Il cookie ne porta anche altre chiavi. */
const CATEGORIE = ['necessary', 'functional', 'analytics', 'performance', 'advertisement'];

/** Lo stato secondo la funzione globale di CookieYes, se c'è. */
function daFunzione(): Categorie | null {
  const g = (window as unknown as { getCkyConsent?: () => { categories?: Categorie } }).getCkyConsent;
  if (typeof g !== 'function') return null;
  try {
    return g()?.categories ?? null;
  } catch {
    return null;
  }
}

/** Lo stato secondo il cookie: `...,analytics:yes,advertisement:no`. */
function daCookie(): Categorie | null {
  try {
    const trovato = /(?:^|;\s*)cookieyes-consent=([^;]+)/.exec(document.cookie);
    if (!trovato) return null;
    const out: Categorie = {};
    decodeURIComponent(trovato[1])
      .split(',')
      .forEach((pezzo) => {
        const [k, v] = pezzo.split(':');
        /* Solo le categorie: nel cookie ci sono anche `consentid` e `action`,
           che non sono sì/no e letti come tali direbbero «no» a sproposito. */
        if (k && v && CATEGORIE.includes(k.trim())) out[k.trim()] = v.trim() === 'yes';
      });
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

function consensoPubblicita(): boolean {
  if (!COOKIEYES_KEY) return true; // nessun banner: vale il comportamento di prima
  const stato = daFunzione() ?? daCookie();
  return Boolean(stato?.advertisement);
}

/** Le `set` che il consenso ha rimandato, da rifare quando arriva. */
const rimandate: (() => void)[] = [];

function scrivi(azione: () => void): void {
  if (consensoPubblicita()) azione();
  else rimandate.push(azione);
}

/** Cosa vede l'adattatore, per confermare l'API su una pagina vera. */
(window as unknown as { athlonStatoConsenso: () => unknown }).athlonStatoConsenso = () => ({
  chiaveConfigurata: Boolean(COOKIEYES_KEY),
  daFunzione: daFunzione(),
  daCookie: daCookie(),
  pubblicitaConsentita: consensoPubblicita(),
  scrittureInAttesa: rimandate.length,
});

if (COOKIEYES_KEY) {
  const rivaluta = () => {
    if (!consensoPubblicita()) return; // può ancora arrivare: la coda resta
    while (rimandate.length) rimandate.shift()!();
  };

  /* Sul documento e sulla finestra: quale dei due porti l'evento dipende dal
     fornitore, ascoltarli entrambi non costa niente. */
  ['cookieyes_consent_update', 'cookieyes_banner_load'].forEach((e) => {
    document.addEventListener(e, rivaluta);
    window.addEventListener(e, rivaluta);
  });

  /* La rete di sicurezza descritta sopra: venti secondi, poi smette. Chi
     acconsente più tardi lo dice comunque con l'evento o col ricarico. */
  let tentativi = 0;
  const orologio = setInterval(() => {
    rivaluta();
    if (++tentativi >= 40 || !rimandate.length) clearInterval(orologio);
  }, 500);
}

/** Quello che vale la pena raccogliere: campagna, click-id delle due piattaforme. */
const CHIAVI = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
];

type Utm = Record<string, string>;

function utmDaUrl(): Utm {
  const out: Utm = {};
  try {
    const params = new URLSearchParams(location.search);
    CHIAVI.forEach((k) => {
      const v = params.get(k);
      if (v) out[k] = v;
    });
  } catch {
    /* URL illeggibile: nessuna attribuzione, non è un errore da mostrare */
  }
  return out;
}

function utmSalvati(): Utm {
  try {
    const salvati = JSON.parse(sessionStorage.getItem(KEY_UTM) || '{}');
    if (Object.keys(salvati).length) return salvati;
  } catch {
    /* illeggibile: vale la memoria */
  }
  return utmInMemoria;
}

/* Il primo tocco tenuto in memoria: è la copia che vale anche senza consenso,
   e quella da cui si travasa se il consenso arriva a metà navigazione. */
let utmInMemoria: Utm = {};

function catturaUtm(): void {
  try {
    if (sessionStorage.getItem(KEY_UTM)) return; // già memorizzato in questa sessione
  } catch {
    /* storage negato (navigazione privata, impostazioni): si prosegue senza */
  }
  const trovati = utmDaUrl();
  if (!Object.keys(trovati).length) return;
  utmInMemoria = trovati;
  scrivi(() => {
    try {
      if (!sessionStorage.getItem(KEY_UTM)) sessionStorage.setItem(KEY_UTM, JSON.stringify(trovati));
    } catch {
      /* niente storage: resta la copia in memoria */
    }
  });
}

/* Il `vid` di questa pagina. Senza consenso è tutto quello che c'è, e muore
   con la pagina; col consenso è la copia di quello nello storage. */
let vidInMemoria: string | null = null;

function vid(): string {
  if (vidInMemoria) return vidInMemoria;

  let salvato: string | null = null;
  try {
    salvato = localStorage.getItem(KEY_VID);
  } catch {
    salvato = null;
  }
  if (salvato) {
    vidInMemoria = salvato;
    return salvato;
  }

  const nuovo =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  vidInMemoria = nuovo;
  scrivi(() => {
    try {
      /* Se un'altra scheda ne ha scritto uno nel frattempo, vince quello: due
         schede della stessa persona non devono diventare due visitatori. */
      const esistente = localStorage.getItem(KEY_VID);
      if (esistente) vidInMemoria = esistente;
      else localStorage.setItem(KEY_VID, nuovo);
    } catch {
      /* senza storage il vid vale per questa pagina soltanto */
    }
  });
  return nuovo;
}

catturaUtm();

const w = window as unknown as {
  athlonGetUtm: () => Utm;
  athlonGetVid: () => string;
};

w.athlonGetUtm = () => {
  const salvati = utmSalvati();
  return Object.keys(salvati).length ? salvati : utmDaUrl();
};

w.athlonGetVid = vid;

export {};
