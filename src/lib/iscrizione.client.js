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
import { WEBHOOK_VERIFICA, haGiaAccount } from '../data/contatto';

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
      mostra('email');
      if (campo) campo.focus();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) chiudi();
  });
})();
