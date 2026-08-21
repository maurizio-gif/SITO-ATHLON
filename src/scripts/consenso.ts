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

/**
 * Il ponte verso il Google Consent Mode.
 *
 * Traduce le categorie del banner nei segnali che GTM, GA4 e Ads leggono. Lo
 * stato di default — tutto negato — lo dichiara `Layout.astro` come primissimo
 * script; questo lo aggiorna quando il visitatore sceglie.
 *
 * **Sta qui e non nell'integrazione nativa di CookieYes**, che il pannello del
 * fornitore offre: quella dipende dal piano sottoscritto, e due sorgenti che
 * mandano gli stessi segnali sono due sorgenti che prima o poi divergono. Nel
 * pannello CookieYes il Consent Mode va quindi lasciato **disattivato**.
 *
 * E sta in questo file e non nel layout perché i listener di CookieYes sono già
 * qui: un secondo blocco che ascolta gli stessi due eventi avrebbe due copie
 * della stessa mappa fra categorie e segnali, da tenere in pari a mano.
 *
 * La mappa ricalca quella del sito del Tennis Club Ambrosiano, che questo
 * impianto ha portato: `advertisement` governa i quattro segnali pubblicitari
 * più la personalizzazione, `analytics` il solo `analytics_storage`.
 * `functionality_storage` non si aggiorna — resta concesso dal default —
 * perché lo storage funzionale di questo sito non lo decide un tag di Google
 * ma `quandoConsentito('functional', …)` qui sotto.
 */
/* L'ultimo stato spedito a Google, per non ripetersi. `rivaluta()` viene
   chiamata anche dalla rete di sicurezza — ogni mezzo secondo per venti
   secondi — e senza questo confronto il `dataLayer` riceveva quaranta comandi
   di consenso identici: rumore per chi legge la coda in debug, e lavoro inutile
   per GTM, che rivaluta i suoi trigger a ogni comando. */
let ultimoConsentMode = '';

function aggiornaConsentMode(): void {
  /* Si passa dalla `gtag()` globale che `Layout.astro` definisce, e non da un
     `dataLayer.push()` scritto qui: `gtag()` mette nella coda l'oggetto
     `arguments`, ed è **quella forma** che GTM riconosce come comando di
     consenso. Un array o un oggetto semplice con le stesse chiavi finirebbe
     nella coda come un evento qualsiasi e verrebbe ignorato in silenzio — che
     è il modo peggiore di sbagliare, perché a schermo non si vede nulla. */
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g !== 'function') return;
  const pub = consenso('advertisement');
  const segnali = {
    analytics_storage: consenso('analytics') ? 'granted' : 'denied',
    ad_storage: pub ? 'granted' : 'denied',
    ad_user_data: pub ? 'granted' : 'denied',
    ad_personalization: pub ? 'granted' : 'denied',
    personalization_storage: pub ? 'granted' : 'denied',
  };
  const firma = JSON.stringify(segnali);
  if (firma === ultimoConsentMode) return;
  ultimoConsentMode = firma;
  g('consent', 'update', segnali);
}

function rivaluta(): void {
  aggiornaConsentMode();
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

/* Il dominio a cui la chiave di CookieYes è registrata. Serve solo all'avviso
   qui sotto: è l'unico posto del sito che ha bisogno di sapere «dove dovremmo
   essere», e tenerlo qui evita di spargere il nome del dominio nel codice. */
const DOMINIO_UFFICIALE = /(^|\.)athlonroma\.it$/i;

/**
 * L'avviso che trasforma un guasto silenzioso in un guasto visibile.
 *
 * Le due configurazioni sbagliate sono simmetriche e nessuna delle due si vede
 * guardando il sito — si vedono solo come «una cosa che non funziona più»:
 *
 *  - **chiave impostata e CookieYes che non risponde.** È quello che è capitato:
 *    la produzione su un host che l'account CookieYes non conosce, quindi
 *    nessun banner, nessun consenso possibile, e `vid`, UTM ed email non
 *    memorizzati. Da fuori sembrava «l'email non si precompila».
 *  - **chiave vuota sul dominio ufficiale.** Il verso opposto, ed è quello che
 *    si dimentica: finito lo spostamento, se nessuno rimette la chiave il sito
 *    gira senza banner e memorizza come prima.
 *
 * Non blocca niente e non parla all'utente: è una riga in console per chi apre
 * gli strumenti. `athlonStatoConsenso()` resta il dettaglio.
 */
function avvisaSeNonCombacia(silenzioso: boolean): void {
  const host = location.hostname;
  const ufficiale = DOMINIO_UFFICIALE.test(host);

  if (COOKIEYES_KEY && silenzioso) {
    console.warn(
      `[athlon] CookieYes non risponde su ${host}: nessun banner, quindi ` +
        'niente consenso e niente memorizzato — vid, UTM ed email ricordata ' +
        'sono spenti. Se questo host non è fra i domini registrati ' +
        'nell\'account, svuota COOKIEYES_KEY in data/sito.ts finché non lo è.'
    );
  }

  if (!COOKIEYES_KEY && ufficiale) {
    console.warn(
      `[athlon] Siamo su ${host} senza banner del consenso: COOKIEYES_KEY è ` +
        'vuota in data/sito.ts. Era il ripiego per stare su un host che ' +
        'CookieYes non conosce — qui va rimessa.'
    );
  }
}

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
    if (++tentativi >= 40) {
      clearInterval(orologio);
      /* Venti secondi e nessuno dei tre segnali ha parlato: non è un visitatore
         che sta ancora leggendo il banner, è un banner che non c'è. */
      avvisaSeNonCombacia(daFunzione() === null && daCookie() === null);
    }
  }, 500);
} else {
  avvisaSeNonCombacia(false);
}
