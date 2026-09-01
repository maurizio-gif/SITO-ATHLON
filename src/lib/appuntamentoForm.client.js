// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica del form «Prenota una chiamata». Vive qui e non dentro il
// componente per la stessa ragione degli altri: il giorno in cui servirà una
// versione incorporata in pagina — in fondo a /abbonamenti, per dire — le due
// copie divergerebbero al primo bug corretto in una sola delle due.
//
// Il calendario è la prima cosa che si vede, sempre. Chiedere l'email prima
// di mostrare gli orari costava un passo a chi magari non trova nemmeno un
// momento libero che gli vada bene — e chi ha scelto **quando** prima di
// lasciare un dato è più probabile che arrivi in fondo. Gli orari sono
// pubblici e non hanno bisogno di sapere chi sei.
//
//   quando ─┬─ email/UserNumber già noti, con un account   → di cosa → fatto
//           ├─ email/UserNumber già noti, senza un account → dati → di cosa → fatto
//           └─ identità sconosciuta → email → verifica ─┬─ ha un account → di cosa → fatto
//                                                        └─ non ce l'ha   → dati → di cosa → fatto
//
// La verifica su PerfectGym parte **in sottofondo**, appena il pannello si
// apre, se l'email o il numero socio sono già noti nella sessione — dallo
// stesso browser, in questa visita o in una precedente ricordata dietro
// consenso (vedi `scripts/emailNota.ts` e `scripts/numeroSocio.ts`). Non
// mostra niente finché la persona non ha scelto un orario: a quel punto, se
// la verifica è già tornata, il passo «chi sei» si salta da solo; se ha già
// un account, si salta anche quello dei dati.
//
// Chi ha già un account non ricompila niente: i dati ce li abbiamo, e
// richiederli è il modo più rapido per far chiudere la pagina a un socio.
// Chi non ce l'ha li lascia una volta sola, con il consenso privacy, e da lì
// nasce il lead su PerfectGym — che lo crea n8n, come per tutti gli altri
// form.

import {
  API_PRENOTA,
  API_SLOT,
  WEBHOOK_APPUNTAMENTO,
  WEBHOOK_EMAIL_APPUNTAMENTO,
  WEBHOOK_VERIFICA,
} from '../data/appuntamento';
import { haGiaAccount } from '../data/contatto';
import { validaTelefono } from '../data/prefissi';
import { leggi as emailConosciuta } from '../scripts/emailNota';
import { leggi as userNumberConosciuto } from '../scripts/numeroSocio';

