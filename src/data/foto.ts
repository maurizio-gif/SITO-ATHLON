/**
 * Le varianti piccole delle foto, per le caselle piccole.
 *
 * Le immagini stanno in `public/` e sono referenziate come stringhe dai file di
 * dati, quindi non passano dall'ottimizzatore di Astro, che lavora su import
 * statici. Accanto a ogni originale c'è un `-640.jpg` generato da
 * `scripts/varianti-foto.mjs`, e questa funzione lo offre in `srcset`.
 *
 * Due cose la rendono sicura:
 *
 *  - **controlla che il file ci sia** prima di dichiararlo. Uno `srcset` che
 *    punta a un file assente non degrada: il browser scarica un 404 e mostra un
 *    buco. Il controllo costa una `statSync` in fase di build e niente a runtime;
 *  - **lascia `src` all'originale**, così la lightbox continua ad aprire la foto
 *    grande e chi ha uno schermo largo la riceve comunque.
 */
import { existsSync } from 'node:fs';

const LARGHEZZA = 640;

/** Il percorso della variante, o null se non è stata generata. */
export function variante(src: string): string | null {
  if (!src.startsWith('/wp-content/')) return null;
  const piccola = src.replace(/\.(jpe?g|png|webp)$/i, `-${LARGHEZZA}.jpg`);
  if (piccola === src) return null;
  return existsSync('public' + piccola) ? piccola : null;
}

/**
 * La foto per uno sfondo CSS, dove `srcset` non arriva: `background-image` non
 * ha varianti, quindi si sceglie il file giusto in partenza. Le card della home
 * sono larghe circa 330px, e 640 le copre anche su schermi a doppia densità.
 *
 * Torna l'originale quando la variante non c'è, così una foto nuova funziona
 * comunque — solo più pesante, finché non si rilancia lo script.
 */
export function urlPiccola(src: string): string {
  return variante(src) ?? src;
}

/**
 * Gli attributi da mettere su un `<img>` che vive in una casella piccola.
 * `sizes` dichiara quanto spazio occupa davvero, altrimenti il browser assume
 * tutta la larghezza della finestra e sceglie sempre l'originale.
 */
export function fotoPiccola(src: string, sizes = '(max-width: 760px) 76vw, 340px') {
  const piccola = variante(src);
  if (!piccola) return {};
  return { srcset: `${piccola} ${LARGHEZZA}w, ${src} 2560w`, sizes };
}
