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
import { validaTelefono } from '../data/prefissi';
import { CALENDLY } from '../data/calendly';
import { suTotem } from '../scripts/totem';
import { montaCalendario } from './calendario.client.js';
import { plans, GUEST_PASS } from '../data/abbonamenti';
import { REGISTRAZIONE, PASSI_ATTIVAZIONE } from '../data/guestPass';
import { WEBHOOK_RESET, PORTALE, haGiaAccount } from '../data/contatto';

export function initChatAssistente(root, options) {
  var onChiudi = (options && options.onChiudi) || function () {};

  var VERIFICA = 'https://automazione.n8ndevelop.it/webhook/athlon-verifica-iscritto';
  var CHAT = 'https://automazione.n8ndevelop.it/webhook/chat-athlon';
  var TICKET = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-ticket';
  var DATI = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-dati';
  /* Lo stesso endpoint che riceve il lead di «Prova Athlon» dal sito: una
     conferma in chat deve produrre la stessa riga su `richieste_prova`, la
     stessa email e lo stesso WhatsApp — non un codice mostrato senza che da
     nessuna parte risulti che qualcuno l'ha chiesto. Vedi `provaForm.client.js`. */
  var PROVA = 'https://automazione.n8ndevelop.it/webhook/athlon-prova-compilata';

  /** Dove finisce il percorso junior, comunque vada. */
  var LANDING_JUNIOR = '/wikiathlon/snb/preiscrizioni-nuoto/';

  /* ── Il richiamo telefonico ──────────────────────────────────────────────
     Si apre **solo su richiesta**, e la richiesta è una sola: l'icona ☎ in
     intestazione, disponibile a chi non è ancora dei nostri (`puoRichiamo`).

     Prima si apriva anche da sé dopo due risposte, e in prova è risultato
     esattamente quello che l'automatismo rischiava di essere: un modulo da
     trentaquattro rem che si prende lo schermo in mezzo a una conversazione
     che nessuno aveva chiesto di interrompere. Un calendario è la fine di un
     percorso, non un suggerimento — chi lo vuole lo cerca, e l'icona in alto
     è lì dal primo istante con la riga che la annuncia nella bolla del saluto.
     Per la stessa ragione non c'è più nemmeno un pulsante sotto le risposte:
     quel posto è di «Contatta il team», che è la via scritta.

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
    /* L'indirizzo sta in `data/calendly.ts` col resto degli eventi del club:
       tre file che ne tenevano una copia ciascuno erano tre posti da aggiornare
       il giorno in cui un evento viene rinominato — e un link Calendly rotto non
       dà errore, dà «questo evento non esiste» a chi stava per prenotare. */
    url: CALENDLY.recall,
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
      /** Lead | Guest | Member, da PerfectGym: il gate del Guest Pass e
          dell'accesso gia' esistente, sempre e solo questo campo — non
          `statoNucleo`, che dice se il nucleo ha un contratto vivo *oggi* e
          non se la persona e' mai stata socia. Vuoto se la verifica non
          risponde: in quel caso nessuna delle due azioni si offre da sola. */
      memberType: '',
      nome: '',
      cognome: '',
      telefono: '',
      /** iscritto | adulti | junior — è ciò che decide tono e conoscenza. */
      ramo: '',
      /** adulti | junior: lo dice l'attività scelta, e non è il ramo. */
      ambito: '',
      /** Vero se PerfectGym conosce già l'email: allora il form non si chiede. */
      conosciuto: false,
      /** Se può fissare una telefonata: nessun abbonamento vivo nel nucleo. */
      puoRichiamo: false,
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
  /* L'icona della telefonata nell'intestazione. Si cerca fra i figli del modal
     e non dentro la conversazione: quella si svuota a ogni riapertura, questa
     resta. */
  var btnRichiamo = q('[data-ca-richiamo]');

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
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(dati.email);
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
        /* Con l'attribuzione, come la stessa verifica chiamata dalla prova e dai
           pulsanti «Iscriviti»: questo endpoint registra **ogni email** del sito
           su `eventi_email`, quindi è il primo tocco di tutti — ed era l'unico
           chiamante a non dire da dove arrivava. Sul totem quel primo tocco
           risultava senza `TOUR`. */
        body: JSON.stringify({
          email: dati.email,
          pagina: dati.pagina,
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
        }),
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
    dati.memberType = (esito && esito.memberType) || '';
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

    /* Chi può fissare una telefonata: **chi non ha un abbonamento vivo nel
       nucleo**, e nessun altro.

       Prima il gate era `conosciuto`, ed era la domanda sbagliata: quella è
       vera anche per un Lead — chi ha un'anagrafica da una prova di due anni fa
       e nessun contratto — cioè esattamente la persona a cui la telefonata
       serve. Si vedeva come «il calendario non compare mai», e non si sarebbe
       notato dalla chat: sembra solo che l'assistente non lo proponga.

       Dall'altra parte a un socio non si offre, e non è una limitazione: la sua
       è assistenza, e la strada è «contatta il team» — scritta, con il
       trascritto allegato, che arriva al desk. Un appuntamento fra tre giorni a
       chi segnala un badge sospeso è un'attesa al posto di una risposta. */
    dati.puoRichiamo = dati.statoNucleo !== 'iscritto';

    dipingiAttivita();
    mostra('attivita');
    /* L'email è il primo dato che vale la pena non lasciare a chi arriva dopo:
       il conto parte da qui, non dalla prima risposta. */
    armaOblio();
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
        'Ciao. Sono l’assistente virtuale di Athlon: rispondo su prenotazioni, ' +
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
    /* La riga che rende scopribile l'icona in cima. Un'icona muta la trova chi
       la cerca, e qui il punto è l'opposto: la telefonata deve essere una cosa
       che si sa di poter fare **prima** di averne bisogno. Costa una riga, e la
       dice l'assistente nella stessa bolla del saluto invece di essere un
       avviso a parte — un cartello sopra la conversazione si legge come
       pubblicità e si salta.

       Solo a chi può prenotarla: a un socio prometterebbe un comando che non
       vede. */
    if (dati.puoRichiamo) {
      apertura +=
        '<p class="ca__fonti">Preferisci parlarne al telefono? Tocca ☎ in alto: ' +
        'scegli tu giorno e ora, e ti chiamiamo noi.</p>';
    }
    bolla('assistente', apertura, apertura.replace(/<[^>]+>/g, ''));

    /* Il comando compare quando la conversazione comincia, non prima: nei passi
       dell'email e dell'attività non c'è ancora niente di cui parlare al
       telefono, e un calendario aperto da lì partirebbe senza contesto. */
    if (btnRichiamo) btnRichiamo.hidden = !dati.puoRichiamo;

    mostra('chat');
    /* Da qui c'è una conversazione da dimenticare: sul totem il conto parte. */
    armaOblio();
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
    /* Un comando solo, ed è quello scritto: parte il trascritto, lo legge una
       persona, risponde quando può.

       Qui c'era anche «Fissa una telefonata», e non c'è più. Sotto una risposta
       scritta il canale l'ha già scelto la persona, e affiancare un secondo
       comando a ogni bolla trasformava la fine di ogni risposta in un bivio —
       due volte per risposta, per tutta la conversazione. La telefonata resta,
       ma dove si va a cercarla: l'icona ☎ in intestazione, annunciata nella
       bolla del saluto a chi può prenotarla.

       I dati, quando servono, li ha già chiesti il form prima della
       conversazione — riproporli qui sarebbe chiedere due volte la stessa
       cosa. */
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
   * Si monta **solo quando la persona lo chiede**, dall'icona ☎ in
   * intestazione. Non è la via d'uscita della `scappatoia()`, che è scritta e
   * va al desk: questa è una telefonata a un'ora scelta da chi la vuole.
   */

  /** Quello che finisce nel campo libero del modulo: il contesto della chiamata. */
  function contestoRichiamo() {
    var testa = ['Richiesta arrivata dalla chat del sito Athlon.'];
    /* Il numero anche qui, in chiaro, e non per ridondanza inutile: se il campo
       del telefono su Calendly non è il «luogo» il parametro va perso, e questa
       riga è quello che resta da leggere a chi richiama. */
    if (dati.telefono) testa.push('Telefono: ' + dati.telefono);
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

  /* Il link diretto — il ripiego se l'embed non carica — lo compone
     `linkDiretto` in `calendario.client.js` a partire dallo stesso
     `prefill` del widget: due modi di costruire lo stesso indirizzo erano due
     modi di sbagliarlo diversamente. La mappatura dei campi resta descritta in
     `RICHIAMO.campi` qui sopra, che è dove si guarda se il modulo cambia. */

  /**
   * Il calendario dentro la conversazione, e ci si arriva **solo con un gesto**.
   *
   * **Uno solo, sempre.** Se c'è già si scorre lì invece di montarne un
   * secondo: due iframe di Calendly nella stessa conversazione sono due
   * moduli che chiedono la stessa cosa, e il primo che si compila lascia
   * l'altro aperto a dire che non è stato fissato niente. È anche il motivo
   * per cui l'icona in intestazione non si disabilita dopo il primo clic —
   * riportare al calendario è una risposta giusta quanto aprirlo.
   */
  function mostraRichiamo() {
    if (!dati.puoRichiamo || !conversazione) return;

    var esistente = conversazione.querySelector('.ca__richiamo');
    if (esistente) {
      esistente.scrollIntoView({ block: 'nearest' });
      return;
    }

    /* Senza email non c'è niente da precompilare, e un modulo vuoto è una
       richiesta in più invece di una scorciatoia. In pratica non capita — il
       primo passo della chat è l'email — ma il gesto arriva da un pulsante, e
       un pulsante lo si può premere prima del previsto. */
    if (!dati.email) return;

    /* Il calendario dentro la conversazione, al posto del pulsante che portava
       fuori. Qui vale più che altrove: la chat è una conversazione in corso, e
       mandare fuori sito a metà discorso la interrompe — chi torna, se torna,
       trova il filo perso.

       Il precompilato è lo stesso di prima, contesto della conversazione
       compreso: su Calendly la domanda personalizzata `a1` è obbligatoria, e
       vuota blocca la prenotazione. Nell'embed si passa da `customAnswers`. */
    var box = document.createElement('div');
    box.className = 'ca__richiamo';
    box.innerHTML =
      /* La testa col titolo e la **chiusura**, e quel pulsante non è un
         ornamento: prima, aperto il calendario, non c'era modo di rimandarlo
         indietro — chi ci ripensava e voleva continuare a chiedere si trovava
         un modulo da trentaquattro rem in mezzo alla conversazione e nessuna
         uscita. Chiudendolo la chat riprende, e l'icona ☎ in intestazione lo
         riapre quando serve. */
      '<div class="ca__richiamo-testa">' +
      '<p class="ca__richiamo-titolo">Vuoi essere ricontattato?</p>' +
      '<button type="button" class="ca__richiamo-chiudi" data-ca-richiamo-chiudi ' +
      'aria-label="Chiudi il calendario e torna alla chat" title="Chiudi">×</button>' +
      '</div>' +
      '<p class="ca__richiamo-lead">Ti richiamiamo noi: scegli giorno e ora, i tuoi dati e quello di cui abbiamo parlato sono già compilati.</p>' +
      '<div class="ca__richiamo-cal" data-ca-calendario></div>' +
      '<div class="ca__richiamo-ripiego" data-ca-cal-ripiego hidden>' +
      '<p class="ca__richiamo-lead">Il calendario non si carica: di solito è il blocco dei cookie. Si apre comunque in una scheda nuova.</p>' +
      '<a class="ca__richiamo-btn" data-ca-cal-link target="_blank" rel="noopener">Apri il calendario →</a>' +
      '</div>' +
      '<p class="ca__richiamo-fatto" data-ca-cal-fatto hidden>✓ Appuntamento fissato. Ti arriva la conferma via email.</p>';
    conversazione.appendChild(box);
    conversazione.scrollTop = conversazione.scrollHeight;

    /* La maniglia si tiene: chiudere il blocco senza chiamare `distruggi()`
       lascerebbe il widget vivo e il singolo `attivo` di
       `calendario.client.js` puntato a un nodo staccato dal documento. */
    montaggioRichiamo = montaCalendario({
      riquadro: box.querySelector('[data-ca-calendario]'),
      ripiego: box.querySelector('[data-ca-cal-ripiego]'),
      link: box.querySelector('[data-ca-cal-link]'),
      url: RICHIAMO.url,
      prefill: {
        /* Separati: il modulo di `recall` ha «Nome» e «Cognome» in due campi, e
           un evento cosi' **ignora `name`** — arrivavano vuoti mentre l'email
           era compilata. Vedi `nomiCompleti` in `calendario.client.js`. */
        firstName: dati.nome,
        lastName: dati.cognome,
        email: dati.email,
        location: dati.telefono || '',
        customAnswers: { a1: contestoRichiamo() },
      },
      onPrenotato: function () {
        var fatto = box.querySelector('[data-ca-cal-fatto]');
        if (fatto) fatto.hidden = false;
        /* Prenotato: la chiusura non serve più e diventa rumore accanto a una
           conferma. Il blocco resta, che è quello che dice cosa è successo. */
        var chiudi = box.querySelector('[data-ca-richiamo-chiudi]');
        if (chiudi) chiudi.hidden = true;
        conversazione.scrollTop = conversazione.scrollHeight;
      },
    });
  }

  /** Il montaggio in corso, per poterlo smontare alla chiusura. */
  var montaggioRichiamo = null;

  // ── L'azione: iscrizione o prova ──────────────────────────────────────────
  /**
   * Il segnale che il modello manda quando la persona ha appena confermato di
   * voler procedere (regole 7, 8 e 12 del prompt di `CHAT ATHLON`): non è
   * testo, è un innesco. `n8n` lo valida gia' contro un enum fisso prima di
   * mandarlo qui — vedi «Leggi la risposta» nel workflow — ma si tratta comunque
   * come un dato esterno: un tipo che non riconosciamo non fa niente.
   */
  function eseguiAzione(azione) {
    if (!azione || !conversazione) return;
    if (azione.tipo === 'iscrizione') mostraIscrizione(azione);
    else if (azione.tipo === 'prova') mostraProva();
  }

  /** Annuale/mensile, Annuale/unico, Mensile Flex: l'ordine fisso delle tre
      opzioni di ogni piano in `data/abbonamenti.ts`. Il modello manda solo
      queste tre chiavi (mai un indice, mai un importo): il resto — nome del
      piano, cifra, periodo, risparmio, `PaymentPlanId` — si legge qui, dall'unico
      posto dove quei dati vivono davvero. Il modello non li vede nemmeno: non
      sono nel testo della KB (vedi `kb.json.ts`), quindi non potrebbe inventarli
      in modo che sembrasse plausibile. */
  var INDICE_OPZIONE = { 'annuale-mensile': 0, 'annuale-unico': 1, 'mensile-flex': 2 };

  function trovaOpzione(pianoId, opzioneChiave) {
    var piano = plans.filter(function (p) { return p.id === pianoId; })[0];
    var indice = INDICE_OPZIONE[opzioneChiave];
    var opzione = piano && indice !== undefined ? piano.options[indice] : null;
    return opzione ? { piano: piano, opzione: opzione } : null;
  }

  /**
   * La card dell'iscrizione, dentro la conversazione. Riusa esattamente la
   * gerarchia gia' scritta per il pulsante «Iscriviti» del sito
   * (`iscrizione.client.js`, `haGiaAccount` da `data/contatto.ts`): chi ha gia'
   * un account — Member o Guest — non si registra di nuovo, l'accesso e' il
   * comando pieno e il reset e' la deviazione sotto; chi non ce l'ha va dritto
   * al link PerfectGym con il `PaymentPlanId` del piano scelto.
   */
  function mostraIscrizione(azione) {
    var trovato = trovaOpzione(azione.piano, azione.opzione);
    if (!trovato) return;

    var box = document.createElement('div');
    box.className = 'ca__richiamo';

    if (haGiaAccount({ memberType: dati.memberType, stato: dati.statoNucleo })) {
      box.innerHTML =
        '<p class="ca__richiamo-titolo">Hai già un account</p>' +
        '<p class="ca__richiamo-lead">Accedi al portale e aggiungi l’abbonamento da lì: Abbonamenti → Aggiungi abbonamento.</p>' +
        '<a class="ca__richiamo-btn" href="' + escape(PORTALE.login) + '" target="_blank" rel="noopener">Accedi al portale →</a>' +
        '<button type="button" class="ca__azione-link" data-ca-reset>Non ricordi la password? Richiedi il reset</button>' +
        '<p class="ca__azione-esito" data-ca-reset-esito hidden></p>';
    } else {
      box.innerHTML =
        '<p class="ca__richiamo-titolo">' + escape(trovato.piano.name) + ' — ' + escape(trovato.opzione.amount) + ' ' + escape(trovato.opzione.period) + '</p>' +
        '<p class="ca__richiamo-lead">' + escape(trovato.opzione.title) + (trovato.opzione.sub ? ' · ' + escape(trovato.opzione.sub) : '') + '</p>' +
        '<a class="ca__richiamo-btn" href="' + escape(trovato.opzione.href) + '" target="_blank" rel="noopener">Vai all’iscrizione →</a>';
    }

    conversazione.appendChild(box);
    conversazione.scrollTop = conversazione.scrollHeight;

    var btnReset = box.querySelector('[data-ca-reset]');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        richiediResetPassword(btnReset, box.querySelector('[data-ca-reset-esito]'));
      });
    }
  }

  /**
   * Il reset password dalla chat: stessa chiamata di `iscrizione.client.js`,
   * stessa regola su cosa fare se non risponde — si apre comunque la pagina del
   * portale, perché quello è quello che la persona voleva. L'email è quella già
   * verificata in questa conversazione, non se ne chiede un'altra.
   */
  async function richiediResetPassword(btn, esito) {
    if (!dati.email) return;
    btn.disabled = true;
    try {
      var stop = new AbortController();
      var scaduta = window.setTimeout(function () { stop.abort(); }, 10000);
      var r = await fetch(WEBHOOK_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: stop.signal,
        body: JSON.stringify({
          email: dati.email,
          pagina: dati.pagina,
          origine: 'chat-reset',
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
        }),
      });
      window.clearTimeout(scaduta);
      var corpo = await r.json();
      if (corpo && corpo.esito === 'inviata') {
        if (esito) {
          esito.textContent = 'Fatto: ti abbiamo mandato via email il link per reimpostarla.';
          esito.hidden = false;
        }
        btn.hidden = true;
        return;
      }
      throw new Error('esito non inviata');
    } catch (e) {
      /* Qualunque errore o timeout: si apre comunque il portale, che è dove la
         persona voleva arrivare — vedi la stessa scelta in `iscrizione.client.js`. */
      btn.disabled = false;
      var scheda = null;
      try {
        scheda = window.open(PORTALE.reset, '_blank', 'noopener');
      } catch (e2) {
        scheda = null;
      }
      if (!scheda) window.location.href = PORTALE.reset;
    }
  }

  /**
   * La card del Guest Pass, dentro la conversazione: solo qui — non prima —
   * parte davvero la richiesta prova, con lo stesso contratto del webhook che
   * usa `ProvaModal.astro` (`athlon-prova-compilata`). Senza questa chiamata il
   * codice mostrato non produrrebbe nessuna riga su `richieste_prova`, nessuna
   * email e nessun WhatsApp di conferma: una prova richiesta a voce che per il
   * resto del sistema non esiste.
   *
   * Il gate `memberType !== 'Member'` e' lo stesso della pagina del club: Lead
   * e Guest possono provare, Member no. Se `memberType` manca — la verifica non
   * ha risposto — non si offre in automatico: e' lo stesso verso in cui si
   * preferisce sbagliare per tutto il resto del sito.
   */
  function mostraProva() {
    if (dati.memberType && /member/i.test(dati.memberType)) {
      var negato = document.createElement('div');
      negato.className = 'ca__richiamo';
      negato.innerHTML =
        '<p class="ca__richiamo-titolo">Il Guest Pass non si può attivare</p>' +
        '<p class="ca__richiamo-lead">Risulta già un tesseramento Athlon a questa email, e il Pass è riservato a chi non ne ha mai avuto uno. Puoi comunque prenotare una lezione singola o scegliere un abbonamento.</p>' +
        '<a class="ca__richiamo-btn" href="/abbonamenti#accessi-singoli">Vedi gli accessi singoli →</a>';
      conversazione.appendChild(negato);
      conversazione.scrollTop = conversazione.scrollHeight;
      return;
    }
    if (!dati.memberType || !dati.email) return;

    var box = document.createElement('div');
    box.className = 'ca__richiamo';
    box.innerHTML =
      '<p class="ca__richiamo-titolo">Il tuo Guest Pass</p>' +
      '<p class="ca__richiamo-lead">Copialo, poi aprilo sul portale: si incolla in fase di iscrizione e sblocca la settimana Premium a ' + escape(GUEST_PASS.prezzo) + ' €.</p>' +
      '<button type="button" class="ca__richiamo-btn" data-copy-code="' + escape(GUEST_PASS.codice) + '" style="border:0;cursor:pointer;">Codice: ' + escape(GUEST_PASS.codice) + ' · copia</button>' +
      '<ol class="ca__richiamo-lead" style="padding-left:1.1rem;">' +
      PASSI_ATTIVAZIONE.map(function (p) { return '<li>' + p + '</li>'; }).join('') +
      '</ol>' +
      '<a class="ca__richiamo-btn" href="' + escape(REGISTRAZIONE) + '" target="_blank" rel="noopener">Vai all’iscrizione →</a>';
    conversazione.appendChild(box);
    conversazione.scrollTop = conversazione.scrollHeight;

    var btnCopia = box.querySelector('[data-copy-code]');
    if (btnCopia) {
      btnCopia.addEventListener('click', async function () {
        var testoOriginale = btnCopia.textContent;
        try {
          await navigator.clipboard.writeText(GUEST_PASS.codice);
          btnCopia.textContent = GUEST_PASS.codice + ' · copiato ✓';
        } catch (e) {
          btnCopia.textContent = GUEST_PASS.codice + ' · copia a mano';
        }
        window.setTimeout(function () { btnCopia.textContent = testoOriginale; }, 2000);
      });
    }

    /* La richiesta vera, in parallelo a quello che la persona gia' vede: al
       browser si e' gia' risposto col codice, che e' suo comunque anche se
       questa chiamata fallisce — stessa scelta di `provaForm.client.js`. */
    fetch(PROVA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'prova',
        email: dati.email,
        nome: dati.nome,
        cognome: dati.cognome,
        cellulare: dati.telefono,
        telefono: dati.telefono,
        stato: dati.stato,
        codice: GUEST_PASS.codice,
        pagina: dati.pagina,
        origine: 'chat',
        cta: 'assistente',
        attivita: dati.attivita ? [dati.attivita] : [],
        utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
        vid: window.athlonGetVid ? window.athlonGetVid() : null,
        sid: window.athlonGetSid ? window.athlonGetSid() : null,
      }),
    }).then(function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'chat-prova' });
    }).catch(function () {
      /* Il codice resta suo comunque: il lead perso e' un problema nostro, e
         n8n lo vede dal log del webhook — vedi la stessa scelta in
         `provaForm.client.js`. */
    });
  }

  /**
   * Toglie il calendario e restituisce la conversazione.
   *
   * Chiuderlo non lo mette al bando: l'icona in intestazione continua a
   * funzionare, e `mostraRichiamo()` ne monta uno nuovo perché il vecchio non
   * c'è più. Non serve ricordarsi che è stato chiuso — da quando il calendario
   * si apre solo su richiesta, riproporlo da sé non capita più.
   */
  async function chiudiRichiamo() {
    var box = conversazione && conversazione.querySelector('.ca__richiamo');
    try {
      var m = await montaggioRichiamo;
      if (m) m.distruggi();
    } catch (e) {}
    montaggioRichiamo = null;
    if (box) box.remove();
  }

  // ── L'oblio sul totem ─────────────────────────────────────────────────────
  /**
   * Svuota lo stato senza toccare il pannello.
   *
   * Sta separato da `reset` per una ragione precisa: `reset` chiama anche
   * `onChiudi()`, che fra le altre cose toglie `amodal-locked` dal `body`. Se
   * l'oblio scattasse a pannello chiuso — cioè il caso normale, la persona se
   * n'è andata dopo aver chiuso — e nel frattempo fosse aperto **un altro**
   * modal, quella riga sbloccherebbe lo scorrimento sotto il pannello di
   * qualcun altro. Il fondo comincerebbe a scorrere dietro il modulo dei
   * contatti, e nessuno collegherebbe la cosa a una chat chiusa tre minuti
   * prima.
   */
  function pulisciStato() {
    dati = statoIniziale();
    trascritto = [];
    ticketInviato = false;
    /* Il pulsante torna nascosto: `puoRichiamo` si riscopre dalla verifica
       dell'email, e fino ad allora non sappiamo se questa persona può
       prenotare. */
    if (btnRichiamo) btnRichiamo.hidden = true;
    if (campoEmail) campoEmail.value = '';
    if (campoDomanda) campoDomanda.value = '';
    if (conversazione) conversazione.innerHTML = '';
    mostra('email');
  }

  /**
   * Tre minuti di inattività, e **solo sul totem**, azzerano la conversazione.
   *
   * La chat riprende dove stava di proposito: chiudere il pannello per sbaglio
   * non deve costare l'email e il ramo, e su un computer personale quella è la
   * scelta giusta — la conversazione è di chi ha quel dispositivo. Sul pannello
   * all'ingresso del club no: lì la persona dopo esiste davvero, e trova
   * l'indirizzo email e le domande di chi è passato prima.
   *
   * **Tre minuti**, e la misura viene dal costo dei due errori, che non sono
   * simmetrici. Troppo presto si cancella il lavoro di qualcuno che è ancora
   * lì a leggere, e lo vede: deve ridigitare l'email. Troppo tardi si mostra
   * l'indirizzo di uno sconosciuto a chi riapre il pannello. Il primo è un
   * fastidio visibile e recuperabile, il secondo è un dato di un'altra persona
   * — quindi si sta dalla parte breve, ma non tanto da colpire chi legge una
   * risposta lunga.
   *
   * **L'attesa di una risposta non è inattività**, ed è l'unico caso in cui
   * stare davanti allo schermo non produce eventi: mentre l'assistente pensa,
   * il conto è sospeso e riparte quando la risposta arriva. Senza questo, una
   * risposta lenta e un visitatore paziente sarebbero indistinguibili da una
   * sala vuota.
   */
  var INATTIVITA = 3 * 60 * 1000;
  var orologioOblio = null;

  function fermaOblio() {
    if (orologioOblio) {
      clearTimeout(orologioOblio);
      orologioOblio = null;
    }
  }

  function armaOblio() {
    if (!suTotem()) return;
    fermaOblio();
    orologioOblio = setTimeout(function () {
      orologioOblio = null;
      /* Una domanda in volo: la persona è lì e aspetta, e cancellarle la
         conversazione mezzo secondo prima della risposta è il modo peggiore di
         sbagliare. Si riparte da capo col conto. */
      if (inCorso) {
        armaOblio();
        return;
      }
      /* Chiude solo se è aperto. Da chiuso si svuota e basta: vedi il commento
         di `pulisciStato`. */
      var aperto = root.classList.contains('open');
      pulisciStato();
      if (aperto) onChiudi();
    }, INATTIVITA);
  }

  /* Cosa conta come presenza: un tocco, un tasto, una scrittura, uno
     scorrimento della conversazione. Su un pannello touch il movimento del
     puntatore non esiste, quindi non lo si ascolta — sarebbe un evento che su
     quel dispositivo non arriva mai. `capture` perché alcuni gestori più sotto
     fermano la propagazione.

     **Ma il conto non dipende solo da questi eventi**, e la differenza l'ha
     trovata una prova: `armaOblio` è chiamata anche dai punti in cui lo stato
     *nasce* — la verifica dell'email, l'apertura della conversazione, ogni
     risposta. Legarlo ai soli eventi voleva dire che il timer partiva perché
     qualcuno aveva toccato lo schermo, non perché c'era qualcosa da dimenticare:
     basta un percorso che arriva a destinazione senza un `pointerdown` — un
     invio da tastiera, un comando premuto da fuori il pannello, un ramo che
     salta un passo — e l'email resta lì per sempre. Il conto deve seguire il
     dato, non il dito. */
  ['pointerdown', 'keydown', 'input'].forEach(function (evento) {
    root.addEventListener(evento, armaOblio, true);
  });
  if (conversazione) conversazione.addEventListener('scroll', armaOblio, { passive: true });

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
          /* Anche il ticket: chi chiede di parlare con una persona è un contatto
             come gli altri, e il desk deve poter sapere se sta rispondendo a
             qualcuno arrivato da una campagna o dal totem in sede. */
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
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
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
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
      /* Solo qui, dopo che la risposta e' gia' a schermo: e' il turno esatto
         in cui la persona ha confermato (regole 7, 8, 12 del prompt), non
         un'anticipazione. */
      eseguiAzione(risposta.azione);
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
      /* La risposta è arrivata: da adesso i tre minuti sono di lettura, e sono
         i suoi. Riparte il conto da capo — non da quando la domanda è partita,
         che avrebbe fatto scadere il tempo durante l'attesa. */
      armaOblio();
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
  var emailEco = q('[data-ca-email-eco]');
  var emailEcoValore = q('[data-ca-email-eco-valore]');
  var emailCampo = q('[data-ca-email-campo]');
  var emailGriglia = q('[data-ca-email-griglia]');

  /**
   * L'email confermata si mostra come riga, non come campo.
   *
   * Il campo resta nel documento e resta compilato: `valore('email')` legge da
   * lì e il payload pure, quindi nascondere il contenitore non cambia niente di
   * quello che parte. Cambia solo cosa vede una persona che l'ha già scritta un
   * passo prima.
   */
  function mostraEmailConfermata(confermata) {
    if (!emailEco || !emailCampo) return;
    emailEco.hidden = !confermata;
    emailCampo.hidden = confermata;
    if (emailGriglia) emailGriglia.classList.toggle('ca__griglia--una', confermata);
    if (confermata && emailEcoValore) {
      emailEcoValore.textContent = campi.email ? campi.email.value : '';
    }
  }

  /**
   * Il numero in forma internazionale, dal prefisso scelto accanto al campo.
   *
   * Sostituisce un `cellulareNudo()` che teneva le cifre nude e un `'+39' +`
   * incollato in tre posti diversi: quindi chi ha un numero straniero non poteva
   * lasciarlo, e la forma giusta non bastava — `3333333333` la rispetta.
   */
  function telefonoScelto(valoreScritto) {
    var pref = q('#ca-cellulare-prefisso');
    return validaTelefono(pref ? pref.value : '+39', valoreScritto);
  }

  /** Il numero già pronto, o `''`. Per i punti che non devono validare niente. */
  function telefonoPronto(v) {
    var e = validaTelefono('+39', v);
    return e.ok ? e.e164 : '';
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
      validaTelefono('+39', dati.telefono).ok
    );
  }

  function segnala(nome, messaggio) {
    if (erroreDati) {
      erroreDati.textContent = messaggio;
      erroreDati.hidden = false;
    }
    var el = campi[nome];
    if (el) {
      /* L'email confermata non ha un campo a schermo, quindi non c'è niente da
         mettere a fuoco: `focus()` su un elemento invisibile non fa niente e il
         messaggio resterebbe senza un posto dove intervenire. Non è un caso
         raggiungibile — la riga si mostra solo con un indirizzo già valido — ma
         se lo diventasse, meglio riaprirlo che segnalare nel vuoto. */
      if (nome === 'email' && emailCampo && emailCampo.hidden) {
        mostraEmailConfermata(false);
      }
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
      var tel = telefonoScelto(valore('cellulare'));
      if (!tel.ok) {
        return segnala('cellulare', tel.motivo);
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
       di nascita e i dati del bambino servono a creare l'anagrafica del bambino
       sul portale, non a farsi ricontattare. E se di lui sappiamo già tutto,
       resta solo il bambino.

       Il testo non parla di **iscrizione**, e non è una sfumatura: qui non si
       iscrive nessuno a niente. Si crea l'account del bambino, che è quello che
       gli fa vedere corsi, orari e posti liberi sul portale — promettere
       un'iscrizione a chi ha lasciato quattro campi in una chat vorrebbe dire
       far credere che il posto è preso. */
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
          ? 'I dati per il suo account'
          : 'I dati di tuo figlio';
    }
    if (leadDati) {
      leadDati.textContent = !junior
        ? 'Ci presentiamo: sono i dati con cui il club ti ricontatta. Poi passiamo alle tue domande.'
        : suoi
          ? 'Con i tuoi e quelli del bambino gli creiamo un account sul portale: da lì vedi tutti i nostri corsi, gli orari e i posti liberi. Poi passiamo alle tue domande.'
          : 'Di te sappiamo già tutto: servono solo i suoi, per creargli l’account sul portale e farti vedere tutti i corsi. Poi passiamo alle tue domande.';
    }
    /* Quello che sappiamo già non si richiede a mano. L'email è quella del
       primo passo: resta modificabile, perché è possibile che l'abbia scritta
       per fare la verifica e ne voglia usare un'altra per essere ricontattato. */
    if (campi.nome && !campi.nome.value) campi.nome.value = dati.nome || '';
    if (campi.cognome && !campi.cognome.value) campi.cognome.value = dati.cognome || '';
    if (campi.email && !campi.email.value) campi.email.value = dati.email || '';
    if (campi.cellulare && !campi.cellulare.value) {
      campi.cellulare.value = dati.telefono || '';
    }
    /* Confermata solo se è davvero un indirizzo: se la verifica non ne ha
       lasciato uno buono il campo va chiesto, non confermato. */
    mostraEmailConfermata(!!(campi.email && emailValida(campi.email.value)));
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
            cellulare: telefonoPronto(valore('cellulare')) || dati.telefono || '',
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
          /* L'attribuzione: questo è il payload che **crea il lead**, quindi è
             quello che deve portarla. Ci mancava, mentre `CHAT` — la
             conversazione — la mandava già: il risultato era che di un contatto
             nato dalla chat non si sapeva da dove venisse, e sul totem non
             portava `TOUR`. */
          utm: window.athlonGetUtm ? window.athlonGetUtm() : {},
          vid: window.athlonGetVid ? window.athlonGetVid() : null,
          sid: window.athlonGetSid ? window.athlonGetSid() : null,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));

      /* Dopo il controllo su `r.ok`, quindi solo quando i dati sono davvero
         arrivati: qui un 500 diventa un `throw` e finisce nel `catch`, dove la
         persona può proseguire senza che il lead sia stato scritto. */
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'chat' });

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
    dati.telefono = telefonoPronto(valore('cellulare'));
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
    /* `data-ca-richiamo` lo porta ormai la sola icona in intestazione: la
       delega resta perché il gesto è uno e il gestore deve restare uno anche
       se un domani quell'attributo tornasse su un secondo comando. */
    /* La chiusura prima dell'apertura: il pulsante × sta **dentro** il blocco
       del calendario, e il blocco non porta `data-ca-richiamo` — ma se un
       domani lo portasse, l'ordine inverso lo riaprirebbe subito dopo averlo
       chiuso. */
    if (e.target.closest && e.target.closest('[data-ca-richiamo-chiudi]')) {
      chiudiRichiamo();
      return;
    }

    if (e.target.closest && e.target.closest('[data-ca-richiamo]')) {
      mostraRichiamo();
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
      pulisciStato();
      onChiudi();
    },
  };
}
