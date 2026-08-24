/**
 * Il widget di CookieYes non deve mai vincere su un modal aperto.
 *
 * `global.css` già nasconde `#cookieyes` e `[class^="cky-"]` quando
 * `body.amodal-locked` — ma quella regola indovina i nomi che CookieYes usa,
 * e lo script del fornitore non è verificabile da qui: il suo CDN è fuori
 * dalla policy di rete di questo ambiente (vedi AGENTS.md). Se CookieYes
 * cambia i nomi delle classi, o se il pallino per riaprire le preferenze —
 * quello che resta sempre in vista, non solo il banner iniziale — vive fuori
 * da quella struttura, il CSS smette di funzionare senza dare nessun segnale.
 *
 * Questo script è la rete sotto: osserva `<body>`, trova da sé qualunque
 * nodo che CookieYes ci ha appena messo (basta un `id` o una `class` che
 * contiene «cky», senza bisogno di indovinare la forma esatta), e lo nasconde
 * da JavaScript con lo stile inline e `!important` — vince quindi anche su
 * un CSS scritto dal fornitore stesso, non solo su una nostra regola.
 *
 * A modal chiuso il nodo torna com'era: non è nascosto per sempre, solo
 * mentre c'è un pannello sopra.
 */
function sembraCookieYes(el: Element): boolean {
  const id = (el.id || '').toLowerCase();
  const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
  /* Il contenitore che il fornitore mette in `<body>` porta l'id
     `cookieyes` (lo stesso dello script in Layout.astro) — una stringa che
     non contiene «cky»: il primo controllo va scritto a parte, o il
     contenitore vero passa inosservato mentre lo script continua a sembrare
     giusto. Le classi dentro sono invece tutte `cky-*`. */
  return id.indexOf('cookieyes') !== -1 || id.indexOf('cky') !== -1 || cls.indexOf('cky') !== -1;
}

const nodi = new Set<HTMLElement>();

function sincronizza() {
  const dietro = document.body.classList.contains('amodal-locked');
  nodi.forEach((nodo) => {
    if (!nodo.isConnected) {
      nodi.delete(nodo);
      return;
    }
    if (dietro) {
      nodo.style.setProperty('opacity', '0', 'important');
      nodo.style.setProperty('visibility', 'hidden', 'important');
      nodo.style.setProperty('pointer-events', 'none', 'important');
    } else {
      nodo.style.removeProperty('opacity');
      nodo.style.removeProperty('visibility');
      nodo.style.removeProperty('pointer-events');
    }
  });
}

function osserva(el: HTMLElement) {
  if (nodi.has(el)) return;
  nodi.add(el);
  sincronizza();
}

/* CookieYes può aggiungere più di un nodo (il banner, l'icona per le
   preferenze) in momenti diversi: si guardano tutti i figli diretti di
   `<body>` che arrivano da qui in avanti, non solo il primo. */
new MutationObserver((mutazioni) => {
  for (const m of mutazioni) {
    m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      const el = n as HTMLElement;
      if (sembraCookieYes(el)) osserva(el);
    });
  }
}).observe(document.body, { childList: true });

/* E si riguardano a ogni apertura/chiusura di un modal, qualunque esso sia:
   nessuno dei modal del sito deve sapere che questo script esiste. */
new MutationObserver(sincronizza).observe(document.body, {
  attributes: true,
  attributeFilter: ['class'],
});

// Se il nodo era già lì quando questo modulo è arrivato (raro: carica dopo
// il primo paint, ma non impossibile su una rete lenta).
Array.from(document.body.children).forEach((el) => {
  if (sembraCookieYes(el)) osserva(el as HTMLElement);
});
