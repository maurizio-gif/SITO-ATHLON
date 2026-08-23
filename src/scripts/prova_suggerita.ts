/**
 * Il banner che ricorda a chi ha visto un'attività, e non ha lasciato un
 * contatto, che il Guest Pass esiste.
 *
 * Non un modal: un banner discreto, in basso a sinistra — l'angolo opposto a
 * `ChatFab`, così i due non si sovrappongono mai senza dover conoscere
 * l'altezza esatta dell'uno per posizionare l'altro. Appare da solo tre
 * secondi dopo il caricamento, ma non blocca niente: si può ignorare e
 * continuare a leggere la pagina. Il pulsante rimanda a `/prova`, la pagina
 * che già racconta il Guest Pass — nessun modal da aprire, nessuna logica di
 * `data-cta="trial"` da riusare qui.
 *
 * ## Chi lo vede
 *
 * Solo chi ha già visitato, **almeno 24 ore fa**, la pagina di un'attività
 * per adulti (mai home, junior, wiki, eventi, news, planning — la whitelist
 * è `/pagine-adulti.json`, generata da `PAGINE_ADULTI`) e **non è già un
 * contatto conosciuto** (non ha mai lasciato un dato in nessun form/chat del
 * sito). La decisione la prende il server (webhook `athlon-suggerisci-
 * prova`): qui si decide solo *quando* chiederglielo.
 *
 * ## Il consenso
 *
 * Riconoscere lo stesso `vid` da una visita all'altra è profilazione
 * commerciale: vale la categoria `advertisement`, la stessa di `vid` in
 * `attribuzione.ts`. Senza quel consenso il vid non è stabile e la domanda
 * al server non avrebbe senso comunque — quindi si esce subito, prima di
 * incapsulare qualunque cosa in `quandoConsentito`.
 *
 * ## Il totem
 *
 * Sul pannello del club è un dispositivo condiviso: mostrare a chi arriva
 * dopo le attività viste da chi è passato prima sarebbe la stessa fuga di
 * dati che `emailNota.ts` evita non precompilando l'email lì. Si esclude
 * con `suTotem()`, la stessa condizione.
 */
import { quandoConsentito } from './consenso';
import { suTotem } from './totem';
import { GUEST_PASS } from '../data/abbonamenti';

const URL_SUGGERISCI = 'https://automazione.n8ndevelop.it/webhook/athlon-suggerisci-prova';

const KEY_STATO = 'athlon_prova_suggerita';
/* Non richiamare il webhook più spesso di così: evita una query per ogni
   pagina della stessa visita, a chi il sito non ha niente da proporre. */
const ORE_TRA_TENTATIVI = 12;
/* Chi ha chiuso il banner con la X non lo rivede per una settimana, anche se
   torna a guardare la stessa attività: insistere è il modo di trasformare un
   suggerimento in fastidio. */
const GIORNI_DOPO_SCARTO = 7;
const ATTESA_MS = 3000;

interface Attivita {
  slug: string;
  titolo: string;
}

interface Finestra {
  athlonGetVid?: () => string;
  athlonVidStabile?: () => boolean;
}

interface Stato {
  ultimoTentativo?: number;
  ultimoScarto?: number;
}

function leggiStato(): Stato {
  try {
    return JSON.parse(localStorage.getItem(KEY_STATO) || '{}');
  } catch {
    return {};
  }
}

function scriviStato(patch: Partial<Stato>): void {
  try {
    localStorage.setItem(KEY_STATO, JSON.stringify({ ...leggiStato(), ...patch }));
  } catch {
    /* Storage negato: niente da fare, si ritenterà alla prossima visita. */
  }
}

function puoTentare(stato: Stato): boolean {
  const oreFa = (t: number) => (Date.now() - t) / 3_600_000;
  if (stato.ultimoTentativo && oreFa(stato.ultimoTentativo) < ORE_TRA_TENTATIVI) return false;
  if (stato.ultimoScarto && oreFa(stato.ultimoScarto) < GIORNI_DOPO_SCARTO * 24) return false;
  return true;
}

/** "Calisthenics", "Calisthenics e Pilates", "Calisthenics, Pilates e Yoga". */
function elencoNomi(voci: Attivita[]): string {
  const nomi = voci.map((v) => v.titolo);
  if (nomi.length === 1) return nomi[0];
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;
}

function mostraBanner(voci: Attivita[]): void {
  const giorni = GUEST_PASS.giorni;
  const box = document.createElement('div');
  box.className = 'prova-sugg';
  box.setAttribute('role', 'status');
  box.innerHTML = `
    <button type="button" class="prova-sugg__chiudi" aria-label="Chiudi">×</button>
    <p class="prova-sugg__testo">
      Hai visto <strong class="u-display">${elencoNomi(voci)}</strong>?
      Provalo${voci.length > 1 ? 'li' : ''} gratis per ${giorni} giorni.
    </p>
    <a class="prova-sugg__btn" href="/prova?source=banner-ritorno">Attiva la prova</a>
  `;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('prova-sugg--visibile'));

  function chiudi() {
    scriviStato({ ultimoScarto: Date.now() });
    box.remove();
    document.removeEventListener('keydown', suEscape);
  }
  function suEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') chiudi();
  }
  box.querySelector('.prova-sugg__chiudi')?.addEventListener('click', chiudi);
  document.addEventListener('keydown', suEscape);
}

/* Il tempo si conta da quando lo script parte, non da quando la chiamata al
   webhook torna: «appare dopo 3 secondi» è il momento in cui compare, non il
   momento in cui si comincia a chiederlo al server. La chiamata parte subito
   — la latenza di rete si consuma dentro quei 3 secondi, non dopo. */
const partenza = Date.now();

function traTreSecondi(azione: () => void): void {
  const restano = ATTESA_MS - (Date.now() - partenza);
  setTimeout(azione, Math.max(0, restano));
}

function avvia(): void {
  if (suTotem()) return;

  const w = window as unknown as Finestra;
  if (!w.athlonVidStabile || !w.athlonVidStabile()) return;

  quandoConsentito('advertisement', () => {
    const stato = leggiStato();
    if (!puoTentare(stato)) return;

    scriviStato({ ultimoTentativo: Date.now() });
    const vid = w.athlonGetVid ? w.athlonGetVid() : null;
    if (!vid) return;

    fetch(URL_SUGGERISCI, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ vid }),
    })
      .then((r) => r.json())
      .then((dati: { attivita?: Attivita[] }) => {
        const voci = (dati?.attivita ?? []).slice(0, 3);
        if (voci.length) traTreSecondi(() => mostraBanner(voci));
      })
      .catch(() => {
        /* Un suggerimento mancato non deve mai rompere la pagina che lo genera. */
      });
  });
}

avvia();

export {};
