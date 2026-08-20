#!/usr/bin/env node
/**
 * Il build del sito, con il pannello di Tina quando ha senso costruirlo.
 *
 * `tinacms build` compila il pannello in `public/admin` e va eseguito **prima**
 * di Astro, perché Astro copia `public/` nel `dist`. Ma quel comando parla con
 * TinaCloud, e TinaCloud conosce un ramo solo: quello che indicizza. Su un
 * deploy di anteprima — un ramo di lavoro, una PR — la prima cosa che fa è
 * fermarsi:
 *
 *   ERROR: Branch 'claude/...' is not on TinaCloud.
 *
 * e con lui si ferma tutto il deploy, sito compreso. Da qui le due regole.
 *
 * **Il pannello si costruisce solo per la produzione.** Non è una rinuncia: il
 * pannello di un'anteprima punterebbe comunque a un ramo che TinaCloud non ha,
 * quindi si aprirebbe su un errore. /admin vive sul sito pubblicato, dove il
 * contenuto è quello vero.
 *
 * **E se si rompe, non porta giù il sito con sé.** Il pannello è un accessorio;
 * le pagine sono il prodotto. Se `tinacms build` fallisce — token scaduto,
 * schema fuori sincrono, TinaCloud non raggiungibile — si scrive perché a
 * schermo, si butta l'eventuale build a metà e si pubblica il sito. Un CMS che
 * non compila è un pannello da sistemare; un deploy bloccato è un sito che non
 * si aggiorna più.
 *
 * Il client id non serve controllarlo: sta in `tina/config.ts`, perché è
 * pubblico per costruzione — finisce nel bundle del pannello.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const esegui = (comando, argomenti, opzioni = {}) =>
  spawnSync(comando, argomenti, { stdio: 'inherit', shell: process.platform === 'win32', ...opzioni });

/*
 * Quanto aspettare il pannello prima di lasciarlo perdere.
 *
 * Perché un limite: `tinacms build` chiede a TinaCloud di indicizzare il
 * repository e **aspetta che finisca**, e quell'attesa non ha una fine sua. Il
 * giorno che TinaCloud restasse a metà, il comando non fallirebbe — resterebbe
 * lì, portandosi dietro tutto il deploy fino al timeout di Vercel:
 * quarantacinque minuti senza una riga di output, che è peggio di un errore,
 * perché un errore almeno si legge. Il resto di questo file esiste perché il
 * pannello non fermi il sito, e senza un limite quella promessa vale solo
 * quando Tina ha la cortesia di fallire.
 *
 * Non è mai stato visto succedere: è un'assicurazione, e costa niente perché il
 * limite è larghissimo. Misurato su questi deploy, il passo dura una
 * quarantina di secondi, prima indicizzazione del repository compresa. Cinque
 * minuti sono sette volte tanto.
 */
const LIMITE_PANNELLO_MS = 5 * 60_000;

/* Su Vercel `VERCEL_ENV` vale 'production' per il ramo di produzione e
   'preview' per tutti gli altri. Fuori da Vercel non esiste, e allora decide
   solo il token: un build in locale gira sul ramo che si ha sotto mano. */
const suVercel = Boolean(process.env.VERCEL);
const anteprima = suVercel && process.env.VERCEL_ENV !== 'production';
const ramo = process.env.VERCEL_GIT_COMMIT_REF || 'il ramo locale';

const perche = !process.env.TINA_TOKEN
  ? 'nessun TINA_TOKEN'
  : anteprima
    ? `deploy di anteprima su ${ramo}, che TinaCloud non indicizza`
    : null;

if (perche === null) {
  console.log('▲ Tina: compilo il pannello in public/admin');
  const esito = esegui('tinacms', ['build'], { timeout: LIMITE_PANNELLO_MS, killSignal: 'SIGKILL' });
  /* Scaduto il tempo, `spawnSync` mette l'errore in `error` e uccide il
     processo col segnale chiesto: `status` resta null, quindi il caso va
     distinto o si legge come un fallimento qualunque. */
  const scaduto = esito.error?.code === 'ETIMEDOUT' || esito.signal === 'SIGKILL';
  if (scaduto || esito.status !== 0) {
    rmSync('public/admin', { recursive: true, force: true });
    console.warn(
      (scaduto
        ? `\n▲ Tina: il pannello non ha finito in ${Math.round(LIMITE_PANNELLO_MS / 60_000)} minuti, l'ho fermato.\n` +
          "  Quasi sempre è TinaCloud che non chiude l'indicizzazione: si riprova\n" +
          '  al prossimo deploy, e intanto il sito si pubblica senza.\n'
        : '\n▲ Tina: il pannello non ha compilato, e il sito si pubblica senza.\n') +
        '  /admin non ci sarà finché questo comando non torna a funzionare:\n' +
        '  controlla TINA_TOKEN, che il ramo di produzione sia indicizzato su\n' +
        '  TinaCloud e che tina/tina-lock.json sia aggiornato allo schema.\n'
    );
  }
} else {
  console.log(
    `▲ Tina: ${perche}, salto il pannello.\n` +
      "  Il sito si pubblica comunque; /admin sta sul sito di produzione."
  );
}

process.exit(esegui('astro', ['build']).status ?? 1);
