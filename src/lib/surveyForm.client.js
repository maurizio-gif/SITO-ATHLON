// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La meccanica delle mini survey. Il perché delle domande sta in
// `data/surveys.ts`; qui ci sono i tre punti che dal codice non si leggono.
//
// **La soglia non è scritta qui.** `giudizioPositivo()` sta nei dati e la
// riapplica n8n prima di scrivere `positivo` su Supabase: una soglia scritta in
// tre posti risponde in tre modi al primo ritocco. Da qui si importa.
//
// **La nota compare e sparisce mentre la persona risponde**, non dopo l'invio.
// Chiederla dopo vorrebbe dire una schermata in più su un modulo che dura venti
// secondi, e la risposta la scriverebbe solo chi ha già deciso di scrivere;
// mostrarla nel momento in cui il giudizio scende sotto la soglia la mette
// davanti a chi sta pensando proprio a quella cosa. Se poi la persona alza i
// voti il campo si richiude — ma **quello che ha scritto resta nel campo**, e
// se il giudizio finale è positivo la nota parte comunque: un testo scritto e
// poi buttato dal codice è il modo peggiore di trattare l'unica risposta libera
// che questo modulo raccoglie.
//
// **L'invio può fallire e lo si dice.** È l'eccezione alla regola dei form del
// sito, dove qualunque errore lascia passare: là in fondo c'è una richiesta che
// costa più se si perde che se si duplica, qui c'è un giudizio — mandarlo due
// volte sporca la media, e dire «grazie» per una risposta che non è arrivata è
// una bugia che nessuno può scoprire. Quindi errore in chiaro e il pulsante
// torna premibile.
import { WEBHOOK_SONDAGGIO, RECENSIONE_GOOGLE, giudizioPositivo } from '../data/surveys';
import { leggi as userNumberConosciuto } from '../scripts/numeroSocio';

