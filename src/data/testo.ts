/**
 * Da markdown a testo leggibile, per chi il markup non lo rende.
 *
 * Due consumatori, una implementazione: il box dell'Help Desk, che dalle schede
 * ricava la risposta breve da mostrare, e `/kb.json`, che serve le stesse schede
 * per intero all'assistente. Finché le due copie erano separate bastava
 * correggere un caso limite in una sola per farle divergere — e i casi limite
 * qui sotto sono tutti veri, trovati sul testo del club.
 *
 * **Gli indirizzi email vengono via da tutto quello che passa di qui.** È la
 * scelta dell'Help Desk, non un effetto collaterale: la sezione non ne mostra
 * nessuno e manda al modulo di assistenza, che è tracciabile e finisce in coda
 * al desk. Un assistente che pesca il testo da qui eredita la stessa regola
 * dalla fonte, invece di doversela ricordare a ogni risposta.
 */

/* La parte a destra della chiocciola è scritta etichetta per etichetta invece
   che come [\w.]+, o il gruppo si mangerebbe anche il punto che chiude la
   frase: è così che «a desk@athlonroma.it. Non accettiamo» diventava
   «a Non accettiamo». */
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

/**
 * Toglie gli indirizzi, e con loro la frase che li introduceva: cancellare il
 * solo indirizzo lascia in piedi un moncone — «Invia a · Solo formato
 * digitale», «invia un'email a dall'indirizzo registrato».
 */
export function stripEmails(s: string): string {
  let out = s.replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi, '$1');

  /* La striscia dei fatti è un elenco di clausole separate da `·`: se una
     nominava una casella, se ne va tutta la clausola, perché toglierne il solo
     indirizzo lascerebbe «Invia a · Solo formato digitale».

     **Riga per riga, non sul testo intero.** Prima questo taglio guardava tutto
     quello che gli arrivava come se fosse una striscia sola: passandogli una
     scheda intera — che di `·` ne ha uno nella striscia dei fatti e un indirizzo
     più in basso — spezzava il documento in tre e ne buttava via il pezzo
     centrale, cioè quasi tutto l'articolo. Finché a chiamarlo era solo
     l'anteprima dell'Help Desk, che gli dà una riga per volta, non si vedeva. */
  out = out
    .split('\n')
    .map((riga) =>
      riga.includes('·') && EMAIL.test(riga)
        ? riga
            .split('·')
            .filter((part) => !EMAIL.test(part))
            .join(' · ')
        : riga
    )
    .join('\n');

  return (
    out
      .replace(new RegExp('(?:\\b(?:ad?|all’|all\')\\s+)?' + EMAIL.source, 'gi'), '')
      // Rimettere in ordine quello che la rimozione lascia indietro: una
      // preposizione appesa, un separatore doppio, uno spazio prima del punto.
      .replace(/\s+\ba\b\s*(?=[.,;:]|$)/gi, '')
      .replace(/·\s*·/g, '·')
      .replace(/\s+([.,;:])/g, '$1')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
  );
}

/** Un blocco di markdown ridotto a una riga sola di testo piano. */
export const toPlain = (s: string) =>
  stripEmails(s)
    // Link markdown → il suo testo; grassetti e corsivi via.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/<[^>]+>/g, '')
    // Il pittogramma in testa alla striscia dei fatti: il resto del sito non ne ha.
    .replace(/^[\p{Extended_Pictographic}️\s]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Taglia a fine frase invece che a metà parola. */
export function clamp(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

/**
 * Una scheda intera in testo piano, con i capoversi ancora separati.
 *
 * `toPlain` schiaccia tutto su una riga, che è quello che serve a un'anteprima
 * e il contrario di quello che serve a chi deve leggere la scheda per intero:
 * senza gli a capo, un elenco di sette punti e il capoverso che lo introduce
 * diventano un unico muro in cui non si distingue più cosa è voce dell'elenco.
 *
 * I titoli restano come riga propria — sono l'indice di lettura del documento —
 * e i `<details>` non vengono buttati, a differenza di quanto fa l'anteprima
 * dell'Help Desk: lì dentro stanno le procedure passo per passo, cioè spesso
 * proprio la risposta.
 */
export function testoCompleto(md: string): string {
  return (
    stripEmails(md)
      // Le immagini non hanno niente da dire a chi legge solo il testo.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Link markdown → il suo testo.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Tag HTML via, il contenuto resta: `<div class="ci-hero">` racchiude i
      // fatti chiave della scheda, che sono la parte più densa che abbia.
      .replace(/<[^>]+>/g, ' ')
      // Cancelletti dei titoli e citazioni: la riga resta, il segno no.
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
      .replace(/^[ \t]*>[ \t]?/gm, '')
      .replace(/[*_`]+/g, '')
      // Spazi orizzontali compattati, gli a capo lasciati stare.
      .replace(/[^\S\n]+/g, ' ')
      // Tre o più righe vuote diventano una riga vuota sola.
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      .trim()
  );
}
