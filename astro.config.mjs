// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Le schede marcate `noindex: true` nel frontmatter, lette qui perché la
 * sitemap va costruita prima che le content collection esistano.
 *
 * Il flag sta in un posto solo — il file della scheda — e da lì decide sia il
 * `<meta name="robots">` della pagina sia la sua presenza qui: una pagina
 * dichiarata nella sitemap e poi marcata noindex è una contraddizione che i
 * motori segnalano, ed è esattamente ciò che succederebbe tenendo due elenchi.
 */
const schedeNoindex = readdirSync('./src/content/articles', { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) =>
    readdirSync(`./src/content/articles/${d.name}`)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ id: `${d.name}/${f.replace(/\.md$/, '')}`, path: `./src/content/articles/${d.name}/${f}` }))
  )
  .filter(({ path }) => /^noindex:\s*true\s*$/m.test(readFileSync(path, 'utf8').split(/^---$/m)[1] ?? ''))
  .map(({ id }) => id);

// https://astro.build/config
export default defineConfig({
  site: 'https://www.athlonroma.it',

  build: {
    /* Il CSS del sito sta in quattro o cinque file per pagina, tutti bloccanti:
       il browser non dipinge niente finché non li ha tutti, e sono richieste da
       1,5 a 6 kB — il costo è il giro di rete, non il peso. Inlinearli li fa
       arrivare con l'HTML.

       Si perde la cache condivisa tra pagine: chi ne visita cinque riscarica lo
       stesso CSS cinque volte, dentro l'HTML. Su misura vale la pena comunque,
       perché il totale è ~14 kB e comprime a poco più di 4, mentre le quattro
       richieste in fila valevano un secondo di rendering bloccato su 4G lenta. */
    inlineStylesheets: 'always',
  },

  /* Il vecchio indirizzo della scuola nuoto bambini finiva con "-3", un residuo
     di WordPress. L'indirizzo giusto è senza, ma quello vecchio è in giro nei
     link condivisi e nei risultati di ricerca: resta buono e porta al nuovo. */
  /* La ginnastica posturale ha cambiato nome: in palinsesto e in pagina è
     ginnastica strutturale, e l'indirizzo l'ha seguita. Quello vecchio è nei
     link condivisi, nei risultati di ricerca e nel menu di chi ha la pagina
     aperta da ieri: resta buono e porta al nuovo. */
  redirects: {
    '/scuola-nuoto-bambini-3': '/scuola-nuoto-bambini',
    '/ginnastica-posturale': '/ginnastica-strutturale',
  },

  integrations: [
    sitemap({
      /* Il reindirizzo non è una pagina: la sua stessa pagina generata porta
         `noindex` e il canonical del bersaglio, quindi nella sitemap non ci va.
         `/diagnostica-schermo` nemmeno: è lo strumento che dice cosa dichiara il
         browser del totem, non una pagina del club. */
      filter: (page) =>
        !page.includes('/scuola-nuoto-bambini-3') &&
        !page.includes('/ginnastica-posturale') &&
        !page.includes('/diagnostica-schermo') &&
        !schedeNoindex.some((id) => page.includes(`/wikiathlon/${id}/`)),

      /* Priorità e frequenza sono suggerimenti, e Google li ignora — restano
         per gli altri crawler. Quello che conta è che ci siano tutte le pagine
         e nessuna di troppo.

         Nessun `lastmod`: una data di modifica falsa è peggio di una assente,
         perché insegna a chi legge a non fidarsi di quelle vere. */
      serialize: (item) => {
        const path = new URL(item.url).pathname;
        const priority = path === '/'
          ? 1
          : path.startsWith('/wikiathlon/')
            ? 0.5
            : path === '/planning/' || path === '/abbonamenti/'
              ? 0.9
              : path.startsWith('/eventi/')
                ? 0.7
                : 0.8;
        const changefreq = path === '/planning/' || path.startsWith('/eventi')
          ? 'weekly'
          : path.startsWith('/wikiathlon/')
            ? 'monthly'
            : 'monthly';
        return { ...item, priority, changefreq };
      },
    }),
  ],
});