(function () {
  var pagina = document.querySelector('main.sq[data-survey]');
  if (!pagina) return;

  var SONDAGGIO = pagina.getAttribute('data-survey');
  var ATTESA_INVIO = 10000;

  var form = pagina.querySelector('[data-sq-form]');
  var passi = {
    form: pagina.querySelector('[data-sq-passo="form"]'),
    positivo: pagina.querySelector('[data-sq-passo="positivo"]'),
    grazie: pagina.querySelector('[data-sq-passo="grazie"]'),
  };
  var blocchi = Array.prototype.slice.call(pagina.querySelectorAll('[data-sq-domanda]'));
  var nota = pagina.querySelector('[data-sq-nota]');
  var campoNota = pagina.querySelector('#sq-nota');
  var campoEmail = pagina.querySelector('#sq-email');
  var riconosciuto = pagina.querySelector('[data-sq-riconosciuto]');
  var errore = pagina.querySelector('[data-sq-errore]');
  var btnInvia = pagina.querySelector('[data-sq-invia]');
  var spinner = pagina.querySelector('[data-sq-spinner]');
  var etichetta = pagina.querySelector('[data-sq-etichetta]');
  var linkGoogle = pagina.querySelector('[data-sq-google]');

  if (linkGoogle) linkGoogle.href = RECENSIONE_GOOGLE;

  // ── Chi sta rispondendo, se lo sappiamo ───────────────────────────────────
  //
  // L'ordine è quello dichiarato in `data/surveys.ts`: prima il link, poi il
  // ricordo del browser, poi il campo. Un'email nell'URL **vince sul ricordo**
  // e toglie `data-email-nota` dal campo, o `emailNota.ts` lo riempirebbe di
  // nuovo al primo fuoco — è la stessa trappola già vista sul modulo del tour.
  var identita = { email: '', userNumber: '', daLink: false };

  function daUrl(chiavi) {
    try {
      var p = new URLSearchParams(location.search);
      for (var i = 0; i < chiavi.length; i++) {
        var v = (p.get(chiavi[i]) || '').trim();
        if (v) return v;
      }
    } catch (e) {
      /* URL illeggibile: si va avanti senza */
    }
    return '';
  }

  function emailValida(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  (function riconosci() {
    var email = daUrl(['email', 'Email', 'EMAIL']).toLowerCase();
    if (email && emailValida(email)) {
      identita.email = email;
      identita.daLink = true;
      if (campoEmail) {
        campoEmail.value = email;
        campoEmail.removeAttribute('data-email-nota');
      }
    }

    /* Il numero socio non ha un campo e non si digita: `leggi()` guarda in
       ordine il link, la visita e il ricordo dietro consenso funzionale, e
       memorizza da sé quello che trova nell'URL. Qui non c'è niente da
       aggiungere — rileggere `UserNumber` a mano vorrebbe dire scrivere una
       seconda volta la stessa precedenza. */
    var numero = '';
    try {
      numero = userNumberConosciuto() || '';
    } catch (e) {
      numero = '';
    }
    identita.userNumber = numero || '';

    if (riconosciuto && (identita.daLink || identita.userNumber)) {
      riconosciuto.textContent = identita.daLink
        ? 'Rispondi come ' + identita.email + '. Se non sei tu, cambia l’indirizzo o svuota il campo.'
        : 'Sappiamo già chi sei dal link con cui sei arrivato.';
      riconosciuto.hidden = false;
    }
  })();

  // ── I voti ────────────────────────────────────────────────────────────────
  function voti() {
    var lista = [];
    blocchi.forEach(function (b) {
      var scelto = b.querySelector('input[data-sq-stella]:checked');
      lista.push({
        id: b.getAttribute('data-sq-domanda'),
        voto: scelto ? Number(scelto.value) : null,
      });
    });
    return lista;
  }

  function media(lista) {
    var dati = lista.filter(function (v) {
      return v.voto !== null;
    });
    if (!dati.length) return null;
    var somma = dati.reduce(function (t, v) {
      return t + v.voto;
    }, 0);
    return Math.round((somma / dati.length) * 100) / 100;
  }

  function nps() {
    var scelto = pagina.querySelector('input[data-sq-nps]:checked');
    return scelto ? Number(scelto.value) : null;
  }

  /**
   * La nota si mostra quando c'è già un giudizio **e** non è positivo.
   *
   * Le due condizioni insieme, o al caricamento la pagina si aprirebbe con
   * «cosa potevamo fare meglio» prima che la persona abbia detto che qualcosa
   * non va — che è il modo di far cominciare male una survey.
   */
  function aggiornaNota() {
    if (!nota) return;
    var lista = voti();
    var m = media(lista);
    var n = nps();
    var risposto = m !== null || n !== null;
    nota.hidden = !(risposto && !giudizioPositivo(m, n));
  }

  pagina.addEventListener('change', function (e) {
    if (e.target && e.target.matches('input[data-sq-stella], input[data-sq-nps]')) {
      aggiornaNota();
      if (errore) errore.hidden = true;
    }
  });

  // ── Invio ─────────────────────────────────────────────────────────────────
  function attendi(acceso) {
    if (btnInvia) btnInvia.disabled = acceso;
    if (spinner) spinner.hidden = !acceso;
    if (etichetta) etichetta.textContent = acceso ? 'Invio…' : 'Invia';
  }

  function sbaglia(testo, campo) {
    if (errore) {
      errore.textContent = testo;
      errore.hidden = false;
    }
    if (campo) {
      campo.classList.add('segnalato');
      campo.focus();
    } else if (errore) {
      errore.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function mostra(nome) {
    Object.keys(passi).forEach(function (k) {
      if (passi[k]) passi[k].hidden = k !== nome;
    });
    var titolo = passi[nome] && passi[nome].querySelector('[data-sq-fuoco]');
    if (titolo) titolo.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function invia(e) {
    e.preventDefault();
    if (errore) errore.hidden = true;
    if (campoEmail) campoEmail.classList.remove('segnalato');

    var lista = voti();
    var m = media(lista);
    var n = nps();

    /* Il solo controllo bloccante: una risposta senza nemmeno un voto non è una
       risposta. Tutto il resto — le altre due domande, l'NPS, l'email, la nota
       — è facoltativo per scelta: chi ha risposto a una domanda e si è stancato
       ci ha comunque detto una cosa. */
    if (m === null && n === null) {
      return sbaglia('Dai almeno un giudizio: basta una domanda.');
    }

    var email = campoEmail ? campoEmail.value.trim().toLowerCase() : '';
    if (email && !emailValida(email)) {
      return sbaglia('L’indirizzo non sembra giusto. Correggilo, o lascialo vuoto.', campoEmail);
    }

    var positivo = giudizioPositivo(m, n);
    attendi(true);

    var risposta = null;
    try {
      var taglia = new AbortController();
      var orologio = setTimeout(function () {
        taglia.abort();
      }, ATTESA_INVIO);
      var r = await fetch(WEBHOOK_SONDAGGIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /* `keepalive`: una survey è spesso l'ultima cosa che si tocca prima di
           chiudere la scheda, e senza questo la richiesta muore con la pagina.
           È la stessa scelta del voto alla chat. */
        keepalive: true,
        body: JSON.stringify({
          sondaggio: SONDAGGIO,
          risposte: lista,
          media: m,
          nps: n,
          positivo: positivo,
          /* La nota parte anche se il campo è tornato nascosto: chi l'ha scritta
             ce l'ha detta, e il fatto che poi abbia alzato un voto non la
             cancella. */
          nota: campoNota ? campoNota.value.trim() : '',
          email: email || null,
          userNumber: identita.userNumber || null,
          pagina: location.pathname,
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      risposta = await r.json();
    } catch (err) {
      risposta = null;
    }
    attendi(false);

    if (!risposta || risposta.esito !== 'ricevuto') {
      return sbaglia(
        'Non è riuscita a partire. Riprova fra un momento: se insiste, scrivici dal club e ce la dici a voce.'
      );
    }

    /* Un'email confermata da una risposta andata a buon fine si ricorda, come
       negli altri form: il prossimo modulo del sito non la richiede. */
    if (email && window.athlonRicordaEmail) {
      try {
        window.athlonRicordaEmail(email);
      } catch (err) {
        /* consenso funzionale negato: non si ricorda, e va bene */
      }
    }

    mostra(positivo ? 'positivo' : 'grazie');
  }

  if (form) form.addEventListener('submit', invia);
})();
