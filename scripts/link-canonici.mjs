/**
 * I link interni escono con lo slash finale, come il canonical.
 *
 * L'indirizzo canonico di ogni pagina di questo sito finisce con `/` — lo dice
 * il `<link rel="canonical">` di `Layout.astro`, lo dice la sitemap, ed è la
 * forma che Google ha indicizzato. Vercel ci porta chiunque arrivi senza slash
 * (`trailingSlash: true` in `vercel.json`, un 308), ma un link interno scritto
 * senza slash costa **un giro di rete in più a ogni clic** e a ogni passaggio
 * del crawler.
 *
 * Gli href scritti a mano sono 211 in 41 file, più quelli costruiti da uno slug
 * (`/${corso.slug}`) e quelli che arrivano dal markdown. Normalizzarli uno per
 * uno vorrebbe dire toccare i dati e il codice dell'applicazione per una cosa
 * che riguarda solo l'HTML in uscita — e mancarne uno non darebbe errore.
 * Quindi si normalizza qui, sull'HTML già generato, dove la regola è una sola e
 * si verifica in blocco.
 *
 * Cosa **non** tocca, e sono le tre righe da non allentare:
 *  - gli indirizzi con un punto nell'ultimo pezzo (`/kb.json`, `/favicon.ico`,
 *    le foto): sono file, e uno slash finale li fa sparire;
 *  - gli indirizzi esterni, `mailto:`, `tel:`, le ancore pure (`#guest-pass`)
 *    e i percorsi che lo slash ce l'hanno già;
 *  - la query e il frammento, che restano attaccati dove stavano
 *    (`/abbonamenti#guest-pass` diventa `/abbonamenti/#guest-pass`).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITO = 'https://www.athlonroma.it';

/** Un percorso è una pagina — e non un file — se l'ultimo pezzo non ha punti. */
function daNormalizzare(percorso) {
  if (!percorso.startsWith('/') || percorso.startsWith('//')) return false;
  const solo = percorso.split(/[?#]/)[0];
  if (solo === '' || solo.endsWith('/')) return false;
  return !/\.[a-z0-9]{1,8}$/i.test(solo.split('/').pop());
}

function conSlash(percorso) {
  const taglio = percorso.search(/[?#]/);
  if (taglio === -1) return percorso + '/';
  return percorso.slice(0, taglio) + '/' + percorso.slice(taglio);
}

export function normalizza(html) {
  let toccati = 0;
  const fuori = html.replace(/(href=")([^"]+)(")/g, (tutto, pre, url, post) => {
    let percorso = url;
    let prefisso = '';
    if (url.startsWith(SITO + '/')) {
      prefisso = SITO;
      percorso = url.slice(SITO.length);
    }
    if (!daNormalizzare(percorso)) return tutto;
    toccati += 1;
    return pre + prefisso + conSlash(percorso) + post;
  });
  /* Il breadcrumb di Schema.org porta l'indirizzo assoluto della pagina: se
     resta senza slash, dichiara come identità della voce un indirizzo che
     reindirizza. */
  const finale = fuori.replace(/("(?:item|url)":")(https:\/\/www\.athlonroma\.it\/[^"]*)(")/g,
    (tutto, pre, url, post) => {
      const percorso = url.slice(SITO.length);
      if (!daNormalizzare(percorso)) return tutto;
      toccati += 1;
      return pre + SITO + conSlash(percorso) + post;
    });
  return { html: finale, toccati };
}

export default function linkCanonici() {
  return {
    name: 'athlon-link-canonici',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const cartella = fileURLToPath(dir);
        const file = (await readdir(cartella, { recursive: true }))
          .filter((f) => f.endsWith('.html'))
          .map((f) => join(cartella, f));
        let totale = 0;
        for (const f of file) {
          const { html, toccati } = normalizza(await readFile(f, 'utf8'));
          if (toccati) {
            await writeFile(f, html);
            totale += toccati;
          }
        }
        logger.info(`${totale} link interni portati alla forma canonica in ${file.length} pagine`);
      },
    },
  };
}
