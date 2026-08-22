// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica del form «Contattaci». Vive qui e non dentro il componente per la
// stessa ragione di `provaForm.client.js`: il giorno in cui il contatto avrà
// anche una versione in pagina — in fondo a /club-life, per dire — le due copie
// divergerebbero al primo bug corretto in una sola delle due.
//
// ── Il percorso, e da dove viene ────────────────────────────────────────────
//
// È la ricostruzione dei rami di `CONTATTACI - ATHLON` su n8n, dove le domande
// stavano nelle pagine del form ospitato e i bivi negli switch. Uno schema:
//
//   email → verifica PGM → macro attività ─┬─ ADULTI  → attività + richiesta
//                                          │             → dati → esito
//                                          ├─ BABY    → già socio? → portale
//                                          │             altrimenti bambino
//                                          │             → genitore → esito
//                                          └─ JUNIOR  → già socio? → portale
//                                                        altrimenti bambino
//                                                        (+ livello in acqua)
//                                                        → genitore → esito
//
// Tre cose non sono ovvie, e sono le tre che ho dovuto decidere.
//
// **Il socio non viene più dirottato.** Il form di oggi manda chi ha un
// contratto vivo sul wiki e chiude lì: la richiesta non parte. Qui lo stato
// viaggia nel payload e il desk lo legge, ma la persona scrive comunque —
// perché un socio che clicca «Contattaci» ha una domanda, e rispondergli con
// un rimando è il modo di non risponderle. Resta la variante del **portale**
// per i rami junior, che non è un vicolo cieco ma l'informazione giusta: se
// l'anagrafica c'è già, creare un doppione è il danno, e il reset password è
// quello che serve davvero.
//
// **Il portale lo decide `memberType`, non `stato`.** L'automazione di oggi
// distingue quattro valori: Lead e assente raccolgono i dati, Member e Guest
// vanno al portale. `athlon-verifica-iscritto` risponde con `stato` (nuovo /
// esiste / iscritto), che unisce Lead e Guest sotto `esiste` — quindi la
// verifica ora restituisce anche `memberType`, ed è quello che si guarda. Se
// il campo non arriva — una versione vecchia del webhook — si ricade su
// `stato === 'iscritto'`, che è il caso Member: raccogliere i dati di un Guest
// è il verso giusto in cui sbagliare, perché un doppione si fonde mentre una
// persona rimandata a un portale che non ha si perde.
//
// **Se PerfectGym non risponde si prosegue.** Come nel form di prova: meglio
// un contatto in più da verificare a mano che una richiesta persa per un
// timeout.

import {
  WEBHOOK_VERIFICA,
  WEBHOOK_CONTATTO,
  PREISCRIZIONI,
  MACRO_BY_ID,
  ATTIVITA_ADULTI,
  haGiaAccount,
} from '../data/contatto';
import { CALENDLY } from '../data/calendly';
import { validaTelefono } from '../data/prefissi';
import { montaCalendario } from './calendario.client.js';

