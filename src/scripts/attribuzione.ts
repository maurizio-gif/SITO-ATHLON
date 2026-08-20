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

import { quandoConsentito } from './consenso';

const KEY_UTM = 'athlon_utm';
const KEY_VID = 'athlon_vid';

/* La categoria che governa questi due è **advertisement**, non `analytics`,
   benché servano anche a misurare: l'identificativo viene allegato ai dati di
   contatto per riattaccare una richiesta a una persona, e quello è marketing.
   Chi accetta solo le statistiche non lo riceve, ed è corretto così anche se
   costa attribuzione.

   Come si legge il consenso — tre segnali, default negato — sta in
   `scripts/consenso.ts`, perché lo chiede anche l'email ricordata, e per una
   categoria diversa. */
const scrivi = (azione: () => void) => quandoConsentito('advertisement', azione);

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
