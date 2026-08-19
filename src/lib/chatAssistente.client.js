// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// L'assistente dell'Help Desk: una conversazione con lo stato, non una ricerca.
//
// Il percorso ha una regola sola che lo governa — **chi sta scrivendo?** — e la
// si scopre dall'email prima di qualsiasi altra cosa, perché cambia tutto quello
// che viene dopo:
//
//   email → verifica ─┬─ il nucleo ha un abbonamento vivo  → assistenza
//                     │                                      (schede + regolamento)
//                     └─ no, o non lo conosciamo            → adulti o junior?
//                          ├─ adulti  → informazioni dal sito, obiettivo la prova
//                          └─ junior  → quale corso, poi i dati e la landing
//
// Tre cose che questo file fa **e che il modello non deve fare**:
//
//   - decidere in quale ramo si è. Lo dice PerfectGym, non una frase;
//   - raccogliere i dati. Al momento giusto compare un form, con i suoi campi e
//     la sua validazione: un'anagrafica su PerfectGym nata da un'estrazione dal
//     parlato è un'anagrafica che prima o poi è sbagliata;
//   - decidere quando scrivere su PerfectGym o aprire un ticket.
//
// Al modello resta il suo lavoro: rispondere alle domande con i contenuti del
// sito, dentro la fetta di conoscenza del ramo in cui siamo.