export function initContattaciForm(root, options) {
  var P = options.prefix;
  var onReset = options.onReset || function () {};

  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    macro: 'Scegli di cosa vuoi parlare.',
    attivita: 'Scegli almeno un’attività.',
    richiesta: 'Scrivi la tua richiesta: anche due righe bastano.',
    nome: 'Serve il tuo nome.',
    cognome: 'Serve il tuo cognome.',
    privacy: 'Serve il consenso al trattamento per poterti rispondere.',
    bnome: 'Serve il nome del bambino.',
    bcognome: 'Serve il cognome del bambino.',
    bnascita: 'Serve la data di nascita: è quella che decide il corso.',
    livello: 'Rispondi alle due domande sul nuoto.',
    nascita: 'Serve la tua data di nascita.',
  };

  function stato() {
    return {
      email: '',
      // Quello che la verifica ha trovato su PerfectGym.
      statoPgm: 'nuovo',
      statoNucleo: 'nuovo',
      memberId: null,
      memberType: '',
      // La scelta del secondo passo.
      macro: '',
      ramo: '',
      gruppo: '',
      // Ramo adulti.
      attivita: [],
      richiesta: '',
      // I dati di chi scrive: l'adulto, o il genitore.
      nome: '',
      cognome: '',
      cellulare: '',
      nascita: '',
      privacy: false,
      marketing: false,
      // Ramo baby e junior.
      bambino: null,
      richiamo: null,
      // L'id della riga su Supabase, che n8n restituisce al primo invio.
      richiestaId: '',
      // Provenienza.
      pagina: '',
      origine: '',
      cta: '',
      attivitaOrigine: '',
      /* L'area dedotta dal pulsante di partenza, se c'era. */
      macroDaCta: '',
    };
  }
  var dati = stato();

  // ── Attribuzione ──────────────────────────────────────────────────────────
  // Le due funzioni arrivano da `scripts/attribuzione.ts`, caricato dal Layout,
  // e rispettano già il consenso cookie: senza `advertisement` tornano vuote
  // invece di leggere lo storage. Se per qualsiasi motivo non ci fossero, il
  // form continua a funzionare — il payload parte senza attribuzione invece di
  // non partire.
  function utm() {
    return window.athlonGetUtm ? window.athlonGetUtm() : {};
  }
  function vid() {
    return window.athlonGetVid ? window.athlonGetVid() : null;
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
    macro: q('#' + P + '-step-macro'),
    adulti: q('#' + P + '-step-adulti'),
    dati: q('#' + P + '-step-dati'),
    bambino: q('#' + P + '-step-bambino'),
    genitore: q('#' + P + '-step-genitore'),
    portale: q('#' + P + '-step-portale'),
    esito: q('#' + P + '-step-esito'),
  };

  // ── Validazione ───────────────────────────────────────────────────────────
  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }

  /**
   * Il numero, in forma internazionale, dal prefisso scelto e da quello scritto.
   *
   * Sostituisce `cellulareNudo()` più `cellulareValido()`, che tenevano il numero
   * nudo e lo ricomponevano con un `'+39' +` scritto in due posti più sotto:
   * quindi chi ha un numero straniero non poteva lasciarlo, e la forma giusta
   * non bastava — `3333333333` la rispetta ed è il numero di nessuno.
   *
   * Il campo è uno dei due, l'adulto o il genitore: la tendina del prefisso è
   * quella accanto, e si trova dall'id del campo più `-prefisso`.
   */
  function telefonoDa(campo) {
    if (!campo) return { ok: false, motivo: 'Manca il numero di cellulare.' };
    var pref = q('#' + campo.id + '-prefisso');
    return validaTelefono(pref ? pref.value : '+39', campo.value);
  }

  function mostraErrore(step, testo) {
    var box = step.querySelector('[data-cf-errore]');
    if (!box) return;
    box.textContent = testo;
    box.hidden = false;
  }
  function pulisciErrore(step) {
    var box = step.querySelector('[data-cf-errore]');
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }
  function segnala(campo) {
    if (!campo) return;
    campo.classList.add('cf__input--errore');
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
  function togliSegno(campo) {
    if (!campo) return;
    campo.classList.remove('cf__input--errore');
    campo.removeAttribute('aria-invalid');
  }

  // ── Navigazione ───────────────────────────────────────────────────────────
  var attuale = 'email';
  /** Da dove si è arrivati, per il pulsante «indietro» di ogni passo. */
  var storia = [];

  /**
   * Gli occhielli dei passi, e perché non sono scritti nel markup.
   *
   * Il totale cambia: con l'area già scelta dal pulsante di partenza i passi
   * sono due, altrimenti tre. Un «Passo 1 di 3» stampato nell'HTML sarebbe
   * diventato una bugia esattamente nel caso che abbiamo appena aggiunto — e
   * un contatore che mente è peggio di un contatore assente, perché chi legge
   * si prepara a una schermata che non arriva.
   */
  function numeraPassi() {
    var salta = !!dati.macroDaCta;
    qa('[data-cf-passo]').forEach(function (el) {
      var n = parseInt(el.dataset.cfPasso, 10);
      if (salta) n -= 1;
      el.textContent = 'Passo ' + n + ' di ' + (salta ? 2 : 3);
      // Con l'area già scelta il passo «1» non esiste: il suo occhiello
      // sparisce invece di dire «Passo 0».
      el.hidden = n < 1;
    });
  }

  /** La riga «stai scrivendo per …», e l'occhiello del primo passo. */
  function mostraContesto() {
    var riga = q('[data-cf-contesto]');
    var area = q('[data-cf-contesto-area]');
    var occhiello = q('[data-cf-occhiello]');
    var macro = dati.macroDaCta ? MACRO_BY_ID[dati.macroDaCta] : null;
    if (riga) riga.hidden = !macro;
    if (macro) {
      /* L'etichetta dell'attività precisa quando c'è, l'area quando non c'è:
         chi arriva dalla pagina del reformer legge «Group Reformer», non
         «Adulti», perché è quello che ha in mente. */
      var precisa = ATTIVITA_ADULTI.filter(function (a) { return a.id === dati.attivitaOrigine; })[0];
      if (area) area.textContent = precisa ? precisa.label : macro.label;
      if (occhiello) occhiello.textContent = 'Richiesta · ' + macro.label;
    } else if (occhiello) {
      occhiello.textContent = 'Richiesta al team';
    }
  }

  function mostraStep(nome, senzaStoria) {
    if (!senzaStoria && attuale !== nome) storia.push(attuale);
    attuale = nome;
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    // Il titolo del passo raccoglie il focus: chi naviga da tastiera o con lo
    // screen reader si ritrova all'inizio della schermata nuova e non sul
    // pulsante di prima, che ora è nascosto.
    var titolo = steps[nome] && steps[nome].querySelector('[data-cf-fuoco]');
    if (titolo) {
      void titolo.offsetWidth;
      titolo.focus();
    }
    // Il pannello torna in cima: le schermate non sono alte uguale, e senza
    // questo chi arriva da un passo lungo vede la nuova a metà.
    var pannello = root.querySelector('[data-cf-pannello]');
    if (pannello) pannello.scrollTop = 0;
  }

  function indietro() {
    var precedente = storia.pop();
    if (precedente) mostraStep(precedente, true);
  }

  function attendi(btn, acceso) {
    if (!btn) return;
    btn.disabled = acceso;
    btn.classList.toggle('cf__btn--attesa', acceso);
  }

  // ── Passo 1: l'email, e la verifica su PerfectGym ─────────────────────────
  var campoEmail = q('#' + P + '-email');
  var btnVerifica = q('[data-cf-verifica]');

  async function verifica() {
    pulisciErrore(steps.email);
    togliSegno(campoEmail);

    if (!emailValida(campoEmail.value)) {
      mostraErrore(steps.email, ERR.email);
      segnala(campoEmail);
      return;
    }
    dati.email = campoEmail.value.trim().toLowerCase();
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(dati.email);
    attendi(btnVerifica, true);

    try {
      var r = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /* Con le UTM oltre al `vid`: la verifica registra ogni email su
           `eventi_email`, ed è il primo tocco. Senza, un contatto nato da qui
           risultava senza provenienza fino al secondo invio. */
        body: JSON.stringify({ email: dati.email, pagina: dati.pagina, utm: utm(), vid: vid() }),
      });
      var body = await r.json();
      if (body && body.stato) {
        dati.statoPgm = String(body.stato);
        dati.statoNucleo = String(body.statoNucleo || body.stato);
        dati.memberId = body.memberId || null;
        dati.memberType = String(body.memberType || '');
        // L'anagrafica c'è: i suoi dati diventano il precompilato dei campi
        // che verranno. È quello che faceva il form di n8n leggendoli dal
        // record PerfectGym, e risparmia tre campi a chi il club conosce già.
        precompila(body);
      }
    } catch (e) {
      // PerfectGym irraggiungibile: si prosegue come contatto nuovo. La
      // verifica vera la rifà comunque n8n quando riceve la richiesta.
      dati.statoPgm = 'errore';
      dati.statoNucleo = 'errore';
    }

    attendi(btnVerifica, false);

    if (dati.statoPgm === 'email_non_valida') {
      mostraErrore(steps.email, ERR.email);
      segnala(campoEmail);
      return;
    }

    if (dati.macroDaCta) {
      /* `storia` finta di proposito: «Indietro» dal ramo porta alla scelta
         dell'area, non all'email. Chi è arrivato dalla pagina della pallanuoto
         e voleva chiedere d'altro ha comunque una strada, senza ricominciare. */
      storia = ['macro'];
      scegliMacro(dati.macroDaCta);
      return;
    }
    mostraStep('macro');
  }

  function precompila(body) {
    if (body.nome) dati.nome = String(body.nome);
    if (body.cognome) dati.cognome = String(body.cognome);
    /* Il numero che PerfectGym restituisce è già internazionale (`+39340…`): si
       mette nel campo così com'è, e `componiTelefono` scarta il prefisso
       ripetuto quando lo ricompone. */
    if (body.telefono) dati.cellulare = String(body.telefono);
    [
      ['#' + P + '-nome', dati.nome],
      ['#' + P + '-cognome', dati.cognome],
      ['#' + P + '-cellulare', dati.cellulare],
      ['#' + P + '-g-nome', dati.nome],
      ['#' + P + '-g-cognome', dati.cognome],
      ['#' + P + '-g-cellulare', dati.cellulare],
    ].forEach(function (coppia) {
      var campo = q(coppia[0]);
      if (campo && !campo.value && coppia[1]) campo.value = coppia[1];
    });
  }

  /**
   * L'area, dedotta dal pulsante da cui si è partiti.
   *
   * I comandi delle pagine junior portano `data-cta-activity` con lo slug del
   * corso — `pallanuoto`, `scuola-nuoto-bambini` — che è lo stesso vocabolario
   * di `activities.ts` e quindi lo stesso degli `id` delle macro. Chi arriva da
   * lì ha **già detto** di cosa vuole parlare, e richiederlo è la domanda che
   * fa chiudere il pannello: il passo si salta.
   *
   * Per un'attività per adulti — `gym-floor`, `reformer` — la macro è `adulti` e
   * lo slug diventa la pastiglia già spuntata al passo dopo. Oggi non ci sono
   * comandi `resolve` sulle pagine adulti, ma il giorno che ci saranno funziona
   * senza toccare niente.
   */
  function macroDa(attivita) {
    if (!attivita) return '';
    if (MACRO_BY_ID[attivita]) return attivita;
    var adulta = ATTIVITA_ADULTI.some(function (a) { return a.id === attivita; });
    return adulta ? 'adulti' : '';
  }

  // ── Passo 2: la macro attività, e il bivio ────────────────────────────────
  function scegliMacro(id) {
    var macro = MACRO_BY_ID[id];
    if (!macro) return;
    dati.macro = macro.id;
    dati.ramo = macro.ramo;
    dati.gruppo = macro.gruppo;

    // Le domande sul livello in acqua valgono per scuola nuoto, agonistico e
    // pallanuoto, non per il baby: a tre mesi non si chiede lo stile libero.
    var livello = q('[data-cf-livello]');
    if (livello) livello.hidden = macro.ramo !== 'junior';

    if (macro.ramo === 'adulti') {
      /* L'attività da cui si è partiti è già spuntata: una pastiglia sola,
         non tutte — chi arriva dalla pagina del reformer vuole parlare del
         reformer, e può aggiungerne altre se gli servono. */
      if (dati.attivitaOrigine) {
        var chip = q('[data-cf-attivita][value="' + dati.attivitaOrigine + '"]');
        if (chip) chip.checked = true;
      }
      mostraStep('adulti');
      return;
    }
    // Junior e baby: chi ha già l'anagrafica non ne crea una seconda.
    if (vaAlPortale()) {
      inviaEPortale();
      return;
    }
    mostraStep('bambino');
  }

  /**
   * Se questa email ha già un profilo sul portale.
   *
   * La regola sta in `data/contatto.ts`, perché la usa anche il controllo
   * davanti ai pulsanti d'iscrizione: due copie della stessa condizione sono
   * due condizioni che a un certo punto rispondono in modo diverso.
   */
  function vaAlPortale() {
    return haGiaAccount({ memberType: dati.memberType, stato: dati.statoPgm });
  }

  // ── Ramo adulti ───────────────────────────────────────────────────────────
  var campoRichiesta = q('#' + P + '-richiesta');
  var campoNome = q('#' + P + '-nome');
  var campoCognome = q('#' + P + '-cognome');
  var campoCellulare = q('#' + P + '-cellulare');
  var campoPrivacy = q('#' + P + '-privacy');
  var campoMarketing = q('#' + P + '-marketing');

  function attivitaScelte() {
    return qa('[data-cf-attivita]:checked').map(function (c) {
      return c.value;
    });
  }

  function avantiAdulti() {
    pulisciErrore(steps.adulti);
    togliSegno(campoRichiesta);

    var scelte = attivitaScelte();
    if (scelte.length === 0) {
      mostraErrore(steps.adulti, ERR.attivita);
      return;
    }
    if (!campoRichiesta.value.trim()) {
      mostraErrore(steps.adulti, ERR.richiesta);
      segnala(campoRichiesta);
      return;
    }
    dati.attivita = scelte;
    dati.richiesta = campoRichiesta.value.trim();
    mostraStep('dati');
  }

  async function inviaAdulti() {
    pulisciErrore(steps.dati);
    [campoNome, campoCognome, campoCellulare].forEach(togliSegno);

    if (!campoNome.value.trim()) {
      mostraErrore(steps.dati, ERR.nome);
      segnala(campoNome);
      return;
    }
    if (!campoCognome.value.trim()) {
      mostraErrore(steps.dati, ERR.cognome);
      segnala(campoCognome);
      return;
    }
    var telcampoCellulare = telefonoDa(campoCellulare);
    if (!telcampoCellulare.ok) {
      mostraErrore(steps.dati, telcampoCellulare.motivo);
      segnala(campoCellulare);
      return;
    }
    if (!campoPrivacy.checked) {
      mostraErrore(steps.dati, ERR.privacy);
      campoPrivacy.focus();
      return;
    }

    dati.nome = campoNome.value.trim();
    dati.cognome = campoCognome.value.trim();
    dati.cellulare = telcampoCellulare.e164;
    dati.privacy = true;
    dati.marketing = !!(campoMarketing && campoMarketing.checked);

    await spedisci(q('[data-cf-invia-adulti]'));
    mostraEsito('adulti');
  }

  // ── Rami baby e junior ────────────────────────────────────────────────────
  var bNome = q('#' + P + '-b-nome');
  var bCognome = q('#' + P + '-b-cognome');
  var bNascita = q('#' + P + '-b-nascita');
  var gNome = q('#' + P + '-g-nome');
  var gCognome = q('#' + P + '-g-cognome');
  var gNascita = q('#' + P + '-g-nascita');
  var gCellulare = q('#' + P + '-g-cellulare');
  var gPrivacy = q('#' + P + '-g-privacy');
  var gMarketing = q('#' + P + '-g-marketing');

  /** La risposta a una delle tre domande sul nuoto: true, false o null. */
  function rispostaLivello(id) {
    var scelta = root.querySelector('[name="' + P + '-' + id + '"]:checked');
    if (!scelta) return null;
    return scelta.value === 'si';
  }

  function avantiBambino() {
    pulisciErrore(steps.bambino);
    [bNome, bCognome, bNascita].forEach(togliSegno);

    if (!bNome.value.trim()) {
      mostraErrore(steps.bambino, ERR.bnome);
      segnala(bNome);
      return;
    }
    if (!bCognome.value.trim()) {
      mostraErrore(steps.bambino, ERR.bcognome);
      segnala(bCognome);
      return;
    }
    if (!bNascita.value) {
      mostraErrore(steps.bambino, ERR.bnascita);
      segnala(bNascita);
      return;
    }

    var livello = {
      haFrequentato: null,
      saNuotare: null,
      stileLibero: null,
    };
    if (dati.ramo === 'junior') {
      livello.haFrequentato = rispostaLivello('haFrequentato');
      livello.saNuotare = rispostaLivello('saNuotare');
      livello.stileLibero = rispostaLivello('stileLibero');
      // Le due obbligatorie sono le stesse del form di oggi: la prima resta
      // facoltativa perché lo era, e un genitore incerto passa oltre invece
      // di rispondere a caso.
      if (livello.saNuotare === null || livello.stileLibero === null) {
        mostraErrore(steps.bambino, ERR.livello);
        return;
      }
    }

    dati.bambino = {
      nome: bNome.value.trim(),
      cognome: bCognome.value.trim(),
      dataNascita: bNascita.value,
      haFrequentato: livello.haFrequentato,
      saNuotare: livello.saNuotare,
      stileLibero: livello.stileLibero,
    };
    mostraMotivoGenitore();
    mostraStep('genitore');
  }

  async function inviaGenitore() {
    pulisciErrore(steps.genitore);
    [gNome, gCognome, gNascita, gCellulare].forEach(togliSegno);

    if (!gNome.value.trim()) {
      mostraErrore(steps.genitore, ERR.nome);
      segnala(gNome);
      return;
    }
    if (!gCognome.value.trim()) {
      mostraErrore(steps.genitore, ERR.cognome);
      segnala(gCognome);
      return;
    }
    if (!gNascita.value) {
      mostraErrore(steps.genitore, ERR.nascita);
      segnala(gNascita);
      return;
    }
    var telgCellulare = telefonoDa(gCellulare);
    if (!telgCellulare.ok) {
      mostraErrore(steps.genitore, telgCellulare.motivo);
      segnala(gCellulare);
      return;
    }
    if (!gPrivacy.checked) {
      mostraErrore(steps.genitore, ERR.privacy);
      gPrivacy.focus();
      return;
    }

    dati.nome = gNome.value.trim();
    dati.cognome = gCognome.value.trim();
    dati.nascita = gNascita.value;
    dati.cellulare = telgCellulare.e164;
    dati.privacy = true;
    dati.marketing = !!(gMarketing && gMarketing.checked);

    await spedisci(q('[data-cf-invia-genitore]'));
    mostraEsito(dati.ramo === 'junior' ? 'junior' : 'baby');
  }

  /** Il ramo di chi ha già l'anagrafica: si registra la richiesta e si spiega
      come entrare nel portale, invece di creare un secondo profilo. */
  async function inviaEPortale() {
    await spedisci(null);
    var per = q('[data-cf-portale-ramo]');
    if (per) per.textContent = dati.ramo === 'baby' ? 'baby nuoto' : 'corsi junior';
    var seguito = q('[data-cf-portale-seguito]');
    if (seguito) seguito.hidden = dati.ramo !== 'junior';
    mostraStep('portale');
  }

  // ── L'invio ───────────────────────────────────────────────────────────────
  function payload(extra) {
    var base = {
      tipo: 'contatto',
      /** Quale ramo del form: `adulti`, `baby` o `junior`. */
      flow: dati.ramo,
      macro: dati.macro,
      gruppoAttivita: dati.gruppo,
      attivita: dati.attivita,
      richiesta: dati.richiesta,
      email: dati.email,
      nome: dati.nome,
      cognome: dati.cognome,
      cellulare: dati.cellulare,
      telefono: dati.cellulare || '',
      dataNascita: dati.nascita,
      bambino: dati.bambino,
      richiamoTelefonico: dati.richiamo,
      richiestaId: dati.richiestaId,
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
      attivitaOrigine: dati.attivitaOrigine,
      macroDaCta: dati.macroDaCta,
      utm: utm(),
      vid: vid(),
    };
    if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }

  async function spedisci(btn, extra) {
    attendi(btn, true);
    try {
      var r = await fetch(WEBHOOK_CONTATTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(extra)),
      });
      // n8n risponde con l'id della riga appena scritta su Supabase, e serve al
      // secondo invio — la risposta sul richiamo telefonico, che nel ramo
      // junior arriva qualche secondo dopo. Con l'id l'aggiornamento colpisce
      // quella riga; senza, n8n dovrebbe indovinarla filtrando per email, e
      // due richieste della stessa persona diventerebbero indistinguibili.
      var risposta = await r.json();
      if (risposta && risposta.richiestaId) dati.richiestaId = String(risposta.richiestaId);

      /* Un evento per lead, e questa funzione viene chiamata due volte per la
         stessa persona: la seconda da `onPrenotato` del calendario, con
         `aggiornamento: 'richiamo'`, che non è un contatto nuovo ma un update
         della riga già scritta (n8n la colpisce per `richiestaId`). Senza il
         guardo, chi prenota il richiamo nel ramo junior contava due volte.

         Il push sta qui e non nei rami chiamanti — «adulti» e
         «genitore/bambino» passano entrambi da qui — e sta dentro il `try`,
         perché il `catch` sotto prosegue in silenzio anche quando la richiesta
         non è mai arrivata. */
      if (!extra || !extra.aggiornamento) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'lead_submit', lead_source: 'contatti' });
      }
    } catch (e) {
      // Dal punto di vista della persona la richiesta è partita, e dirle il
      // contrario a schermo non le dà niente da fare. Il contatto perso resta
      // un problema nostro, e n8n lo vede dal log del webhook. Vale anche per
      // la risposta illeggibile: si prosegue senza id.
    }
    attendi(btn, false);
  }

  // ── L'esito, e il calendario dentro la pagina ─────────────────────────────
  //
  // Il pulsante che portava su Calendly è diventato il calendario stesso, sotto
  // la domanda «Vuoi essere ricontattato?». Il come — script pigro, le due reti
  // di sicurezza, la conferma della prenotazione — sta in
  // `calendario.client.js`, condiviso con il form della prova e con la chat, e
  // lì c'è anche il perché di ognuna. Qui resta solo cosa prenota questo form:
  // quale dei tre eventi, con quale precompilato, e cosa fare quando Calendly
  // conferma.

  function baseCalendario() {
    if (dati.ramo === 'adulti') return CALENDLY.richiamami;
    if (dati.ramo === 'baby') return CALENDLY.baby;
    return CALENDLY.assistenza;
  }

  /** Il precompilato: `location` è il campo del telefono negli eventi
      «chiamata» di Calendly, cioè il numero su cui il club richiama. */
  function precompilato() {
    return {
      name: (dati.nome + ' ' + dati.cognome).trim(),
      email: dati.email,
      location: dati.cellulare || '',
    };
  }

  var calendario = null;

  async function apriCalendario() {
    if (calendario) calendario.distruggi();
    calendario = await montaCalendario({
      riquadro: q('[data-cf-calendario]'),
      ripiego: q('[data-cf-cal-ripiego]'),
      link: q('[data-cf-cal-link]'),
      url: baseCalendario(),
      prefill: precompilato(),
      onPrenotato: function () {
        dati.richiamo = true;
        var fatto = q('[data-cf-cal-fatto]');
        if (fatto) fatto.hidden = false;
        // Secondo POST: n8n aggiorna la riga per id, e il desk vede un
        // appuntamento fissato invece di un'intenzione dichiarata.
        spedisci(null, { aggiornamento: 'richiamo' });
      },
    });
  }

  /** Il passo «E di te» spiega perché servono quei dati, e il perché cambia
   *  con l'attività: la Scuola Nuoto Bambini, l'agonistico e la pallanuoto
   *  (ramo `junior`) danno accesso a turni e costi, il Baby Nuoto (ramo
   *  `baby`) dà la prenotazione delle lezioni. */
  function mostraMotivoGenitore() {
    qa('[data-cf-genitore-motivo]').forEach(function (blocco) {
      blocco.hidden = blocco.dataset.cfGenitoreMotivo !== dati.ramo;
    });
  }

  function mostraEsito(variante) {
    qa('[data-cf-esito]').forEach(function (blocco) {
      blocco.hidden = blocco.dataset.cfEsito !== variante;
    });
    qa('[data-cf-esito-link]').forEach(function (a) {
      a.hidden = a.dataset.cfEsitoLink !== variante;
    });
    qa('[data-cf-preiscrizioni]').forEach(function (el) {
      el.href = PREISCRIZIONI;
    });
    var fatto = q('[data-cf-cal-fatto]');
    if (fatto) fatto.hidden = true;

    // Il pannello si allarga prima di montare il widget, così Calendly misura
    // la larghezza definitiva e non quella di mezzo passaggio.
    root.classList.add('cf--largo');
    mostraStep('esito');
    apriCalendario();
  }

  // ── Eventi ────────────────────────────────────────────────────────────────
  if (btnVerifica) btnVerifica.addEventListener('click', verifica);

  qa('[data-cf-macro]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      scegliMacro(btn.dataset.cfMacro);
    });
  });

  var btnAvantiAdulti = q('[data-cf-avanti-adulti]');
  if (btnAvantiAdulti) btnAvantiAdulti.addEventListener('click', avantiAdulti);

  var btnInviaAdulti = q('[data-cf-invia-adulti]');
  if (btnInviaAdulti) btnInviaAdulti.addEventListener('click', inviaAdulti);

  var btnAvantiBambino = q('[data-cf-avanti-bambino]');
  if (btnAvantiBambino) btnAvantiBambino.addEventListener('click', avantiBambino);

  var btnInviaGenitore = q('[data-cf-invia-genitore]');
  if (btnInviaGenitore) btnInviaGenitore.addEventListener('click', inviaGenitore);

  /* «cambia» rinuncia alla preselezione: da qui in poi i passi tornano tre, e
     il contatore lo dice. */
  var btnCambia = q('[data-cf-contesto-cambia]');
  if (btnCambia) {
    btnCambia.addEventListener('click', function () {
      dati.macroDaCta = '';
      numeraPassi();
      mostraContesto();
      mostraStep('macro');
    });
  }

  qa('[data-cf-indietro]').forEach(function (btn) {
    btn.addEventListener('click', indietro);
  });

  // Invio da tastiera: dentro un campo, Enter fa avanzare il passo corrente.
  // Non nella textarea della richiesta, dove Enter è un capoverso.
  qa('input').forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (attuale === 'email') verifica();
      else if (attuale === 'adulti') avantiAdulti();
      else if (attuale === 'dati') inviaAdulti();
      else if (attuale === 'bambino') avantiBambino();
      else if (attuale === 'genitore') inviaGenitore();
    });
  });

  /**
   * Svuota tutto: lo stato, i campi, i segni di errore, la storia.
   *
   * La chiama `open`, e questa è la parte che conta. Il modal si chiude senza
   * svuotarsi — la chiusura è solo una classe che va via — quindi senza questo
   * chi lo riapre trova le risposte di prima ancora nei campi. Su un computer
   * personale è un fastidio; sul **totem all'ingresso del club** sono il nome,
   * il cellulare e la data di nascita del figlio della persona precedente,
   * mostrati a quella dopo. Il form si apre vuoto, sempre.
   */
  function pulisci() {
    dati = stato();
    qa('input, textarea').forEach(function (c) {
      if (c.type === 'checkbox' || c.type === 'radio') c.checked = false;
      else c.value = '';
      togliSegno(c);
    });
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) pulisciErrore(steps[k]);
    });
    storia = [];
    numeraPassi();
    mostraContesto();
    root.classList.remove('cf--largo');
    if (calendario) {
      calendario.distruggi();
      calendario = null;
    }
  }

  return {
    open: function (origine, cta, attivita) {
      pulisci();
      // La pagina la sa il browser. `origine` è il punto del sito da cui parte
      // il comando — "header", "footer", "/promo" — e non sempre coincide con
      // la pagina: l'header è su tutte.
      dati.pagina = location.pathname;
      dati.origine = origine || '';
      dati.cta = cta || '';
      dati.attivitaOrigine = attivita || '';
      dati.macroDaCta = macroDa(dati.attivitaOrigine);
      numeraPassi();
      mostraContesto();
      mostraStep('email', true);
    },
    reset: function () {
      pulisci();
      mostraStep('email', true);
      onReset();
    },
  };
}
