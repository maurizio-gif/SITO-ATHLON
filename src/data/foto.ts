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
/** La larghezza per le foto a tutta pagina: copre un telefono a doppia densità. */
const LARGHEZZA_HERO = 1280;

/** Il percorso della variante, o null se non è stata generata. */
export function variante(src: string, larghezza = LARGHEZZA): string | null {
  if (!src.startsWith('/wp-content/')) return null;
  const piccola = src.replace(/\.(jpe?g|png|webp)$/i, `-${larghezza}.jpg`);
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

/**
 * Gli attributi per la foto di sfondo di una hero: occupa tutta la larghezza,
 * ed è l'elemento su cui si misura l'LCP di quasi ogni pagina interna.
 *
 * Il file originale è una foto da 2560px e mezzo megabyte: su una connessione
 * mobile lenta valeva più di due secondi di LCP da sola. Le due varianti la
 * coprono per come si vede davvero — 640 su un telefono a densità singola, 1280
 * su uno a doppia — e l'originale resta per gli schermi larghi.
 *
 * `fetchpriority="high"` la mette davanti al resto: è un `<img>` nell'HTML
 * iniziale, quindi il browser la trova subito, ma per difetto la considera meno
 * urgente del CSS e dei font.
 *
 * Una approssimazione dichiarata: l'originale è annunciato come `2560w` senza
 * misurarlo, che è la dimensione massima dei file di WordPress. Dove la foto è
 * più stretta — qualche `-1024x683` — il browser può sceglierla credendola più
 * grande di quello che è. Scarica lo stesso file di oggi, quindi al peggio non
 * si guadagna; non si perde.
 */
export function fotoHero(src: string) {
  const piccola = variante(src);
  const media = variante(src, LARGHEZZA_HERO);
  const fonti = [
    piccola && `${piccola} ${LARGHEZZA}w`,
    media && `${media} ${LARGHEZZA_HERO}w`,
    `${src} 2560w`,
  ].filter(Boolean);
  if (fonti.length === 1) return { fetchpriority: 'high' };
  return { srcset: fonti.join(', '), sizes: '100vw', fetchpriority: 'high' };
}
