/**
 * L'indirizzo del sito, in un posto solo.
 *
 * Serve a chi genera URL assoluti — `/llms.txt` e `/kb.json` — perché quelli
 * finiscono fuori dal sito: nella risposta di un assistente, in un'email, nella
 * citazione di una fonte. Un link relativo lì non vuol dire niente.
 *
 * **Finché il sito vive su Vercel e non ancora su athlonroma.it**, le due cose
 * non coincidono: le fonti citate dall'assistente devono portare dove il
 * contenuto sta *adesso*, o chi clicca finisce sul sito vecchio. Da qui la
 * variabile d'ambiente: in anteprima si imposta
 * `PUBLIC_SITE_URL=https://sito-athlon.vercel.app`, in produzione non si imposta
 * niente e vale il dominio definitivo.
 *
 * Non è la stessa cosa del `site` in `astro.config.mjs`, che resta il dominio
 * canonico per la sitemap e i `<link rel="canonical">`: quelli devono indicare
 * la destinazione finale anche da un'anteprima, o si indicizzerebbe Vercel.
 */
export const SITE = (
  import.meta.env.PUBLIC_SITE_URL || 'https://www.athlonroma.it'
).replace(/\/$/, '');

/**
 * La chiave del sito su CookieYes, cioè il banner del consenso.
 *
 * Sta in chiaro come il client id di Tina, e per lo stesso motivo: finisce
 * dentro l'URL dello script in pagina, quindi la legge chiunque apra il
 * sorgente — su athlonroma.it si legge già oggi. Nasconderla in una variabile
 * darebbe l'illusione di un segreto e costerebbe un deploy rotto ogni volta che
 * qualcuno dimentica di impostarla.
 *
 * La chiave sta nello snippet che CookieYes dà in *Installation*:
 * `https://cdn-cookieyes.com/client_data/<chiave>/script.js`.
 *
 * **Vuoto è uno stato legittimo, e vale un interruttore solo.** Athlon ha già
 * un account CookieYes per athlonroma.it in WordPress, e il sito Astro è
 * destinato a *essere* quel dominio: si copia la chiave di là, non se ne crea
 * un'altra. Finché qui non c'è:
 *
 *  - il banner non viene scritto in pagina, perché uno script con una chiave
 *    finta non chiede consenso, dà errore;
 *  - `scripts/attribuzione.ts` continua a memorizzare `vid` e UTM come ha
 *    sempre fatto.
 *
 * Nel momento in cui la chiave compare, le due cose scattano insieme: banner in
 * pagina e archiviazione subordinata al consenso. Un interruttore solo e non
 * due, perché lo stato intermedio — nessun banner e già niente attribuzione —
 * perderebbe i dati senza che nessuno possa acconsentire.
 *
 * ## Perché adesso è vuota, e quando va rimessa
 *
 * La chiave è `3e76f0f799c6d1d94882361d`, e va rimessa **il giorno che
 * `www.athlonroma.it` punta su Vercel**. Non un momento prima, e la ragione è
 * quella scritta sopra, capitata per davvero: CookieYes serve il banner solo sui
 * domini registrati nell'account, e l'account ha quel dominio solo — piano Free,
 * uno. Finché la produzione sta su `sito-athlon.vercel.app`, CookieYes non
 * decide niente su questo host: `getCkyConsent()` non esiste, il cookie
 * `cookieyes-consent` non compare, e `consenso()` risponde «negato» per
 * costruzione, perché un fornitore che non risponde non è un consenso.
 *
 * Cioè: con la chiave impostata qui il sito stava **esattamente nello stato
 * intermedio** che questo commento dichiara sbagliato — nessun banner e già
 * niente memorizzato. Si vedeva da fuori come «l'email non si ricorda», che è il
 * sintomo piccolo; quello grosso era che `vid` e UTM non venivano scritti, e
 * ogni richiesta risultava senza campagna.
 *
 * Il promemoria non è questo commento: `scripts/consenso.ts` avvisa in console
 * quando la configurazione e l'host non combaciano, nei due versi.
 */
export const COOKIEYES_KEY = '';
