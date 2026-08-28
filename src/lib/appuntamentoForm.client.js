// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica del form «Prenota una chiamata». Vive qui e non dentro il
// componente per la stessa ragione degli altri: il giorno in cui servirà una
// versione incorporata in pagina — in fondo a /abbonamenti, per dire — le due
// copie divergerebbero al primo bug corretto in una sola delle due.
//
// Il percorso ha cinque schermate e una regola sola che le decide:
//
//   email → verifica ─┬─ ha già un account → quando → di cosa → fatto
//                     └─ non ce l'ha       → dati → quando → di cosa → fatto
//
// Chi ha già un account salta i dati: li abbiamo, e richiederli è il modo più
// rapido per far chiudere la pagina a un socio. Chi non ce l'ha li lascia una
// volta sola, con il consenso privacy, e da lì nasce il lead su PerfectGym —
// che lo crea n8n, come per tutti gli altri form.
//
// L'ordine dei due passi finali non è casuale. Prima **quando**, che è la cosa
// per cui la persona è arrivata fin qui e che può sparire mentre esita: gli
// slot sono contesi. Poi **di cosa**, che è la domanda a cui si risponde
// volentieri una volta che l'orario è già scelto.

import { API_PRENOTA, API_SLOT, WEBHOOK_APPUNTAMENTO, WEBHOOK_VERIFICA } from '../data/appuntamento';
import { haGiaAccount } from '../data/contatto';
import { validaTelefono } from '../data/prefissi';
import { leggi as emailConosciuta } from '../scripts/emailNota';

