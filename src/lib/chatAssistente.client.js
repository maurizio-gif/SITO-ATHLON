// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// L'assistente dell'Help Desk: una conversazione con lo stato, non una ricerca.
//
// Il percorso ha una regola sola che lo governa — **chi sta scrivendo?** — e la
// si scopre dall'email prima di qualsiasi altra cosa, perché cambia tutto quello
// che viene dopo:
//
//   email → verifica → quale attività ─┬─ l'anagrafica c'è già
//                                       │    → conversazione
//                                       └─ non la conosciamo
//                                            → i dati → conversazione
//
// Due domande prima della conversazione, e in quest'ordine:
//
//   - **di cosa parliamo**, a chiunque: «disdetta», «recuperi» e «cambio
//     orario» sono procedure diverse per un abbonamento e per la scuola nuoto,
//     e l'attività è ciò che le distingue. Senza, l'assistente risponde con la
//     media di tutto il sito. Cinque voci, una sola scelta: le attività per
//     adulti stanno tutte insieme perché per un adulto il percorso e' lo stesso,
//     mentre i quattro corsi dei bambini hanno eta', requisiti e iscrizioni
//     diverse fra loro;
//   - **chi sei**, solo se l'email non e' gia' in PerfectGym: di chi c'e' già
//     l'anagrafica ce l'ha il gestionale, e richiederla e' una domanda a cui ha
//     già risposto.
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

import { ACTIVITY_AUDIENCE } from '../data/activities';

