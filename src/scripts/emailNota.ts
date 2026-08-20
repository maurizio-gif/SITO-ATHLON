/**
 * L'email che il visitatore ci ha già dato, ricordata nel suo browser.
 *
 * Il form della prova si compila una volta: è lì che l'email entra. Tutti gli
 * altri — l'assistente, «contattaci», il ticket dell'Help Desk — si possono
 * compilare più volte, e ognuno riparte chiedendo l'email. Il passo resta,
 * perché è la porta del controllo su PerfectGym: da lì il sito sa se hai già
 * un'anagrafica e salta tutto il resto. Quello che si toglie è la **digitazione**.
 *
 * ## Tre scelte che meritano una riga
 *
 * **Nel browser e non sul server.** Sarebbe stato possibile chiedere a n8n «di
 * chi è il `vid` X?» e riavere nome, email e telefono. Non si fa: sarebbe una
 * consultazione di dati personali senza autenticazione, con chiave scelta dal
 * client — chi legge o indovina un `vid` tira fuori la scheda. Qui il dato non
 * esce e non rientra: resta sul dispositivo che l'aveva già digitato.
 *
 * **Categoria `functional`, non `advertisement`.** Ricordare un campo che hai
 * compilato per non richiedertelo è comodità, non profilazione, e la differenza
 * è concreta: i funzionali li accetta molta più gente della pubblicità. Il
 * `vid` resta sotto advertisement, perché quello serve a riattaccare una
 * richiesta a una persona.
 *
 * **Niente precompilazione sul totem.** Il club ha un dispositivo condiviso
 * vero: il pannello in ingresso. Lì ricordare l'email vorrebbe dire mostrare
 * quella dell'ultimo visitatore al prossimo, che è una fuga di dati con
 * l'aspetto di una gentilezza. Si riconosce dalla forma dello schermo, con le
 * stesse tre condizioni che usa tutto il resto del sito.
 *
 * ## Come si usa
 *
 * Il campo che vuole la precompilazione porta `data-email-nota`. Chi conferma
 * un'email — cioè chi la manda alla verifica e non prende un errore — chiama
 * `window.athlonRicordaEmail(email)`.
 */
import { quandoConsentito } from './consenso';

const CHIAVE = 'athlon_email';

/* Le tre condizioni del totem, identiche a quelle di `global.css` e di
   `/diagnostica-schermo`. Se cambiano là vanno cambiate qui: è il prezzo di
   avere una regola che vive in CSS e serve anche al JavaScript. */
const TOTEM = '(min-width: 900px) and (min-height: 1200px) and (max-aspect-ratio: 7/10)';

function suTotem(): boolean {
  try {
    return window.matchMedia(TOTEM).matches;
  } catch {
    return false;
  }
}

function leggi(): string {
  if (suTotem()) return '';
  try {
    return localStorage.getItem(CHIAVE) || '';
  } catch {
    return '';
  }
}

function ricorda(email: string): void {
  const pulita = String(email || '').trim().toLowerCase();
  /* Una validazione minima e non una completa: qui non si accetta o rifiuta un
     indirizzo — quello l'ha già fatto il form — si evita solo di memorizzare
     una stringa che non è un'email. */
  if (!pulita || pulita.indexOf('@') < 1) return;
  if (suTotem()) return;
  quandoConsentito('functional', () => {
    try {
      localStorage.setItem(CHIAVE, pulita);
    } catch {
      /* storage negato: il campo resterà da compilare, e va bene */
    }
  });
}

/** Riempie i campi marcati che sono vuoti. Non tocca quelli già compilati. */
function precompila(dove: ParentNode = document): void {
  const email = leggi();
  if (!email) return;
  dove.querySelectorAll<HTMLInputElement>('input[data-email-nota]').forEach((campo) => {
    if (!campo.value) campo.value = email;
  });
}

const w = window as unknown as {
  athlonRicordaEmail: (email: string) => void;
  athlonEmailNota: () => string;
};
w.athlonRicordaEmail = ricorda;
w.athlonEmailNota = leggi;

precompila();

/* I pannelli si chiudono svuotando i campi, e alla riapertura sarebbero vuoti:
   una precompilazione al caricamento coprirebbe solo la prima volta. Riempire
   quando il campo riceve il fuoco copre ogni apertura senza che i quattro form
   debbano sapere che questo file esiste. */
document.addEventListener(
  'focusin',
  (e) => {
    const campo = e.target as HTMLInputElement | null;
    if (campo?.matches?.('input[data-email-nota]') && !campo.value) precompila(campo.parentElement ?? document);
  },
  true
);