export function initAppuntamentoForm(root, options) {
  var P = options.prefix;
  var onReset = options.onReset || function () {};

  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    nome: 'Serve il tuo nome.',
    cognome: 'Serve il tuo cognome.',
    telefono: 'Controlla il numero: è quello su cui ti chiamiamo.',
    privacy: 'Serve il consenso al trattamento dei dati per poterti richiamare.',
    oggetto: 'Scrivi due parole sull’argomento: servono a chi ti chiama.',
    slot: 'Scegli un orario.',
    slotPreso: 'Quell’orario è appena stato preso. Scegline un altro.',
    orari: 'Non riusciamo a leggere gli orari disponibili. Riprova fra poco.',
    invio: 'Non siamo riusciti a registrare l’appuntamento. Riprova tra poco.',
  };

  function stato() {
    return {
      email: '',
      nome: '',
      cognome: '',
      cellulare: '',
      privacy: false,
      marketing: false,
      oggetto: '',
      data: '',
      ora: '',
      statoPgm: 'nuovo',
      statoNucleo: '',
      memberId: '',
      memberType: '',
      userNumber: '',
      pagina: '',
      origine: '',
      cta: '',
    };
  }
  var dati = stato();
  var giorni = [];
  var giornoAperto = '';

  // ── Attribuzione ──────────────────────────────────────────────────────────
  // Da `scripts/attribuzione.ts`, caricato dal Layout. Se non ci fossero, il
  // payload parte senza attribuzione invece di non partire.
  function utm() {
    return window.athlonGetUtm ? window.athlonGetUtm() : {};
  }
  function vid() {
    return window.athlonGetVid ? window.athlonGetVid() : null;
  }
  function sid() {
    return window.athlonGetSid ? window.athlonGetSid() : null;
  }

  // ── Nodi ──────────────────────────────────────────────────────────────────
  function q(sel) {
    return root.querySelector(sel);
  }
  function qa(sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }
  var steps = {
    email: q('#' + P + '-step-email'),
    dati: q('#' + P + '-step-dati'),
    quando: q('#' + P + '-step-quando'),
    oggetto: q('#' + P + '-step-oggetto'),
    esito: q('#' + P + '-step-esito'),
  };
  var campoEmail = q('#' + P + '-email');
  var campoNome = q('#' + P + '-nome');
  var campoCognome = q('#' + P + '-cognome');
  var campoCellulare = q('#' + P + '-cellulare');
  var campoPrivacy = q('#' + P + '-privacy');
  var campoMarketing = q('#' + P + '-marketing');
  var campoOggetto = q('#' + P + '-oggetto');
  var elencoGiorni = q('[data-ap-giorni]');
  var elencoOrari = q('[data-ap-orari]');

  // ── Validazione ───────────────────────────────────────────────────────────
  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }
  function telefonoDa(campo) {
    var pref = q('#' + P + '-cellulare-prefisso');
    return validaTelefono(pref ? pref.value : '+39', campo ? campo.value : '');
  }

  /**
   * Riempie i campi con quello che la verifica ha restituito: solo i vuoti, e
   * lasciandoli visibili e modificabili. Un dato che arriva da un sistema va
   * potuto guardare prima di confermarlo.
   */
  function precompila(body) {
    if (body.nome) dati.nome = String(body.nome);
    if (body.cognome) dati.cognome = String(body.cognome);
    if (body.telefono) dati.cellulare = String(body.telefono);
    [
      [campoNome, dati.nome],
      [campoCognome, dati.cognome],
      [campoCellulare, dati.cellulare],
    ].forEach(function (coppia) {
      if (coppia[0] && !coppia[0].value && coppia[1]) coppia[0].value = coppia[1];
    });
  }

  function mostraErrore(step, testo) {
    var box = step.querySelector('[data-ap-errore]');
    if (!box) return;
    box.textContent = testo;
    box.hidden = false;
  }
  function pulisciErrore(step) {
    var box = step.querySelector('[data-ap-errore]');
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }
  function segnala(campo) {
    campo.classList.add('ap__input--errore');
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
  function togliSegno(campo) {
    campo.classList.remove('ap__input--errore');
    campo.removeAttribute('aria-invalid');
  }

  // ── Navigazione ───────────────────────────────────────────────────────────
  var attuale = 'email';

  function mostraStep(nome) {
    attuale = nome;
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    var fuoco = steps[nome] && steps[nome].querySelector('[data-ap-fuoco]');
    if (fuoco) fuoco.focus();
  }

  function attesa(bottone, acceso) {
    if (!bottone) return;
    bottone.disabled = acceso;
    bottone.classList.toggle('is-attesa', acceso);
  }

  // ── 1. L'email ────────────────────────────────────────────────────────────
  async function verifica() {
    var step = steps.email;
    pulisciErrore(step);
    togliSegno(campoEmail);

    var email = String(campoEmail.value || '').trim().toLowerCase();
    if (!emailValida(email)) {
      mostraErrore(step, ERR.email);
      segnala(campoEmail);
      return;
    }
    dati.email = email;
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(email);

    var bottone = q('[data-ap-verifica]');
    attesa(bottone, true);

    var body = {};
    try {
      var risposta = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, pagina: dati.pagina, utm: utm(), vid: vid(), sid: sid() }),
      });
      body = await risposta.json();
    } catch (e) {
      /* Rete o timeout: si prosegue come contatto nuovo. Meglio un lead in
         più da verificare a mano che un appuntamento perso per un errore di
         rete — è la regola di tutti i form del sito. */
      body = {};
    }
    attesa(bottone, false);

    if (body && body.stato === 'email_non_valida') {
      mostraErrore(step, ERR.email);
      segnala(campoEmail);
      return;
    }

    dati.statoPgm = (body && body.stato) || 'nuovo';
    dati.statoNucleo = (body && (body.statoNucleo || body.stato)) || '';
    dati.memberId = (body && body.memberId) || '';
    dati.memberType = (body && body.memberType) || '';
    dati.userNumber = (body && body.number) || '';
    if (body) precompila(body);
    if (dati.userNumber && window.athlonRicordaUserNumber) window.athlonRicordaUserNumber(dati.userNumber);

    // Chi ha già un account non ricompila niente: i dati ce li abbiamo, e
    // chiederglieli di nuovo è il modo più rapido per farlo desistere.
    if (haGiaAccount({ memberType: dati.memberType, stato: dati.statoPgm })) {
      await vaiAgliOrari();
    } else {
      mostraStep('dati');
    }
  }

  // ── 2. I dati, solo per chi non ce li ha già ───────────────────────────────
  async function confermaDati() {
    var step = steps.dati;
    pulisciErrore(step);
    [campoNome, campoCognome, campoCellulare].forEach(togliSegno);

    var nome = String(campoNome.value || '').trim();
    var cognome = String(campoCognome.value || '').trim();
    if (!nome) {
      mostraErrore(step, ERR.nome);
      segnala(campoNome);
      return;
    }
    if (!cognome) {
      mostraErrore(step, ERR.cognome);
      segnala(campoCognome);
      return;
    }
    var tel = telefonoDa(campoCellulare);
    if (!tel.ok) {
      mostraErrore(step, tel.motivo || ERR.telefono);
      segnala(campoCellulare);
      return;
    }
    // Il consenso privacy è obbligatorio e blocca: senza, il lead non si può
    // creare. Il marketing resta facoltativo, sempre.
    if (campoPrivacy && !campoPrivacy.checked) {
      mostraErrore(step, ERR.privacy);
      campoPrivacy.focus();
      return;
    }

    dati.nome = nome;
    dati.cognome = cognome;
    dati.cellulare = tel.e164;
    dati.privacy = !!(campoPrivacy && campoPrivacy.checked);
    dati.marketing = !!(campoMarketing && campoMarketing.checked);

    await vaiAgliOrari();
  }

  // ── 3. Quando ─────────────────────────────────────────────────────────────

  /**
   * Gli orari si chiedono qui e non all'apertura del modal: sono l'unica cosa
   * che invecchia mentre la persona compila, e caricarli tardi vuol dire
   * mostrarli veri. Chi non arriva fin qui non paga la chiamata.
   */
  async function vaiAgliOrari() {
    mostraStep('quando');
    var step = steps.quando;
    pulisciErrore(step);
    elencoGiorni.innerHTML = '<p class="ap__attesa">Cerco gli orari liberi…</p>';
    elencoOrari.innerHTML = '';

    try {
      var risposta = await fetch(API_SLOT, { headers: { Accept: 'application/json' } });
      if (!risposta.ok) throw new Error('slot');
      var body = await risposta.json();
      giorni = (body && body.giorni) || [];
    } catch (e) {
      elencoGiorni.innerHTML = '';
      mostraErrore(step, ERR.orari);
      return;
    }

    if (giorni.length === 0) {
      elencoGiorni.innerHTML = '';
      mostraErrore(
        step,
        'Non ci sono orari liberi nei prossimi giorni. Scrivici e troviamo un momento.'
      );
      return;
    }

    disegnaGiorni();
    /* Nessun giorno aperto d'ufficio: ventiquattro orari srotolati prima ancora
       di aver scelto il giorno sono un muro di numeri, e per di più riferiti a
       un giorno che magari non interessa. Prima si sceglie il quando grosso,
       poi il quando fine. */
    invitoAScegliere();
  }

  function invitoAScegliere() {
    elencoOrari.innerHTML =
      '<p class="ap__invito">Scegli un giorno per vedere gli orari liberi.</p>';
  }

  /* I giorni come una fila di pillole scorrevole: sette voci in orizzontale
     occupano una riga sola anche su un telefono stretto, dove sette righe
     avrebbero riempito lo schermo prima ancora di mostrare un orario. */
  function disegnaGiorni() {
    elencoGiorni.innerHTML = '';
    giorni.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ap__giorno';
      b.dataset.apGiorno = g.data;
      var parti = g.etichetta.split(' ');
      /* Tre righe: il nome del giorno, il numero, quanti orari ci sono. Il
         conteggio è quello che permette di scegliere il giorno **prima** di
         aprirlo: dice dove c'è spazio senza doverli guardare tutti. */
      b.innerHTML =
        '<span class="ap__giorno-nome">' + parti[0] + '</span>' +
        '<span class="ap__giorno-num">' + parti[1] + '</span>' +
        '<span class="ap__giorno-mese">' + (parti[2] || '') + '</span>' +
        '<span class="ap__giorno-quanti">' + g.slot.length + '</span>';
      b.addEventListener('click', function () {
        apriGiorno(g.data);
      });
      elencoGiorni.appendChild(b);
    });
  }

  /* Gli orari divisi per mattina e pomeriggio, in una griglia di pillole.
     Ventiquattro orari in fila sarebbero un muro di numeri: due gruppi con il
     loro titolo si leggono a colpo d'occhio, e su un telefono la griglia si
     stringe da sola invece di andare a capo a metà. */
  function apriGiorno(data) {
    giornoAperto = data;
    dati.data = '';
    dati.ora = '';
    aggiornaSceltaOrario();

    qa('[data-ap-giorno]').forEach(function (b) {
      b.classList.toggle('is-scelto', b.dataset.apGiorno === data);
      b.setAttribute('aria-pressed', b.dataset.apGiorno === data ? 'true' : 'false');
    });

    var giorno = giorni.filter(function (g) {
      return g.data === data;
    })[0];
    elencoOrari.innerHTML = '';
    if (!giorno) return;

    [
      ['mattina', 'Mattina'],
      ['pomeriggio', 'Pomeriggio'],
    ].forEach(function (coppia) {
      var orari = giorno.slot.filter(function (o) {
        var mattina = Number(o.slice(0, 2)) < 13;
        return coppia[0] === 'mattina' ? mattina : !mattina;
      });
      if (orari.length === 0) return;

      var gruppo = document.createElement('div');
      gruppo.className = 'ap__fascia';
      gruppo.innerHTML = '<h4 class="ap__fascia-titolo">' + coppia[1] + '</h4>';
      var griglia = document.createElement('div');
      griglia.className = 'ap__orari';
      orari.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ap__ora';
        b.textContent = o;
        b.dataset.apOra = o;
        b.addEventListener('click', function () {
          dati.data = data;
          dati.ora = o;
          qa('[data-ap-ora]').forEach(function (x) {
            x.classList.toggle('is-scelto', x === b);
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
          aggiornaSceltaOrario();
          pulisciErrore(steps.quando);
        });
        griglia.appendChild(b);
      });
      gruppo.appendChild(griglia);
      elencoOrari.appendChild(gruppo);
    });
  }

  function aggiornaSceltaOrario() {
    var avanti = q('[data-ap-avanti-quando]');
    if (avanti) avanti.disabled = !dati.ora;
    var riassunto = q('[data-ap-scelta]');
    if (!riassunto) return;
    if (!dati.ora) {
      riassunto.textContent = '';
      riassunto.hidden = true;
      return;
    }
    var giorno = giorni.filter(function (g) {
      return g.data === dati.data;
    })[0];
    riassunto.textContent = (giorno ? giorno.etichetta : dati.data) + ' alle ' + dati.ora;
    riassunto.hidden = false;
  }

  // ── 4. Di cosa ────────────────────────────────────────────────────────────
  async function invia() {
    var step = steps.oggetto;
    pulisciErrore(step);
    togliSegno(campoOggetto);

    var oggetto = String(campoOggetto.value || '').trim();
    if (!oggetto) {
      mostraErrore(step, ERR.oggetto);
      segnala(campoOggetto);
      return;
    }
    if (!dati.data || !dati.ora) {
      mostraStep('quando');
      mostraErrore(steps.quando, ERR.slot);
      return;
    }
    dati.oggetto = oggetto;

    var bottone = q('[data-ap-invia]');
    attesa(bottone, true);

    /* Prima si prende lo slot, che è la cosa contesa, poi si crea il lead. Se
       il secondo fallisce resta un appuntamento con nome e telefono dentro, e
       il desk può chiamare comunque; all'inverso sarebbe rimasto un lead con
       la promessa di una telefonata che non esiste in nessuna agenda. */
    var esito;
    try {
      var risposta = await fetch(API_PRENOTA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: dati.data,
          ora: dati.ora,
          email: dati.email,
          nome: dati.nome,
          cognome: dati.cognome,
          telefono: dati.cellulare,
          oggetto: dati.oggetto,
          privacy: dati.privacy,
          marketing: dati.marketing,
          pagina: dati.pagina,
          origine: dati.origine,
          cta: dati.cta,
          utm: utm(),
          vid: vid(),
          sid: sid(),
        }),
      });
      esito = await risposta.json();
      if (!risposta.ok) {
        attesa(bottone, false);
        if (esito && esito.slotOccupato) {
          // L'orario è sparito mentre compilava: si torna alla scelta con gli
          // orari ricaricati, non si lascia la persona davanti a un errore.
          await vaiAgliOrari();
          mostraErrore(steps.quando, ERR.slotPreso);
          return;
        }
        mostraErrore(step, (esito && esito.errore) || ERR.invio);
        return;
      }
    } catch (e) {
      attesa(bottone, false);
      mostraErrore(step, ERR.invio);
      return;
    }

    /* Il lead su PerfectGym lo crea n8n, come per tutti gli altri form. Se
       questa fallisce l'appuntamento resta: si prosegue senza bloccare. */
    try {
      await fetch(WEBHOOK_APPUNTAMENTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'contatto',
          tipoRichiesta: 'appuntamento',
          richiesta: dati.oggetto,
          appuntamento: { data: dati.data, ora: dati.ora, id: esito && esito.id },
          richiamoTelefonico: true,
          email: dati.email,
          nome: dati.nome,
          cognome: dati.cognome,
          cellulare: dati.cellulare,
          telefono: dati.cellulare,
          userNumber: dati.userNumber,
          privacy: dati.privacy,
          marketing: dati.marketing,
          stato: dati.statoPgm,
          statoNucleo: dati.statoNucleo,
          memberId: dati.memberId,
          memberType: dati.memberType,
          isNewUser: dati.statoPgm === 'nuovo',
          pagina: dati.pagina,
          origine: dati.origine,
          cta: dati.cta,
          utm: utm(),
          vid: vid(),
          sid: sid(),
        }),
      });
    } catch (e) {
      /* Vedi sopra: l'appuntamento è già in agenda, e vale più della riga su
         PerfectGym. */
    }

    attesa(bottone, false);

    if (window.dataLayer) {
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'appuntamento_telefonico' });
    }

    var riepilogo = q('[data-ap-riepilogo]');
    if (riepilogo) {
      var giorno = giorni.filter(function (g) {
        return g.data === dati.data;
      })[0];
      riepilogo.textContent = (giorno ? giorno.etichetta : dati.data) + ' alle ' + dati.ora;
    }
    mostraStep('esito');
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /* Si svuota sia in chiusura sia in apertura, e non è ridondanza: il sito
     gira anche sul totem all'ingresso del club, e i dati di un visitatore non
     devono restare visibili al successivo. */
  function pulisci() {
    dati = stato();
    giorni = [];
    giornoAperto = '';
    [campoEmail, campoNome, campoCognome, campoCellulare, campoOggetto].forEach(function (c) {
      if (c) {
        c.value = '';
        togliSegno(c);
      }
    });
    [campoPrivacy, campoMarketing].forEach(function (c) {
      if (c) c.checked = false;
    });
    if (elencoGiorni) elencoGiorni.innerHTML = '';
    if (elencoOrari) elencoOrari.innerHTML = '';
    aggiornaSceltaOrario();
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) pulisciErrore(steps[k]);
    });
    mostraStep('email');
    onReset();
  }

  // ── Aggancio ──────────────────────────────────────────────────────────────
  var bVerifica = q('[data-ap-verifica]');
  if (bVerifica) bVerifica.addEventListener('click', verifica);
  var bDati = q('[data-ap-dati]');
  if (bDati) bDati.addEventListener('click', confermaDati);
  var bAvanti = q('[data-ap-avanti-quando]');
  if (bAvanti) bAvanti.addEventListener('click', function () { mostraStep('oggetto'); });
  var bInvia = q('[data-ap-invia]');
  if (bInvia) bInvia.addEventListener('click', invia);

  qa('[data-ap-indietro]').forEach(function (b) {
    b.addEventListener('click', function () {
      mostraStep(b.dataset.apIndietro);
    });
  });

  // Invio da tastiera sui campi di testo: su un form a passi, premere Invio
  // deve fare la stessa cosa del pulsante che si ha davanti.
  [
    [campoEmail, verifica],
    [campoNome, confermaDati],
    [campoCognome, confermaDati],
    [campoCellulare, confermaDati],
  ].forEach(function (coppia) {
    if (!coppia[0]) return;
    coppia[0].addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        coppia[1]();
      }
    });
  });

  return {
    apri: function (contesto) {
      pulisci();
      dati.pagina = (contesto && contesto.pagina) || location.pathname;
      dati.origine = (contesto && contesto.origine) || '';
      dati.cta = (contesto && contesto.cta) || '';
      // Se l'email è già nota da un altro form, si salta il primo passo e si
      // verifica da soli: chiederla di nuovo a chi l'ha appena scritta è la
      // domanda che fa chiudere la pagina.
      var nota = emailConosciuta();
      if (nota) {
        campoEmail.value = nota;
        verifica();
      }
    },
    chiudi: pulisci,
  };
}