export function initChatAssistente(root, options) {
  var onChiudi = (options && options.onChiudi) || function () {};

  var VERIFICA = 'https://automazione.n8ndevelop.it/webhook/athlon-verifica-iscritto';
  var CHAT = 'https://automazione.n8ndevelop.it/webhook/chat-athlon';
  var TICKET = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-ticket';
  var DATI = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-dati';

  /** Dove finisce il percorso junior, comunque vada. */
  var LANDING_JUNIOR = '/wikiathlon/snb/preiscrizioni-nuoto/';

  /* ── Il richiamo telefonico ──────────────────────────────────────────────
     Si propone **solo a chi non è ancora dei nostri** — adulto o genitore non
     fa differenza, conta che sia nuovo — e **non subito**: dopo qualche
     risposta. Offrirlo al primo messaggio è un venditore che interrompe una
     domanda; offrirlo dopo tre è una porta aperta a chi si è già fatto un'idea
     e adesso vuole parlarne.

     I dati li abbiamo già tutti, perché per un nuovo il form viene prima della
     conversazione: si passano precompilati a Calendly così la persona trova il
     modulo pieno e sceglie solo giorno e ora.

     **La mappatura dei parametri è qui e solo qui**, e non è più un'ipotesi:
     letta dall'evento sull'account del club. `recall` è un `outbound_call` —
     il club chiama, e Calendly chiede il numero come «luogo», quindi il numero
     va in `location` — e ha **una sola** domanda personalizzata, in posizione
     0 e **obbligatoria**: «Per favore, condividi tutto ciò che può essere
     utile per preparare il nostro incontro.» Le domande personalizzate si
     precompilano con `a1`, `a2`… nell'ordine del modulo, quindi il contesto è
     `a1`. Che quella domanda sia obbligatoria è il motivo per cui va
     riempita sempre: vuota, blocca la prenotazione.

     Il nome è il campo unico di Calendly, quindi `name` e basta.

     Se un domani il modulo cambia — una domanda in più prima di quella, o il
     numero spostato in una domanda invece che nel «luogo» — si aggiorna
     `campi` qui sotto e non serve toccare altro. Il numero resta comunque
     anche nella prima riga del contesto, che è la rete di sicurezza. */
  var RICHIAMO = {
    url: 'https://calendly.com/athlonclub/recall/',
    /** Quante risposte dell'assistente prima di proporlo. */
    dopoRisposte: 3,
    campi: { telefono: 'location', contesto: 'a1' },
    /* Il trascritto intero non ci sta in una query string, e un url troppo
       lungo lo troncano il browser o Calendly: si tengono gli ultimi scambi,
       che sono quelli che dicono di cosa si stava parlando. */
    maxContesto: 1200,
  };

  /* Le cinque voci fra cui scegliere, una sola.

     Le quattro junior portano lo slug di `activities.ts`, e non per ordine: è
     quello il valore che il workflow accetta in `attivitaJunior` per restringere
     la conoscenza a un corso solo, ed è con quello che sono taggati gli articoli
     del wiki.

     `adulti` invece non è uno slug e non deve diventarlo: sta per le otto
     attività che elenca la sua nota, perché per un adulto il percorso è lo
     stesso — un abbonamento — e chiedergli quale delle otto prima di poter fare
     una domanda è una domanda in più senza una risposta in più. Le otto restano
     nominate nella nota: chi cerca il Reformer si riconosce lì. */
  var ATTIVITA = [
    {
      id: 'adulti',
      label: 'Attività adulti',
      nota: 'Gym Floor, Corsi Fitness, Group Reformer, Nuoto Libero, Aqua Fitness, Scuola Nuoto Adulti, Corso Gestanti, Personal Training',
    },
    /* «Dai 30 mesi» e non «dai 3 anni», che è come il resto del sito lo dice.
       I tre anni sono la cifra tonda della comunicazione, non un requisito: il
       criterio vero è l'anno di nascita — per il 2026/27 sono i nati dal 2013
       al 2023, e un nato a fine 2023 a settembre ha trentatré mesi. Il bot
       legge i dati del sito e risponde «dai 30 mesi», quindi una nota che
       dicesse tre anni lo smentirebbe due righe più su. E qui la nota non è
       una didascalia: è quello che fa scegliere fra queste due voci a chi ha
       un bambino di trenta mesi.

       Per il Baby Nuoto la nota dice anche del genitore, perché fra i 30 e i
       36 mesi le due fasce si sovrappongono per davvero e l'età non decide
       niente: quello che cambia è se in acqua si entra insieme. */
    { id: 'scuola-nuoto-bambini', label: 'Scuola Nuoto Bambini', nota: 'dai 30 mesi' },
    { id: 'baby-nuoto', label: 'Baby Nuoto', nota: 'da 3 a 36 mesi, con un genitore in acqua' },
    { id: 'nuoto-agonistico', label: 'Nuoto Agonistico', nota: '' },
    { id: 'pallanuoto', label: 'Pallanuoto', nota: '' },
  ];

  function etichettaAttivita() {
    var scelta = ATTIVITA.filter(function (a) {
      return a.id === dati.attivita;
    })[0];
    return scelta ? scelta.label : '';
  }

  /* Due attese diverse, perché sono due cose diverse. La verifica interroga
     PerfectGym e torna in meno di un secondo: se tarda, tanto vale proseguire
     come se non conoscessimo la persona, quindi il tetto resta corto. La
     risposta del modello invece è lenta per costruzione — legge le voci del
     sito e poi scrive una parola per volta — e un tetto di quindici secondi
     buttava via risposte già pronte: misurate, arrivavano a 16,8 secondi. */
  var ATTESA_VERIFICA = 15000;
  var ATTESA_RISPOSTA = 45000;

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
      /** adulti | junior: lo dice l'attività scelta, e non è il ramo. */
      ambito: '',
      /** Vero se PerfectGym conosce già l'email: allora il form non si chiede. */
      conosciuto: false,
      /** Lo slug dell'attività scelta, o '' se non ne ha scelta nessuna. */
      attivita: '',
      attivitaJunior: '',
      /** Vero da quando l'anagrafica è partita: non si richiede due volte. */
      datiFatti: false,
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
    attivita: q('[data-ca-step="attivita"]'),
    chat: q('[data-ca-step="chat"]'),
    dati: q('[data-ca-step="dati"]'),
  };
  var campoEmail = q('[data-ca-email]');
  var btnEmail = q('[data-ca-email-invia]');
  var erroreEmail = q('[data-ca-email-errore]');
  var conversazione = q('[data-ca-conversazione]');
  var campoDomanda = q('[data-ca-domanda]');
  var btnDomanda = q('[data-ca-invia]');
  var intestazione = q('[data-ca-intestazione]');
  var elencoAttivita = q('[data-ca-attivita]');

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
      }, ATTESA_VERIFICA);
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

    /* Il ramo lo decide PerfectGym, e lo decide qui: un socio resta un socio
       anche quando chiede del corso di suo figlio, e va servito con le schede e
       il regolamento invece che con il depliant. La scelta dell'attività, che
       viene dopo, non lo cambia. */
    if (dati.statoNucleo === 'iscritto') dati.ramo = 'iscritto';

    /* `conosciuto` è la domanda del form: l'anagrafica esiste già? Vale per un
       socio e per chi è a sistema come lead — di entrambi PerfectGym ha nome,
       cognome e telefono, e ce li ha appena detti. Chiederli di nuovo è una
       domanda a cui hanno già risposto. Se la verifica non ha risposto affatto
       (`errore`) non sappiamo niente, quindi il form si chiede. */
    dati.conosciuto =
      dati.statoNucleo === 'iscritto' ||
      dati.statoNucleo === 'esiste' ||
      dati.stato === 'iscritto' ||
      dati.stato === 'esiste';

    dipingiAttivita();
    mostra('attivita');
  }

  // ── Passo 2: quale attività ───────────────────────────────────────────────
  function dipingiAttivita() {
    if (!elencoAttivita) return;
    elencoAttivita.innerHTML = ATTIVITA.map(function (a) {
      return (
        '<button type="button" class="ca__scelta" data-ca-attivita-scelta="' +
        escape(a.id) +
        '"><span class="ca__scelta-nome">' +
        escape(a.label) +
        '</span>' +
        (a.nota ? '<span class="ca__scelta-nota">' + escape(a.nota) + '</span>' : '') +
        '</button>'
      );
    }).join('');
  }

  function scegliAttivita(id) {
    dati.attivita = id || '';
    /* `attivitaJunior` è quella con cui il workflow restringe la conoscenza a un
       corso solo: vale per i quattro junior e per nessun'altra attività. */
    dati.attivitaJunior = id && ACTIVITY_AUDIENCE[id] === 'junior' ? id : '';
    dati.ambito = dati.attivitaJunior ? 'junior' : 'adulti';
    /* Chi non è di casa prende il ramo dall'attività; per un socio il ramo l'ha
       già deciso la verifica. */
    if (dati.ramo !== 'iscritto') dati.ramo = dati.ambito;

    /* Chi ha bisogno del form, e di quale parte:

       - un'attività per adulti diventa un lead su PerfectGym, e un lead che c'è
         già non si crea due volte: se lo conosciamo non c'è niente da chiedere;
       - un corso per bambini diventa **due** anagrafiche guest, genitore e
         figlio, e il figlio PerfectGym non ce l'ha mai detto: quei dati servono
         sempre, anche al socio più vecchio del club. Di lui però il form chiede
         solo ciò che manca. */
    if (dati.datiFatti) apriConversazione();
    else if (dati.ambito === 'junior') apriDati();
    else if (dati.conosciuto) apriConversazione();
    else apriDati();
  }

  // ── Passo 3: la conversazione ─────────────────────────────────────────────
  var APERTURE = {
    /* Nessun nome qui, ed è voluto: il nome lo dice solo chi ce l'ha appena
       scritto nel form. Salutare per nome chi non ha compilato niente è dirgli
       che lo stiamo riconoscendo da un'email, e non è il tono di un help desk. */
    iscritto: function () {
      return (
        'Ciao. Sono l’assistente dell’Help Desk: rispondo su prenotazioni, ' +
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
      return (
        'Ciao. Ti dico tutto su ' +
        escape(etichettaAttivita() || 'i corsi per bambini') +
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
    /* Chi ha appena compilato il form vuole sapere che è servito, e lo vuole
       sapere prima di qualsiasi altra cosa: è la prima bolla, non una nota in
       fondo. Nel ramo junior porta con sé la pagina che dice come si completa
       l'iscrizione — è lì che finisce quel percorso, comunque vada. */
    if (dati.datiFatti) {
      /* Nessuna promessa di essere richiamato: sta scrivendo adesso, e la
         risposta la vuole adesso. Se poi quella dell'assistente non gli basta,
         il pulsante sotto ogni risposta porta a una persona — ed è quello il
         momento di parlare di ricontatti. */
      var conferma =
        'Grazie' + (dati.nome ? ' ' + dati.nome : '') + ', ci siamo: i tuoi dati sono a posto.';
      bolla(
        'assistente',
        '<p>' +
          escape(conferma) +
          '</p>' +
          (dati.ambito === 'junior'
            ? '<p class="ca__fonti"><a href="' +
              LANDING_JUNIOR +
              '">Come si completa l’iscrizione →</a></p>'
            : ''),
        conferma
      );
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
    /* Un comando solo, e sempre lo stesso: parlare con una persona. I dati,
       quando servono, li ha già chiesti il form prima della conversazione —
       riproporli qui sarebbe chiedere due volte la stessa cosa. */
    return (
      '<div class="ca__uscita">' +
      '<span class="ca__uscita-lead">' +
      (senzaRisposta ? 'Su questo serve una persona.' : 'Vuoi parlarne con noi?') +
      '</span>' +
      '<button type="button" class="ca__uscita-btn" data-ca-ticket>Contatta il team →</button>' +
      '</div>'
    );
  }

  // ── Il richiamo telefonico ────────────────────────────────────────────────
  /**
   * Compare una volta sola, dopo `RICHIAMO.dopoRisposte` risposte, e solo a chi
   * non è ancora iscritto. Non è la via d'uscita della `scappatoia()`, che è
   * scritta e va al desk: questa è una telefonata, e la chiede chi ha letto un
   * po' e adesso vuole una voce.
   */
  var risposteDate = 0;
  var richiamoOfferto = false;

  /** Quello che finisce nel campo libero del modulo: il contesto della chiamata. */
  function contestoRichiamo() {
    var testa = ['Richiesta arrivata dalla chat del sito Athlon.'];
    /* Il numero anche qui, in chiaro, e non per ridondanza inutile: se il campo
       del telefono su Calendly non è il «luogo» il parametro va perso, e questa
       riga è quello che resta da leggere a chi richiama. */
    if (dati.telefono) testa.push('Telefono: +39 ' + cellulareNudo(dati.telefono));
    var att = etichettaAttivita();
    if (att) testa.push('Interesse: ' + att);
    if (dati.pagina) testa.push('Pagina da cui scrive: ' + dati.pagina);

    var scambi = trascritto.map(function (m) {
      return (m.ruolo === 'utente' ? 'Persona: ' : 'Assistente: ') + m.testo;
    });
    /* Dalla fine verso l'inizio: se non ci sta tutto si taglia il vecchio, che
       è la parte che serve meno a chi deve richiamare. */
    var corpo = '';
    for (var i = scambi.length - 1; i >= 0; i--) {
      var candidato = scambi[i] + (corpo ? '\n' + corpo : '');
      if (candidato.length > RICHIAMO.maxContesto) break;
      corpo = candidato;
    }
    return testa.join('\n') + '\n\nConversazione:\n' + (corpo || '(nessuno scambio)');
  }

  /** Il link con tutto già dentro: chi ci arriva scegle solo giorno e ora. */
  function linkRichiamo() {
    var p = new URLSearchParams();
    /* Un campo nome solo, come il modulo dell'evento. */
    var nome = [dati.nome, dati.cognome].filter(Boolean).join(' ');
    if (nome) p.set('name', nome);
    if (dati.email) p.set('email', dati.email);
    if (dati.telefono) p.set(RICHIAMO.campi.telefono, '+39' + cellulareNudo(dati.telefono));
    p.set(RICHIAMO.campi.contesto, contestoRichiamo());
    return RICHIAMO.url + '?' + p.toString();
  }

  function proponiRichiamo() {
    risposteDate++;
    if (richiamoOfferto || dati.conosciuto) return;
    if (risposteDate < RICHIAMO.dopoRisposte) return;
    /* Senza email non c'è niente da precompilare, e un modulo vuoto è una
       richiesta in più invece di una scorciatoia. */
    if (!dati.email || !conversazione) return;
    richiamoOfferto = true;
    var box = document.createElement('div');
    box.className = 'ca__richiamo';
    box.innerHTML =
      '<p class="ca__richiamo-lead">Preferisci sentirci a voce? Ti richiamiamo noi: scegli giorno e ora, i tuoi dati sono già compilati.</p>' +
      '<a class="ca__richiamo-btn" href="' +
      escape(linkRichiamo()) +
      '" target="_blank" rel="noopener">Prenota una chiamata →</a>';
    conversazione.appendChild(box);
    conversazione.scrollTop = conversazione.scrollHeight;
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
          attivita: dati.attivita,
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

  /**
   * L'ultima domanda che ha scritto lui, prima di questa. Serve al workflow per
   * scegliere le voci del sito: un seguito come «e se volessi spendere di
   * meno?» non nomina il suo argomento, e da solo pescava le voci sbagliate —
   * fino a far inventare al modello un abbonamento che non esiste.
   */
  function domandaPrecedente() {
    for (var i = trascritto.length - 1; i >= 0; i--) {
      if (trascritto[i].ruolo === 'utente') return trascritto[i].testo;
    }
    return '';
  }

  async function chiedi() {
    var domanda = (campoDomanda && campoDomanda.value || '').trim();
    if (domanda.length < 3 || inCorso) return;

    // Da leggere prima di aggiungere la domanda nuova al trascritto.
    var precedente = domandaPrecedente();

    inCorso = true;
    campoDomanda.value = '';
    if (btnDomanda) btnDomanda.disabled = true;
    bolla('utente', escape(domanda), domanda);
    var attesa = bolla('assistente', '<span class="ca__pensa"><span></span><span></span><span></span></span>');

    try {
      var stop = new AbortController();
      var scaduta = window.setTimeout(function () {
        stop.abort();
      }, ATTESA_RISPOSTA);
      var r = await fetch(CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: stop.signal,
        body: JSON.stringify({
          domanda: domanda,
          precedente: precedente,
          sessione: sessione(),
          pagina: dati.pagina,
          origine: 'assistente',
          ramo: dati.ramo,
          attivita: dati.attivita ? [dati.attivita] : [],
          attivitaJunior: dati.attivitaJunior,
          email: dati.email,
          memberId: dati.memberId,
          stato: dati.stato,
          statoNucleo: dati.statoNucleo,
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
      /* Senza separatore fra i link: adesso sono pastiglie, e si separano da
         sé. Il puntino in mezzo era la spaziatura di due link in fila. */
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
            .join('') +
          '</p>'
        : '';

      /* Il modello ha l'ordine di scrivere in prosa e senza markdown, perché
         qui il testo si stampa come testo. Ma se un capoverso arriva comunque,
         va reso un capoverso e non una riga incollata alla precedente: è la
         differenza fra una risposta che si legge e un muro. */
      var paragrafi = risposta.risposta
        .split(/\n{1,}/)
        .map(function (r) { return r.trim(); })
        .filter(Boolean)
        .map(function (r) { return '<p>' + escape(r) + '</p>'; })
        .join('');

      attesa.innerHTML = paragrafi + rimandi + scappatoia(!!risposta.senzaRisposta);
      trascritto.push({ ruolo: 'assistente', testo: risposta.risposta });
      proponiRichiamo();
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
  var genitoreDati = q('[data-ca-genitore]');
  var nascitaGenitore = q('[data-ca-nascita]');
  var erroreDati = q('[data-ca-dati-errore]');
  var btnDati = q('[data-ca-dati-invia]');
  var titoloDati = q('[data-ca-dati-titolo]');
  var leadDati = q('[data-ca-dati-lead]');
  var privacyDati = q('[data-ca-dati-privacy]');
  var saltaDati = q('[data-ca-dati-salta]');

  /** Accetta 3201122333, +39 320 112 2333, 0039320…: resta il numero nudo. */
  function cellulareNudo(v) {
    var solo = String(v || '').replace(/[^\d+]/g, '');
    return solo.replace(/^\+39/, '').replace(/^0039/, '').replace(/\D/g, '');
  }

  function valore(nome) {
    return campi[nome] ? String(campi[nome].value || '').trim() : '';
  }

  /**
   * I campi dell'adulto si chiedono a meno che non li abbiamo già tutti e tre
   * buoni dalla verifica. Il cellulare va controllato, non solo contato: su
   * PerfectGym in quel campo può esserci un fisso, e allora è come non averlo.
   * Finché la verifica pubblicata non restituisce l'anagrafica, questo è falso
   * per tutti e il form li chiede — che è il comportamento giusto.
   */
  function serveGenitore() {
    return !(
      dati.conosciuto &&
      dati.nome &&
      dati.cognome &&
      /^3\d{8,9}$/.test(cellulareNudo(dati.telefono))
    );
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

    var oggi = new Date().toISOString().slice(0, 10);
    var junior = dati.ambito === 'junior';

    /* Si valida quello che è a schermo: i campi dell'adulto che non gli abbiamo
       chiesto sono precompilati da PerfectGym, e non è lui a doverli sistemare. */
    if (serveGenitore()) {
      if (!valore('nome')) return segnala('nome', 'Serve il tuo nome.');
      if (!valore('cognome')) return segnala('cognome', 'Serve il tuo cognome.');
      if (!emailValida(valore('email'))) {
        return segnala('email', 'Controlla l’indirizzo email: manca qualcosa.');
      }
      if (!/^3\d{8,9}$/.test(cellulareNudo(valore('cellulare')))) {
        return segnala('cellulare', 'Serve un cellulare italiano, senza prefisso.');
      }
      /* La data di nascita serve solo dove si crea un'anagrafica guest, cioè nel
         ramo junior: `AddGuestMember` la pretende, `Crm2/AddLead` non ce l'ha. */
      if (junior) {
        if (!valore('nascita')) return segnala('nascita', 'Serve la tua data di nascita.');
        /* Una data nel futuro non è una data di nascita: è un refuso, e su
           PerfectGym diventerebbe un'anagrafica da correggere a mano. */
        if (valore('nascita') > oggi) {
          return segnala('nascita', 'La data di nascita non può essere nel futuro.');
        }
      }
    }

    if (!junior) return true;

    if (!valore('bnome')) return segnala('bnome', 'Serve il nome del bambino.');
    if (!valore('bcognome')) return segnala('bcognome', 'Serve il cognome del bambino.');
    if (!valore('bnascita')) return segnala('bnascita', 'Serve la data di nascita del bambino.');
    if (valore('bnascita') > oggi) {
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
    var junior = dati.ambito === 'junior';
    var suoi = serveGenitore();
    /* Un adulto lascia nome, cognome, email e cellulare, e nient'altro: la data
       di nascita e i dati del bambino sono di un'iscrizione, non di un
       ricontatto. E se di lui sappiamo già tutto, resta solo il bambino. */
    if (genitoreDati) genitoreDati.hidden = !suoi;
    if (nascitaGenitore) nascitaGenitore.hidden = !(junior && suoi);
    if (bimbo) bimbo.hidden = !junior;
    if (privacyDati) privacyDati.hidden = junior;
    if (saltaDati) saltaDati.hidden = true;
    if (erroreDati) erroreDati.hidden = true;
    if (titoloDati) {
      titoloDati.textContent = !junior
        ? 'I tuoi dati'
        : suoi
          ? 'I dati per l’iscrizione'
          : 'I dati di tuo figlio';
    }
    if (leadDati) {
      leadDati.textContent = !junior
        ? 'Ci presentiamo: sono i dati con cui il club ti ricontatta. Poi passiamo alle tue domande.'
        : suoi
          ? 'Servono i tuoi e quelli del bambino: li usiamo per preparare l’iscrizione. Poi passiamo alle tue domande.'
          : 'Di te sappiamo già tutto: serve solo chi iscriviamo. Poi passiamo alle tue domande.';
    }
    /* Quello che sappiamo già non si richiede a mano. L'email è quella del
       primo passo: resta modificabile, perché è possibile che l'abbia scritta
       per fare la verifica e ne voglia usare un'altra per essere ricontattato. */
    if (campi.nome && !campi.nome.value) campi.nome.value = dati.nome || '';
    if (campi.cognome && !campi.cognome.value) campi.cognome.value = dati.cognome || '';
    if (campi.email && !campi.email.value) campi.email.value = dati.email || '';
    if (campi.cellulare && !campi.cellulare.value) {
      campi.cellulare.value = cellulareNudo(dati.telefono) || '';
    }
    mostra('dati');
  }

  async function inviaDati() {
    if (!validaDati()) return;
    attendi(btnDati, true);

    var junior = dati.ambito === 'junior';
    try {
      var r = await fetch(DATI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ramo: dati.ramo,
          /* Il ramo dice **come** parlargli, l'ambito dice **cosa** creare su
             PerfectGym: un socio che iscrive suo figlio ha ramo `iscritto` e
             ambito `junior`, e sono due anagrafiche guest, non un lead. */
          ambito: dati.ambito,
          attivita: dati.attivita ? [dati.attivita] : [],
          attivitaJunior: dati.attivitaJunior,
          email: valore('email') || dati.email,
          memberId: dati.memberId,
          statoPgm: dati.stato,
          statoNucleo: dati.statoNucleo,
          sessione: sessione(),
          pagina: dati.pagina,
          genitore: {
            nome: valore('nome') || dati.nome,
            cognome: valore('cognome') || dati.cognome,
            cellulare: cellulareNudo(valore('cellulare')) || cellulareNudo(dati.telefono),
            /* Vuota nel ramo adulti, e non è una dimenticanza: là non si chiede.
               Il workflow deve accettarla vuota e non passarla a PerfectGym. */
            nascita: junior ? valore('nascita') : '',
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

      /* Quello che la persona ha scritto lo teniamo: è ciò che compare nel
         ticket se poi la conversazione non basta, e il nome con cui la si
         saluta un momento dopo. */
      ricordaDati();
      dati.datiFatti = true;
      attendi(btnDati, false);
      apriConversazione();
    } catch (e) {
      attendi(btnDati, false);
      if (erroreDati) {
        erroreDati.textContent = 'Non siamo riusciti a inviare i dati. Riprova fra un momento.';
        erroreDati.hidden = false;
      }
      /* Un'automazione giù non deve costare la conversazione: da qui si può
         andare avanti e parlare comunque. È la stessa scelta della verifica —
         meglio una richiesta da smistare a mano che una persona lasciata davanti
         a un errore, e qui il prezzo dell'alternativa è che non parla nessuno. */
      if (saltaDati) saltaDati.hidden = false;
    }
  }

  /** Come li ha scritti lui: è quello che finisce nel ticket, e il nome con cui
      lo si saluta. */
  function ricordaDati() {
    dati.nome = valore('nome');
    dati.cognome = valore('cognome');
    dati.telefono = cellulareNudo(valore('cellulare'));
    if (emailValida(valore('email'))) dati.email = valore('email');
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
    var scelta = e.target.closest && e.target.closest('[data-ca-attivita-scelta]');
    if (scelta) {
      scegliAttivita(scelta.dataset.caAttivitaScelta);
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

    if (e.target.closest && e.target.closest('[data-ca-dati-invia]')) {
      inviaDati();
      return;
    }
    if (e.target.closest && e.target.closest('[data-ca-dati-annulla]')) {
      /* Indietro è la conversazione se ce n'è una, altrimenti il passo da cui
         il form è nato: prima della prima risposta non c'è niente a cui tornare. */
      mostra(trascritto.length ? 'chat' : 'attivita');
      return;
    }
    if (e.target.closest && e.target.closest('[data-ca-dati-salta]')) {
      /* Senza un invio riuscito non c'è anagrafica su PerfectGym, ma quello che
         la persona ha scritto resta: finisce nel ticket, che è la via che
         funziona anche quando il resto non funziona. */
      ricordaDati();
      apriConversazione();
      return;
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
