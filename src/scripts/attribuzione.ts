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
 * Leggere i parametri dall'URL non è archiviazione nel terminale e non chiede
 * consenso; **memorizzarli sì**, e il `vid` pure. Il sito oggi non ha un banner
 * cookie: quando arriverà, questo file è il punto in cui subordinare le due
 * `set` al consenso — la lettura dell'URL può restare com'è.
 */

const KEY_UTM = 'athlon_utm';
const KEY_VID = 'athlon_vid';

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
    return JSON.parse(sessionStorage.getItem(KEY_UTM) || '{}');
  } catch {
    return {};
  }
}

function catturaUtm(): void {
  try {
    if (sessionStorage.getItem(KEY_UTM)) return;
    const trovati = utmDaUrl();
    if (Object.keys(trovati).length) sessionStorage.setItem(KEY_UTM, JSON.stringify(trovati));
  } catch {
    /* storage negato (navigazione privata, impostazioni): si prosegue senza */
  }
}

function vid(): string {
  let salvato: string | null = null;
  try {
    salvato = localStorage.getItem(KEY_VID);
  } catch {
    salvato = null;
  }
  if (salvato) return salvato;

  const nuovo =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  try {
    localStorage.setItem(KEY_VID, nuovo);
  } catch {
    /* senza storage il vid vale per questa pagina soltanto */
  }
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
