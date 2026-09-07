/**
 * La meccanica del gate degli abbonamenti.
 *
 * Perché esiste sta in `components/InfoAbbonamentiModal.astro`. Qui ci sono
 * quattro scelte che dal codice non si leggono.
 *
 * **La destinazione la porta il pulsante.** Ogni comando ha il suo `href` —
 * oggi tutti `/abbonamenti/`, domani magari un'ancora — e il pannello ce la
 * manda alla fine. Così questo file non sa dove sta il listino.
 *
 * **Chi passa, passa sempre.** Verifica in errore, in timeout, webhook giù: si
 * va al listino lo stesso. È la regola di tutti i form del sito, e qui vale il
 * doppio: questo pannello sta davanti alla pagina che vende.
 *
 * **La richiesta parte con `keepalive`.** Subito dopo si naviga, e senza quello
 * la `fetch` morirebbe con la pagina — cioè proprio il contatto che il gate
 * esiste per raccogliere. È la stessa scelta del voto alla chat.
 *
 * **L'esito resta nella sessione**, e da lì lo legge il pulsante «Iscriviti»
 * del listino: chi ha appena verificato l'indirizzo non se lo vede richiedere
 * due schermate dopo.
 */
import { WEBHOOK_VERIFICA, anagraficaNota, servonoISuoiDati } from '../data/contatto';
import { validaTelefono, PREFISSO_PREDEFINITO } from '../data/prefissi';
import { WEBHOOK_INFO, LISTINO, ricorda } from '../data/infoAbbonamenti';
import { leggi as emailConosciuta } from '../scripts/emailNota';

