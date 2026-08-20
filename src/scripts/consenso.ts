/**
 * Cosa il visitatore ha acconsentito, letto da CookieYes.
 *
 * Sta in un modulo suo perché lo chiedono in due — l'attribuzione e l'email
 * ricordata — e per **due categorie diverse**, che è il punto: non esiste «il
 * consenso», esistono cinque categorie e ogni cosa memorizzata sta sotto la sua.
 *
 * Le categorie di CookieYes sono `necessary`, `functional`, `analytics`,
 * `performance`, `advertisement`. Non `marketing`, che è il nome di un altro
 * fornitore.
 *
 * **Tre segnali e non uno**, e la ragione è dichiarata: il comportamento dello
 * script di CookieYes non è verificabile da questo repository — il suo CDN non è
 * raggiungibile dall'ambiente in cui il codice si scrive e si prova — così la
 * lettura non dipende dall'aver indovinato un nome:
 *
 *   1. `getCkyConsent()`, se lo espone;
 *   2. il cookie `cookieyes-consent`, che porta le categorie in chiaro;
 *   3. un controllo periodico dei due, limitato nel tempo, per il caso in cui
 *      l'evento si chiami diversamente da come lo aspettiamo.
 *
 * Il default è **negato**: se nessuno dei tre dice sì, non si scrive. Un
 * fornitore che non risponde non è un consenso.
 *
 * Quando l'API sarà confermata su una pagina vera — `window.athlonStatoConsenso()`
 * la stampa — il controllo periodico si può togliere. È l'unico pezzo qui che
 * esiste per prudenza e non per necessità.
 */
import { COOKIEYES_KEY } from '../data/sito';

export type Categoria = 'necessary' | 'functional' | 'analytics' | 'performance' | 'advertisement';

type Categorie = Partial<Record<Categoria, boolean>>;

const CATEGORIE: Categoria[] = [
  'necessary',
  'functional',
  'analytics',
  'performance',
  'advertisement',
];

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
        const nome = k?.trim() as Categoria | undefined;
        if (nome && v && CATEGORIE.includes(nome)) out[nome] = v.trim() === 'yes';
      });
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Se questa categoria è consentita. Senza banner vale il comportamento di prima. */
export function consenso(categoria: Categoria): boolean {
  if (!COOKIEYES_KEY) return true;
  const stato = daFunzione() ?? daCookie();
  return Boolean(stato?.[categoria]);
}

/* Le scritture che il consenso ha rimandato, per categoria. Tenerle divise è
   ciò che permette a chi accetta i funzionali e rifiuta la pubblicità di avere
   la sua email ricordata e nessuna attribuzione: una coda sola le farebbe
   partire insieme. */
const rimandate = new Map<Categoria, (() => void)[]>();

/** Esegue adesso se consentito, altrimenti quando il consenso arriva. */
export function quandoConsentito(categoria: Categoria, azione: () => void): void {
  if (consenso(categoria)) {
    azione();
    return;
  }
  const coda = rimandate.get(categoria) ?? [];
  coda.push(azione);
  rimandate.set(categoria, coda);
}

function rivaluta(): void {
  rimandate.forEach((coda, categoria) => {
    if (!consenso(categoria) || !coda.length) return;
    rimandate.set(categoria, []);
    coda.forEach((azione) => azione());
  });
}

/** Cosa vede l'adattatore, per confermare l'API su una pagina vera. */
(window as unknown as { athlonStatoConsenso: () => unknown }).athlonStatoConsenso = () => ({
  chiaveConfigurata: Boolean(COOKIEYES_KEY),
  daFunzione: daFunzione(),
  daCookie: daCookie(),
  consentito: CATEGORIE.reduce<Record<string, boolean>>((acc, c) => {
    acc[c] = consenso(c);
    return acc;
  }, {}),
  scrittureInAttesa: [...rimandate].reduce((n, [, coda]) => n + coda.length, 0),
});

if (COOKIEYES_KEY) {
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
    if (++tentativi >= 40) clearInterval(orologio);
  }, 500);
}
