#!/usr/bin/env node
/**
 * Il build del sito, con il pannello di Tina se ci sono le credenziali.
 *
 * `tinacms build` compila il pannello in `public/admin` e va eseguito **prima**
 * di Astro, perché Astro copia `public/` nel `dist`. Ma serve un progetto su
 * TinaCloud: senza `TINA_CLIENT_ID` e `TINA_TOKEN` quel comando non passa, e un
 * build che si rompe per una variabile mancante è un sito che non si pubblica
 * più.
 *
 * Quindi la regola è: se le credenziali ci sono si costruisce anche il
 * pannello, se non ci sono si costruisce il sito e si dice perché il pannello
 * non c'è. Il giorno in cui le variabili vengono aggiunte su Vercel, /admin
 * compare al primo deploy senza toccare una riga.
 */
import { spawnSync } from 'node:child_process';

const esegui = (comando, argomenti) => {
  const esito = spawnSync(comando, argomenti, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (esito.status !== 0) process.exit(esito.status ?? 1);
};

const credenziali = process.env.TINA_CLIENT_ID && process.env.TINA_TOKEN;

if (credenziali) {
  console.log('▲ Tina: credenziali trovate, compilo il pannello in public/admin');
  esegui('tinacms', ['build']);
} else {
  console.log(
    '▲ Tina: nessuna credenziale (TINA_CLIENT_ID / TINA_TOKEN), salto il pannello.\n' +
      '  Il sito si pubblica comunque; /admin non esiste finché le variabili non ci sono.'
  );
}

esegui('astro', ['build']);
