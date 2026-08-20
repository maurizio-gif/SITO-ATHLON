#!/usr/bin/env node
/**
 * Il build del sito, con il pannello di Tina se ci sono le credenziali.
 *
 * `tinacms build` compila il pannello in `public/admin` e va eseguito **prima**
 * di Astro, perché Astro copia `public/` nel `dist`. Ma quel comando pretende
 * il token di TinaCloud, e un build che si rompe per una variabile d'ambiente
 * mancante è un sito che non si pubblica più.
 *
 * Quindi la regola è: se il token c'è si costruisce anche il pannello, se non
 * c'è si costruisce il sito e si dice perché il pannello non c'è. Il giorno in
 * cui la variabile viene aggiunta su Vercel, /admin compare al primo deploy
 * senza toccare una riga.
 *
 * Il client id non serve controllarlo: sta in `tina/config.ts`, perché è
 * pubblico per costruzione — finisce nel bundle del pannello.
 */
import { spawnSync } from 'node:child_process';

const esegui = (comando, argomenti) => {
  const esito = spawnSync(comando, argomenti, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (esito.status !== 0) process.exit(esito.status ?? 1);
};

if (process.env.TINA_TOKEN) {
  console.log('▲ Tina: token trovato, compilo il pannello in public/admin');
  esegui('tinacms', ['build']);
} else {
  console.log(
    '▲ Tina: nessun TINA_TOKEN, salto il pannello.\n' +
      "  Il sito si pubblica comunque; /admin non esiste finché la variabile non c'è."
  );
}

esegui('astro', ['build']);
