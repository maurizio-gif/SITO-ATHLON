// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica del form «Prova Athlon». Vive qui e non dentro il componente per
// la stessa ragione per cui al TCA vive in `leadForm.client.js`: il giorno in
// cui la prova avrà anche una versione incorporata in pagina — in fondo a
// /abbonamenti, per dire — le due copie divergerebbero al primo bug corretto
// in una sola delle due. Il componente passa il proprio nodo radice e il
// prefisso degli id, e questa funzione fa il resto.
//
// Il percorso ha quattro schermate e una regola sola che le decide:
//
//   email → verifica ─┬─ è già socio      → «non attivabile», si va agli abbonamenti
//                     └─ non lo è         → dati → codice GOLD7 e istruzioni
//
// La regola è la stessa del workflow n8n «PROVA SITO - ATHLON»: il Guest Pass
// è per chi non ha né ha mai avuto un abbonamento, quindi `memberType`
// «Member» in PerfectGym è l'unico stato che chiude la strada. Chi risulta
// solo come contatto (`Guest`) e chi non risulta affatto proseguono uguale.
// Se PerfectGym non risponde si prosegue: meglio un lead in più da verificare
// a mano che una richiesta persa per un timeout.

import { CALENDLY } from '../data/calendly';
import { montaCalendario } from './calendario.client.js';
import { validaTelefono } from '../data/prefissi';

