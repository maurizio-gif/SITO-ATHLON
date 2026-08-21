/**
 * Il controllo dell'email davanti ai pulsanti d'iscrizione.
 *
 * Perché esiste sta in `components/IscrizioneModal.astro`. Qui c'è la
 * meccanica, e tre punti meritano una riga.
 *
 * **La destinazione arriva dal pulsante, non da qui.** Ogni «Iscriviti» porta
 * il suo `href` con il `PaymentPlanId` del piano scelto: il modal lo mette da
 * parte e, se la persona può registrarsi, ce la manda. Così aggiungere un piano
 * resta una riga in `data/abbonamenti.ts` e questo file non lo sa nemmeno.
 *
 * **Chi passa, passa sempre.** Lead, sconosciuto, verifica in errore o in
 * timeout: si va su PerfectGym. L'unico caso che si ferma è l'account che
 * esiste davvero.
 *
 * **Il timeout è nostro e non del browser.** `fetch` senza limite può restare
 * appeso quanto vuole, e una persona davanti a un pulsante d'acquisto che non
 * risponde chiude la pagina. Sei secondi e si passa.
 */
import { WEBHOOK_VERIFICA, WEBHOOK_RESET, PORTALE, haGiaAccount } from '../data/contatto';

(function () {
  var modal = document.getElementById('iscrizione-modal');
  if (!modal) return;

  var ATTESA = 6000;

  var passi = {
    email: modal.querySelector('#is-step-email'),
    portale: modal.querySelector('#is-step-portale'),
  };
  var campo = modal.querySelector('#is-email');
  var btn = modal.querySelector('[data-is-verifica]');
  var spinner = modal.querySelector('[data-is-spinner]');
  var errore = modal.querySelector('[data-is-errore]');
  var occhiello = modal.querySelector('[data-is-piano]');

  /** Dove andrebbe il pulsante che ha aperto il modal. */
  var destinazione = '';
  /** Chi l'ha aperto, per rimettergli il fuoco alla chiusura. */
  var chiamante = null;

  function mostra(nome) {
    Object.keys(passi).forEach(function (k) {
      if (passi[k]) passi[k].hidden = k !== nome;
    });
    var titolo = passi[nome] && passi[nome].querySelector('[data-is-fuoco]');
    if (titolo) titolo.focus();
  }

  function apri(link) {
    destinazione = link.getAttribute('href') || '';
    chiamante = link;
    if (occhiello) {
      var piano = link.getAttribute('data-iscrizione');
      occhiello.textContent = piano ? 'Iscrizione · ' + piano : 'Iscrizione';
    }
    if (errore) errore.hidden = true;
    if (campo) campo.classList.remove('segnalato');
    /* Il passo del portale si riapre come nuovo. Senza questo, chi ha chiesto
       il reset, chiuso il pannello e ripreso da un altro pulsante ritroverebbe
       «controlla la tua email» con dentro l'indirizzo — che sul totem in sede è
       l'indirizzo della persona prima. */
    resetPulito();
    mostra('email');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('amodal-locked');
    /* Lo stile è appena cambiato: senza questa lettura la visibilità calcolata
       è ancora `hidden` e il `focus()` di `mostra` non attaccherebbe. */
    void modal.offsetWidth;
    mostra('email');
    if (campo && !campo.value) campo.focus();
  }

  function chiudi() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('amodal-locked');
    if (chiamante) chiamante.focus();
  }

  function attendi(sospeso) {
    if (btn) btn.disabled = sospeso;
    if (spinner) spinner.hidden = !sospeso;
  }

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  }

  function vai() {
    if (destinazione) window.location.href = destinazione;
    else chiudi();
  }

  async function verifica() {
    if (!campo) return;
    if (!emailValida(campo.value)) {
      if (errore) {
        errore.textContent = 'Controlla l’indirizzo: sembra incompleto.';
        errore.hidden = false;
      }
      campo.classList.add('segnalato');
      campo.focus();
      return;
    }
    if (errore) errore.hidden = true;
    campo.classList.remove('segnalato');

    var email = campo.value.trim().toLowerCase();
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(email);

    attendi(true);
    var esito = null;
    try {
      var taglia = new AbortController();
      var orologio = setTimeout(function () {
        taglia.abort();
      }, ATTESA);
      var r = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          pagina: location.pathname,
          origine: 'iscrizione',
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      esito = await r.json();
    } catch (e) {
      /* Irraggiungibile, lento o risposta illeggibile: si passa. La verifica
         vera la rifà PerfectGym nella registrazione, che è dove la persona sta
         andando. */
      esito = null;
    }
    attendi(false);

    if (esito && haGiaAccount({ memberType: esito.memberType, stato: esito.stato })) {
      mostra('portale');
      return;
    }
    vai();
  }

  /* Delega sul documento: i pulsanti sono dentro una griglia costruita in
     pagina, e uno per uno andrebbero riagganciati a ogni ritocco del markup. */
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('[data-iscrizione]') : null;
    if (!link) return;
    /* Un click con un modificatore vuol dire «apri in un'altra scheda», e chi
       lo fa sa cosa vuole: non gli si mette davanti un pannello. */
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    apri(link);
  });

  if (btn) btn.addEventListener('click', verifica);
  if (campo) {
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifica();
      }
    });
  }

  modal.querySelectorAll('[data-is-close]').forEach(function (x) {
    x.addEventListener('click', chiudi);
  });

  /* ── Il reset della password, senza uscire da qui ────────────────────────
     Il pulsante chiede a n8n di far partire la mail di PerfectGym, e la
     persona resta nel pannello. Tre scelte che non si leggono dal codice:

     **L'email è quella verificata, non quella nel campo.** Si legge da
     `campo.value` al momento del click, ed è la stessa che ha prodotto la
     risposta «hai già un account»: prenderne un'altra manderebbe il reset a un
     indirizzo che non abbiamo controllato.

     **L'attesa è più lunga della verifica** — dieci secondi contro sei. La
     verifica sta davanti a un pulsante d'acquisto, dove chi aspetta abbandona,
     e per questo si arrende presto e lascia passare. Qui la persona ha appena
     chiesto una cosa sola e la aspetta: arrendersi a sei secondi le mostrerebbe
     un errore per una mail che poi arriva.

     **In caso di errore non si scrive niente: si apre il portale.** È la cosa
     che la persona voleva, e un avviso l'avrebbe fatta leggere e poi cliccare
     per arrivare nello stesso posto — due passi in più su una cosa già andata
     storta. */
  var risposta = { fatto: null, riga: null, email: null };
  var btnReset = modal.querySelector('[data-is-reset]');
  var spinnerReset = modal.querySelector('[data-is-reset-spinner]');
  risposta.riga = modal.querySelector('[data-is-reset-riga]');
  risposta.fatto = modal.querySelector('[data-is-reset-fatto]');
  risposta.email = modal.querySelector('[data-is-reset-email]');

  /** Rimette la riga del pulsante e nasconde i due esiti. */
  function resetPulito() {
    if (risposta.riga) risposta.riga.hidden = false;
    if (risposta.fatto) risposta.fatto.hidden = true;
    /* Anche l'indirizzo, e non solo il blocco che lo mostra: nascosto non è
       cancellato, e su un pannello in sede il testo di chi è passato prima resta
       nel documento fino al ricaricamento della pagina. */
    if (risposta.email) risposta.email.textContent = '';
    if (btnReset) btnReset.disabled = false;
    if (spinnerReset) spinnerReset.hidden = true;
  }

  async function chiediReset() {
    if (!btnReset) return;
    var email = campo ? campo.value.trim().toLowerCase() : '';
    if (!emailValida(email)) return;

    btnReset.disabled = true;
    if (spinnerReset) spinnerReset.hidden = false;

    var esito = null;
    try {
      var taglia = new AbortController();
      var orologio = setTimeout(function () {
        taglia.abort();
      }, 10000);
      var r = await fetch(WEBHOOK_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          pagina: location.pathname,
          origine: 'iscrizione-reset',
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      esito = await r.json();
    } catch (e) {
      esito = null;
    }

    if (spinnerReset) spinnerReset.hidden = true;

    if (esito && esito.esito === 'inviata') {
      if (risposta.email) risposta.email.textContent = email;
      if (risposta.riga) risposta.riga.hidden = true;
      if (risposta.fatto) risposta.fatto.hidden = false;
      return;
    }

    /* Qualunque altra cosa — `errore`, `email_non_valida`, risposta illeggibile,
       timeout, rete giù — è la stessa cosa per chi guarda: la mail non è
       partita. E allora si va dove la persona voleva andare, cioè sulla pagina
       del portale che chiede il reset.

       Prima la scheda nuova, e se il browser la blocca la stessa. Il blocco è
       probabile e non ipotetico: siamo dopo un `await`, quindi fuori dal gesto
       dell'utente, ed è esattamente il caso che i browser fermano. Aprire una
       scheda vuota al click per riempirla dopo — il trucco che si usa per
       aggirarlo — costerebbe una scheda vuota **a ogni click**, anche ai nove
       su dieci che vanno a buon fine.

       Il pulsante torna premibile prima di andare: se la scheda si apre, questo
       pannello resta dietro intatto invece di mostrare uno spinner fermo a
       chi ci ritorna. */
    if (btnReset) btnReset.disabled = false;
    var scheda = null;
    try {
      scheda = window.open(PORTALE.reset, '_blank', 'noopener');
    } catch (e) {
      scheda = null;
    }
    if (!scheda) window.location.href = PORTALE.reset;
  }

  if (btnReset) btnReset.addEventListener('click', chiediReset);

  /* Torna al campo svuotandolo: chi arriva qui l'ha fatto con un'email che il
     browser ricordava e che non è la sua, quindi ripresentargliela sarebbe
     ripresentargli lo stesso vicolo.
     Il campo deve anche **smettere di essere precompilabile**, e per questo si
     toglie `data-email-nota`: `scripts/emailNota.ts` riempie sul fuoco tutti i
     campi vuoti che lo portano, quindi svuotare e mettere il fuoco rimetterebbe
     dentro la stessa email. L'attributo è l'adesione, e qui si ritira. */
  var ripeti = modal.querySelector('[data-is-ripeti]');
  if (ripeti) {
    ripeti.addEventListener('click', function () {
      if (campo) {
        campo.removeAttribute('data-email-nota');
        campo.value = '';
      }
      /* Si sta cambiando indirizzo: un esito del reset riferito a quello di
         prima, se si torna qui, parlerebbe di una mail mandata a un altro. */
      resetPulito();
      mostra('email');
      if (campo) campo.focus();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) chiudi();
  });
})();
