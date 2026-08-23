/**
 * `/pagine-adulti.json` — gli slug delle pagine di attività per adulti, e
 * nient'altro.
 *
 * Serve al banner di richiamo per chi ha visitato un'attività senza lasciare
 * un contatto (`src/scripts/prova_suggerita.ts`) e al workflow n8n
 * `athlon-suggerisci-prova`, che deve riconoscere se una riga di
 * `visite_pagina` è una pagina-attività adulti o no. La lista non si scrive
 * a mano in n8n: si legge da qui, che a sua volta la legge da
 * `PAGINE_ADULTI` (`data/pagine.ts`) — la stessa fonte che già governa i
 * rimandi fra pagine del sito. Un corso nuovo aggiunto a `data/corsi.ts`
 * compare qui da solo, al prossimo deploy.
 *
 * Nessun testo, nessun prezzo: solo slug e nome, come una mappa.
 *
 * **Un oggetto con dentro l'elenco, non un array nudo.** Il nodo HTTP Request
 * di n8n spezza una risposta che è un array al livello più alto in tanti
 * item quanti sono gli elementi — utile quando servono righe, un guaio
 * quando serve la lista intera per un confronto. Avvolgerla in `{ pagine:
 * [...] }` la fa arrivare come un item solo, sempre.
 */
import type { APIRoute } from 'astro';
import { PAGINE_ADULTI } from '../data/pagine';

export const GET: APIRoute = async () => {
  const body = { pagine: PAGINE_ADULTI.map((p) => ({ slug: p.slug, nome: p.nome })) };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      /* Un'ora, come `/kb.json`: cambia solo a ogni deploy. */
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