export function initProvaForm(root, options) {
  var P = options.prefix;
  var onReset = options.onReset || function () {};

  var WEBHOOK_CHECK = 'https://automazione.n8ndevelop.it/webhook/athlon-verifica-iscritto';
  var WEBHOOK_LEAD = 'https://automazione.n8ndevelop.it/webhook/athlon-prova-compilata';

  /** Il codice e la destinazione dell'iscrizione: stessi valori di /abbonamenti. */
  var CODICE = 'GOLD7';

  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    nome: 'Serve il tuo nome.',
    cognome: 'Serve il tuo cognome.',
    invio: 'Non siamo riusciti a inviare la richiesta. Riprova tra poco.',
  };

  function stato() {
    return {
      email: '',
      nome: '',
      cognome: '',
      cellulare: '',
      statoPgm: 'nuovo',
      pagina: '',
      origine: '',
      cta: '',
      attivita: '',
    };
  }
  var dati = stato();

  // ── Attribuzione ──────────────────────────────────────────────────────────
  // Le due funzioni arrivano da `scripts/attribuzione.ts`, caricato dal Layout.
  // Se per qualsiasi motivo non ci fossero, il form continua a funzionare: il
  // payload parte senza attribuzione invece di non partire.
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
  var steps = {
    email: q('#' + P + '-step-email'),
    dati: q('#' + P + '-step-dati'),
    blocco: q('#' + P + '-step-blocco'),
    esito: q('#' + P + '-step-esito'),
  };
  var campoEmail = q('#' + P + '-email');
  var campoNome = q('#' + P + '-nome');
  var campoCognome = q('#' + P + '-cognome');
  var campoCellulare = q('#' + P + '-cellulare');
  var btnVerifica = q('[data-pf-verifica]');
  var btnInvia = q('[data-pf-invia]');

  // ── Validazione ───────────────────────────────────────────────────────────
  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }

  /**
   * Il numero, in forma internazionale, dal prefisso scelto e da quello scritto.
   *
   * Sostituisce un `cellulareNudo()` che toglieva `+39` e `0039` e restituiva le
   * cifre nude, e un `cellulareValido()` che controllava `^3\d{8,9}$`. Due cose
   * non funzionavano: il numero nudo veniva poi ricomposto con un `'+39' +`
   * scritto altrove — quindi chi ha un numero straniero non poteva lasciarlo —
   * e la forma giusta non basta, perché `3333333333` la rispetta.
   */
  function telefonoDa(campo) {
    var pref = q('#' + P + '-cellulare-prefisso');
    return validaTelefono(pref ? pref.value : '+39', campo ? campo.value : '');
  }
  /**
   * Riempie i campi del secondo passo con quello che la verifica ha restituito.
   *
   * Solo i campi vuoti: se la persona ha già scritto qualcosa, quello che ha
   * scritto vince. E restano visibili e modificabili — non nascosti — perché
   * un dato che arriva da un sistema va potuto guardare prima di confermarlo.
   */
  function precompila(body) {
    if (body.nome) dati.nome = String(body.nome);
    if (body.cognome) dati.cognome = String(body.cognome);
    /* Il numero che PerfectGym restituisce è già in forma internazionale
       (`+39340…`): si mette nel campo così com'è, e la tendina lo riconosce
       perché `componiTelefono` scarta il prefisso ripetuto. */
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
    var box = step.querySelector('[data-pf-errore]');
    if (!box) return;
    box.textContent = testo;
    box.hidden = false;
  }
  function pulisciErrore(step) {
    var box = step.querySelector('[data-pf-errore]');
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }
  function segnala(campo) {
    campo.classList.add('pf__input--errore');
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
  function togliSegno(campo) {
    campo.classList.remove('pf__input--errore');
    campo.removeAttribute('aria-invalid');
  }

  // ── Navigazione ───────────────────────────────────────────────────────────
  var attuale = 'email';

  /* ── Il calendario del richiamo ────────────────────────────────────────────
     Sull'ultima schermata, sotto il codice. La logica dell'embed — script
     pigro, ripiego se non carica, conferma della prenotazione — sta in
     `calendario.client.js`, condivisa con il form dei contatti e con la chat.

     L'evento è `richiamami`, quello degli adulti: chi attiva un Guest Pass è
     un adulto, e la chiamata serve a farlo partire, non a inserire un bambino
     in un corso. */
  var calendario = null;

  async function apriCalendario() {
    if (calendario) calendario.distruggi();
    root.classList.add('pf--largo');
    calendario = await montaCalendario({
      riquadro: q('[data-pf-calendario]'),
      ripiego: q('[data-pf-cal-ripiego]'),
      link: q('[data-pf-cal-link]'),
      url: CALENDLY.richiamami,
      prefill: {
        name: (dati.nome + ' ' + dati.cognome).trim(),
        email: dati.email,
        // `location` è il campo del telefono negli eventi «chiamata».
        location: dati.cellulare || '',
      },
      onPrenotato: function () {
        var fatto = q('[data-pf-cal-fatto]');
        if (fatto) fatto.hidden = false;
      },
    });
  }

  function chiudiCalendario() {
    root.classList.remove('pf--largo');
    if (calendario) {
      calendario.distruggi();
      calendario = null;
    }
  }

  function mostraStep(nome) {
    attuale = nome;
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    // Il widget si monta solo qui, e non all'apertura del modal: è un terzo
    // dominio, e chi non arriva in fondo non deve pagarne DNS, TLS e script.
    if (nome === 'esito') apriCalendario();
    else chiudiCalendario();
    // Il titolo del passo raccoglie il focus: chi naviga da tastiera o con lo
    // screen reader si ritrova all'inizio della schermata nuova e non sul
    // pulsante di prima, che ora è nascosto.
    var titolo = steps[nome] && steps[nome].querySelector('[data-pf-fuoco]');
    if (titolo) {
      void titolo.offsetWidth;
      titolo.focus();
    }
  }

  function attendi(btn, acceso) {
    btn.disabled = acceso;
    btn.classList.toggle('pf__btn--attesa', acceso);
  }

  // ── Passo 1: l'email, e la verifica su PerfectGym ────────────────────────
  async function verifica() {
    pulisciErrore(steps.email);
    togliSegno(campoEmail);

    if (!emailValida(campoEmail.value)) {
      mostraErrore(steps.email, ERR.email);
      segnala(campoEmail);
      return;
    }
    dati.email = campoEmail.value.trim();
    // Ricordata qui e non all'invio del lead: a questo punto l'indirizzo è
    // valido e la persona l'ha confermato premendo. Se poi abbandona il
    // secondo passo, la prossima volta trova comunque il campo pieno.
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(dati.email);
    attendi(btnVerifica, true);

    var risultato = 'nuovo';
    try {
      var r = await fetch(WEBHOOK_CHECK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dati.email,
          pagina: dati.pagina,
          origine: dati.origine,
          cta: dati.cta,
          attivita: dati.attivita,
          utm: utm(),
          vid: vid(),
        }),
      });
      var body = await r.json();
      if (body && body.stato) risultato = String(body.stato);
      /* La verifica non risponde solo «chi sei»: se PerfectGym ha già
         l'anagrafica — un socio, o chi ha lasciato i dati un'altra volta —
         torna anche con nome, cognome e telefono. Prima li buttavamo e li
         richiedevamo, cioè facevamo una domanda a cui la persona aveva già
         risposto. L'assistente li usa per saltare il passo e «contattaci» per
         precompilarlo; qui si fa come «contattaci», perché chi si iscrive a una
         prova deve poterli rileggere e correggere prima di mandarli. */
      if (body) precompila(body);
    } catch (e) {
      // PerfectGym irraggiungibile: si prosegue come se fosse un contatto
      // nuovo. La verifica vera la rifà comunque n8n quando crea il lead.
      risultato = 'errore';
    }

    attendi(btnVerifica, false);
    dati.statoPgm = risultato;

    if (risultato === 'iscritto') {
      mostraStep('blocco');
    } else {
      mostraStep('dati');
    }
  }

  // ── Passo 2: i dati, e il lead ───────────────────────────────────────────
  async function invia() {
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
    var tel = telefonoDa(campoCellulare);
    if (!tel.ok) {
      mostraErrore(steps.dati, tel.motivo);
      segnala(campoCellulare);
      return;
    }

    dati.nome = campoNome.value.trim();
    dati.cognome = campoCognome.value.trim();
    /* Il numero completo, col `+`: chi lo riceve non deve più incollarci niente
       davanti. Era il numero nudo, e il prefisso lo aggiungeva chi lo usava —
       una riga per ogni consumatore, e ognuna assumeva l'Italia. */
    dati.cellulare = tel.e164;
    attendi(btnInvia, true);

    try {
      await fetch(WEBHOOK_LEAD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'prova',
          email: dati.email,
          nome: dati.nome,
          cognome: dati.cognome,
          cellulare: dati.cellulare,
          telefono: '+39' + dati.cellulare,
          stato: dati.statoPgm,
          codice: CODICE,
          pagina: dati.pagina,
          origine: dati.origine,
          cta: dati.cta,
          attivita: dati.attivita,
          utm: utm(),
          vid: vid(),
        }),
      });

      /* Dentro il `try` e non accanto a `mostraStep('esito')`: quello step si
         mostra anche quando la fetch fallisce — il `catch` qui sotto è vuoto di
         proposito, perché il codice è della persona comunque — e un evento di
         conversione spedito su una richiesta mai arrivata conterebbe un lead
         che n8n non ha. */
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'prova' });
    } catch (e) {
      // La richiesta è partita dal punto di vista della persona: il codice è
      // suo e glielo diamo lo stesso. Il lead perso resta un problema nostro,
      // e n8n lo vede dal log del webhook.
    }

    attendi(btnInvia, false);
    mostraStep('esito');
  }

  // ── Eventi ────────────────────────────────────────────────────────────────
  if (btnVerifica) btnVerifica.addEventListener('click', verifica);
  if (btnInvia) btnInvia.addEventListener('click', invia);

  // Invio da tastiera: dentro un campo, Enter fa avanzare il passo corrente.
  root.querySelectorAll('input').forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (attuale === 'email') verifica();
      else if (attuale === 'dati') invia();
    });
  });

  // Copia del codice: stessa meccanica del pulsante su /abbonamenti, compreso
  // il caso in cui la clipboard sia negata — lo dice, invece di fingere.
  root.querySelectorAll('[data-copy-code]').forEach(function (btn) {
    var codice = btn.dataset.copyCode || '';
    var testo = btn.textContent;
    btn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(codice);
        btn.textContent = codice + ' · copiato ✓';
        btn.classList.add('copied');
      } catch (e) {
        btn.textContent = codice + ' · copia a mano';
      }
      window.setTimeout(function () {
        btn.textContent = testo;
        btn.classList.remove('copied');
      }, 2000);
    });
  });

  function reset() {
    chiudiCalendario();
    dati = stato();
    [campoEmail, campoNome, campoCognome, campoCellulare].forEach(function (c) {
      if (!c) return;
      c.value = '';
      togliSegno(c);
    });
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) pulisciErrore(steps[k]);
    });
    mostraStep('email');
    onReset();
  }

  return {
    open: function (origine, cta, attivita) {
      // La pagina la sa il browser. `origine` e' il punto del sito da cui
      // parte il comando — "header" o "/gym-floor" — e non sempre coincide
      // con la pagina: l'header e' su tutte.
      dati.pagina = location.pathname;
      dati.origine = origine || '';
      dati.cta = cta || '';
      dati.attivita = attivita || '';
      mostraStep('email');
    },
    reset: reset,
  };
}
