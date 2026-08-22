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
import { WEBHOOK_REFERRAL, CANALI, AMICI } from '../data/referral';
import { validaTelefono } from '../data/prefissi';

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

  /** Fino a tre, dalla costante: il markup ne genera altrettanti. */
  var QUANTI = AMICI;

  var campi = {
    email: modal.querySelector('#rfr-email'),
    consenso: modal.querySelector('[data-rfr-consenso]'),
  };

  /** I tre blocchi, ognuno coi suoi quattro campi. */
  var blocchi = [];
  for (var i = 1; i <= QUANTI; i++) {
    blocchi.push({
      n: i,
      root: modal.querySelector('[data-rfr-blocco="' + i + '"]'),
      nome: modal.querySelector('#rfr-nome-' + i),
      cognome: modal.querySelector('#rfr-cognome-' + i),
      email: modal.querySelector('#rfr-email-' + i),
      cellulare: modal.querySelector('#rfr-cell-' + i),
      prefisso: modal.querySelector('#rfr-cell-' + i + '-prefisso'),
    });
  }

  var btnAggiungi = modal.querySelector('[data-rfr-aggiungi]');
  var etichettaInvio = modal.querySelector('[data-rfr-etichetta-invio]');
  var fuori = modal.querySelector('[data-rfr-fuori]');

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
    if (campi.email) campi.email.classList.remove('segnalato');
    blocchi.forEach(function (b) {
      [b.nome, b.cognome, b.email, b.cellulare].forEach(function (c) {
        if (c) c.classList.remove('segnalato');
      });
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
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
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
    if (blocchi[0].nome) blocchi[0].nome.focus();
  }

  // ── Passo 2: gli amici ────────────────────────────────────────────────────

  /** Quanti blocchi sono aperti in questo momento. */
  function apertiOra() {
    return blocchi.filter(function (b) {
      return b.root && !b.root.hidden;
    }).length;
  }

  /** Apre il prossimo blocco chiuso, e nasconde il comando quando finiscono. */
  function aggiungiBlocco() {
    var prossimo = blocchi.find(function (b) {
      return b.root && b.root.hidden;
    });
    if (prossimo) {
      prossimo.root.hidden = false;
      if (prossimo.nome) prossimo.nome.focus();
    }
    aggiornaComandi();
  }

  function togliBlocco(n) {
    var b = blocchi[n - 1];
    if (!b || !b.root) return;
    /* Si svuota **e** si chiude: un blocco chiuso ma pieno manderebbe un invito
       che la persona ha appena detto di non volere. `hidden` nasconde, non
       cancella. */
    [b.nome, b.cognome, b.email, b.cellulare].forEach(function (c) {
      if (c) c.value = '';
    });
    b.root.hidden = true;
    aggiornaComandi();
  }

  /**
   * L'etichetta del pulsante segue quanti amici ci sono, e il comando
   * «aggiungi» sparisce al terzo. Sono due dettagli, e insieme sono la ragione
   * per cui la schermata non mente: «Manda gli inviti» con un blocco solo
   * aperto prometterebbe più di quello che sta per fare.
   */
  function aggiornaComandi() {
    var n = apertiOra();
    if (btnAggiungi) btnAggiungi.hidden = n >= QUANTI;
    if (etichettaInvio) {
      etichettaInvio.textContent = n > 1 ? "Manda gli inviti" : "Manda l'invito";
    }
  }

  /** I blocchi compilati, letti e normalizzati. `null` se un dato è sbagliato. */
  function leggiAmici() {
    var fuoriUso = null;
    var lista = [];
    for (var k = 0; k < blocchi.length; k++) {
      var b = blocchi[k];
      if (!b.root || b.root.hidden) continue;
      var nome = b.nome ? b.nome.value.trim() : '';
      var cognome = b.cognome ? b.cognome.value.trim() : '';
      var email = b.email ? b.email.value.trim().toLowerCase() : '';
      var cell = b.cellulare ? b.cellulare.value.trim() : '';

      /* Un blocco aperto e completamente vuoto si salta invece di dare errore:
         chi ha premuto «aggiungi» e poi ha cambiato idea senza chiudere il
         blocco non sta sbagliando niente. Uno riempito a metà invece è un
         errore, e va detto dove. */
      /* Un blocco aperto e completamente vuoto si salta invece di dare errore:
         chi ha premuto «aggiungi» e poi ha cambiato idea senza chiudere il
         blocco non sta sbagliando niente. La tendina del prefisso non conta come
         «riempito» — ha un valore da sempre, è preselezionata. */
      if (!nome && !cognome && !email && !cell) continue;

      if (!nome) return { errore: 'Manca il nome dell’amico ' + b.n + '.', campo: b.nome };
      if (!cognome) return { errore: 'Manca il cognome dell’amico ' + b.n + '.', campo: b.cognome };
      if (!emailValida(email)) {
        return { errore: 'Serve l’email dell’amico ' + b.n + ': è lì che arriva il pass.', campo: b.email };
      }
      /* Il cellulare è obbligatorio come gli altri tre, e non per simmetria: il
         pass parte anche su WhatsApp, e un amico senza numero riceve metà
         dell'invito. Il controllo non guarda solo la forma — `3333333333` è un
         cellulare italiano formalmente perfetto che non è di nessuno. */
      var tel = validaTelefono(b.prefisso ? b.prefisso.value : '+39', cell);
      if (!tel.ok) {
        return { errore: 'Amico ' + b.n + ': ' + tel.motivo, campo: b.cellulare };
      }
      var cellulare = tel.e164;
      if (email === invitante.email) {
        return { errore: 'L’amico ' + b.n + ' ha la tua email: serve quella della persona che vuoi invitare.', campo: b.email };
      }
      /* Due blocchi con lo stesso indirizzo manderebbero due pass alla stessa
         persona e scriverebbero due righe su Airtable. */
      for (var z = 0; z < lista.length; z++) {
        if (lista[z].email === email) {
          return { errore: 'L’amico ' + b.n + ' ha la stessa email dell’amico ' + lista[z].n + '.', campo: b.email };
        }
      }
      lista.push({ n: b.n, nome: nome, cognome: cognome, email: email, cellulare: cellulare });
    }
    if (!lista.length) {
      return { errore: 'Compila almeno un amico da invitare.', campo: blocchi[0].nome };
    }
    return { lista: lista, fuoriUso: fuoriUso };
  }

  /** «Marco», «Marco e Giulia», «Marco, Giulia e Luca». */
  function elenca(nomi) {
    if (nomi.length === 1) return nomi[0];
    return nomi.slice(0, -1).join(', ') + ' e ' + nomi[nomi.length - 1];
  }

  async function mandaInvito() {
    var letti = leggiAmici();
    if (letti.errore) return sbaglia('amico', letti.errore, letti.campo);
    if (campi.consenso && !campi.consenso.checked) {
      return sbaglia('amico', 'Serve la conferma di aver informato le persone che stai segnalando.');
    }
    pulisciErrore('amico');

    attendi(btnInvia, spinnerInvio, true);

    /* Le verifiche **tutte insieme** e non una dopo l'altra: sono chiamate
       indipendenti, e in fila tre amici vorrebbero dire fino a diciotto secondi
       davanti a uno spinner. `Promise.all` le fa costare quanto la più lenta. */
    var esiti = await Promise.all(
      letti.lista.map(function (a) {
        return verifica(a.email, ATTESA_VERIFICA);
      })
    );

    var daInvitare = [];
    var giaSoci = [];
    letti.lista.forEach(function (a, k) {
      var e = esiti[k];
      /* Come sempre: se la verifica non ha risposto si passa, e il workflow
         rifà il controllo prima di scrivere. */
      if (e && eSocio({ memberType: e.memberType, stato: e.stato })) giaSoci.push(a);
      else {
        a.stato = e ? e.stato : 'non-verificato';
        daInvitare.push(a);
      }
    });

    /* Se sono tutti già soci non c'è niente da mandare, e la schermata è quella
       che spiega cosa possono fare invece. */
    if (!daInvitare.length) {
      attendi(btnInvia, spinnerInvio, false);
      if (nomeAmico) {
        nomeAmico.textContent = elenca(giaSoci.map(function (a) { return a.nome; }));
      }
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
          /* Un array, e sempre un array anche con un amico solo: il workflow
             cicla sugli item, e un contratto che cambia forma quando l'elenco
             ha un elemento è un contratto che si rompe sul caso di mezzo. */
          amici: daInvitare.map(function (a) {
            return {
              nome: a.nome,
              cognome: a.cognome,
              email: a.email,
              cellulare: a.cellulare,
              stato: a.stato,
            };
          }),
          consenso: true,
          pagina: location.pathname,
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
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
        'Non è riuscito a partire. Riprova fra poco: se insiste, scrivici e li mandiamo noi.'
      );
    }

    if (esitoTesto) {
      /* Con più amici l'elenco degli indirizzi diventa illeggibile, quindi si
         nominano le persone e si dice come. Con uno solo l'indirizzo si scrive:
         è la conferma che serve a chi ha appena digitato una mail che potrebbe
         aver sbagliato. */
      /* Con un amico solo si scrive l'indirizzo: è la conferma che serve a chi ha
         appena digitato una mail che potrebbe aver sbagliato. Con più di uno gli
         indirizzi in fila diventano illeggibili, e si nominano le persone. */
      var nomi = elenca(daInvitare.map(function (a) { return a.nome; }));
      if (daInvitare.length === 1) {
        var uno = daInvitare[0];
        esitoTesto.textContent =
          'Il pass è in viaggio verso ' + uno.nome + ': per ' + CANALI[0] + ' su ' + uno.email +
          ' e via ' + CANALI[1] + ' al ' + uno.cellulare + '.';
      } else {
        esitoTesto.textContent =
          'Il pass è in viaggio verso ' + nomi + ', per ' + CANALI[0] + ' e via ' + CANALI[1] + '.';
      }
    }

    if (fuori) {
      if (giaSoci.length) {
        var esclusi = elenca(giaSoci.map(function (a) { return a.nome; }));
        fuori.textContent =
          giaSoci.length === 1
            ? esclusi + ' invece no: ci risulta già dei nostri, e il pass di prova è per chi non frequenta. Può venire con una lezione singola o un abbonamento.'
            : esclusi + ' invece no: ci risultano già dei nostri, e il pass di prova è per chi non frequenta. Possono venire con una lezione singola o un abbonamento.';
        fuori.hidden = false;
      } else {
        fuori.hidden = true;
      }
    }
    mostra('fatto');
  }

  // ── Apertura, chiusura, e il ritorno a capo ───────────────────────────────
  function pulisci() {
    /* Come nel form dei contatti, e per la stessa ragione: sul totem in sede il
       pannello si riapre davanti alla persona dopo, e i dati di un amico
       segnalato da qualcun altro non devono restare nei campi. */
    blocchi.forEach(function (b) {
      [b.nome, b.cognome, b.email, b.cellulare].forEach(function (c) {
        if (c) c.value = '';
      });
      /* Anche la tendina torna al preselezionato: chi ha invitato un amico
         inglese e riapre il pannello per un amico italiano troverebbe `+44`. */
      if (b.prefisso) b.prefisso.value = '+39';
      /* Il primo blocco resta aperto, gli altri due tornano chiusi: la
         schermata si riapre come la prima volta. */
      if (b.root) b.root.hidden = b.n > 1;
    });
    if (campi.consenso) campi.consenso.checked = false;
    if (nomeAmico) nomeAmico.textContent = '';
    if (esitoTesto) esitoTesto.textContent = '';
    if (fuori) {
      fuori.textContent = '';
      fuori.hidden = true;
    }
    aggiornaComandi();
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
  blocchi.forEach(function (b) {
    [b.nome, b.cognome, b.email, b.cellulare, b.prefisso].forEach(function (c) {
      if (!c) return;
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          mandaInvito();
        }
      });
    });
  });

  if (btnAggiungi) btnAggiungi.addEventListener('click', aggiungiBlocco);
  modal.querySelectorAll('[data-rfr-togli]').forEach(function (x) {
    x.addEventListener('click', function () {
      togliBlocco(Number(x.getAttribute('data-rfr-togli')));
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
      if (blocchi[0].nome) blocchi[0].nome.focus();
    });
  }

  /* «Invita un altro amico» torna al passo dei dati e non a quello dell'email:
     chi invita è già stato verificato e chiedergli di nuovo la sua email
     sarebbe una domanda a cui ha già risposto. */
  var altro = modal.querySelector('[data-rfr-altro]');
  if (altro) {
    altro.addEventListener('click', function () {
      blocchi.forEach(function (b) {
        [b.nome, b.cognome, b.email, b.cellulare].forEach(function (c) {
          if (c) c.value = '';
        });
        if (b.root) b.root.hidden = b.n > 1;
      });
      if (campi.consenso) campi.consenso.checked = false;
      if (fuori) fuori.hidden = true;
      aggiornaComandi();
      pulisciErrore('amico');
      mostra('amico');
      if (blocchi[0].nome) blocchi[0].nome.focus();
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
