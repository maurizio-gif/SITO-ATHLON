/**
 * Il numero socio PerfectGym che il visitatore ci ha già dato, ricordato nel suo
 * browser — la stessa logica di `emailNota.ts`, applicata a un identificativo
 * diverso.
 *
 * `UserNumber` è il campo pubblico `number` di PerfectGym, quello con cui il
 * club interroga il gestionale con `$filter=number eq "…"`. Arriva appeso ai
 * link delle newsletter — `?UserNumber=101004716` — e permette a chi lo apre
 * di non rimettere la sua email in nessuno dei flussi che oggi chiedono
 * «email → verifica su PerfectGym → ramo»: l'assistente, «contattaci», il
 * referral.
 *
 * ## La sola vera differenza dall'email: da dove entra la prima volta
 *
 * L'email può arrivare digitata in un campo. UserNumber no — non esiste un
 * campo dove scriverlo, e non deve mai essercene uno: entra solo dall'URL, o
 * dalla risposta di una verifica già riuscita (il gestionale restituisce il
 * `number` insieme a `memberId` anche quando la ricerca è partita dall'email —
 * vedi `chatAssistente.client.js`). Una volta noto, da qualunque delle due
 * strade, **si ricorda esattamente come l'email**: stessa sessione, stesso
 * `localStorage` dietro consenso funzionale, stessa durata. La differenza è
 * solo all'ingresso, non nella memoria.
 *
 * ## Due memorie, e solo la seconda passa dal consenso
 *
 * Stessa struttura di `emailNota.ts`, stessa ragione (vedi il commento di testa
 * di quel file per il perché di ogni scelta — categoria `functional`, non
 * `advertisement`; niente sul totem; l'URL vince sempre). La differenza è che
 * qui **nessuna funzione scrive da sola in `localStorage`**: `leggi()` legge le
 * tre fonti ma non ne scrive nessuna oltre alla sessione, e `ricorda()` — la
 * sola a toccare `localStorage` — non è mai chiamata da questo file: la
 * chiamano i tre flussi, e solo dopo una verifica riuscita. Non c'è
 * `precompila()`: non c'è un campo da riempire.
 */
import { quandoConsentito } from './consenso';
import { suTotem } from './totem';

/** Il ricordo fra una visita e l'altra: `localStorage`, dietro il consenso. */
const CHIAVE = 'athlon_usernumber';
/** Il numero di questa visita: `sessionStorage`, come il `sid`, senza consenso. */
const CHIAVE_VISITA = 'athlon_usernumber_visita';

/** Il solo parametro nell'indirizzo di **questa** pagina. */
export function daUrl(): string {
  try {
    const params = new URLSearchParams(location.search);
    const v = (
      params.get('UserNumber') ||
      params.get('userNumber') ||
      params.get('usernumber') ||
      params.get('user_number') ||
      ''
    ).trim();
    return v;
  } catch {
    return '';
  }
}

/** Il numero già visto in questa visita, da un link o da una verifica riuscita. */
function diQuestaVisita(): string {
  /* Mai sul totem: la persona dopo non è la stessa, e la scheda del browser
     lì non si chiude fra un visitatore e il successivo. */
  if (suTotem()) return '';
  try {
    return sessionStorage.getItem(CHIAVE_VISITA) || '';
  } catch {
    return '';
  }
}

function segnaVisita(numero: string): void {
  if (suTotem()) return;
  try {
    sessionStorage.setItem(CHIAVE_VISITA, numero);
  } catch {
    /* storage negato: il numero vale per questa pagina sola, e va bene */
  }
}

/**
 * Il numero socio che conosciamo, da qualunque fonte, in ordine di
 * specificità — identica a `emailNota.leggi()`.
 */
export function leggi(): string {
  /* L'indirizzo nel link vince su tutto e vale anche sul totem: non è il
     residuo di chi è passato prima, è l'informazione con cui quel link è
     stato costruito. Ed entra nella memoria di visita, così sopravvive al
     primo clic su un link interno. */
  const url = daUrl();
  if (url) {
    segnaVisita(url);
    return url;
  }
  const visita = diQuestaVisita();
  if (visita) return visita;
  if (suTotem()) return '';
  try {
    return localStorage.getItem(CHIAVE) || '';
  } catch {
    return '';
  }
}

/**
 * Chiamata dai tre flussi dopo una verifica riuscita — mai dalla sola lettura
 * dell'URL, e mai da un campo digitato, perché non esiste. È il gemello di
 * `window.athlonRicordaEmail`.
 */
function ricorda(numero: string): void {
  const pulito = String(numero || '').trim();
  if (!pulito) return;
  if (suTotem()) return;
  /* Subito e senza consenso: dentro la visita è lo stesso stato di servizio
     della sessione della chat. Vedi «Due memorie» in cima. */
  segnaVisita(pulito);
  /* E fra una visita e l'altra solo con i funzionali: quello è un ricordo, e
     un ricordo si chiede. */
  quandoConsentito('functional', () => {
    try {
      localStorage.setItem(CHIAVE, pulito);
    } catch {
      /* storage negato: il numero resterà da riconoscere ogni volta dal link */
    }
  });
}

const w = window as unknown as {
  athlonUserNumberDaUrl: () => string;
  athlonUserNumberConosciuto: () => string;
  athlonRicordaUserNumber: (numero: string) => void;
};
w.athlonUserNumberDaUrl = daUrl;
w.athlonUserNumberConosciuto = leggi;
w.athlonRicordaUserNumber = ricorda;
