/**
 * Il totem del club, riconosciuto una volta sola.
 *
 * Le tre condizioni sono quelle di `global.css` e di `/diagnostica-schermo`, e
 * vanno tenute identiche: `min-width` esclude un telefono, `min-height` una
 * finestra bassa da scrivania, `max-aspect-ratio` fa passare un pannello 9:16
 * e lascia fuori un tablet 3:4. Il perché di ogni misura — e perché il rapporto
 * è 7/10 e non la forma vera del pannello — sta in AGENTS.md.
 *
 * **Non si riconosce dal puntatore.** Windows presenta il pannello touch come
 * una macchina col mouse — `pointer: fine`, `hover: hover` — quindi
 * `pointer: coarse` non scatta mai lì.
 *
 * Questo file esiste perché la stessa domanda la fanno in due: `emailNota.ts`,
 * che sul totem non precompila l'email — è un dispositivo condiviso, e
 * ricordarla vorrebbe dire mostrare quella dell'ultimo visitatore al prossimo —
 * e `attribuzione.ts`, che sul totem forza la sorgente della campagna. Due
 * copie della stessa media query erano due occasioni di divergere il giorno che
 * una misura cambia.
 */
export const TOTEM = '(min-width: 900px) and (min-height: 1200px) and (max-aspect-ratio: 7/10)';

export function suTotem(): boolean {
  try {
    return window.matchMedia(TOTEM).matches;
  } catch {
    return false;
  }
}
