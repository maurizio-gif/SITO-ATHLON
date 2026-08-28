// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica di `/tour`, la pagina che sta aperta sul totem all'ingresso.
//
// ── Il percorso ─────────────────────────────────────────────────────────────
//
//   email → verifica PGM → anagrafica + attività di interesse → conferma
//                                                                  ↓
//                                                          si azzera da sola
//
// Tre passi e non sei, e la ragione sta scritta in `data/tour.ts`: qui
// l'operatore è nella stanza, quindi le domande che «Contattaci» fa per capire
// di cosa si tratta sono già state fatte a voce.
//
// ── Le tre cose che questo file fa e gli altri form no ──────────────────────
//
// **Si dimentica.** Ogni form del sito vive su un dispositivo personale e può
// permettersi di ricordare; questo no. Alla conferma parte un conto alla
// rovescia che riporta al primo passo e svuota tutto, ed è la stessa regola per
// cui `emailNota.ts` non precompila sul totem e la chat dimentica dopo tre
// minuti — chi arriva dopo non deve trovare il nome di chi è passato prima.
//
// **La verifica dell'email non cambia il percorso, precompila e basta.** In
// «Contattaci» `memberType` decide se mandare la persona al portale: qui no,
// perché un tour è un tour anche per un socio che si è portato dietro un amico.
// Quello che serve è l'id PerfectGym — che è la chiave con cui il pannello
// dedupla la persona — e i suoi dati, così tre campi si riempiono da soli.
//
// **Un errore del pannello ferma l'invio, uno di n8n no.** Il tour in agenda è
// la cosa che il club deve avere; il lead su PerfectGym è quello che si
// riconcilia a mano. Se invertiti, l'operatore vedrebbe «fatto» su una visita
// che in agenda non c'è, e nessuno la richiamerebbe mai.

import { API_TOUR, WEBHOOK_VERIFICA, WEBHOOK_CONTATTO, SECONDI_CONFERMA } from '../data/tour';
import { validaTelefono } from '../data/prefissi';