export function initChatAssistente(root, options) {
  var onChiudi = (options && options.onChiudi) || function () {};

  var VERIFICA = 'https://automazione.n8ndevelop.it/webhook/athlon-verifica-iscritto';
  var CHAT = 'https://automazione.n8ndevelop.it/webhook/chat-athlon';
  var TICKET = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-ticket';
  var DATI = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-dati';

  /** Dove finisce il percorso junior, comunque vada. */
  var LANDING_JUNIOR = '/wikiathlon/snb/preiscrizioni-nuoto/';

  /* Le quattro attività junior, con lo slug della loro pagina: sono le stesse
     che elenca lo Switch di CONTATTACI, e cambiano il ramo perché cambiano la
     conoscenza che l'assistente può usare. */
  var JUNIOR = [
    { id: 'baby-nuoto', label: 'Baby Nuoto', nota: 'dai 3 ai 36 mesi' },
    { id: 'scuola-nuoto-bambini', label: 'Scuola Nuoto Bambini', nota: 'dai 30 mesi ai 13 anni' },
    { id: 'pallanuoto', label: 'Pallanuoto', nota: '' },
    { id: 'nuoto-agonistico', label: 'Nuoto Agonistico', nota: '' },
  ];

  var ATTESA_MAX = 15000;

  // ── Stato ─────────────────────────────────────────────────────────────────
  function statoIniziale() {
    return {
      passo: 'email',
      email: '',
      /** L'esito della verifica su PerfectGym. */
      stato: '',
      statoNucleo: '',
      memberId: null,
      nome: '',
      cognome: '',
      telefono: '',
      /** iscritto | adulti | junior — è ciò che decide tono e conoscenza. */
      ramo: '',
      attivitaJunior: '',
      pagina: '/',
    };
  }
  var dati = statoIniziale();

  function sessione() {
    var CHIAVE = 'athlon:assistente:sessione';
    try {
      var salvata = sessionStorage.getItem(CHIAVE);
      if (salvata) return salvata;
      var nuova =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(16).slice(2);
      sessionStorage.setItem(CHIAVE, nuova);
      return nuova;
    } catch (e) {
      return String(Date.now());
    }
  }

  // ── Nodi ──────────────────────────────────────────────────────────────────
  var q = function (sel) {
    return root.querySelector(sel);
  };
  var passi = {
    email: q('[data-ca-step="email"]'),
    ambito: q('[data-ca-step="ambito"]'),
    junior: q('[data-ca-step="junior"]'),
    chat: q('[data-ca-step="chat"]'),
    dati: q('[data-ca-step="dati"]'),
    fatto: q('[data-ca-step="fatto"]'),
  };
  var campoEmail = q('[data-ca-email]');
  var btnEmail = q('[data-ca-email-invia]');
  var erroreEmail = q('[data-ca-email-errore]');
  var conversazione = q('[data-ca-conversazione]');
  var campoDomanda = q('[data-ca-domanda]');
  var btnDomanda = q('[data-ca-invia]');
  var intestazione = q('[data-ca-intestazione]');
  var elencoJunior = q('[data-ca-junior]');

  function mostra(nome) {
    dati.passo = nome;
    Object.keys(passi).forEach(function (k) {
      if (passi[k]) passi[k].hidden = k !== nome;
    });
    var fuoco = passi[nome] && passi[nome].querySelector('[data-ca-fuoco]');
    if (fuoco) {
      // La classe è appena cambiata: lo stile è sporco e `focus()` su un
      // elemento ancora invisibile non fa niente. Vedi CLAUDE.md.
      void fuoco.offsetWidth;
      fuoco.focus();
    }
  }

  var escape = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  // ── Passo 1: l'email ──────────────────────────────────────────────────────
  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }

  function attendi(btn, acceso) {
    if (!btn) return;
    btn.disabled = acceso;
    btn.classList.toggle('ca__btn--attesa', acceso);
  }

  async function verifica() {
    if (erroreEmail) erroreEmail.hidden = true;
    if (!emailValida(campoEmail.value)) {
      if (erroreEmail) {
        erroreEmail.textContent = 'Controlla l’indirizzo email: manca qualcosa.';
        erroreEmail.hidden = false;
      }
      campoEmail.focus();
      return;
    }

    dati.email = campoEmail.value.trim().toLowerCase();
    attendi(btnEmail, true);

    var esito = null;
    try {
      var stop = new AbortController();
      var scaduta = window.setTimeout(function () {
        stop.abort();
      }, ATTESA_MAX);
      var r = await fetch(VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: stop.signal,
        body: JSON.stringify({ email: dati.email, pagina: dati.pagina }),
      });
      window.clearTimeout(scaduta);
      esito = await r.json();
    } catch (e) {
      /* PerfectGym irraggiungibile: si prosegue come se non lo conoscessimo.
         Meglio una conversazione in più da smistare a mano che una persona
         lasciata davanti a un errore. */
      esito = null;
    }

    attendi(btnEmail, false);

    dati.stato = (esito && esito.stato) || 'errore';
    /* `statoNucleo` è la domanda della chat — «questo nucleo è di casa?» —
       mentre `stato` è quella del Guest Pass. Se rispondesse una versione più
       vecchia del workflow, il campo non c'è e si ricade su `stato`. */
    dati.statoNucleo = (esito && esito.statoNucleo) || dati.stato;
    dati.memberId = (esito && esito.memberId) || null;
    dati.nome = (esito && esito.nome) || '';
    dati.cognome = (esito && esito.cognome) || '';
    dati.telefono = (esito && esito.telefono) || '';

    if (dati.statoNucleo === 'iscritto') {
      dati.ramo = 'iscritto';
      apriConversazione();
    } else {
      mostra('ambito');
    }
  }

  // ── Passo 2: adulti o junior ──────────────────────────────────────────────
  function scegliAmbito(ambito) {
    if (ambito === 'junior') {
      dipingiJunior();
      mostra('junior');
      return;
    }
    dati.ramo = 'adulti';
    apriConversazione();
  }

  function dipingiJunior() {
    if (!elencoJunior) return;
    elencoJunior.innerHTML = JUNIOR.map(function (c) {
      return (
        '<button type="button" class="ca__scelta" data-ca-junior-scelta="' +
        escape(c.id) +
        '"><span class="ca__scelta-nome">' +
        escape(c.label) +
        '</span>' +
        (c.nota ? '<span class="ca__scelta-nota">' + escape(c.nota) + '</span>' : '') +
        '</button>'
      );
    }).join('');
  }

  // ── Passo 3: la conversazione ─────────────────────────────────────────────
  var APERTURE = {
    iscritto: function () {
      var chi = dati.nome ? ' ' + dati.nome : '';
      return (
        'Ciao' +
        escape(chi) +
        '. Sono l’assistente dell’Help Desk: rispondo su prenotazioni, ' +
        'certificato medico, sospensioni, disdette e tutto quello che c’è nelle schede e nel regolamento. ' +
        'Dimmi pure.'
      );
    },
    adulti: function () {
      return (
        'Ciao. Ti racconto io il club: attività, orari, abbonamenti e come funziona la prova. ' +
        'Cosa ti interessa sapere?'
      );
    },
    junior: function () {
      var corso = JUNIOR.filter(function (c) {
        return c.id === dati.attivitaJunior;
      })[0];
      return (
        'Ciao. Ti dico tutto su ' +
        escape(corso ? corso.label : 'i corsi per bambini') +
        ': età, come sono organizzati i turni, cosa serve. Chiedimi pure.'
      );
    },
  };

  function apriConversazione() {
    if (conversazione) conversazione.innerHTML = '';
    if (intestazione) {
      intestazione.textContent =
        dati.ramo === 'iscritto'
          ? 'Assistenza'
          : dati.ramo === 'junior'
            ? 'Corsi per bambini'
            : 'Informazioni';
    }
    var apertura = APERTURE[dati.ramo]();
    bolla('assistente', apertura, apertura.replace(/<[^>]+>/g, ''));
    mostra('chat');
  }

  /** Il trascritto, nell'ordine in cui è comparso: è ciò che finisce nel ticket. */
  var trascritto = [];

  function bolla(chi, html, testo) {
    if (!conversazione) return null;
    var div = document.createElement('div');
    div.className = chi === 'utente' ? 'ca__msg ca__msg--utente' : 'ca__msg ca__msg--bot';
    div.innerHTML = html;
    conversazione.appendChild(div);
    conversazione.scrollTop = conversazione.scrollHeight;
    /* Si tiene il testo, non l'HTML: al desk serve leggere la conversazione,
       non ricostruirne il markup. Le bolle di attesa non si registrano. */
    if (testo) trascritto.push({ ruolo: chi, testo: testo });
    return div;
  }

  // ── La via d'uscita: contattare il team ───────────────────────────────────
  /**
   * Il pulsante compare **sotto ogni risposta**, non solo quando l'assistente
   * non sa: «non mi hai convinto» è un giudizio della persona, non del modello,
   * e nasconderlo finché il modello ammette di non sapere vuol dire non
   * offrirlo proprio quando serve di più — cioè quando ha risposto con
   * sicurezza una cosa che non c'entra.
   */
  function scappatoia(senzaRisposta) {
    /* Nei rami commerciali il primo comando non è la lamentela ma il passo
       avanti: chi sta valutando vuole lasciare i dati, non aprire un reclamo.
       Il ticket resta, un gradino sotto. */
    var lasciaDati =
      dati.ramo !== 'iscritto'
        ? '<button type="button" class="ca__uscita-btn ca__uscita-btn--pieno" data-ca-dati>' +
          (dati.ramo === 'junior' ? 'Richiedi informazioni →' : 'Fatti richiamare →') +
          '</button>'
        : '';

    return (
      '<div class="ca__uscita">' +
      '<span class="ca__uscita-lead">' +
      (senzaRisposta ? 'Su questo serve una persona.' : 'Vuoi parlarne con noi?') +
      '</span>' +
      lasciaDati +
      '<button type="button" class="ca__uscita-btn" data-ca-ticket>Contatta il team →</button>' +
      '</div>'
    );
  }

  var ticketInviato = false;

  /** Il modulo che compare quando si chiede di essere contattati. */
  function apriTicket(dopo) {
    if (ticketInviato) return;
    /* Uno solo per volta: aprirne due sotto due risposte diverse porterebbe a
       due email con lo stesso trascritto. */
    var vecchio = root.querySelector('[data-ca-ticket-form]');
    if (vecchio) vecchio.remove();

    var box = document.createElement('div');
    box.className = 'ca__ticket';
    box.setAttribute('data-ca-ticket-form', '');
    box.innerHTML =
      '<p class="ca__ticket-lead">Mando al team questa conversazione. Vuoi aggiungere qualcosa?</p>' +
      '<textarea class="ca__ticket-testo" rows="3" data-ca-ticket-testo ' +
      'placeholder="Facoltativo — qualsiasi cosa possa servirci"></textarea>' +
      '<div class="ca__ticket-azioni">' +
      '<button type="button" class="ca__btn" data-ca-ticket-invia>Invia al team</button>' +
      '<button type="button" class="ca__link" data-ca-ticket-annulla>Annulla</button>' +
      '</div>';

    (dopo && dopo.parentNode ? dopo.parentNode : conversazione).insertBefore(
      box,
      dopo ? dopo.nextSibling : null
    );
    if (conversazione) conversazione.scrollTop = conversazione.scrollHeight;
    var campo = box.querySelector('[data-ca-ticket-testo]');
    if (campo) campo.focus();
  }

  async function inviaTicket(box) {
    var campo = box.querySelector('[data-ca-ticket-testo]');
    var btn = box.querySelector('[data-ca-ticket-invia]');
    var messaggio = (campo && campo.value || '').trim();

    attendi(btn, true);
    try {
      var r = await fetch(TICKET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dati.email,
          nome: dati.nome,
          cognome: dati.cognome,
          telefono: dati.telefono,
          memberId: dati.memberId,
          ramo: dati.ramo,
          attivitaJunior: dati.attivitaJunior,
          sessione: sessione(),
          pagina: dati.pagina,
          messaggio: messaggio,
          conversazione: trascritto,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      ticketInviato = true;
      box.innerHTML =
        '<p class="ca__ticket-fatto">Fatto: la tua richiesta è arrivata al nostro team, ' +
        'insieme a questa conversazione. Ti rispondono via email.</p>';
    } catch (e) {
      attendi(btn, false);
      var errore = box.querySelector('.ca__ticket-errore');
      if (!errore) {
        errore = document.createElement('p');
        errore.className = 'ca__ticket-errore';
        box.appendChild(errore);
      }
      errore.textContent = 'Non è partita. Riprova fra un momento.';
    }
  }

  var inCorso = false;

  async function chiedi() {
    var domanda = (campoDomanda && campoDomanda.value || '').trim();
    if (domanda.length < 3 || inCorso) return;

    inCorso = true;
    campoDomanda.value = '';
    if (btnDomanda) btnDomanda.disabled = true;
    bolla('utente', escape(domanda), domanda);
    var attesa = bolla('assistente', '<span class="ca__pensa"><span></span><span></span><span></span></span>');

    try {
      var stop = new AbortController();
      var scaduta = window.setTimeout(function () {
        stop.abort();
      }, ATTESA_MAX);
      var r = await fetch(CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: stop.signal,
        body: JSON.stringify({
          domanda: domanda,
          sessione: sessione(),
          pagina: dati.pagina,
          origine: 'assistente',
          ramo: dati.ramo,
          attivitaJunior: dati.attivitaJunior,
          email: dati.email,
          memberId: dati.memberId,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
        }),
      });
      window.clearTimeout(scaduta);
      if (!r.ok) throw new Error(String(r.status));
      var risposta = await r.json();
      if (!risposta || typeof risposta.risposta !== 'string' || !risposta.risposta.trim()) {
        throw new Error('risposta vuota');
      }

      /* Le fonti sotto la risposta, in scheda nuova: chi apre l'articolo non
         deve perdere la conversazione e i dati che ha già lasciato. */
      var fonti = (risposta.fonti || []).filter(function (f) {
        return f && f.url;
      });
      var rimandi = fonti.length
        ? '<p class="ca__fonti">' +
          fonti
            .map(function (f) {
              return (
                '<a href="' +
                escape(f.url) +
                '" target="_blank" rel="noopener">' +
                escape(f.titolo || 'Leggi l’articolo completo') +
                ' →</a>'
              );
            })
            .join('<span aria-hidden="true"> · </span>') +
          '</p>'
        : '';

      attesa.innerHTML = '<p>' + escape(risposta.risposta) + '</p>' + rimandi +
        scappatoia(!!risposta.senzaRisposta);
      trascritto.push({ ruolo: 'assistente', testo: risposta.risposta });
    } catch (e) {
      /* Nel modal non c'è la ricerca locale a cui ricadere — quella è rimasta
         nel box della pagina. Qui si dice come stanno le cose e si offre la
         via che funziona sempre: scrivere a una persona. */
      var scusa = 'Non riesco a risponderti in questo momento.';
      attesa.innerHTML = '<p>' + scusa + '</p>' + scappatoia(true);
      trascritto.push({ ruolo: 'assistente', testo: scusa });
    } finally {
      inCorso = false;
      if (btnDomanda) btnDomanda.disabled = (campoDomanda.value || '').trim().length < 3;
      if (conversazione) conversazione.scrollTop = conversazione.scrollHeight;
    }
  }


  // ── Passo 5: i dati ───────────────────────────────────────────────────────
  /* Il modello non tocca questi campi: li raccoglie il form, li valida il
     codice, e solo dopo si scrive su PerfectGym. */
  var campi = {};
  root.querySelectorAll('[data-ca-f]').forEach(function (el) {
    campi[el.dataset.caF] = el;
  });
  var bimbo = q('[data-ca-bimbo]');
  var erroreDati = q('[data-ca-dati-errore]');
  var btnDati = q('[data-ca-dati-invia]');
  var titoloDati = q('[data-ca-dati-titolo]');
  var leadDati = q('[data-ca-dati-lead]');
  var privacyDati = q('[data-ca-dati-privacy]');
  var leadFatto = q('[data-ca-fatto-lead]');
  var ctaFatto = q('[data-ca-fatto-cta]');

  /** Accetta 3201122333, +39 320 112 2333, 0039320…: resta il numero nudo. */
  function cellulareNudo(v) {
    var solo = String(v || '').replace(/[^\d+]/g, '');
    return solo.replace(/^\+39/, '').replace(/^0039/, '').replace(/\D/g, '');
  }

  function valore(nome) {
    return campi[nome] ? String(campi[nome].value || '').trim() : '';
  }

  function segnala(nome, messaggio) {
    if (erroreDati) {
      erroreDati.textContent = messaggio;
      erroreDati.hidden = false;
    }
    var el = campi[nome];
    if (el) {
      el.classList.add('ca__input--errore');
      el.focus();
    }
    return false;
  }

  function validaDati() {
    if (erroreDati) erroreDati.hidden = true;
    Object.keys(campi).forEach(function (k) {
      if (campi[k].classList) campi[k].classList.remove('ca__input--errore');
    });

    if (!valore('nome')) return segnala('nome', 'Serve il tuo nome.');
    if (!valore('cognome')) return segnala('cognome', 'Serve il tuo cognome.');
    if (!/^3\d{8,9}$/.test(cellulareNudo(valore('cellulare')))) {
      return segnala('cellulare', 'Serve un cellulare italiano, senza prefisso.');
    }
    if (!valore('nascita')) return segnala('nascita', 'Serve la tua data di nascita.');
    /* Una data nel futuro non è una data di nascita: è un refuso, e su
       PerfectGym diventerebbe un'anagrafica da correggere a mano. */
    if (valore('nascita') > new Date().toISOString().slice(0, 10)) {
      return segnala('nascita', 'La data di nascita non può essere nel futuro.');
    }

    if (dati.ramo !== 'junior') return true;

    if (!valore('bnome')) return segnala('bnome', 'Serve il nome del bambino.');
    if (!valore('bcognome')) return segnala('bcognome', 'Serve il cognome del bambino.');
    if (!valore('bnascita')) return segnala('bnascita', 'Serve la data di nascita del bambino.');
    if (valore('bnascita') > new Date().toISOString().slice(0, 10)) {
      return segnala('bnascita', 'La data di nascita non può essere nel futuro.');
    }
    if (campi.consenso && !campi.consenso.checked) {
      if (erroreDati) {
        erroreDati.textContent = 'Serve il consenso per trattare i dati di tuo figlio.';
        erroreDati.hidden = false;
      }
      campi.consenso.focus();
      return false;
    }
    return true;
  }

  function apriDati() {
    var junior = dati.ramo === 'junior';
    if (bimbo) bimbo.hidden = !junior;
    if (privacyDati) privacyDati.hidden = junior;
    if (titoloDati) titoloDati.textContent = junior ? 'I dati per l’iscrizione' : 'I tuoi dati';
    if (leadDati) {
      leadDati.textContent = junior
        ? 'Servono i tuoi e quelli del bambino: li usiamo per preparare l’iscrizione.'
        : 'Lasciaci come raggiungerti: ti richiamiamo noi.';
    }
    // Quello che sappiamo già non si richiede.
    if (campi.nome && !campi.nome.value) campi.nome.value = dati.nome || '';
    if (campi.cognome && !campi.cognome.value) campi.cognome.value = dati.cognome || '';
    if (campi.cellulare && !campi.cellulare.value) {
      campi.cellulare.value = cellulareNudo(dati.telefono) || '';
    }
    mostra('dati');
  }

  async function inviaDati() {
    if (!validaDati()) return;
    attendi(btnDati, true);

    var junior = dati.ramo === 'junior';
    try {
      var r = await fetch(DATI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ramo: dati.ramo,
          attivitaJunior: dati.attivitaJunior,
          email: dati.email,
          memberId: dati.memberId,
          statoPgm: dati.stato,
          statoNucleo: dati.statoNucleo,
          sessione: sessione(),
          pagina: dati.pagina,
          genitore: {
            nome: valore('nome'),
            cognome: valore('cognome'),
            cellulare: cellulareNudo(valore('cellulare')),
            nascita: valore('nascita'),
          },
          bambino: junior
            ? {
                nome: valore('bnome'),
                cognome: valore('bcognome'),
                nascita: valore('bnascita'),
              }
            : null,
          consenso: junior ? !!(campi.consenso && campi.consenso.checked) : true,
          conversazione: trascritto,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));

      /* Il ramo junior finisce sempre sulla stessa pagina, che esista o no
         l'anagrafica: è lì che c'è scritto come si completa l'iscrizione. */
      if (leadFatto) {
        leadFatto.textContent = junior
          ? 'Abbiamo i dati. Qui sotto trovi come si completa l’iscrizione, con prezzi e modalità.'
          : 'Abbiamo i tuoi dati: ti ricontatta una persona del club, via email o al telefono.';
      }
      if (ctaFatto) {
        ctaFatto.hidden = !junior;
        if (junior) {
          ctaFatto.href = LANDING_JUNIOR;
          ctaFatto.textContent = 'Come iscriversi →';
        }
      }
      mostra('fatto');
    } catch (e) {
      attendi(btnDati, false);
      if (erroreDati) {
        erroreDati.textContent = 'Non siamo riusciti a inviare i dati. Riprova fra un momento.';
        erroreDati.hidden = false;
      }
    }
  }

  // ── Eventi ────────────────────────────────────────────────────────────────
  if (btnEmail) btnEmail.addEventListener('click', verifica);
  if (campoEmail) {
    campoEmail.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      verifica();
    });
  }

  root.addEventListener('click', function (e) {
    var ambito = e.target.closest && e.target.closest('[data-ca-ambito]');
    if (ambito) {
      scegliAmbito(ambito.dataset.caAmbito);
      return;
    }
    var corso = e.target.closest && e.target.closest('[data-ca-junior-scelta]');
    if (corso) {
      dati.attivitaJunior = corso.dataset.caJuniorScelta;
      dati.ramo = 'junior';
      apriConversazione();
      return;
    }
    var indietro = e.target.closest && e.target.closest('[data-ca-indietro]');
    if (indietro) {
      mostra('ambito');
      return;
    }

    var chiedeTeam = e.target.closest && e.target.closest('[data-ca-ticket]');
    if (chiedeTeam) {
      apriTicket(chiedeTeam.closest('.ca__msg'));
      return;
    }
    var invia = e.target.closest && e.target.closest('[data-ca-ticket-invia]');
    if (invia) {
      inviaTicket(invia.closest('[data-ca-ticket-form]'));
      return;
    }
    var annulla = e.target.closest && e.target.closest('[data-ca-ticket-annulla]');
    if (annulla) {
      annulla.closest('[data-ca-ticket-form]').remove();
      return;
    }

    if (e.target.closest && e.target.closest('[data-ca-dati]')) {
      apriDati();
      return;
    }
    if (e.target.closest && e.target.closest('[data-ca-dati-invia]')) {
      inviaDati();
      return;
    }
    if (e.target.closest && e.target.closest('[data-ca-dati-annulla]')) {
      mostra('chat');
      return;
    }
    if (e.target.closest && e.target.closest('[data-ca-fatto-chiudi]')) {
      onChiudi();
    }
  });

  if (btnDomanda) btnDomanda.addEventListener('click', chiedi);
  if (campoDomanda) {
    campoDomanda.addEventListener('input', function () {
      if (btnDomanda) btnDomanda.disabled = campoDomanda.value.trim().length < 3;
    });
    campoDomanda.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      chiedi();
    });
  }

  return {
    apri: function (pagina) {
      dati.pagina = pagina || location.pathname;
      // Una conversazione già avviata riprende da dove stava: chiudere il
      // modal per sbaglio non deve costare l'email e il ramo.
      if (dati.passo === 'email') mostra('email');
      else mostra(dati.passo);
    },
    reset: function () {
      dati = statoIniziale();
      trascritto = [];
      ticketInviato = false;
      if (campoEmail) campoEmail.value = '';
      if (campoDomanda) campoDomanda.value = '';
      if (conversazione) conversazione.innerHTML = '';
      mostra('email');
      onChiudi();
    },
  };
}