export function initAppuntamentoForm(root, options) {
  var P = options.prefix;
  var onReset = options.onReset || function () {};

  /* Il fuoco al primo passo si salta solo per il riquadro incorporato in
     pagina: là il form è già visibile all'arrivo, e mettere il fuoco su un
     titolo a metà articolo fa saltare la lettura al riquadro senza che nessuno
     l'abbia chiesto. Nel pannello invece il fuoco è obbligatorio — si è appena
     aperto sopra la pagina, e chi naviga da tastiera deve trovarcisi dentro. */
  var saltaPrimoFuoco = options.fuoco === false;

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
  /* La verifica lanciata in sottofondo all'apertura, se l'email o il numero
     socio erano già noti. Chi clicca «Continua» sul calendario prima che sia
     tornata deve aspettarla: è lei a dire se il passo dell'identità serve. */
  var verificaInCorso = null;

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
    quando: q('#' + P + '-step-quando'),
    email: q('#' + P + '-step-email'),
    dati: q('#' + P + '-step-dati'),
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
    /* L'email non arriva sempre — una verifica partita dal solo numero socio
       può tornare senza — ma quando c'è è quella buona: risparmia il passo a
       chi il club conosce già anche se lo ha raggiunto da un link, non da un
       campo digitato. */
    if (body.email && !dati.email) dati.email = String(body.email).trim().toLowerCase();
    [
      [campoNome, dati.nome],
      [campoCognome, dati.cognome],
      [campoCellulare, dati.cellulare],
    ].forEach(function (coppia) {
      if (coppia[0] && !coppia[0].value && coppia[1]) coppia[0].value = coppia[1];
    });
    if (campoEmail && !campoEmail.value && dati.email) campoEmail.value = dati.email;
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
  var attuale = 'quando';

  /* I passi che restano da fare da qui in avanti, nell'ordine in cui si
     vedranno — usata solo per numerarli («Passo 2 di 3»). Non è una previsione
     fissata all'apertura: si ricalcola ogni volta che si mostra un passo
     numerato, con quello che sappiamo *in quel momento*. Sul passo email può
     ancora non sapere se seguirà «dati» — lo saprà lei stessa, una volta
     mostrata, e allora il conto si aggiusta da solo. */
  function passiRestanti() {
    var passi = [];
    if (!dati.email) {
      passi.push('email');
    } else if (!haGiaAccount({ memberType: dati.memberType, stato: dati.statoPgm })) {
      passi.push('dati');
    }
    passi.push('oggetto');
    return passi;
  }

  var STEP_NUMERATI = { email: true, dati: true, oggetto: true };

  function aggiornaEyebrow(nome) {
    if (!STEP_NUMERATI[nome]) return;
    var el = steps[nome] && steps[nome].querySelector('.ap__eyebrow');
    if (!el) return;
    var passi = passiRestanti();
    var indice = passi.indexOf(nome);
    el.textContent = 'Passo ' + (indice >= 0 ? indice + 1 : 1) + ' di ' + passi.length;
  }

  function mostraStep(nome) {
    attuale = nome;
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    aggiornaEyebrow(nome);
    if (saltaPrimoFuoco) {
      saltaPrimoFuoco = false;
      return;
    }
    var fuoco = steps[nome] && steps[nome].querySelector('[data-ap-fuoco]');
    if (fuoco) fuoco.focus();
  }

  function attesa(bottone, acceso) {
    if (!bottone) return;
    bottone.disabled = acceso;
    bottone.classList.toggle('is-attesa', acceso);
  }

  /** Dove si va dopo aver scelto l'orario: salta l'identità se la conosciamo già. */
  function proseguiOltreIdentita() {
    if (!dati.email) {
      mostraStep('email');
    } else if (!haGiaAccount({ memberType: dati.memberType, stato: dati.statoPgm })) {
      mostraStep('dati');
    } else {
      mostraStep('oggetto');
    }
  }

  // ── L'identità: email o numero socio, solo quando serve davvero ──────────
  /**
   * `numero`, quando passato, è un UserNumber già noto (da un link, o da una
   * verifica precedente riuscita): si salta la lettura del campo email e si
   * cerca su PerfectGym con quello. È la stessa idea di `contattaciForm` e
   * dell'assistente — vedi `numeroSocio.ts`.
   *
   * Due modi di essere chiamata. **In sottofondo**, dall'apertura del
   * pannello: `attuale` è ancora `'quando'`, e allora questa funzione si
   * limita ad aggiornare `dati` senza toccare lo schermo — decide il passo
   * successivo chi ha in mano il click su «Continua». **Dal passo email**,
   * quando la persona la digita e conferma: lì `attuale === 'email'`, ed è
   * questa funzione stessa a decidere dove andare.
   */
  async function verifica(numero) {
    var viaNumero = typeof numero === 'string' && numero;
    var step = steps.email;
    var suSchermo = attuale === 'email';
    if (suSchermo) {
      pulisciErrore(step);
      togliSegno(campoEmail);
    }

    if (!viaNumero) {
      var email = String(campoEmail.value || '').trim().toLowerCase();
      if (!emailValida(email)) {
        if (suSchermo) {
          mostraErrore(step, ERR.email);
          segnala(campoEmail);
        }
        return;
      }
      dati.email = email;
      if (window.athlonRicordaEmail) window.athlonRicordaEmail(email);
    } else {
      dati.userNumber = viaNumero;
    }

    var bottone = q('[data-ap-verifica]');
    if (suSchermo) attesa(bottone, true);

    var body = {};
    try {
      var corpo = viaNumero ? { userNumber: viaNumero } : { email: dati.email };
      corpo.pagina = dati.pagina;
      corpo.utm = utm();
      corpo.vid = vid();
      corpo.sid = sid();
      var risposta = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      body = await risposta.json();
    } catch (e) {
      /* Rete o timeout: si prosegue come contatto nuovo. Meglio un lead in
         più da verificare a mano che un appuntamento perso per un errore di
         rete — è la regola di tutti i form del sito. */
      body = {};
    }
    if (suSchermo) attesa(bottone, false);

    if (!viaNumero && body && body.stato === 'email_non_valida') {
      if (suSchermo) {
        mostraErrore(step, ERR.email);
        segnala(campoEmail);
      }
      return;
    }

    dati.statoPgm = (body && body.stato) || 'nuovo';
    dati.statoNucleo = (body && (body.statoNucleo || body.stato)) || '';
    dati.memberId = (body && body.memberId) || '';
    dati.memberType = (body && body.memberType) || '';
    dati.userNumber = (body && body.number) || dati.userNumber;
    if (body) precompila(body);
    if (dati.userNumber && window.athlonRicordaUserNumber) window.athlonRicordaUserNumber(dati.userNumber);

    // Solo se siamo davvero sul passo dell'email si decide qui dove andare:
    // la verifica lanciata in sottofondo all'apertura non deve cambiare
    // schermata da sola mentre la persona sta ancora guardando il calendario.
    if (suSchermo) proseguiOltreIdentita();
  }

  // ── I dati, solo per chi non ce li ha già ──────────────────────────────────
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

    mostraStep('oggetto');
  }

  // ── Quando ────────────────────────────────────────────────────────────────

  /**
   * Gli orari si chiedono all'apertura, non dietro un passo di identità: sono
   * pubblici, e farli aspettare dietro un'email da digitare sarebbe un
   * rallentamento per niente. Restano comunque freschi — è l'unica cosa che
   * invecchia mentre la persona sceglie — perché si ricaricano anche dopo un
   * «quell'orario è appena stato preso».
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

  /** «Lunedì 8 settembre alle 10:30»: come si dice l'appuntamento a voce. */
  function etichettaScelta() {
    var giorno = giorni.filter(function (g) {
      return g.data === dati.data;
    })[0];
    return (giorno ? giorno.etichetta : dati.data) + ' alle ' + dati.ora;
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
    riassunto.textContent = etichettaScelta();
    riassunto.hidden = false;
  }

  // ── Di cosa ───────────────────────────────────────────────────────────────
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

    /* Il lead e le due email, e sono due chiamate perché sono due lavori: il
       primo webhook crea il lead su PerfectGym come per tutti gli altri form,
       il secondo manda la conferma a chi ha prenotato e l'avviso al desk.
       Stesso corpo, così i due log di n8n dicono la stessa cosa.

       `urlGestione` è il link firmato dal pannello, e diventa il pulsante
       «sposta o annulla» dentro la conferma: senza, quell'email arriva con un
       pulsante che non porta da nessuna parte.

       Se una delle due non riesce l'appuntamento resta: è già in agenda, e
       vale più di una email. */
    var corpo = JSON.stringify({
      tipo: 'contatto',
      tipoRichiesta: 'appuntamento',
      richiesta: dati.oggetto,
      appuntamento: {
        id: esito && esito.id,
        data: dati.data,
        ora: dati.ora,
        etichetta: etichettaScelta(),
        durataMinuti: esito && esito.durataMinuti,
        urlGestione: esito && esito.urlGestione,
      },
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
    });
    [WEBHOOK_APPUNTAMENTO, WEBHOOK_EMAIL_APPUNTAMENTO].forEach(function (indirizzo) {
      fetch(indirizzo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
      }).catch(function () {
        /* Vedi sopra. */
      });
    });

    attesa(bottone, false);

    if (window.dataLayer) {
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'appuntamento_telefonico' });
    }

    var riepilogo = q('[data-ap-riepilogo]');
    if (riepilogo) riepilogo.textContent = etichettaScelta();
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
    verificaInCorso = null;
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
    mostraStep('quando');
    onReset();
  }

  // ── Aggancio ──────────────────────────────────────────────────────────────
  var bVerifica = q('[data-ap-verifica]');
  if (bVerifica) bVerifica.addEventListener('click', function () { verifica(); });
  var bDati = q('[data-ap-dati]');
  if (bDati) bDati.addEventListener('click', confermaDati);
  var bAvanti = q('[data-ap-avanti-quando]');
  if (bAvanti) {
    bAvanti.addEventListener('click', async function () {
      if (!dati.ora) return;
      bAvanti.disabled = true;
      if (verificaInCorso) {
        try {
          await verificaInCorso;
        } catch (e) {
          /* La verifica in sottofondo fallisce già in silenzio al suo
             interno (rete o timeout): si prosegue come contatto nuovo. */
        }
        verificaInCorso = null;
      }
      bAvanti.disabled = !dati.ora;
      proseguiOltreIdentita();
    });
  }
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
    [campoEmail, function () { verifica(); }],
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

      // Il calendario si vede subito: non aspetta nessuna verifica.
      vaiAgliOrari();

      // In parallelo, senza mostrare niente: se questa persona ha già dato
      // l'email — in questa visita, su un altro form, o ricordata da una
      // precedente — o è arrivata da un link con un numero socio, la
      // verifica parte da sola. Quando servirà deciderlo, il passo
      // sull'identità si sarà già risolto da sé.
      var numero = userNumberConosciuto();
      var nota = emailConosciuta();
      if (numero) {
        verificaInCorso = verifica(numero);
      } else if (nota) {
        campoEmail.value = nota;
        verificaInCorso = verifica();
      }
    },
    chiudi: pulisci,
  };
}
