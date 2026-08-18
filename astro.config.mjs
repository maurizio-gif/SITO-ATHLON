// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.athlonroma.it',

  /* Il vecchio indirizzo della scuola nuoto bambini finiva con "-3", un residuo
     di WordPress. L'indirizzo giusto è senza, ma quello vecchio è in giro nei
     link condivisi e nei risultati di ricerca: resta buono e porta al nuovo. */
  redirects: {
    '/scuola-nuoto-bambini-3': '/scuola-nuoto-bambini',
  },
});
