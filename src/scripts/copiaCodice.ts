/**
 * «Copia il codice», una volta sola.
 *
 * Il codice promozionale si copia in quattro posti — il modal della prova, la
 * chat, `/attiva` e `/promo` — e i primi due lo fanno dentro i loro bundle,
 * dove il markup lo costruisce lo script. Le due **pagine** invece avevano la
 * stessa funzione scritta due volte, e la seconda copia è nata copiando la
 * prima: quello è il momento in cui una si sistema e l'altra no.
 *
 * L'aggancio resta `data-copy-code`, che è già la convenzione del sito, quindi
 * un blocco nuovo non chiede altro che l'attributo.
 *
 * Due dettagli che sono la ragione per cui la funzione esiste e non è una
 * riga:
 *
 *  - **il testo di partenza si legge e si rimette**, perché il pulsante non
 *    dice solo il codice ma anche «· copia»: ricostruirlo a mano
 *    significherebbe scriverlo in due posti;
 *  - **`writeText` può essere negata** — pagina non sicura, permesso rifiutato
 *    — e allora il pulsante lo dice invece di sembrare rotto. Il codice resta
 *    a schermo, quindi si copia a mano: il verso giusto in cui sbagliare.
 */

/** Quanto resta a schermo la conferma, prima che il pulsante torni com'era. */
const DURATA = 2000;

export function montaCopiaCodice(radice: ParentNode = document): void {
  radice.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach((btn) => {
    const codice = btn.dataset.copyCode || '';
    const originale = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codice);
        btn.textContent = `${codice} · copiato ✓`;
        btn.classList.add('copied');
      } catch {
        btn.textContent = `${codice} · copia a mano`;
      }
      window.setTimeout(() => {
        btn.textContent = originale;
        btn.classList.remove('copied');
      }, DURATA);
    });
  });
}
