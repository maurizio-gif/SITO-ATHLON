// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La meccanica di «invita un amico». Il perché sta in
// `components/ReferralModal.astro`; qui ci sono i punti che dal codice non si
// leggono.
//
// **Due verifiche, un endpoint.** `athlon-verifica-iscritto` risponde alla
// stessa domanda dai due lati: chi invita deve essere socio, chi è invitato non
// deve esserlo. La regola la scrive `eSocio()` in `data/contatto.ts`, e sta là
// perché una regola come questa scritta in due posti a un certo punto risponde
// in due modi.
//
// **Chi passa quando la verifica non risponde.** Tutti e due. Un invito in più
// da riconciliare costa meno di un invito perso per un timeout, e il workflow
// rifà il controllo prima di scrivere. È la stessa scelta del form di prova e
// di «contattaci».
//
// **Sei secondi di attesa** come le altre verifiche del sito, dieci per l'invio:
// la verifica sta davanti a un pulsante e chi aspetta abbandona, l'invio è la
// cosa che la persona è venuta a fare e la aspetta.
import { WEBHOOK_VERIFICA, eSocio } from '../data/contatto';
import { WEBHOOK_REFERRAL, CANALI } from '../data/referral';

(function () {
  var modal = document.getElementById('referral-modal');
  if (!modal) return;

  var ATTESA_VERIFICA = 6000;
  var ATTESA_INVIO = 10000;

  var passi = {
    email: modal.querySelector('#rfr-step-email'),
    nonSocio: modal.querySelector('#rfr-step-non-socio'),
    amico: modal.querySelector('#rfr-step-amico'),
    amicoSocio: modal.querySelector('#rfr-step-amico-socio'),
    fatto: modal.querySelector('#rfr-step-fatto'),
  };

  var campi = {
    email: modal.querySelector('#rfr-email'),
    nome: modal.querySelector('#rfr-nome'),
    cognome: modal.querySelector('#rfr-cognome'),
    cellulare: modal.querySelector('#rfr-cellulare'),
    amicoEmail: modal.querySelector('#rfr-amico-email'),
    consenso: modal.querySelector('[data-rfr-consenso]'),
  };

  var btnVerifica = modal.querySelector('[data-rfr-verifica]');
  var btnInvia = modal.querySelector('[data-rfr-invia]');
  var spinnerVerifica = modal.querySelector('[data-rfr-spinner]');
  var spinnerInvio = modal.querySelector('[data-rfr-spinner-invio]');
  var saluto = modal.querySelector('[data-rfr-saluto]');
  var nomeAmico = modal.querySelector('[data-rfr-nome-amico]');
  var esitoTesto = modal.querySelector('[data-rfr-esito]');

  /** Chi invita, dopo la verifica: serve al payload e al saluto. */
  var invitante = { email: '', nome: '', cognome: '', memberId: null };
  /** Chi ha aperto il pannello, per rimettergli il fuoco alla chiusura. */
  var chiamante = null;

  function q(sel) {
    return modal.querySelector(sel);
  }

  function erroreDi(nome) {
    /* Ogni passo ha il suo `[data-rfr-errore]`, e sono due: prendere il primo
       del pannello scriverebbe l'errore del passo dell'amico dentro quello
       dell'email, cioè in una sezione nascosta. È lo stesso inciampo che il
       form dei contatti ha già avuto con `querySelector`. */
    return passi[nome] ? passi[nome].querySelector('[data-rfr-errore]') : null;
  }

  function sbaglia(passo, testo, campo) {
    var e = erroreDi(passo);
    if (e) {
      e.textContent = testo;
      e.hidden = false;
    }
    if (campo) {
      campo.classList.add('segnalato');
      campo.focus();
    }
  }

  function pulisciErrore(passo) {
    var e = erroreDi(passo);
    if (e) e.hidden = true;
    Object.keys(campi).forEach(function (k) {
      if (campi[k] && campi[k].classList) campi[k].classList.remove('segnalato');
    });
  }

  function mostra(nome) {
    Object.keys(passi).forEach(function (k) {
      if (passi[k]) passi[k].hidden = k !== nome;
    });
    var titolo = passi[nome] && passi[nome].querySelector('[data-rfr-fuoco]');
    if (titolo) titolo.focus();
  }

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  }

  /**
   * Il cellulare in forma internazionale.
   *
   * Il flusso su n8n incollava `+39` davanti a quello che la persona aveva
   * scritto, e su un numero già scritto `+39 320…` usciva `+39+39320…` — un
   * numero a cui WhatsApp non arriva. Qui si toglie tutto quello che non è una
   * cifra, si tolgono il prefisso e lo zero internazionale se ci sono, e si
   * rimette `+39` una volta sola.
   *
   * Vuoto è ammesso: il cellulare non è obbligatorio, e senza di lui l'invito
   * parte solo per email.
   */
  function cellulareNormale(v) {
    var cifre = String(v || '').replace(/[^\d+]/g, '');
    if (!cifre) return '';
    cifre = cifre.replace(/^\+/, '').replace(/^00/, '');
    if (cifre.indexOf('39') === 0 && cifre.length > 10) cifre = cifre.slice(2);
    if (cifre.length < 8) return null;
    return '+39' + cifre;
  }

  /** La verifica su PerfectGym, con il suo tempo massimo. Null = non lo sappiamo. */
  async function verifica(email, attesa) {
    try {
      var taglia = new AbortController();
      var orologio = setTimeout(function () {
        taglia.abort();
      }, attesa);
      var r = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          pagina: location.pathname,
          origine: 'referral',
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      return await r.json();
    } catch (e) {
      return null;
    }
  }

  function attendi(btn, spinner, sospeso) {
    if (btn) btn.disabled = sospeso;
    if (spinner) spinner.hidden = !sospeso;
  }

  // ── Passo 1: chi invita ───────────────────────────────────────────────────
  async function controllaInvitante() {
    if (!campi.email) return;
    var email = campi.email.value.trim().toLowerCase();
    if (!emailValida(email)) {
      return sbaglia('email', 'Controlla l’indirizzo: sembra incompleto.', campi.email);
    }
    pulisciErrore('email');
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(email);

    attendi(btnVerifica, spinnerVerifica, true);
    var esito = await verifica(email, ATTESA_VERIFICA);
    attendi(btnVerifica, spinnerVerifica, false);

    invitante.email = email;
    invitante.nome = (esito && esito.nome) || '';
    invitante.cognome = (esito && esito.cognome) || '';
    invitante.memberId = (esito && esito.memberId) || null;

    /* Se la verifica ha risposto e dice che non è socio, si ferma. Se non ha
       risposto — `esito` è null — si passa: il workflow rifà il controllo. */
    if (esito && !eSocio({ memberType: esito.memberType, stato: esito.stato })) {
      return mostra('nonSocio');
    }

    if (saluto) {
      saluto.textContent = invitante.nome
        ? 'Ciao ' + invitante.nome + ', chi vuoi invitare?'
        : 'Chi vuoi invitare';
    }
    mostra('amico');
    if (campi.nome) campi.nome.focus();
  }

  // ── Passo 2: l'amico ──────────────────────────────────────────────────────
  async function mandaInvito() {
    var nome = campi.nome ? campi.nome.value.trim() : '';
    var cognome = campi.cognome ? campi.cognome.value.trim() : '';
    var email = campi.amicoEmail ? campi.amicoEmail.value.trim().toLowerCase() : '';
    var cellulare = cellulareNormale(campi.cellulare ? campi.cellulare.value : '');

    if (!nome) return sbaglia('amico', 'Manca il nome del tuo amico.', campi.nome);
    if (!cognome) return sbaglia('amico', 'Manca il cognome.', campi.cognome);
    if (!emailValida(email)) {
      return sbaglia('amico', 'Serve la sua email: è lì che arriva il pass.', campi.amicoEmail);
    }
    if (cellulare === null) {
      return sbaglia('amico', 'Il cellulare sembra incompleto. Puoi anche lasciarlo vuoto.', campi.cellulare);
    }
    if (email === invitante.email) {
      return sbaglia('amico', 'Questa è la tua email: serve quella della persona che vuoi invitare.', campi.amicoEmail);
    }
    if (campi.consenso && !campi.consenso.checked) {
      return sbaglia('amico', 'Serve la conferma di aver informato la persona che stai segnalando.');
    }
    pulisciErrore('amico');

    attendi(btnInvia, spinnerInvio, true);

    /* La verifica dell'amico **prima** dell'invio, e non dopo: nel flusso
       vecchio si compilava, si mandava, e la pagina dopo diceva no. Così invece
       nessuna riga viene scritta su Airtable per un invito che non parte. */
    var suo = await verifica(email, ATTESA_VERIFICA);
    if (suo && eSocio({ memberType: suo.memberType, stato: suo.stato })) {
      attendi(btnInvia, spinnerInvio, false);
      if (nomeAmico) nomeAmico.textContent = nome;
      return mostra('amicoSocio');
    }

    var risposta = null;
    try {
      var taglia = new AbortController();
      var orologio = setTimeout(function () {
        taglia.abort();
      }, ATTESA_INVIO);
      var r = await fetch(WEBHOOK_REFERRAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitante: {
            email: invitante.email,
            nome: invitante.nome,
            cognome: invitante.cognome,
            memberId: invitante.memberId,
          },
          amico: {
            nome: nome,
            cognome: cognome,
            email: email,
            cellulare: cellulare,
            /* Quello che la verifica sa di lui: `nuovo` o `esiste`. Il workflow
               lo scrive su Airtable nella colonna «Nuovo?», che è la stessa
               informazione che il flusso vecchio ricavava da una chiamata sua. */
            stato: suo ? suo.stato : 'non-verificato',
          },
          consenso: true,
          pagina: location.pathname,
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      risposta = await r.json();
    } catch (e) {
      risposta = null;
    }
    attendi(btnInvia, spinnerInvio, false);

    if (!risposta || risposta.esito !== 'inviato') {
      return sbaglia(
        'amico',
        'Non è riuscito a partire. Riprova fra poco: se insiste, scrivici e lo mandiamo noi.'
      );
    }

    if (esitoTesto) {
      /* I canali si nominano tutti e due, e con l'indirizzo: chi invita vuole
         sapere che è partito davvero, e «gli abbiamo scritto» senza dire dove
         non è una conferma. Quando il cellulare manca si nomina solo la mail,
         invece di promettere un WhatsApp che non parte. */
      esitoTesto.textContent = cellulare
        ? 'Il pass è in viaggio verso ' + nome + ': per ' + CANALI[0] + ' su ' + email +
          ' e via ' + CANALI[1] + ' al ' + cellulare + '.'
        : 'Il pass è in viaggio verso ' + nome + ', per ' + CANALI[0] + ' su ' + email + '.';
    }
    mostra('fatto');
  }

  // ── Apertura, chiusura, e il ritorno a capo ───────────────────────────────
  function pulisci() {
    /* Come nel form dei contatti, e per la stessa ragione: sul totem in sede il
       pannello si riapre davanti alla persona dopo, e i dati di un amico
       segnalato da qualcun altro non devono restare nei campi. */
    [campi.nome, campi.cognome, campi.cellulare, campi.amicoEmail].forEach(function (c) {
      if (c) c.value = '';
    });
    if (campi.consenso) campi.consenso.checked = false;
    if (nomeAmico) nomeAmico.textContent = '';
    if (esitoTesto) esitoTesto.textContent = '';
    invitante = { email: '', nome: '', cognome: '', memberId: null };
    pulisciErrore('email');
    pulisciErrore('amico');
    attendi(btnVerifica, spinnerVerifica, false);
    attendi(btnInvia, spinnerInvio, false);
  }

  function apri(comando) {
    chiamante = comando || null;
    pulisci();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('amodal-locked');
    /* Lo stile è appena cambiato: senza questa lettura la visibilità calcolata è
       ancora `hidden` e il `focus()` di `mostra` non attaccherebbe. */
    void modal.offsetWidth;
    mostra('email');
    if (campi.email && !campi.email.value) campi.email.focus();
  }

  function chiudi() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('amodal-locked');
    if (chiamante && chiamante.focus) chiamante.focus();
  }

  /* Delega sul documento, come gli altri pannelli: i comandi possono stare in
     qualsiasi pagina e non vanno riagganciati uno per uno. */
  document.addEventListener('click', function (e) {
    var cta = e.target && e.target.closest ? e.target.closest('[data-cta="referral"]') : null;
    if (!cta) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    apri(cta);
  });

  if (btnVerifica) btnVerifica.addEventListener('click', controllaInvitante);
  if (btnInvia) btnInvia.addEventListener('click', mandaInvito);

  /* Invio da tastiera nei campi: chi compila un form si aspetta che funzioni, e
     su un telefono il tasto della tastiera è l'unico modo di avanzare senza
     chiudere il pannello con lo scorrimento. */
  if (campi.email) {
    campi.email.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        controllaInvitante();
      }
    });
  }
  [campi.nome, campi.cognome, campi.cellulare, campi.amicoEmail].forEach(function (c) {
    if (!c) return;
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        mandaInvito();
      }
    });
  });

  var ripeti = modal.querySelector('[data-rfr-ripeti]');
  if (ripeti) {
    ripeti.addEventListener('click', function () {
      /* Il campo deve anche smettere di essere precompilabile: `emailNota` riempie
         sul fuoco tutti i campi vuoti che portano `data-email-nota`, quindi
         svuotare e mettere il fuoco rimetterebbe dentro la stessa email.
         L'attributo è l'adesione, e qui si ritira. */
      if (campi.email) {
        campi.email.removeAttribute('data-email-nota');
        campi.email.value = '';
      }
      pulisciErrore('email');
      mostra('email');
      if (campi.email) campi.email.focus();
    });
  }

  var altroAmico = modal.querySelector('[data-rfr-altro-amico]');
  if (altroAmico) {
    altroAmico.addEventListener('click', function () {
      mostra('amico');
      if (campi.nome) campi.nome.focus();
    });
  }

  /* «Invita un altro amico» torna al passo dei dati e non a quello dell'email:
     chi invita è già stato verificato e chiedergli di nuovo la sua email
     sarebbe una domanda a cui ha già risposto. */
  var altro = modal.querySelector('[data-rfr-altro]');
  if (altro) {
    altro.addEventListener('click', function () {
      [campi.nome, campi.cognome, campi.cellulare, campi.amicoEmail].forEach(function (c) {
        if (c) c.value = '';
      });
      if (campi.consenso) campi.consenso.checked = false;
      pulisciErrore('amico');
      mostra('amico');
      if (campi.nome) campi.nome.focus();
    });
  }

  modal.querySelectorAll('[data-rfr-close]').forEach(function (x) {
    x.addEventListener('click', chiudi);
  });

  /* Il passaggio al modulo contatti: quello lo apre `ContattaciModal`, che
     ascolta `data-cta="talk"` sul documento. Qui si chiude solo questo pannello,
     altrimenti i due resterebbero impilati. */
  modal.querySelectorAll('[data-cta="talk"]').forEach(function (x) {
    x.addEventListener('click', function () {
      chiudi();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) chiudi();
  });

  /* La pagina `/referral` apre il pannello da sola: è tutta lì. Anche
     `#referral` in coda a qualsiasi indirizzo, per i link da fuori — una
     newsletter, un QR in sede. */
  function apriDaIndirizzo() {
    if (location.pathname.replace(/\/$/, '') === '/referral' || location.hash === '#referral') {
      apri(null);
    }
  }
  apriDaIndirizzo();
  window.addEventListener('hashchange', apriDaIndirizzo);

  window.athlonApriReferral = function () {
    apri(null);
  };
})();
