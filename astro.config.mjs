// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  redirects: {
    '/scuola-nuoto-bambini-3': '/scuola-nuoto-bambini',
  },

  integrations: [
    sitemap({
      /* Il reindirizzo non è una pagina: la sua stessa pagina generata porta
         `noindex` e il canonical del bersaglio, quindi nella sitemap non ci va.
         `/diagnostica-schermo` nemmeno: è lo strumento che dice cosa dichiara il
         browser del totem, non una pagina del club. */
      filter: (page) =>
        !page.includes('/scuola-nuoto-bambini-3') && !page.includes('/diagnostica-schermo'),

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
