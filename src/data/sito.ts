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
