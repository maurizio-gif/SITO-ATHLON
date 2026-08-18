/**
 * FAQ delle pagine attività, collegate all'Help Desk.
 *
 * Chi legge queste pagine non è ancora iscritto: la domanda è "mi trovo bene
 * qui?", non "cosa succede se salto una lezione". Le risposte quindi sono
 * brevi, trasparenti sull'essenziale e scritte per rassicurare — mentre la
 * procedura, con termini e conseguenze, resta nella scheda dell'Help Desk, che
 * è scritta per chi è già dentro.
 *
 * Il collegamento è quello che tiene insieme le due cose: ogni voce dichiara la
 * scheda di riferimento e la risposta chiude con il suo link. Il titolo del
 * link viene letto dalla scheda, quindi rinominarla aggiorna tutte le pagine
 * che la citano, e un id sbagliato fa fallire la build invece di pubblicare un
 * link rotto.
 *
 * Il testo della KB non viene copiato di proposito: era il modo più rapido per
 * riempire la sezione, ed era anche il modo più rapido per spaventare qualcuno
 * che sta ancora decidendo.
 */
import { getCollection } from 'astro:content';

export interface FaqEntry {
  q: string;
  /** Può contenere HTML in linea: link e grassetto. */
  a: string;
}

export interface VoceFaq extends FaqEntry {
  /** Id della scheda dell'Help Desk, es. 'generali/prenotazioni'. */
  scheda?: string;
  /** Testo del rimando, quando "Tutti i dettagli" non è la frase giusta. */
  rimando?: string;
}

export async function faqConSchede(voci: VoceFaq[]): Promise<FaqEntry[]> {
  const schede = await getCollection('articles', ({ data }) => !data.draft);
  const perId = new Map(schede.map((a) => [a.id, a.data.title]));

  return voci.map(({ q, a, scheda, rimando }) => {
    if (!scheda) return { q, a };

    const titolo = perId.get(scheda);
    if (!titolo) throw new Error(`faqConSchede: la scheda "${scheda}" non esiste`);

    const invito = rimando ?? 'Tutti i dettagli';
    return {
      q,
      a: `${a} <a href="/wikiathlon/${scheda}/">${invito} nella scheda “${titolo}” →</a>`,
    };
  });
}