export function initTourForm(root) {
  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    nome: 'Serve il nome.',
    cognome: 'Serve il cognome.',
    attivita: 'Scegli almeno un’attività.',
    privacy: 'Serve il consenso al trattamento per poterti ricontattare.',
    invio: 'Non riusciamo a registrare il tour. Riprova fra un istante.',
  };

  function q(sel) {
    return root.querySelector(sel);
  }
  function qa(sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  var steps = {
    email: q('#tt-step-email'),
    dati: q('#tt-step-dati'),
    fatto: q('#tt-step-fatto'),
  };

  var campoEmail = q('#tt-email');
  var campoNome = q('#tt-nome');
  var campoCognome = q('#tt-cognome');
  var campoCellulare = q('#tt-cellulare');
  var campoPrivacy = q('#tt-privacy');
  var campoMarketing = q('#tt-marketing');

  var dati = vuoto();

  function vuoto() {
    return {
      email: '',
      nome: '',
      cognome: '',
      cellulare: '',
      attivita: [],
      privacy: false,
      marketing: false,
      statoPgm: '',
      /* Serve a n8n, non a questa pagina: `Normalizza e Componi Email`
         ricalcola la classificazione da qui e non dal campo che il browser
         manda. Senza, un socio che fa fare il tour a un amico verrebbe
         classificato come una richiesta di informazioni qualsiasi. */
      statoNucleo: '',
      memberId: null,
      memberType: '',
    };
  }

  /* L'attribuzione, quando c'è. Sul totem `attribuzione.ts` forza la sorgente,
     quindi queste tre non sono mai la campagna di qualcun altro. */
  function utm() {
    return window.athlonGetUtm ? window.athlonGetUtm() : {};
  }
  function vid() {
    return window.athlonGetVid ? window.athlonGetVid() : null;
  }
  function sid() {
    return window.athlonGetSid ? window.athlonGetSid() : null;
  }

  // ── Schermate ─────────────────────────────────────────────────────────────
  function mostraStep(nome) {
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    var titolo = steps[nome] && steps[nome].querySelector('[data-tt-fuoco]');
    if (titolo) {
      // Lo stile è appena cambiato: si forza il calcolo prima di chiedere il
      // fuoco, o l'elemento risulta ancora invisibile e `focus()` non fa niente.
      void steps[nome].offsetWidth;
      titolo.focus();
    }
  }

  function mostraErrore(step, testo) {
    var p = step.querySelector('[data-tt-errore]');
    if (!p) return;
    p.textContent = testo;
    p.hidden = false;
  }

  function pulisciErrore(step) {
    var p = step.querySelector('[data-tt-errore]');
    if (p) p.hidden = true;
  }

  function segnala(campo) {
    if (!campo) return;
    campo.classList.add('tt__input--errore');
    campo.focus();
  }

  qa('.tt__input').forEach(function (campo) {
    campo.addEventListener('input', function () {
      campo.classList.remove('tt__input--errore');
    });
  });

  function attendi(bottone, sì) {
    if (!bottone) return;
    bottone.disabled = sì;
    bottone.classList.toggle('tt__btn--attesa', sì);
  }

  function emailValida(valore) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valore || '').trim());
  }

  /* Il numero in forma internazionale: la tendina del prefisso è quella accanto
     al campo, e si trova dall'id del campo più `-prefisso`. Leggere
     `input.value` da solo darebbe il numero come l'ha scritto la persona, non
     il numero. */
  function telefono() {
    var pref = q('#tt-cellulare-prefisso');
    return validaTelefono(pref ? pref.value : '+39', campoCellulare.value);
  }

  // ── 1. L'email ────────────────────────────────────────────────────────────
  var btnVerifica = q('[data-tt-verifica]');

  async function verifica() {
    pulisciErrore(steps.email);
    if (!emailValida(campoEmail.value)) {
      mostraErrore(steps.email, ERR.email);
      segnala(campoEmail);
      return;
    }
    dati.email = campoEmail.value.trim().toLowerCase();

    attendi(btnVerifica, true);
    try {
      var r = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dati.email,
          pagina: '/tour',
          utm: utm(),
          vid: vid(),
          sid: sid(),
        }),
      });
      var body = await r.json();
      if (body && body.stato) {
        dati.statoPgm = String(body.stato);
        dati.statoNucleo = String(body.statoNucleo || body.stato);
        dati.memberId = body.memberId || null;
        dati.memberType = String(body.memberType || '');
        precompila(body);
      }
    } catch (e) {
      // PerfectGym irraggiungibile: si prosegue come persona nuova. Nessuno
      // deve restare fermo davanti al totem per un timeout, e la verifica vera
      // la rifà comunque n8n quando riceve la richiesta.
      dati.statoPgm = 'errore';
      dati.statoNucleo = 'errore';
    }
    attendi(btnVerifica, false);

    if (dati.statoPgm === 'email_non_valida') {
      mostraErrore(steps.email, ERR.email);
      segnala(campoEmail);
      return;
    }

    mostraStep('dati');
  }

  /* Chi il club conosce già non ridigita quello che il club sa. Solo nei campi
     vuoti: se l'operatore ha già corretto un cognome, la correzione vince. */
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

  if (btnVerifica) btnVerifica.addEventListener('click', verifica);
  if (campoEmail) {
    campoEmail.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') verifica();
    });
  }

  // ── 2. Anagrafica e attività ──────────────────────────────────────────────
  function attivitaScelte() {
    return qa('[data-tt-attivita]:checked').map(function (c) {
      return { id: c.value, label: c.dataset.ttEtichetta || c.value };
    });
  }

  var btnInvia = q('[data-tt-invia]');

  async function invia() {
    pulisciErrore(steps.dati);

    dati.nome = campoNome.value.trim();
    dati.cognome = campoCognome.value.trim();
    if (!dati.nome) {
      mostraErrore(steps.dati, ERR.nome);
      segnala(campoNome);
      return;
    }
    if (!dati.cognome) {
      mostraErrore(steps.dati, ERR.cognome);
      segnala(campoCognome);
      return;
    }

    /* Il cellulare è facoltativo, e al totem è la scelta giusta: la persona è
       qui, l'email l'ha già data, e un campo obbligatorio in più davanti a
       qualcuno che ha fretta di andarsene è il punto in cui il modulo non si
       compila. Ma se è scritto dev'essere un numero vero, o il richiamo parte
       verso il nulla. */
    if (campoCellulare.value.trim()) {
      var tel = telefono();
      if (!tel.ok) {
        mostraErrore(steps.dati, tel.motivo);
        segnala(campoCellulare);
        return;
      }
      dati.cellulare = tel.e164;
    } else {
      dati.cellulare = '';
    }

    var scelte = attivitaScelte();
    if (!scelte.length) {
      mostraErrore(steps.dati, ERR.attivita);
      return;
    }
    dati.attivita = scelte;

    dati.privacy = !!(campoPrivacy && campoPrivacy.checked);
    dati.marketing = !!(campoMarketing && campoMarketing.checked);
    if (!dati.privacy) {
      mostraErrore(steps.dati, ERR.privacy);
      return;
    }

    attendi(btnInvia, true);

    var comune = {
      email: dati.email,
      nome: dati.nome,
      cognome: dati.cognome,
      telefono: dati.cellulare,
      attivita: scelte.map(function (a) { return a.id; }),
      attivitaEtichette: scelte.map(function (a) { return a.label; }),
      privacy: dati.privacy,
      marketing: dati.marketing,
      memberId: dati.memberId,
      memberType: dati.memberType,
      statoPgm: dati.statoPgm,
      statoNucleo: dati.statoNucleo,
      pagina: '/tour',
      origine: 'totem-tour',
      utm: utm(),
      vid: vid(),
      sid: sid(),
    };

    // 1. La voce in agenda. Se non riesce, non si va avanti: dire «fatto» per
    //    un tour che in agenda non c'è vuol dire perderlo, e senza accorgersene.
    var esito;
    try {
      var risposta = await fetch(API_TOUR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comune),
      });
      esito = await risposta.json();
      if (!risposta.ok) {
        attendi(btnInvia, false);
        mostraErrore(steps.dati, (esito && esito.errore) || ERR.invio);
        return;
      }
    } catch (e) {
      attendi(btnInvia, false);
      mostraErrore(steps.dati, ERR.invio);
      return;
    }

    // 2. Il lead su PerfectGym e la riga su `richieste_contatto`, come per ogni
    //    altro form: li fa n8n. Se fallisce si prosegue — il tour è registrato.
    try {
      await fetch(WEBHOOK_CONTATTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          Object.assign({}, comune, {
            tipo: 'contatto',
            /* n8n riconosce il tour da qui, come riconosce l'appuntamento
               telefonico da `tipoRichiesta: 'appuntamento'`: stesso webhook,
               perché un tour è una richiesta di contatto con una visita già
               fatta, e un secondo workflow sarebbe un secondo posto in cui
               aggiornare le regole di PerfectGym. */
            tipoRichiesta: 'tour',
            flow: 'adulti',
            gruppoAttivita: 'adulti',
            cellulare: dati.cellulare,
            /* La richiesta non la scrive nessuno al totem: quello che c'è è
               l'elenco delle attività, ed è quello che il desk legge
               nell'email. */
            richiesta: 'Tour in sede. Attività di interesse: ' +
              scelte.map(function (a) { return a.label; }).join(', ') + '.',
            tour: { id: esito && esito.id, data: esito && esito.data, ora: esito && esito.ora },
            isNewUser: dati.statoPgm === 'nuovo',
            /* n8n legge lo stato da `stato`/`statoNucleo`, non da `statoPgm`:
               sono gli stessi valori con i nomi che quel workflow si aspetta. */
            stato: dati.statoPgm,
          })
        ),
      });
    } catch (e) {
      /* Volutamente in silenzio: il tour c'è, e chi sta davanti allo schermo
         non può fare niente con un errore che riguarda il CRM. */
    }

    attendi(btnInvia, false);
    conferma();
  }

  if (btnInvia) btnInvia.addEventListener('click', invia);

  // ── 3. La conferma, e l'oblio ─────────────────────────────────────────────
  var conto = null;
  var etichettaConto = q('[data-tt-conto]');

  function conferma() {
    var saluto = q('[data-tt-nome-conferma]');
    if (saluto) saluto.textContent = dati.nome;
    mostraStep('fatto');
    avviaConto();
  }

  function avviaConto() {
    fermaConto();
    var restano = SECONDI_CONFERMA;
    scriviConto(restano);
    conto = setInterval(function () {
      restano -= 1;
      scriviConto(restano);
      if (restano <= 0) azzera();
    }, 1000);
  }

  function scriviConto(n) {
    if (etichettaConto) etichettaConto.textContent = String(Math.max(n, 0));
  }

  function fermaConto() {
    if (conto) clearInterval(conto);
    conto = null;
  }

  /* Svuota tutto e torna al primo passo. Non è «ricomincia», è «dimentica»:
     il campo email, i campi anagrafici, le spunte delle attività e i consensi.
     Un campo lasciato pieno qui è il dato di un'altra persona mostrato alla
     prossima. */
  function azzera() {
    fermaConto();
    dati = vuoto();
    qa('.tt__input').forEach(function (campo) {
      campo.value = '';
      campo.classList.remove('tt__input--errore');
    });
    qa('[data-tt-attivita]').forEach(function (c) {
      c.checked = false;
    });
    if (campoPrivacy) campoPrivacy.checked = false;
    if (campoMarketing) campoMarketing.checked = false;
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) pulisciErrore(steps[k]);
    });
    mostraStep('email');
  }

  var btnAncora = q('[data-tt-ancora]');
  if (btnAncora) btnAncora.addEventListener('click', azzera);

  mostraStep('email');
}