(function () {
  var modal = document.getElementById('info-abbonamenti-modal');
  if (!modal) return;

  var ATTESA = 6000;

  var passi = {
    email: modal.querySelector('[data-ia-passo="email"]'),
    dati: modal.querySelector('[data-ia-passo="dati"]'),
  };
  var campoEmail = modal.querySelector('#ia-email');
  var campoNome = modal.querySelector('#ia-nome');
  var campoCognome = modal.querySelector('#ia-cognome');
  var campoCell = modal.querySelector('#ia-cell');
  var selPrefisso = modal.querySelector('#ia-cell-prefisso');
  var btnVerifica = modal.querySelector('[data-ia-verifica]');
  var btnInvia = modal.querySelector('[data-ia-invia]');
  var spinner = modal.querySelector('[data-ia-spinner]');
  var spinnerDati = modal.querySelector('[data-ia-spinner-dati]');
  var errore = modal.querySelector('[data-ia-errore]');
  var erroreDati = modal.querySelector('[data-ia-errore-dati]');
  var occhiello = modal.querySelector('[data-ia-occhiello]');

  var destinazione = LISTINO;
  var chiamante = null;
  /** Quello che la verifica ha detto di questa email. */
  var esitoVerifica = null;
  /** L'attività e la pagina da cui si è partiti, lette dal comando premuto. */
  var contesto = { attivita: [], pagina: '', origine: '', cta: '' };

  function mostra(nome) {
    Object.keys(passi).forEach(function (k) {
      if (passi[k]) passi[k].hidden = k !== nome;
    });
    var fuoco = passi[nome] && passi[nome].querySelector('[data-ia-fuoco]');
    if (fuoco) fuoco.focus();
  }

  function attendi(sospeso, quale) {
    var b = quale === 'dati' ? btnInvia : btnVerifica;
    var s = quale === 'dati' ? spinnerDati : spinner;
    if (b) b.disabled = sospeso;
    if (s) s.hidden = !sospeso;
  }

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  }

  function apri(comando) {
    destinazione = comando.getAttribute('href') || LISTINO;
    chiamante = comando;
    esitoVerifica = null;
    contesto = {
      attivita: (comando.getAttribute('data-cta-activity') || '')
        .split(',')
        .map(function (x) {
          return x.trim();
        })
        .filter(Boolean),
      pagina: location.pathname + location.search,
      origine: comando.getAttribute('data-cta-source') || '',
      cta: (comando.textContent || '').trim().slice(0, 80),
    };

    if (errore) errore.hidden = true;
    if (erroreDati) erroreDati.hidden = true;
    if (campoEmail) campoEmail.classList.remove('segnalato');
    if (occhiello) occhiello.textContent = 'Abbonamenti';

    mostra('email');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('amodal-locked');
    /* Lo stile è appena cambiato: senza questa lettura la visibilità calcolata
       è ancora quella di prima e il `focus()` di `mostra` non attaccherebbe. */
    void modal.offsetWidth;
    mostra('email');

    /* Un'email che il browser ricorda non si fa ridigitare: si verifica e
       basta. Chi l'ha già data una volta ha già fatto la sua parte, e il gate
       diventa invisibile — che è il modo giusto di trattarlo la seconda volta. */
    var nota = emailConosciuta();
    if (nota && campoEmail) {
      campoEmail.value = nota;
      verifica();
      return;
    }
    if (campoEmail && !campoEmail.value) campoEmail.focus();
  }

  function chiudi() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('amodal-locked');
    if (chiamante) chiamante.focus();
  }

  function vai() {
    window.location.href = destinazione;
  }

  /** Il payload verso n8n, con quello che si sa in questo momento. */
  function componiPayload(telefono) {
    var e = esitoVerifica || {};
    return {
      email: (campoEmail && campoEmail.value.trim().toLowerCase()) || '',
      nome: (campoNome && campoNome.value.trim()) || e.nome || '',
      cognome: (campoCognome && campoCognome.value.trim()) || e.cognome || '',
      cellulare: telefono || e.telefono || '',
      stato: e.stato || '',
      statoNucleo: e.statoNucleo || '',
      memberType: e.memberType || '',
      memberId: e.memberId ? String(e.memberId) : '',
      attivita: contesto.attivita,
      pagina: contesto.pagina,
      origine: contesto.origine,
      cta: contesto.cta,
      vid: window.athlonGetVid ? window.athlonGetVid() : null,
      sid: window.athlonGetSid ? window.athlonGetSid() : null,
      utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
    };
  }

  /**
   * Manda la richiesta e va al listino.
   *
   * L'ordine è quello: prima si spara la `fetch`, poi si naviga senza
   * aspettarla. `keepalive` la tiene viva oltre la pagina, e un errore di rete
   * non deve trattenere nessuno davanti a un pannello.
   */
  function inviaEVai(telefono) {
    var payload = componiPayload(telefono);
    if (payload.email) {
      ricorda({
        email: payload.email,
        memberType: payload.memberType,
        stato: payload.stato,
        statoNucleo: payload.statoNucleo,
        memberId: payload.memberId,
        nome: payload.nome,
        cognome: payload.cognome,
        telefono: payload.cellulare,
      });
      try {
        fetch(WEBHOOK_INFO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }
    vai();
  }

  async function verifica() {
    if (!campoEmail) return;
    if (!emailValida(campoEmail.value)) {
      if (errore) {
        errore.textContent = 'Controlla l’indirizzo: sembra incompleto.';
        errore.hidden = false;
      }
      campoEmail.classList.add('segnalato');
      campoEmail.focus();
      return;
    }
    if (errore) errore.hidden = true;
    campoEmail.classList.remove('segnalato');

    var email = campoEmail.value.trim().toLowerCase();
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(email);

    attendi(true, 'email');
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
          pagina: contesto.pagina,
          origine: 'info-abbonamenti',
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      esito = await r.json();
    } catch (e) {
      esito = null;
    }
    attendi(false, 'email');
    esitoVerifica = esito;

    /* Nessuna risposta: non sappiamo se quell'anagrafica esista, quindi non si
       chiede niente e non si crea nessun lead. La riga parte lo stesso, e su
       Supabase si qualifica da sé come `sconosciuta`. */
    if (!esito) {
      inviaEVai('');
      return;
    }

    var serve = servonoISuoiDati({
      nota: anagraficaNota(esito),
      id: esito.memberId,
      nome: esito.nome,
      cognome: esito.cognome,
      telefono: esito.telefono,
    });

    if (!serve) {
      inviaEVai(esito.telefono || '');
      return;
    }

    /* Quello che il portale ci ha dato si mette nei campi invece di sparire:
       un dato che arriva da un gestionale va potuto guardare prima di
       confermarlo, ed è la stessa scelta del totem. */
    if (campoNome && esito.nome) campoNome.value = esito.nome;
    if (campoCognome && esito.cognome) campoCognome.value = esito.cognome;
    if (campoCell && esito.telefono) campoCell.value = esito.telefono;
    mostra('dati');
  }

  function invia() {
    var mancano = [];
    if (campoNome && !campoNome.value.trim()) mancano.push(campoNome);
    if (campoCognome && !campoCognome.value.trim()) mancano.push(campoCognome);

    if (mancano.length) {
      if (erroreDati) {
        erroreDati.textContent = 'Ci servono nome e cognome per proseguire.';
        erroreDati.hidden = false;
      }
      mancano.forEach(function (c) {
        c.classList.add('segnalato');
      });
      mancano[0].focus();
      return;
    }
    if (campoNome) campoNome.classList.remove('segnalato');
    if (campoCognome) campoCognome.classList.remove('segnalato');

    /* Mai `input.value` da solo: quello è il numero come l'ha scritto la
       persona, non il numero. La composizione col prefisso della tendina la fa
       `validaTelefono`, che è anche quella che decide se è plausibile. */
    var prefisso = (selPrefisso && selPrefisso.value) || PREFISSO_PREDEFINITO;
    var scritto = (campoCell && campoCell.value) || '';
    var tel = validaTelefono(prefisso, scritto);
    if (!tel.ok) {
      if (erroreDati) {
        erroreDati.textContent = tel.motivo || 'Controlla il numero di cellulare.';
        erroreDati.hidden = false;
      }
      if (campoCell) {
        campoCell.classList.add('segnalato');
        campoCell.focus();
      }
      return;
    }
    if (campoCell) campoCell.classList.remove('segnalato');
    if (erroreDati) erroreDati.hidden = true;

    attendi(true, 'dati');
    inviaEVai(tel.e164);
  }

  /* Delega sul documento: i comandi verso il listino stanno in una ventina di
     pagine e dentro griglie costruite in pagina, e uno per uno andrebbero
     riagganciati a ogni ritocco del markup. */
  document.addEventListener('click', function (e) {
    var comando =
      e.target && e.target.closest
        ? e.target.closest('[data-cta="buy"][data-cta-intent="membership"]')
        : null;
    if (!comando) return;

    /* Un click con un modificatore vuol dire «apri in un'altra scheda», e chi
       lo fa sa cosa vuole: non gli si mette davanti un pannello. Il listino è
       pubblico, quindi lasciarlo passare non toglie niente a nessuno. */
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    /* Gia' sul listino: il gate non ha niente da fare. La pastiglia
       dell'header e la voce del footer stanno anche su `/abbonamenti`, e li'
       aprire il pannello vorrebbe dire chiedere l'email per portare la persona
       dov'e' gia'. Il comando torna a essere un link, che al massimo ricarica
       la pagina. */
    var meta = (comando.getAttribute('href') || '').split('#')[0].split('?')[0];
    var qui = location.pathname;
    if (meta.replace(/\/+$/, '') === qui.replace(/\/+$/, '')) return;

    e.preventDefault();
    apri(comando);
  });

  if (btnVerifica) btnVerifica.addEventListener('click', verifica);
  if (btnInvia) btnInvia.addEventListener('click', invia);
  if (campoEmail) {
    campoEmail.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        verifica();
      }
    });
  }

  modal.querySelectorAll('[data-ia-close]').forEach(function (x) {
    x.addEventListener('click', chiudi);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) chiudi();
  });
})();
