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
 * Il gruppo di domini di Cookiebot, cioè il banner del consenso.
 *
 * Sta in chiaro come il client id di Tina, e per lo stesso motivo: finisce
 * dentro l'attributo `data-cbid` della pagina, quindi lo legge chiunque apra il
 * sorgente. Nasconderlo in una variabile darebbe l'illusione di un segreto e
 * costerebbe un deploy rotto ogni volta che qualcuno dimentica di impostarla.
 *
 * **Vuoto è uno stato legittimo, e vale un interruttore solo.** Athlon ha già
 * un account Cookiebot per athlonroma.it in WordPress, e il sito Astro è
 * destinato a *essere* quel dominio: stesso dominio, stesso gruppo, stesso
 * identificativo — non se ne crea un altro, si copia quello. Finché qui non c'è:
 *
 *  - il banner non viene scritto in pagina, perché uno script con un id finto
 *    non chiede consenso, dà errore;
 *  - `scripts/attribuzione.ts` continua a memorizzare `vid` e UTM come ha
 *    sempre fatto.
 *
 * Nel momento in cui l'identificativo compare, le due cose scattano insieme:
 * banner in pagina e archiviazione subordinata al consenso. Un interruttore
 * solo e non due, perché lo stato intermedio — nessun banner e già niente
 * attribuzione — non serve a nessuno: perderebbe i dati senza che nessuno
 * possa acconsentire.
 */
export const COOKIEBOT_CBID = '';
