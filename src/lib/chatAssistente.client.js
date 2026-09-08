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
import { suTotem } from '../scripts/totem';
import { leggi as emailConosciuta } from '../scripts/emailNota';
import { leggi as userNumberConosciuto } from '../scripts/numeroSocio';
import { montaAppuntamento } from './appuntamentoInline.client.js';
import { plans, GUEST_PASS } from '../data/abbonamenti';
import { REGISTRAZIONE, PASSI_ATTIVAZIONE } from '../data/guestPass';
import {
  WEBHOOK_RESET,
  PORTALE,
  haGiaAccount,
  anagraficaNota,
  servonoISuoiDati,
} from '../data/contatto';

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
  /* Il voto alla chat: una riga sola su `chat_conversazioni`, trovata dalla
     sessione. Vedi `CHAT ATHLON — VALUTAZIONE` su n8n. */
  var VALUTAZIONE = 'https://automazione.n8ndevelop.it/webhook/chat-athlon-valutazione';

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
     conversazione: si passano al calendario così la persona sceglie solo
     giorno e ora. E con loro va **la conversazione**: il testo degli ultimi
     scambi finisce nell'argomento della chiamata, che è il campo che chi
     richiama legge prima di comporre il numero. Con Calendly quel testo usciva
     dal sito e non tornava più indietro; adesso è la nota di programmazione
     della voce d'agenda. */
  var RICHIAMO = {
    /* Il trascritto intero non ci sta in un campo di briefing, e chi richiama
       non lo legge comunque: si tengono gli ultimi scambi, che sono quelli che
       dicono di cosa si stava parlando. */
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
    /* La scelta fra le due si fa per **anno di nascita**, non in mesi, ed è la
       regola che toglie la sovrapposizione: i nati dal 2013 al 2023 fanno la
       Scuola Nuoto Bambini, i nati nel 2024, 2025 e 2026 il Baby Nuoto. Prima
       le note dicevano «dai 30 mesi» e «da 3 a 36 mesi», e fra i 30 e i 36 mesi
       le due fasce si sovrapponevano davvero — quello che mandava un bambino
       del 2023 nel corso sbagliato. Ora l'anno decide da solo, come già fa il
       portale (sotto «nati 2023» c'è la scuola nuoto). Per il Baby Nuoto la
       nota dice anche del genitore in acqua, che è l'altra differenza. Gli anni
       vanno aggiornati ogni stagione. */
    { id: 'scuola-nuoto-bambini', label: 'Scuola Nuoto Bambini', nota: 'nati dal 2013 al 2023' },
    { id: 'baby-nuoto', label: 'Baby Nuoto', nota: 'nati nel 2024, 2025 e 2026, con un genitore in acqua' },
    { id: 'nuoto-agonistico', label: 'Nuoto Agonistico', nota: '' },
    { id: 'pallanuoto', label: 'Pallanuoto', nota: '' },
  ];

  /* Il pulsante scelto qui sopra è una supposizione di chi scrive, fatta
     prima di aver detto l'anno vero: le due note appena sopra lo dicono, ma
     nessuno fa il conto con precisione cliccando un bottone. La data di
     nascita del bambino, che arriva un passo dopo nel form dati, è invece il
     dato esatto — e se le due cose non coincidono si corregge da quella,
     vedi `correggiAttivitaJunior()`. Fuori da 2013-2026 non è una di queste
     due attività (nuoto agonistico, pallanuoto, o nessuna): non correggere,
     '' lo dice a chi chiama. */
  function attivitaJuniorDaAnno(anno) {
    if (anno >= 2024 && anno <= 2026) return 'baby-nuoto';
    if (anno >= 2013 && anno <= 2023) return 'scuola-nuoto-bambini';
    return '';
  }

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
      /** Il numero socio, quando la verifica è partita da un link invece che
          da un'email digitata. Vedi `numeroSocio.ts`. */
      userNumber: '',
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
      /** L'intento del comando che ha aperto la chat, dedotto dal testo della
          CTA: 'assistenza' apre con un saluto d'aiuto invece della
          presentazione del club, '' lascia l'apertura al ramo. Vedi
          `intentoDaCta` e le APERTURE. */
      ctaIntento: '',
      /** La data di nascita del bambino, come l'ha scritta nel form dei dati
          (YYYY-MM-DD). Non serve a PerfectGym da qui — quella l'ha già
          ricevuta `inviaDati()` — serve a non richiederla una seconda volta
          in chat: il modello non la vede altrimenti, perché è un campo di un
          form e non un messaggio scritto in conversazione. */
      bambinoNascita: '',
      /** Vero da quando l'anagrafica è partita: non si richiede due volte. */
      datiFatti: false,
      pagina: '/',
    };
  }
  var dati = statoIniziale();

  var CHIAVE_SESSIONE = 'athlon:assistente:sessione';

  function idNuovo() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function sessione() {
    try {
      var salvata = sessionStorage.getItem(CHIAVE_SESSIONE);
      if (salvata) return salvata;
      var nuova = idNuovo();
      sessionStorage.setItem(CHIAVE_SESSIONE, nuova);
      return nuova;
    } catch (e) {
      return String(Date.now());
    }
  }

  /**
   * Una conversazione appartiene a **una persona sola**, e questa funzione è
   * quello che lo garantisce.
   *
   * `sessione` vive in `sessionStorage`, quindi sopravvive a un ricaricamento
   * della pagina e all'oblio del totem — mentre `dati.email` no, si riazzera.
   * Il risultato, misurato su una sessione vera: la riga di
   * `chat_conversazioni` nasce col primo messaggio e **si tiene per sempre la
   * prima email**, perché gli inserimenti successivi trovano la stessa
   * `sessione` e non cambiano niente. Chi cominciava a scrivere con un
   * indirizzo e poi ne confermava un altro finiva con la conversazione
   * attaccata a una persona e la richiesta prova a un'altra: nel pannello del
   * desk la scheda di chi ha chiesto la prova non mostrava la conversazione,
   * che era rimasta sulla scheda di prima.
   *
   * Sul totem è peggio che un fastidio: `pulisciStato()` dimentica la persona
   * ma non l'identificativo, quindi i messaggi di chi arriva dopo si
   * accodavano alla conversazione di chi era passato prima, sotto la sua
   * email.
   *
   * Quindi: **identità nuova, conversazione nuova.** Non si aggiorna la riga
   * vecchia — sarebbe spostare a una persona quello che ne ha detto un'altra —
   * se ne apre una accanto. La memoria del modello riparte con lei, ed è
   * giusto: sta parlando con qualcun altro.
   */
  function rinnovaSessione() {
    try {
      sessionStorage.setItem(CHIAVE_SESSIONE, idNuovo());
    } catch (e) {}
    /* **E la conversazione con lei**, in memoria e nello storage. Da quando la
       scena sopravvive al cambio di pagina, tenerla qui vorrebbe dire
       ridisegnare a chi ha appena scritto il proprio indirizzo la
       conversazione di chi c'era prima — sotto il suo nome, per giunta, perché
       lo stato è già quello nuovo. Identità nuova, conversazione nuova: vale
       per la riga su `chat_conversazioni` e vale per quello che sta a schermo.
       Oggi non ci si arriva dall'interfaccia — al passo dell'email si torna
       solo passando da `pulisciStato()`, che pulisce tutto — ma la garanzia
       deve stare qui, accanto all'identità che cambia, non nel fatto che
       nessun pulsante ci porti. */
    trascritto = [];
    dimenticaScena();
    if (conversazione) conversazione.innerHTML = '';
  }

  function dimenticaSessione() {
    try {
      sessionStorage.removeItem(CHIAVE_SESSIONE);
    } catch (e) {}
  }

  // ── La conversazione sopravvive al cambio di pagina ───────────────────────
  /**
   * Il sito è statico e multipagina: aprire un link **ricarica tutto**, e con
   * tutto se ne andava la conversazione. Restava solo `sessione`, che vive in
   * `sessionStorage` — quindi il modello continuava a ricordare (n8n tiene la
   * memoria su quella chiave) mentre la persona riapriva il pannello e trovava
   * il passo dell'email e una chat vuota. Il caso peggiore di tutti: la
   * macchina ricorda, chi ha scritto no, e la seconda domanda arriva come se
   * fosse la prima.
   *
   * Quindi si salva quello che manca: lo stato (`dati`) e **la scena**, cioè
   * l'ordine in cui le cose sono comparse nella conversazione.
   *
   * Tre scelte, e nessuna è arbitraria:
   *
   * - **`sessionStorage` e non `localStorage`.** La conversazione dura quanto
   *   la scheda: cambiare pagina la conserva, chiudere il browser la chiude.
   *   Con `localStorage` la chat di stasera riaprirebbe domani sul computer di
   *   casa davanti a un'altra persona della famiglia — che è lo stesso guaio
   *   del totem, spostato di ventiquattr'ore. È anche la ragione per cui non
   *   serve il consenso: la sessione della chat è **necessaria**, come già
   *   dichiarato in `/privacy`.
   * - **Sul totem non si salva niente**, e si riconosce con lo stesso
   *   `suTotem()` dell'oblio a tre minuti e di `emailNota.ts`. Là il ripristino
   *   sarebbe l'oblio annullato da un click sul menu.
   * - **Si salva la scena, non `conversazione.innerHTML`.** Le schede di
   *   iscrizione e Guest Pass hanno due pulsanti con il gestore attaccato
   *   direttamente — il reset password e la copia del codice — e un innerHTML
   *   rimesso in pagina li riporterebbe muti. Ripassando dalle stesse funzioni
   *   che le hanno disegnate, i gestori tornano insieme al markup.
   *
   * Quello che **non** si ripete è la parte che ha un effetto fuori dal
   * browser: `mostraProva()` in ricostruzione non ripubblica la richiesta prova
   * (sarebbe una seconda riga su `richieste_prova`, una seconda email e un
   * secondo WhatsApp per una prova sola), e il calendario di Calendly non si
   * rimonta — è un iframe vivo, non un pezzo di conversazione, e l'icona ☎ lo
   * riapre in un gesto.
   */
  /* La legge anche `ChatModal.astro`, prima ancora che questo modulo sia
     caricato — è lui a decidere se vale la pena importarlo appena la pagina
     arriva. La stringa è duplicata lì, non importata: le due copie vanno
     tenute uguali a mano. */
  var CHIAVE_RIAPRI = 'athlon:assistente:riapri';

  var CHIAVE_SCENA = 'athlon:assistente:scena';
  /* Un tetto, perché `sessionStorage` è piccolo e una conversazione lunga porta
     dentro l'HTML di ogni bolla: si tiene la coda, che è la parte che si sta
     leggendo. Il trascritto che va al desk non passa di qui — quello se lo
     tiene n8n, riga per riga, su `chat_messaggi`. */
  var SCENA_MAX = 80;
  var scena = [];
  /** Vero mentre si ridisegna: sopprime i salvataggi e gli effetti esterni. */
  var ricostruendo = false;

  /* L'attività con cui la chat parte già scelta, quando la apre un comando che
     la conosce: il pulsante «Trova il corso giusto per tuo figlio» della scuola
     nuoto sa di parlare di scuola nuoto bambini, quindi il passo «di quale
     attività si tratta?» è una domanda a cui la persona ha già risposto
     arrivando da lì. La si consuma una volta sola, all'arrivo al passo
     dell'attività: una conversazione già in corso non si sposta di corso. */
  var preselezioneAttivita = '';

  /** Vero se `id` è una delle voci pickabili nel passo dell'attività. */
  function attivitaEsiste(id) {
    return !!id && ATTIVITA.some(function (a) {
      return a.id === id;
    });
  }

  /* L'intento del pulsante che ha aperto la chat, letto dal suo testo. Chi
     arriva da «Richiedi assistenza» vuole aiuto, non la presentazione del
     club: l'apertura lo rispecchia, qualunque sia il ramo (tranne junior, che
     ha la sua apertura sull'attività). «Chatta con noi» e ogni altro pulsante
     generico non danno un intento e lasciano l'apertura al ramo. Si guarda al
     testo e non alla sorgente perché è il testo che la persona ha letto e
     cliccato — ed è quello che il committente ha chiesto di rispecchiare. */
  function intentoDaCta(testo) {
    var t = String(testo || '').toLowerCase();
    if (/assistenz|aiuto|supporto/.test(t)) return 'assistenza';
    return '';
  }

  /* Il titolo del passo email, per intento della CTA — la stessa scelta delle
     APERTURE, un passo prima: chi arriva da «Richiedi assistenza» legge un
     titolo d'aiuto, chi arriva da «Trova il corso giusto per tuo figlio» legge
     già di cosa si sta parlando, chi arriva da «Chatta con noi» un invito
     generico. Il modulo lo scrive all'apertura di una chat nuova; il markup
     porta il default che si vede finché il modulo non gira. */
  var EMAIL_TITOLO = {
    assistenza: 'Come possiamo aiutarti?',
    junior: 'Troviamo il corso giusto per tuo figlio',
    adulti: 'Troviamo l’attività giusta per te',
    generico: 'Di cosa ti va di parlare?',
  };
  function vestiEmail() {
    if (!emailTitolo) return;
    /* L'attività preselezionata (`preselezioneAttivita`, valorizzata da
       `apri()` prima di questa chiamata) conta quanto l'intento: un pulsante
       di corso non dice «assistenza» nel testo, ma sa benissimo di cosa parla.
       Il suo pubblico — junior o adulti — decide quale titolo. */
    var ambito = preselezioneAttivita ? ACTIVITY_AUDIENCE[preselezioneAttivita] : '';
    emailTitolo.textContent =
      dati.ctaIntento === 'assistenza'
        ? EMAIL_TITOLO.assistenza
        : ambito === 'junior'
          ? EMAIL_TITOLO.junior
          : ambito === 'adulti'
            ? EMAIL_TITOLO.adulti
            : EMAIL_TITOLO.generico;
  }

  function salva() {
    if (ricostruendo || suTotem()) return;
    /* Niente email e niente conversazione vuol dire che non c'e' ancora niente
       da ritrovare: si evita di scrivere un record vuoto, e soprattutto di
       riscriverne uno subito dopo `pulisciStato()`, che l'aveva appena tolto. */
    if (!dati.email && !dati.userNumber && !scena.length) return;
    try {
      if (scena.length > SCENA_MAX) scena = scena.slice(-SCENA_MAX);
      sessionStorage.setItem(
        CHIAVE_SCENA,
        JSON.stringify({
          v: 1,
          sessione: sessione(),
          dati: dati,
          scena: scena,
          ticketInviato: ticketInviato,
          sollecitato: sollecitato,
          richiamoProposto: richiamoProposto,
          /* La domanda sul voto si fa **una volta per conversazione**, e la
             conversazione sopravvive al cambio di pagina: senza questi due
             flag nella scena, chi cambia pagina se la vedrebbe rifare. */
          votoChiesto: votoChiesto,
          votoDato: votoDato,
          risposteFatte: risposteFatte,
        })
      );
    } catch (e) {
      /* Quota piena o storage negato: la conversazione continua in memoria e
         non sopravvivrà al cambio di pagina. È il verso giusto in cui
         sbagliare — meglio perdere il ripristino che la chat aperta. */
    }
  }

  function dimenticaScena() {
    scena = [];
    try {
      sessionStorage.removeItem(CHIAVE_SCENA);
    } catch (e) {}
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
  /* Il titolo del passo email: lo riscrive `vestiEmail()` in base al testo della
     CTA che ha aperto la chat. L'intro (`data-ca-email-lead`) resta com'è —
     spiega perché serve l'email, e vale in entrambi i casi. */
  var emailTitolo = q('[data-ca-email-titolo]');
  var conversazione = q('[data-ca-conversazione]');
  var campoDomanda = q('[data-ca-domanda]');
  var btnDomanda = q('[data-ca-invia]');
  var intestazione = q('[data-ca-intestazione]');
  var elencoAttivita = q('[data-ca-attivita]');
  /* L'icona della telefonata nell'intestazione. Si cerca fra i figli del modal
     e non dentro la conversazione: quella si svuota a ogni riapertura, questa
     resta. */
  var btnRichiamo = q('[data-ca-richiamo]');
  /* Il gemello scritto della telefonata, nell'intestazione. Si cerca fra i
     figli del modal e non dentro la conversazione, che si svuota a ogni
     riapertura: questo deve restare. */
  var btnScrivi = q('[data-ca-ticket]');

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
    /* **Il passo si salva qui, dove cambia**, e non dove capita.
     *
     * Prima il salvataggio partiva solo da `registra()`, cioè da una battuta
     * nuova, e il passo era quello del momento in cui la battuta e' comparsa.
     * Basta guardare l'ordine di `apriConversazione()` per vedere il guaio: la
     * bolla del saluto si scrive **prima** di `mostra('chat')`, quindi
     * l'unico salvataggio di quella conversazione diceva `passo: 'attivita'`.
     * Chi cambiava pagina dopo il saluto e prima di scrivere si ritrovava
     * l'elenco delle attivita' e nessun campo dove scrivere: il campo sta
     * dentro il passo `chat`, e quel passo era tornato nascosto.
     *
     * Stessa causa un passo piu' in la': chi cambiava pagina mentre compilava
     * il form dei dati tornava all'elenco delle attivita', perche' l'ultimo
     * salvataggio era quello di `verifica()`.
     *
     * `dati.passo` lo scrive questa funzione e nessun'altra, quindi il posto
     * dove registrarlo e' questo — trovato provando la navigazione, non
     * leggendo il codice. */
    salva();
  }

  var escape = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /**
   * Il grassetto delle risposte, e perché passa da qui invece che dal modello.
   *
   * Il prompt gli concede **una sola** cosa di markdown — `**così**`, per il
   * prezzo, il nome dell'attività, l'orario — perché in una chat quelli sono i
   * tre pezzi che si cercano con l'occhio invece di leggerli. Tutto il resto
   * del markdown resta vietato: un titolo o un elenco in una bolla non hanno
   * senso, e l'assistente li produrrebbe volentieri.
   *
   * **Si converte dopo l'escape, non prima**, ed è la riga da non invertire:
   * `escape()` ha già trasformato `<` in `&lt;`, quindi qui dentro non può più
   * entrare markup di nessun tipo — né dal modello, né da quello che una
   * persona ha scritto e che il modello potrebbe ripetere. Convertire prima
   * significherebbe fidarsi del testo, che è esattamente la cosa che non si fa.
   *
   * Solo le coppie: un `**` spaiato resta com'è invece di mangiarsi il resto
   * della frase. Si vede, ed è il verso giusto in cui sbagliare.
   */
  var conGrassetto = function (escapato) {
    return escapato.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  };

  /**
   * Gli asterischi non vanno nel trascritto: quello finisce nell'email al desk
   * e nel contesto di Calendly, dove `**75 €**` è solo rumore da leggere.
   */
  var senzaMarcatori = function (testo) {
    return String(testo).replace(/\*\*/g, '');
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

  /**
   * `numero`, quando passato, è un UserNumber già noto (dal link di una
   * newsletter, o da una verifica precedente riuscita): si salta la lettura
   * e la validazione del campo email, e si cerca su PerfectGym con quello
   * invece che con l'email. Finché la risposta non porta anche l'email della
   * persona, `dati.email` resta vuoto per una sessione aperta così — non
   * rompe niente a valle, ma è deliberato e non una svista.
   */
  async function verifica(numero) {
    var viaNumero = typeof numero === 'string' && numero;
    if (!viaNumero) {
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
      /* L'identità di questa sessione, decisa qui e una volta sola. Se
         l'indirizzo non è quello con cui la sessione stava parlando, da adesso
         si parla con qualcun altro: sessione nuova, conversazione nuova. Vedi
         `rinnovaSessione`. Al primo giro `emailSessione` è vuota e non si
         rinnova niente — sarebbe buttare via la sessione appena nata. */
      try {
        var emailPrima = sessionStorage.getItem('athlon:assistente:email');
        if (emailPrima && emailPrima !== dati.email) rinnovaSessione();
        sessionStorage.setItem('athlon:assistente:email', dati.email);
      } catch (e) {}
      if (window.athlonRicordaEmail) window.athlonRicordaEmail(dati.email);
    } else {
      dati.userNumber = viaNumero;
    }
    attendi(btnEmail, true);

    var esito = null;
    try {
      var stop = new AbortController();
      var scaduta = window.setTimeout(function () {
        stop.abort();
      }, ATTESA_VERIFICA);
      /* Con l'attribuzione, come la stessa verifica chiamata dalla prova e dai
         pulsanti «Iscriviti»: questo endpoint registra **ogni email** del sito
         su `eventi_email`, quindi è il primo tocco di tutti — ed era l'unico
         chiamante a non dire da dove arrivava. Sul totem quel primo tocco
         risultava senza `TOUR`. */
      var corpo = viaNumero ? { userNumber: viaNumero } : { email: dati.email };
      corpo.pagina = dati.pagina;
      corpo.utm = window.athlonGetUtm ? window.athlonGetUtm() : {};
      corpo.vid = window.athlonGetVid ? window.athlonGetVid() : null;
      corpo.sid = window.athlonGetSid ? window.athlonGetSid() : null;
      var r = await fetch(VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: stop.signal,
        body: JSON.stringify(corpo),
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

    /* Il number di PerfectGym, qualunque sia stata la chiave di ricerca:
       ricordato come l'email, così una verifica partita da un indirizzo
       digitato riconosce da qui in poi anche i link di newsletter della
       stessa persona — le due identità confluiscono nella stessa memoria. */
    if (esito && esito.number && window.athlonRicordaUserNumber) {
      window.athlonRicordaUserNumber(esito.number);
    }

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
    dati.conosciuto = anagraficaNota({ stato: dati.stato, statoNucleo: dati.statoNucleo });

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
    /* Se il comando che ha aperto la chat portava già l'attività — «Trova il
       corso giusto per tuo figlio» sulla scuola nuoto — si salta la scelta e si
       va dritti nel ramo di quel corso, lo stesso che aprirebbe un clic sulla
       voce. Si consuma qui, così un reset o una seconda email non la ereditano. */
    if (attivitaEsiste(preselezioneAttivita)) {
      var pre = preselezioneAttivita;
      preselezioneAttivita = '';
      scegliAttivita(pre);
    } else {
      mostra('attivita');
    }
    /* Si salva già qui, prima che ci sia una conversazione: chi verifica
       l'email e poi apre una pagina del sito per guardare l'attività di cui
       stavamo parlando deve ritrovare il passo dell'attività, non ridigitare
       l'indirizzo. */
    salva();
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
    /* Chi apre la chat da «Richiedi assistenza» sta chiedendo aiuto, non un
       depliant: l'apertura parte dall'assistenza a prescindere dal ramo. È la
       stessa materia dell'apertura `iscritto`, perché l'assistenza è quella per
       tutti — quello che cambia è il pulsante da cui si arriva, non le risposte. */
    assistenza: function () {
      return (
        'Ciao, come possiamo aiutarti? Rispondo su prenotazioni, certificato medico, ' +
        'sospensioni, disdette e tutto quello che c’è nelle schede e nel regolamento. Dimmi pure.'
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
      /* Il titolo segue l'apertura: se si arriva da «Richiedi assistenza» il
         pannello dice «Assistenza» anche a chi non è socio, così testata e
         primo messaggio non si contraddicono. Il ramo junior tiene il suo. */
      intestazione.textContent =
        dati.ramo === 'junior'
          ? 'Corsi per bambini'
          : dati.ramo === 'iscritto' || dati.ctaIntento === 'assistenza'
            ? 'Assistenza'
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
              '" data-ca-interno="1">Come si completa l’iscrizione →</a></p>'
            : ''),
        conferma
      );
    }

    /* L'apertura la sceglie il ramo, ma un intento «assistenza» dal pulsante
       vince — tranne nel ramo junior, che ha già la sua apertura sull'attività
       (quella del pulsante «Trova il corso giusto per tuo figlio»). */
    var apertura = (
      dati.ramo === 'junior'
        ? APERTURE.junior
        : dati.ctaIntento === 'assistenza'
          ? APERTURE.assistenza
          : APERTURE[dati.ramo] || APERTURE.adulti
    )();
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
    /* Scrivere al team invece vale per tutti, socio compreso: nessuna
       condizione, solo il momento — quando c'è una conversazione da mandare. */
    if (btnScrivi) btnScrivi.hidden = false;

    mostra('chat');
    /* Da qui c'è una conversazione da dimenticare: sul totem il conto parte. */
    armaOblio();
    /* E il silenzio si misura da subito: la bolla del saluto finisce con una
       domanda, e se resta senza risposta è proprio il momento in cui si perde
       una persona. */
    armaSollecito();
    armaRichiamoInattivo();
  }

  /** Il trascritto, nell'ordine in cui è comparso: è ciò che finisce nel ticket. */
  var trascritto = [];

  /**
   * Registra una battuta nella scena, che è quello che permette di ridisegnarla
   * dopo un cambio di pagina.
   *
   * Sta fuori da `bolla()` perché **la risposta dell'assistente non passa da
   * `bolla()`**: nasce come bolla d'attesa — senza testo, quindi non
   * registrata, ed è giusto — e diventa la risposta sostituendo il proprio
   * `innerHTML`. Finché questa funzione non c'era, una conversazione
   * ripristinata mostrava le domande e non le risposte: la metà peggiore delle
   * due da perdere. Trovato con una prova vera, non leggendo il codice.
   */
  function registra(chi, html, testo) {
    if (ricostruendo || !testo) return;
    scena.push({ k: 'm', c: chi, h: html, t: testo });
    salva();
  }

  function bolla(chi, html, testo) {
    if (!conversazione) return null;
    var div = document.createElement('div');
    div.className = chi === 'utente' ? 'ca__msg ca__msg--utente' : 'ca__msg ca__msg--bot';
    div.innerHTML = html;
    conversazione.appendChild(div);
    conversazione.scrollTop = conversazione.scrollHeight;
    /* Si tiene il testo, non l'HTML: al desk serve leggere la conversazione,
       non ricostruirne il markup. Le bolle di attesa non si registrano. */
    if (testo) {
      trascritto.push({ ruolo: chi, testo: testo });
      /* La scena invece tiene **anche** l'HTML, perché lei serve a ridisegnare:
         il grassetto e i rimandi sono già dentro, e ricavarli dal testo nudo
         vorrebbe dire riscriverli. Vedi `salva`. */
      registra(chi, html, testo);
    }
    return div;
  }

  // ── Sotto la risposta: i rimandi, e nient'altro ───────────────────────────
  /**
   * Quello che sta sotto una risposta sono **le fonti**, e da oggi solo quelle.
   *
   * Prima c'era anche il blocco «Vuoi parlarne con noi? / Contatta il team»,
   * ripetuto identico alla fine di ogni bolla. Quella coppia diceva una cosa
   * che si dice **una volta e vale sempre** — se non ti basto, ti risponde una
   * persona — e ripeterla a ogni risposta la trasformava in arredamento, oltre
   * a schiacciare i rimandi fra la risposta e il pulsante. È salita in
   * intestazione, accanto alla telefonata, dove sta ferma e si trova sempre.
   *
   * Nello spazio che libera i rimandi diventano quello che sono: un invito a
   * leggere, in corpo piccolo, con la loro riga che dice cosa sono. Non erano
   * mai stati presentati — comparivano come due pastiglie senza nome — e
   * «Approfondisci» costa tre parole e li rende una scelta invece che un
   * ornamento.
   *
   * Senza fonti non si stampa niente: una riga «Approfondisci» sopra il vuoto
   * è peggio del vuoto.
   *
   * Un rimando **verso il sito stesso** naviga nella stessa scheda — non
   * `target="_blank"` — e porta `data-ca-interno`: è l'aggancio con cui il
   * click, più sotto, lascia il segno che la pagina che arriva legge per
   * riaprire la chat da sola, già scritta, invece di farla ripartire dal
   * passo dell'email. `sessionStorage` è lo stesso della scheda di prima,
   * quindi la conversazione c'è già — non va clonata da nessuna parte.
   * Un rimando **verso il portale PerfectGym** resta `target="_blank"` e
   * senza quell'aggancio: è un altro sito, non ha questa chat da ritrovare,
   * e non deve portarsi via la scheda da cui si è partiti.
   */
  function stessaOrigine(url) {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  /** Un indirizzo perfectgym.com prende un titolo che dice cosa c'è dietro;
      qualunque altro un titolo neutro — non sappiamo di più, e inventare un
      titolo specifico per un link che non doveva stare qui sarebbe scrivere
      un dato che non abbiamo. */
  function etichettaLinkNudo(url) {
    try {
      if (new URL(url).hostname.indexOf('perfectgym.com') !== -1) {
        return 'Vai al portale e vedi i posti disponibili';
      }
    } catch (e) {}
    return 'Apri il link';
  }

  /**
   * Il prompt dice al modello di mettere ogni link fra le fonti, mai scritto
   * nella prosa — nel testo di una bolla un indirizzo resta scritto e non si
   * clicca (regola 2bis, regola 3 del prompt) — ma non è garantito che lo
   * faccia sempre. Questa è la rete sotto: toglie dal testo qualunque
   * indirizzo rimasto lì, e lo aggiunge alle fonti, dove `rimandi()` lo
   * disegna come lo stesso pulsante di una fonte vera, invece di lasciarlo
   * scritto per intero e morto in mezzo a una frase.
   */
  function estraiLinkNudi(testo, fonti) {
    var giaCitati = fonti.map(function (f) { return f.url; });
    var trovati = [];
    /* Il carattere escluso non è solo lo spazio: se il modello raddoppia
       l'incapsulamento — la sua «risposta» finisce per contenere il JSON
       intero invece del solo testo, `fonti` compresa — un indirizzo qui dentro
       ha subito, a ridosso, la sintassi di quel JSON: virgolette, parentesi
       graffe o quadre, il backtick. Nessun link vero del sito le porta senza
       essere già percentualmente codificato, quindi fermarsi lì invece che a
       fine riga è la differenza fra un rimando che apre la pagina giusta e uno
       che si porta dietro `"},{"titolo":"…` fino al prossimo spazio — cioè un
       indirizzo che il browser non risolve, e la persona legge "pagina non
       trovata". Trovato leggendo una conversazione vera, non a tavolino. */
    var ripulito = String(testo).replace(/https?:\/\/[^\s<>"'`(){}\[\]]+/g, function (url) {
      var pulito = url.replace(/[.,;:)\]"'`}]+$/, '');
      if (giaCitati.indexOf(pulito) === -1 && trovati.indexOf(pulito) === -1) {
        trovati.push(pulito);
      }
      return '';
    });
    /* Quello che restava intorno al link tolto non deve restare appeso: gli
       spazi doppi lasciati dal buco, i due punti che non introducono più
       niente — sia a fine riga («disponibili: ») sia in mezzo alla frase
       («disponibili:  . Fammi», dove il punto che segue era già lì) — e uno
       spazio isolato prima della punteggiatura che segue. */
    ripulito = ripulito
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/:\s*([.,;])/g, '$1')
      .replace(/[ \t]*:[ \t]*(\n|$)/g, '$1')
      .replace(/[ \t]+([.,;])/g, '$1')
      .replace(/[ \t]+(\n|$)/g, '$1');
    return {
      testo: ripulito,
      fonti: fonti.concat(trovati.map(function (url) {
        return { url: url, titolo: etichettaLinkNudo(url) };
      })),
    };
  }

  function rimandi(fonti) {
    if (!fonti.length) return '';
    return (
      '<div class="ca__rimandi">' +
      '<span class="ca__rimandi-lead">Approfondisci</span>' +
      fonti
        .map(function (f) {
          var interno = stessaOrigine(f.url);
          return (
            '<a class="ca__rimandi-link" href="' +
            escape(f.url) +
            '"' +
            (interno ? ' data-ca-interno="1"' : ' target="_blank" rel="noopener"') +
            '>' +
            escape(f.titolo || 'Leggi l’articolo completo') +
            ' →</a>'
          );
        })
        .join('') +
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

  /**
   * Il calendario dentro la conversazione, e ci si arriva **solo con un gesto**.
   *
   * **Uno solo, sempre.** Se c'è già si scorre lì invece di montarne un
   * secondo: due calendari nella stessa conversazione sono due moduli che
   * chiedono la stessa cosa, e il primo che si compila lascia l'altro aperto a
   * dire che non è stato fissato niente. È anche il motivo per cui l'icona in
   * intestazione non si disabilita dopo il primo clic — riportare al
   * calendario è una risposta giusta quanto aprirlo.
   *
   * **`ca__richiamo` è il calendario e nient'altro**, ed è una riga che è
   * costata un guasto: le schede delle azioni — iscrizione, Guest Pass —
   * riusavano quella classe perché ne riusano l'aspetto, e questa ricerca le
   * scambiava per un calendario già aperto. Il risultato era che dopo una
   * qualsiasi azione l'icona ☎ smetteva di funzionare: scorreva sulla scheda
   * e non apriva niente, senza dare errore. Le schede ora sono `ca__azione`;
   * l'aspetto resta condiviso dal CSS, l'identità no.
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
       trova il filo perso. */
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
      '<div class="ca__richiamo-cal" data-ca-calendario></div>';
    conversazione.appendChild(box);
    conversazione.scrollTop = conversazione.scrollHeight;

    /* La maniglia si tiene: chiudere il blocco senza chiamare `distruggi()`
       lascerebbe il calendario a rispondere a una fetch su un nodo staccato
       dal documento. */
    montaggioRichiamo = montaAppuntamento({
      riquadro: box.querySelector('[data-ca-calendario]'),
      prefill: {
        email: dati.email,
        nome: dati.nome,
        cognome: dati.cognome,
        telefono: dati.telefono || '',
        /* Il consenso l'ha dato al primo passo della chat, che è dove si
           lasciano i dati: questa è la stessa conversazione, non un secondo
           trattamento. */
        privacy: true,
        marketing: false,
      },
      /* La conversazione, riassunta: è quello che chi richiama deve sapere
         prima di comporre il numero, ed è esattamente ciò che con Calendly
         finiva in una domanda personalizzata fuori dal sito.
         `contestoNascosto` e non `oggetto`: è un riassunto scritto da noi,
         non nelle parole della persona, e non deve comparire nel campo come
         se lei stessa lo avesse digitato — potrebbe correggerlo o cancellarlo
         pensando di correggere un proprio testo, e chi chiama perderebbe il
         contesto. Il campo resta per lei, vuoto e facoltativo: se vuole
         aggiungere qualcosa, si somma al riassunto invece di sostituirlo. */
      contestoNascosto: contestoRichiamo(),
      contesto: {
        pagina: dati.pagina,
        origine: 'chat-assistente',
        cta: 'Richiamo dalla chat',
        extra: {
          tipoOrigine: 'chat',
          attivita: etichettaAttivita(),
          conversazione: contestoRichiamo(),
          sessioneChat: sessione(),
        },
      },
      onPrenotato: function () {
        /* Prenotato: la chiusura non serve più e diventa rumore accanto a una
           conferma. Il blocco resta, che è quello che dice cosa è successo —
           e la conferma con giorno e ora la scrive il calendario da sé. */
        var chiudi = box.querySelector('[data-ca-richiamo-chiudi]');
        if (chiudi) chiudi.hidden = true;
        conversazione.scrollTop = conversazione.scrollHeight;
      },
    });
  }

  /** Il montaggio in corso, per poterlo smontare alla chiusura. */
  var montaggioRichiamo = null;

  // ── L'azione: iscrizione, prova, richiamo o team ──────────────────────────
  /**
   * Il segnale che il modello manda quando la persona ha appena confermato di
   * voler procedere (regole 7, 8, 8bis e 12 del prompt di `CHAT ATHLON`): non è
   * testo, è un innesco. `n8n` lo valida gia' contro un enum fisso prima di
   * mandarlo qui — vedi «Leggi la risposta» nel workflow — ma si tratta comunque
   * come un dato esterno: un tipo che non riconosciamo non fa niente.
   *
   * `richiamo` è l'unico dei tre che non apre niente di nuovo: chiama la stessa
   * `mostraRichiamo()` dell'icona ☎ in intestazione, quindi valgono le sue
   * guardie — niente calendario a chi ha un abbonamento vivo, e uno solo per
   * conversazione. Il calendario torna così ad apparire **solo su richiesta**,
   * come dopo la rimozione dell'offerta automatica: la differenza è che qui la
   * richiesta è arrivata a parole invece che da un pulsante.
   *
   * `team` è il gemello scritto di `richiamo`, e serve a una cosa sola che
   * finora la chat non sapeva fare: **ricevere un file**. Il box del team ha
   * un campo allegato — immagine o PDF, fino a 5 MB — quindi il certificato
   * medico si manda da qui, senza aprire la posta. Prima l'assistente
   * rispondeva «lo mandi via email» e l'indirizzo non poteva nemmeno dirlo,
   * perché `data/testo.ts` toglie gli indirizzi da tutto quello che entra
   * nella knowledge base: la persona restava con una procedura senza il dato
   * che la fa partire. Apre lo stesso modulo dell'icona in alto, quindi ne
   * valgono le guardie — uno per volta, e a ticket già inviato si torna alla
   * conferma invece di aprirne un secondo.
   */
  function eseguiAzione(azione) {
    if (!azione || !conversazione) return;
    if (azione.tipo === 'iscrizione') mostraIscrizione(azione);
    else if (azione.tipo === 'prova') mostraProva();
    else if (azione.tipo === 'richiamo') mostraRichiamo();
    else if (azione.tipo === 'team') apriTicket();
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
   *
   * **Il ripiego guarda `stato`, non `statoNucleo`**, e la differenza si vede
   * solo nel caso che lo fa sbagliare. `haGiaAccount` decide su `memberType` e
   * ricade su `stato === 'iscritto'` per una versione del webhook che non lo
   * mandi; qui gli veniva passato `statoNucleo`, che e' un'altra domanda —
   * «questo nucleo e' di casa?» invece di «questa persona ha un account?». Un
   * genitore senza contratto suo, con un figlio iscritto, ha
   * `statoNucleo: 'iscritto'` e nessun account: si sarebbe visto dire «hai gia'
   * un account» e mandare a un login che non ha. E' il verso sbagliato in cui
   * sbagliare, quello che la nota di `haGiaAccount` mette per iscritto: chi ha
   * un account e viene mandato a registrarsi lo scopre subito, chi non ce l'ha
   * e viene mandato al login resta fuori senza capire perche'.
   * `stato` e' anche l'ingresso che passano gli altri due chiamanti
   * (`iscrizione.client.js`, `contattaciForm.client.js`): una regola sola,
   * con lo stesso dato in mano.
   */
  function mostraIscrizione(azione) {
    var trovato = trovaOpzione(azione.piano, azione.opzione);
    if (!trovato) return;

    var box = document.createElement('div');
    box.className = 'ca__azione';

    if (haGiaAccount({ memberType: dati.memberType, stato: dati.stato })) {
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

    /* Si registra l'`azione`, non il markup: ridisegnarla vuol dire ripassare
       di qui, e il gestore del reset torna insieme al pulsante. */
    if (!ricostruendo) {
      scena.push({ k: 'iscr', a: { tipo: 'iscrizione', piano: azione.piano, opzione: azione.opzione } });
      salva();
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
  /**
   * Chi puo' avere il Guest Pass, in un posto solo — e sono due **fatti**, non
   * due deduzioni: quale pulsante ha premuto al passo dell'attivita' e cosa ha
   * risposto PerfectGym sull'email. Nessuna delle due dipende da come e' andata
   * la conversazione, ed e' il motivo per cui la regola tiene.
   *
   * La stessa condizione vive anche in `Componi contesto` su n8n, dove decide
   * se la voce del Pass entra nel contesto del modello. I due lati devono dire
   * la stessa cosa: se divergono, il modello propone una prova che qui non
   * compare — cioe' il guasto peggiore, un'offerta letta e non attivabile.
   */
  var STATI_PROVABILI = ['nuovo', 'esiste'];

  function puoProvare() {
    /* **`attivita` e non `ambito`.** `ambito` vale 'adulti' anche quando non e'
       stato scelto niente (vedi `scegliAttivita`): con lui «non lo sappiamo»
       passerebbe per «ha detto adulti», che e' il modo in cui una regola
       stringente diventa larga senza che nessuno lo veda. Qui serve il
       pulsante premuto, e quello e' `attivita === 'adulti'`. */
    if (dati.attivita !== 'adulti') return false;
    /* Un Member non prova. Lo dice `memberType` quando c'e'. */
    if (/member/i.test(dati.memberType || '')) return false;
    /* **Lista bianca, non esclusione.** `nuovo` (PerfectGym non lo conosce) e
       `esiste` (Lead o Guest) sono le due risposte che valgono; `iscritto` e'
       il Member, e il quarto caso — la verifica che non ha risposto, che il
       client marca `errore` — cade fuori da se' invece di essere un valore da
       ricordarsi di escludere. E' la stessa scelta di tutto il sito: quando non
       sappiamo, non si offre. */
    if (STATI_PROVABILI.indexOf(dati.stato) === -1) return false;
    return !!dati.email;
  }

  function mostraProva() {
    /* Al socio la card spiega perche' no, invece di non comparire. Il gate
       guarda anche `stato`, perche' un webhook che non mandasse `memberType`
       lo direbbe comunque con `iscritto`. */
    if (/member/i.test(dati.memberType || '') || dati.stato === 'iscritto') {
      var negato = document.createElement('div');
      negato.className = 'ca__azione';
      negato.innerHTML =
        '<p class="ca__richiamo-titolo">Il Guest Pass non si può attivare</p>' +
        '<p class="ca__richiamo-lead">Risulta già un tesseramento Athlon a questa email, e il Pass è riservato a chi non ne ha mai avuto uno. Puoi comunque prenotare una lezione singola o scegliere un abbonamento.</p>' +
        '<a class="ca__richiamo-btn" href="/abbonamenti#accessi-singoli" data-ca-interno="1">Vedi gli accessi singoli →</a>';
      conversazione.appendChild(negato);
      conversazione.scrollTop = conversazione.scrollHeight;
      if (!ricostruendo) {
        scena.push({ k: 'prova' });
        salva();
      }
      return;
    }
    /* Tutto il resto passa da `puoProvare()`. Prima qui c'era
       `if (!dati.memberType || !dati.email) return;`, e quel `!dati.memberType`
       teneva fuori **le persone nuove** — che per PerfectGym non hanno nessun
       memberType e sono la ragione per cui il Pass esiste. Il modello diceva
       «ecco il tuo Guest Pass», la card non compariva e su `richieste_prova`
       non arrivava niente: nessun errore, nessuna traccia, il codice
       semplicemente non appariva. */
    if (!puoProvare()) return;

    var box = document.createElement('div');
    box.className = 'ca__azione';
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

    if (!ricostruendo) {
      scena.push({ k: 'prova' });
      salva();
    } else {
      /* Ridisegnata dopo un cambio di pagina: il codice e i passi tornano a
         schermo, la richiesta **no**. Era gia' partita la prima volta, e
         rifarla vorrebbe dire una seconda riga su `richieste_prova`, una
         seconda email e un secondo WhatsApp per una prova sola — cioe' un
         doppione che al desk sembra due persone. */
      return;
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
    fermaSollecito();
    sollecitato = false;
    fermaRichiamoInattivo();
    richiamoProposto = false;
    /* Sul totem la persona dopo non ha valutato niente: il voto e la domanda
       ripartono da zero come tutto il resto. */
    votoChiesto = false;
    votoDato = false;
    risposteFatte = 0;
    /* Una preselezione non consumata non deve sopravvivere a un reset: la
       persona dopo, sul totem, non sta cercando quel corso. */
    preselezioneAttivita = '';
    /* **Anche l'identificativo della sessione**, ed è la parte che mancava:
       senza, sul totem i messaggi di chi arriva dopo si accodano alla
       conversazione di chi è passato prima, sotto la sua email — perché la
       riga di `chat_conversazioni` esiste già e non cambia più. Dimenticare la
       persona senza dimenticare la sua conversazione è mezzo oblio, e la metà
       che resta è quella con dentro i dati di qualcun altro. */
    dimenticaSessione();
    /* E la scena con lei: un'identità nuova che ereditasse la conversazione
       vecchia sarebbe l'oblio a metà una seconda volta. */
    dimenticaScena();
    try {
      sessionStorage.removeItem('athlon:assistente:email');
    } catch (e) {}
    /* Il pulsante torna nascosto: `puoRichiamo` si riscopre dalla verifica
       dell'email, e fino ad allora non sappiamo se questa persona può
       prenotare. */
    if (btnRichiamo) btnRichiamo.hidden = true;
    if (btnScrivi) btnScrivi.hidden = true;
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
  // ── Il sollecito: trenta secondi di silenzio ──────────────────────────────
  /**
   * Se dopo una risposta non arriva più niente, l'assistente riprende lui.
   *
   * **Una volta sola per conversazione**, e la ragione è la stessa della
   * regola 6quater del prompt: riprendere il filo una volta è ingaggio,
   * riprenderlo tre volte è assillo, e chi si sente inseguito chiude. Qui il
   * limite è più stretto che nel prompt perché lì a rispondere è una persona
   * che ha scritto qualcosa; qui non ha scritto niente, e insistere nel vuoto
   * è la definizione di molesto.
   *
   * **Solo a chi non è già iscritto.** Un socio che ha avuto la sua risposta e
   * se ne va ha finito: sollecitarlo è chiedergli di continuare una pratica
   * che per lui è chiusa. L'ingaggio serve a chi sta decidendo se entrare.
   *
   * **Non tocca l'oblio del totem.** Il conto dei tre minuti si arma sugli
   * eventi della persona e sui punti in cui nasce uno stato, non su quello che
   * scrive l'assistente: il sollecito a trenta secondi cade dentro quella
   * finestra e la lascia correre, quindi al minuto tre la conversazione si
   * cancella lo stesso. Sarebbe il difetto peggiore da introdurre qui — un
   * pannello che si tiene i dati di uno sconosciuto perché il bot ha parlato
   * da solo.
   *
   * La domanda cambia col ramo perché una domanda generica («posso aiutarti?»)
   * non riapre niente: quello che riapre è una scelta fra due cose, a cui si
   * risponde con una parola.
   */
  var SOLLECITO = 30 * 1000;
  var orologioSollecito = null;
  var sollecitato = false;

  var SOLLECITI = {
    adulti: 'Ci sei? Dimmi solo una cosa e ti dico io da dove partire: ti alleneresti più la mattina presto o dopo il lavoro?',
    junior: 'Ci sei? Se mi dici quanti anni ha, ti dico subito qual è il turno giusto per lui.',
  };

  function fermaSollecito() {
    if (orologioSollecito) {
      clearTimeout(orologioSollecito);
      orologioSollecito = null;
    }
  }

  function armaSollecito() {
    fermaSollecito();
    if (sollecitato || dati.ramo === 'iscritto' || !SOLLECITI[dati.ramo]) return;
    orologioSollecito = window.setTimeout(function () {
      orologioSollecito = null;
      /* Le tre condizioni al momento dello scatto, non a quello dell'armamento:
         mezzo minuto è lungo abbastanza perché la persona nel frattempo abbia
         chiuso il pannello, cominciato a scrivere, o mandato un'altra domanda
         che è ancora in volo. In tutti e tre i casi il sollecito è fuori posto. */
      if (!root.classList.contains('open')) return;
      if (dati.passo !== 'chat' || inCorso) return;
      if (campoDomanda && (campoDomanda.value || '').trim()) return;
      sollecitato = true;
      var testo = SOLLECITI[dati.ramo];
      bolla('assistente', '<p>' + escape(testo) + '</p>', testo);
    }, SOLLECITO);
  }

  // ── Il richiamo si propone da sé, dopo un silenzio più lungo ──────────────
  /**
   * Il sollecito qui sopra riprende il filo con una domanda; se anche a
   * quello non arriva niente, il filo non lo si riprende una terza volta
   * (vale la regola 6quater del prompt) — si propone la strada che non
   * dipende da altre risposte: farsi richiamare.
   *
   * **Propone, non monta il calendario.** Il calendario si apre solo su
   * richiesta — è la ragione per cui l'apertura automatica dopo due risposte
   * è stata tolta (vedi il commento in cima a questo file) — quindi qui
   * arriva soltanto una bolla che ricorda la cornetta in alto, non un iframe
   * che si prende lo schermo da solo. Chi vuole la telefonata la chiede
   * cliccandola.
   *
   * **Solo a chi non ha un abbonamento vivo nel nucleo** (`dati.puoRichiamo`,
   * la stessa condizione dell'icona ☎), e **una volta sola per conversazione**
   * — le stesse due guardie del sollecito, per lo stesso motivo: insistere nel
   * vuoto è la definizione di molesto.
   */
  var RICHIAMO_INATTIVO = 90 * 1000;
  var orologioRichiamoInattivo = null;
  var richiamoProposto = false;
  var PROPOSTA_RICHIAMO =
    'Se preferisci parlarne al telefono, tocca la cornetta qui sopra: scegli tu giorno e ora, ti chiamiamo noi.';

  function fermaRichiamoInattivo() {
    if (orologioRichiamoInattivo) {
      clearTimeout(orologioRichiamoInattivo);
      orologioRichiamoInattivo = null;
    }
  }

  function armaRichiamoInattivo() {
    fermaRichiamoInattivo();
    if (richiamoProposto || !dati.puoRichiamo) return;
    orologioRichiamoInattivo = window.setTimeout(function () {
      orologioRichiamoInattivo = null;
      // Le stesse condizioni del sollecito, controllate al momento dello scatto.
      if (!root.classList.contains('open')) return;
      if (dati.passo !== 'chat' || inCorso) return;
      if (campoDomanda && (campoDomanda.value || '').trim()) return;
      if (!dati.puoRichiamo) return;
      richiamoProposto = true;
      bolla('assistente', '<p>' + escape(PROPOSTA_RICHIAMO) + '</p>', PROPOSTA_RICHIAMO);
    }, RICHIAMO_INATTIVO);
  }

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

  // ── La valutazione della chat ─────────────────────────────────────────────
  /**
   * «Come è andata?», una volta sola, verso la fine.
   *
   * **Dopo la terza risposta e non alla prima**, perché a una domanda sola non
   * si è ancora capito se l'assistente è servito: un voto chiesto troppo
   * presto misura la cortesia dell'apertura, non l'aiuto. E **non si chiede
   * mai** a chi è appena stato passato al team (`senzaRisposta`) o ha già
   * aperto il ticket: lì la persona sta aspettando una risposta vera, e
   * chiederle un voto in quel momento è il modo più rapido per prenderne uno
   * da una stella per un motivo che non è il nostro.
   *
   * Il voto viaggia da solo verso `chat-athlon-valutazione`, che lo scrive
   * sulla riga della conversazione: la chiave è la sessione, l'unica cosa che
   * il browser conosce di quella riga.
   */
  var votoChiesto = false;
  var votoDato = false;
  var risposteFatte = 0;
  var RISPOSTE_PRIMA_DEL_VOTO = 3;

  function mandaVoto(voto, nota) {
    try {
      fetch(VALUTAZIONE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        /* `keepalive`: il voto è spesso l'ultima cosa che si tocca prima di
           chiudere la scheda, e senza questo la richiesta muore con la pagina. */
        keepalive: true,
        body: JSON.stringify({
          sessione: sessione(),
          valutazione: voto,
          nota: nota || '',
          email: dati.email || '',
          pagina: dati.pagina || '',
        }),
      }).catch(function () {});
    } catch (e) {
      /* Un voto perso non è un guasto per chi sta scrivendo: la chat continua
         come se niente fosse, ed è il verso giusto in cui sbagliare. */
    }
  }

  /** Il grazie, con la domanda in più solo quando il voto è basso. */
  function grazieDelVoto(box, voto) {
    box.innerHTML =
      '<p class="ca__voto-grazie">Grazie, ci aiuta a migliorare.</p>' +
      (voto <= 3
        ? '<label class="ca__voto-lab" for="ca-voto-nota">Cosa potevamo fare meglio?</label>' +
          '<textarea class="ca__ticket-testo" id="ca-voto-nota" rows="2" data-ca-voto-nota ' +
          'placeholder="Facoltativo — una riga ci basta"></textarea>' +
          '<div class="ca__ticket-azioni">' +
          '<button type="button" class="ca__btn" data-ca-voto-invia>Invia</button>' +
          '</div>'
        : '');
    var campo = box.querySelector('[data-ca-voto-nota]');
    var invia = box.querySelector('[data-ca-voto-invia]');
    if (!campo || !invia) return;
    invia.addEventListener('click', function () {
      var nota = (campo.value || '').trim();
      if (nota) mandaVoto(voto, nota);
      box.innerHTML = '<p class="ca__voto-grazie">Grazie: lo giriamo al team.</p>';
    });
  }

  function chiediVoto() {
    if (!conversazione || votoChiesto || votoDato) return;
    votoChiesto = true;

    var box = document.createElement('div');
    box.className = 'ca__ticket ca__voto';
    box.setAttribute('data-ca-voto', '');
    /* Le stelle sono cinque pulsanti veri e non un `input range`: si toccano
       col dito, si leggono con la tastiera, e ognuna dice ad alta voce quante
       stelle sta dando — un range da 1 a 5 in una chat non lo capisce nessuno. */
    var stelle = '';
    for (var i = 1; i <= 5; i++) {
      stelle +=
        '<button type="button" class="ca__stella" data-ca-stella="' + i + '" ' +
        'aria-label="' + i + (i === 1 ? ' stella su 5' : ' stelle su 5') + '">★</button>';
    }
    box.innerHTML =
      '<p class="ca__ticket-lead">Come è andata? Dai un voto a questa chat.</p>' +
      '<div class="ca__stelle" role="group" aria-label="Da 1 a 5 stelle">' + stelle + '</div>';

    conversazione.appendChild(box);
    conversazione.scrollTop = conversazione.scrollHeight;

    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-ca-stella]') : null;
      if (!b) return;
      var voto = Number(b.getAttribute('data-ca-stella'));
      if (!(voto >= 1 && voto <= 5)) return;
      votoDato = true;
      mandaVoto(voto, '');
      grazieDelVoto(box, voto);
      salva();
    });
    salva();
  }

  /**
   * Chiamata alla fine di ogni risposta. Le condizioni stanno qui e non dentro
   * `chiediVoto` perché sono su *questo* turno: quante risposte sono arrivate,
   * e se l'ultima era una che passa la mano al team.
   */
  function forseChiediVoto(senzaRisposta) {
    risposteFatte += 1;
    if (votoChiesto || votoDato) return;
    if (senzaRisposta || ticketInviato) return;
    if (risposteFatte < RISPOSTE_PRIMA_DEL_VOTO) return;
    chiediVoto();
  }

  var ticketInviato = false;

  /** Il modulo che compare quando si chiede di essere contattati. */
  /* La conferma del ticket sta in una costante perché la scrive due volte:
     l'invio, che la mette **al posto** del modulo, e la ricostruzione dopo un
     cambio di pagina, che la rimette in fondo. Senza la seconda, `apriTicket`
     su una conversazione ripristinata cercherebbe una conferma che non esiste
     e il comando in intestazione non farebbe niente — esattamente il dubbio
     che quel ramo esiste per togliere. */
  var TICKET_FATTO =
    '<p class="ca__ticket-fatto">Fatto: la tua richiesta è arrivata al nostro team, ' +
    'insieme a questa conversazione. Ti rispondono via email.</p>';

  function ticketFatto() {
    if (!conversazione) return;
    var box = document.createElement('div');
    box.className = 'ca__ticket';
    box.setAttribute('data-ca-ticket-form', '');
    box.innerHTML = TICKET_FATTO;
    conversazione.appendChild(box);
  }

  function apriTicket(dopo) {
    /* Gia' mandato: non se ne apre un secondo, ma non si resta nemmeno senza
       risposta. Da quando il comando sta in intestazione capita di premerlo di
       nuovo per controllare che sia partito, e un pulsante che non fa niente
       lascia esattamente il dubbio che si voleva togliere: si torna alla
       conferma, che e' l'unica cosa che risponde alla domanda. */
    if (ticketInviato) {
      var fatto = root.querySelector('[data-ca-ticket-form]');
      if (fatto) fatto.scrollIntoView({ block: 'nearest' });
      return;
    }
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
      /* Un allegato facoltativo: la richiesta tipica al team ne ha uno — il
         certificato medico, lo screenshot di un errore — e senza un campo qui
         la persona doveva aprire l'email a parte. Stesso pattern del form
         dell'Help Desk: immagine o PDF, uno solo, fino a 5 MB, e il file
         viaggia in base64 nel payload del ticket (vedi inviaTicket). */
      '<label class="ca__ticket-file-lab" for="ca-ticket-file">Vuoi allegare un file? Il certificato medico, uno screenshot dell’errore o qualsiasi documento utile — immagine o PDF, fino a 5 MB.</label>' +
      '<input class="ca__ticket-file" id="ca-ticket-file" type="file" accept="image/*,application/pdf" data-ca-ticket-file>' +
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

  /** Il file in base64, senza il prefisso `data:` che il webhook non usa. */
  function leggiBase64(f) {
    return new Promise(function (risolvi, rifiuta) {
      var r = new FileReader();
      r.onload = function () {
        var s = String(r.result || '');
        var virgola = s.indexOf(',');
        risolvi(virgola >= 0 ? s.slice(virgola + 1) : s);
      };
      r.onerror = function () { rifiuta(r.error); };
      r.readAsDataURL(f);
    });
  }

  function mostraErroreTicket(box, testo) {
    var errore = box.querySelector('.ca__ticket-errore');
    if (!errore) {
      errore = document.createElement('p');
      errore.className = 'ca__ticket-errore';
      box.appendChild(errore);
    }
    errore.textContent = testo;
  }

  async function inviaTicket(box) {
    var campo = box.querySelector('[data-ca-ticket-testo]');
    var btn = box.querySelector('[data-ca-ticket-invia]');
    var campoFile = box.querySelector('[data-ca-ticket-file]');
    var messaggio = (campo && campo.value || '').trim();

    /* Il tetto si controlla qui, prima di leggere il file: un rifiuto immediato
       e' piu' gentile di un caricamento che finisce in errore, e il base64
       costa un terzo di byte in piu' — su 5 MB sono 6,7 MB di richiesta, dentro
       il limite. Stesso limite del form dell'Help Desk. */
    var MAX = 5 * 1024 * 1024;
    var scelto = (campoFile && campoFile.files && campoFile.files[0]) || null;
    if (scelto && scelto.size > MAX) {
      mostraErroreTicket(
        box,
        'L’allegato è troppo grande (' + (scelto.size / 1024 / 1024).toFixed(1) + ' MB): il limite è 5 MB.'
      );
      return;
    }

    attendi(btn, true);
    try {
      var payload = {
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
      };
      /* L'allegato viaggia in base64 dentro lo stesso JSON: il webhook riceve un
         oggetto e da quello compone l'email al desk, quindi passare a multipart
         per un campo facoltativo vorrebbe dire riscrivere il contratto. Il
         workflow lo riattacca binario all'email; nella riga di database restano
         nome, tipo e peso, non il base64. */
      if (scelto) {
        payload.allegatoNome = scelto.name;
        payload.allegatoTipo = scelto.type || 'application/octet-stream';
        payload.allegatoPeso = scelto.size;
        payload.allegatoBase64 = await leggiBase64(scelto);
      }
      var r = await fetch(TICKET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(String(r.status));
      ticketInviato = true;
      box.innerHTML = TICKET_FATTO;
      scena.push({ k: 'ticket' });
      salva();
    } catch (e) {
      attendi(btn, false);
      mostraErroreTicket(box, 'Non è partita. Riprova fra un momento.');
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

  /**
   * L'ultima battuta dell'assistente, cioè la domanda a cui questa risposta
   * risponde. Serve al workflow per un caso solo, e il caso è **la conferma**.
   *
   * Il 08/09, a *«Ti va di sapere quanto costa?»* una persona ha risposto
   * «Certo». Al workflow arrivavano due parole — «Certo» e «Acqua», la domanda
   * di prima — e su quelle due si sceglie il contesto: nessuna ancora si è
   * accesa, e delle due voci del listino è entrata solo quella dello Smart,
   * pescata dalla parola «acqua» che nella voce del Premium non c'è. Il modello
   * aveva davanti mezzo listino, e l'altra metà se l'è inventata — 119 €/mese,
   * 1.190 €/anno, 149 € di Mensile Flex, nessuno dei quali esiste.
   *
   * Una conferma non ha un argomento suo: il suo argomento è la domanda a cui
   * dice di sì, e quella l'ha fatta l'assistente. È l'unica battuta della
   * conversazione che al workflow non arrivava.
   *
   * Il saluto d'apertura è una bolla dell'assistente come le altre, e va bene
   * che lo sia: se la prima cosa che scrive la persona è «certo», il workflow
   * si ritrova davanti il saluto, che non nomina nessun argomento e quindi non
   * accende niente — lo stesso di oggi.
   */
  function rispostaPrecedente() {
    for (var i = trascritto.length - 1; i >= 0; i--) {
      if (trascritto[i].ruolo === 'assistente') return trascritto[i].testo;
    }
    return '';
  }

  /**
   * Chi scrive così non sta ponendo una domanda: sta chiedendo di uscire
   * dalla conversazione con il modello. Mandarla comunque al workflow
   * rischia di tornare con l'invito a «toccare l'icona in alto» — la stessa
   * icona che da qui si apre già da sola, un giro in più che la persona ha
   * appena detto di non volere.
   */
  var CHIEDE_OPERATORE =
    /\boperator[ei]\b|\bumano\b|persona (umana|vera|reale|fisica)|essere umano|parlare con (qualcuno|una persona|un umano|il team|lo staff)|contattare (il team|lo staff|una persona|qualcuno)|assistenza umana/i;

  function chiedeOperatore(testo) {
    return CHIEDE_OPERATORE.test(testo || '');
  }

  /** Il riordino da fare dopo ogni battuta, sia arrivata dal modello sia
      saltata per andare dritti al team: vedi `chiedi()`. */
  function fineRisposta() {
    inCorso = false;
    if (btnDomanda) btnDomanda.disabled = (campoDomanda.value || '').trim().length < 3;
    if (conversazione) conversazione.scrollTop = conversazione.scrollHeight;
    armaOblio();
    armaSollecito();
    armaRichiamoInattivo();
  }

  async function chiedi() {
    var domanda = (campoDomanda && campoDomanda.value || '').trim();
    if (domanda.length < 3 || inCorso) return;

    // Da leggere prima di aggiungere la domanda nuova al trascritto.
    var precedente = domandaPrecedente();
    var precedenteAssistente = rispostaPrecedente();

    inCorso = true;
    /* Ha scritto: né il sollecito né la proposta di richiamo hanno più niente
       da sollecitare o proporre. */
    fermaSollecito();
    fermaRichiamoInattivo();
    campoDomanda.value = '';
    if (btnDomanda) btnDomanda.disabled = true;
    var msgUtente = bolla('utente', escape(domanda), domanda);

    if (chiedeOperatore(domanda)) {
      apriTicket(msgUtente);
      fineRisposta();
      return;
    }

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
          /* Vedi `rispostaPrecedente()`: serve al workflow per capire di cosa
             parla un «certo», che da solo non parla di niente. */
          precedenteAssistente: precedenteAssistente,
          sessione: sessione(),
          pagina: dati.pagina,
          origine: 'assistente',
          ramo: dati.ramo,
          /* Quante volte ha scritto, questa compresa. Serve a n8n per la
             condizione «dopo qualche messaggio» del Guest Pass: un conteggio e'
             un fatto, «e' passato un po' di conversazione» sarebbe un giudizio
             del modello. Si conta da `trascritto`, dove la domanda in corso e'
             gia' entrata (`bolla('utente', ...)` viene prima di questa
             chiamata), e non dalle bolle dell'assistente: l'apertura del
             saluto e' una di quelle e non e' un turno di nessuno. */
          scambi: trascritto.filter(function (m) { return m.ruolo === 'utente'; }).length,
          attivita: dati.attivita ? [dati.attivita] : [],
          attivitaJunior: dati.attivitaJunior,
          bambinoNascita: dati.bambinoNascita,
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

      /* Prima di scrivere il testo, la rete sotto: un link rimasto nella
         prosa esce da lì e finisce fra le fonti, vedi `estraiLinkNudi`. */
      var estratto = estraiLinkNudi(risposta.risposta, fonti);
      var testoRisposta = estratto.testo;
      fonti = estratto.fonti;

      /* Il modello scrive in prosa, con il solo `**grassetto**` che il prompt
         gli concede. Il capoverso resta un capoverso e non una riga incollata
         alla precedente — è la differenza fra una risposta che si legge e un
         muro — e il grassetto si converte **dopo** l'escape, mai prima: vedi
         `conGrassetto`. */
      var paragrafi = testoRisposta
        .split(/\n{1,}/)
        .map(function (r) { return r.trim(); })
        .filter(Boolean)
        .map(function (r) { return '<p>' + conGrassetto(escape(r)) + '</p>'; })
        .join('');

      var corpo = paragrafi + rimandi(fonti);
      attesa.innerHTML = corpo;
      trascritto.push({ ruolo: 'assistente', testo: senzaMarcatori(risposta.risposta) });
      registra('assistente', corpo, senzaMarcatori(risposta.risposta));
      /* Solo qui, dopo che la risposta e' gia' a schermo: e' il turno esatto
         in cui la persona ha confermato (regole 7, 8, 12 del prompt), non
         un'anticipazione. */
      eseguiAzione(risposta.azione);
      /* E, verso la fine, la domanda sul voto: dopo che la risposta e' a
         schermo, mai prima. Il flag di questo turno serve a non chiederlo a
         chi e' appena stato passato a una persona. */
      forseChiediVoto(!!risposta.senzaRisposta);
    } catch (e) {
      /* Nel modal non c'è la ricerca locale a cui ricadere — quella è rimasta
         nel box della pagina. Qui si dice come stanno le cose e si indica la
         via che funziona sempre: scrivere a una persona.
         Il comando non si ristampa qui sotto — sta in intestazione ed è lì da
         quando la conversazione è cominciata — ma nominarlo sì: è il momento in
         cui serve, e un'icona che non si sa a cosa serva non aiuta nessuno. */
      var scusa =
        'Non riesco a risponderti in questo momento. Se ti serve subito, ' +
        'scrivi al nostro team con l’icona in alto: la conversazione gli arriva insieme al messaggio.';
      attesa.innerHTML = '<p>' + escape(scusa) + '</p>';
      trascritto.push({ ruolo: 'assistente', testo: scusa });
      registra('assistente', attesa.innerHTML, scusa);
    } finally {
      /* La risposta è arrivata: da adesso i tre minuti sono di lettura, e sono
         i suoi, e i trenta secondi di sollecito ripartono da qui — non da
         quando la domanda è partita, che avrebbe fatto scadere il tempo
         durante l'attesa. Vedi `fineRisposta`. */
      fineRisposta();
    }
  }


  // ── Passo 5: i dati ───────────────────────────────────────────────────────
  /* Il modello non tocca questi campi: li raccoglie il form, li valida il
     codice, e solo dopo si scrive su PerfectGym. */
  var campi = {};
  root.querySelectorAll('[data-ca-f]').forEach(function (el) {
    campi[el.dataset.caF] = el;
  });
  if (campi.bnascita) campi.bnascita.addEventListener('change', correggiAttivitaJunior);
  var bimbo = q('[data-ca-bimbo]');
  var genitoreDati = q('[data-ca-genitore]');
  var nascitaGenitore = q('[data-ca-nascita]');
  var bnascitaNota = q('[data-ca-bnascita-nota]');
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

  /** Il numero già pronto, o `''`. Per i punti che non devono validare niente.
   *
   * **Passa dal prefisso scelto, e non da `'+39'` fisso.** Con l'Italia scritta
   * dentro, questa funzione rivalidava come italiano un numero che il controllo
   * a schermo aveva appena approvato come tedesco — `validaTelefono` applica la
   * regola del 3 solo quando il prefisso è 39 — e restituiva `''`. Il campo si
   * svuotava **fra il controllo e la spedizione**: la persona vedeva il modulo
   * accettare il suo numero, e il workflow riceveva `cellulare: ""` e rifiutava
   * tutto con «cellulare non valido».
   *
   * Successo davvero il 05/09/2026 alle 15:38, a una visitatrice tedesca su
   * `/gym-floor/`: nome e cognome arrivati, cellulare vuoto, esecuzione morta in
   * 31 ms. Su PerfectGym non è stata creata, nel CRM è rimasta una riga con la
   * sola email, e lei è andata avanti in chat a chiedere quanto costa un
   * abbonamento di quattro mesi. La tendina dei prefissi c'è dal principio ed è
   * giusta: era questo punto a non guardarla. */
  function telefonoPronto(v) {
    var e = telefonoScelto(v);
    return e.ok ? e.e164 : '';
  }

  function valore(nome) {
    return campi[nome] ? String(campi[nome].value || '').trim() : '';
  }

  /**
   * Corregge da sola l'attività quando l'anno di nascita appena scritto non è
   * quello del pulsante scelto un passo prima — succede, perché quel pulsante
   * è una stima e non un calcolo. Senza questa correzione la conversazione
   * parte scoperta: `Componi contesto` sul workflow restringe tutta la
   * conoscenza del modello all'attività scelta, quindi un bambino del 2024
   * mandato avanti come "Scuola Nuoto Bambini" fa parlare il modello di un
   * corso — e di eventuali suoi link diretti ai turni — che per lui non è
   * quello giusto, e di cui in più non ha nessuna fonte vera in mano.
   */
  function correggiAttivitaJunior() {
    if (!bnascitaNota) return;
    var attuale = dati.attivitaJunior;
    if (attuale !== 'scuola-nuoto-bambini' && attuale !== 'baby-nuoto') {
      bnascitaNota.hidden = true;
      return;
    }
    var v = valore('bnascita');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      bnascitaNota.hidden = true;
      return;
    }
    var anno = Number(v.slice(0, 4));
    var giusta = attivitaJuniorDaAnno(anno);
    if (!giusta || giusta === attuale) {
      bnascitaNota.hidden = true;
      return;
    }
    dati.attivitaJunior = giusta;
    dati.attivita = giusta;
    var etichetta = giusta === 'baby-nuoto' ? 'Baby Nuoto' : 'Scuola Nuoto Bambini';
    bnascitaNota.textContent =
      'In base all’anno di nascita (' + anno + '), il corso giusto è ' + etichetta + ': ho aggiornato la richiesta.';
    bnascitaNota.hidden = false;
  }

  /**
   * I campi dell'adulto si chiedono a meno che non li abbiamo già tutti e tre
   * buoni dalla verifica. Il cellulare va controllato, non solo contato: su
   * PerfectGym in quel campo può esserci un fisso, e allora è come non averlo.
   * Finché la verifica pubblicata non restituisce l'anagrafica, questo è falso
   * per tutti e il form li chiede — che è il comportamento giusto.
   */
  /* La regola sta in `data/contatto.ts` e non qui, perché la usa anche il
     modulo del totem: è lo stesso percorso — email, poi i dati solo se mancano
     — e due copie di quella condizione risponderebbero in due modi al primo
     ritocco. */
  function serveGenitore() {
    return servonoISuoiDati({
      nota: dati.conosciuto,
      id: dati.memberId,
      nome: dati.nome,
      cognome: dati.cognome,
      telefono: dati.telefono,
    });
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

  /** Diciotto anni compiuti alla data di oggi. Si contano sull'anno e poi si
      arretra di uno se il compleanno deve ancora arrivare: `Date` con le
      stringhe `YYYY-MM-DD` sta in UTC, e a Roma un confronto fra timestamp
      sposterebbe di un giorno chi è nato il 6 settembre. */
  function maggiorenne(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    var oggi = new Date();
    var anni = oggi.getFullYear() - Number(v.slice(0, 4));
    var mese = Number(v.slice(5, 7));
    var giorno = Number(v.slice(8, 10));
    var meseOggi = oggi.getMonth() + 1;
    if (mese > meseOggi || (mese === meseOggi && giorno > oggi.getDate())) anni -= 1;
    return anni >= 18;
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
    /* Un maggiorenne in questo campo non è un refuso di battitura: è il campo
       sbagliato. Quando il genitore è già su PerfectGym il suo blocco è
       nascosto, quindi a schermo restano tre campi che chiedono nome, cognome e
       data di nascita e basta, e si compilano con i propri — è successo il
       06/09/2026, e su PerfectGym è nata l'anagrafica di una figlia del 1985.
       Il messaggio dice qual è il campo, non che la data è invalida: «formato
       non valido» a chi ha scritto una data vera fa riscrivere la stessa data.
       Il limite è a 18 anni compiuti e non alla fascia del corso: quale corso
       spetta a quell'anno lo dice già `correggiAttivitaJunior()`, e un tetto
       stretto rifiuterebbe l'agonistica junior, che arriva fino alla maggiore
       età. */
    if (maggiorenne(valore('bnascita'))) {
      return segnala(
        'bnascita',
        'Questa sembra la tua data di nascita: qui serve quella di tuo figlio o tua figlia.'
      );
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
    if (bnascitaNota) bnascitaNota.hidden = true;
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
          userNumber: dati.userNumber || null,
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
    /* Solo nel ramo junior il campo esiste ed è compilato: altrove resta
       quello che era, cioè vuoto. */
    if (valore('bnascita')) dati.bambinoNascita = valore('bnascita');
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
    /* `data-ca-interno` marca ogni link della conversazione che porta a
       un'altra pagina di **questo** sito — quelli di `rimandi()`, e i due
       scritti a mano più sotto (guest pass negato, dati junior confermati).
       Un link verso PerfectGym non lo porta mai: è un altro sito, si apre in
       una scheda a parte (vedi il suo `target="_blank"`) e lì la chat non
       deve riaprirsi da sola.
       Questi invece navigano nella **stessa** scheda — niente
       `target="_blank"`, sarebbe una seconda scheda per restare sul nostro
       stesso sito — quindi non c'è niente da clonare: `sessionStorage` è
       già quello di prima. Il click non blocca la navigazione, si limita a
       lasciare un segno prima che parta, così la pagina che arriva lo legge
       e riapre la chat da sola, già scritta, invece di lasciarla chiusa in
       mezzo a una pagina che parlava di quello che stava chiedendo. */
    var interno = e.target.closest && e.target.closest('[data-ca-interno]');
    if (interno) {
      try {
        sessionStorage.setItem(CHIAVE_RIAPRI, '1');
      } catch (err) {}
      // Non c'è return: il click deve comunque aprire il link.
    }

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
      /* Sta scrivendo: interromperlo con un "ci sei?" o con la proposta di
         richiamo mentre digita e' il modo peggiore di chiedere se c'e'. */
      if (campoDomanda.value.trim()) {
        fermaSollecito();
        fermaRichiamoInattivo();
      }
    });
    campoDomanda.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      chiedi();
    });
  }

  /**
   * Rimette in pagina la conversazione salvata da `salva()`.
   *
   * Si scarta e si riparte da zero in tre casi, e sono tutti «meglio vuoto che
   * sbagliato»: sul totem (non si salva nemmeno), quando il formato non è
   * quello che ci aspettiamo, e quando l'identità della sessione non coincide
   * più — cioè quando `rinnovaSessione()` è passata di lì perché l'email è
   * cambiata. In quest'ultimo caso la conversazione salvata è di **un'altra
   * persona**, e rimetterla in pagina sarebbe il guasto che quella funzione
   * esiste per chiudere.
   *
   * Lo stato si ricopia campo per campo su uno `statoIniziale()` fresco:
   * quello che non è previsto oggi non entra, e un salvataggio scritto da una
   * versione precedente perde i campi che non ha invece di portarsi dietro i
   * suoi.
   */
  function ripristina() {
    if (suTotem()) return;
    var grezzo = null;
    try {
      grezzo = sessionStorage.getItem(CHIAVE_SCENA);
    } catch (e) {
      return;
    }
    if (!grezzo) return;

    var salvato = null;
    try {
      salvato = JSON.parse(grezzo);
    } catch (e) {
      salvato = null;
    }
    if (!salvato || salvato.v !== 1 || !salvato.dati || !Array.isArray(salvato.scena)) {
      dimenticaScena();
      return;
    }
    if (salvato.sessione !== sessione()) {
      dimenticaScena();
      return;
    }

    ricostruendo = true;
    try {
      var base = statoIniziale();
      Object.keys(base).forEach(function (k) {
        if (salvato.dati[k] !== undefined) base[k] = salvato.dati[k];
      });
      dati = base;
      scena = salvato.scena;
      ticketInviato = !!salvato.ticketInviato;
      sollecitato = !!salvato.sollecitato;
      richiamoProposto = !!salvato.richiamoProposto;
      votoChiesto = !!salvato.votoChiesto;
      votoDato = !!salvato.votoDato;
      risposteFatte = Number(salvato.risposteFatte) || 0;

      scena.forEach(function (v) {
        if (v.k === 'm') bolla(v.c, v.h, v.t);
        else if (v.k === 'iscr' && v.a) mostraIscrizione(v.a);
        else if (v.k === 'prova') mostraProva();
        else if (v.k === 'ticket') ticketFatto();
      });

      /* I due comandi in intestazione seguono lo stato, non la scena: la
         telefonata la decide `puoRichiamo`, la scrittura al team il fatto che
         una conversazione ci sia. */
      if (btnRichiamo) btnRichiamo.hidden = !dati.puoRichiamo;
      if (btnScrivi) btnScrivi.hidden = dati.passo !== 'chat';
      if (campoEmail && dati.email) campoEmail.value = dati.email;
      /* La lista delle attività non è nella scena salvata — è statica, la
         ridisegna `dipingiAttivita()` — ma su una pagina nuova il modulo
         riparte da zero e quella lista non l'ha ancora scritta nessuno.
         Restaurare `passo: 'attivita'` senza questa riga mostrava il titolo
         "Di cosa parliamo?" con il corpo bianco sotto: il passo tornava,
         il contenuto no. È idempotente, quindi si chiama comunque, non solo
         quando il passo restaurato è proprio questo. */
      dipingiAttivita();
      mostra(dati.passo || 'email');
    } finally {
      ricostruendo = false;
    }
  }

  ripristina();

  /* Un'email già nota — dall'URL di questa visita o ricordata da un invio
     precedente in un altro form del sito — salta il passo, non solo lo
     precompila: chi l'ha già data una volta non deve scriverla una seconda
     volta. Solo se `ripristina()` non ha già restituito una conversazione in
     corso — quella di chi sta scrivendo ora vince sempre su quella di un
     link vecchio riaperto per caso — e solo se la persona non ha già scritto
     qualcosa (bastano campoEmail e dati.passo, perché è `ripristina()` a
     rimettere `dati.passo` diverso da 'email' quando c'è una sessione
     salvata). */
  if (dati.passo === 'email' && !dati.email && campoEmail) {
    /* UserNumber prima dell'email: chi arriva da un link di newsletter è già
       una persona nota, e non deve nemmeno vedere il campo. */
    var numeroGiaNoto = userNumberConosciuto();
    if (numeroGiaNoto) {
      verifica(numeroGiaNoto);
    } else {
      var emailGiaNota = emailConosciuta();
      if (emailGiaNota) {
        campoEmail.value = emailGiaNota;
        verifica();
      }
    }
  }

  return {
    apri: function (pagina, attivita, ctaTesto) {
      dati.pagina = pagina || location.pathname;
      /* L'attività preselezionata vale solo per una chat che parte ora: se la
         persona ha una conversazione già avviata (o è già oltre l'email), il
         corso lo ha scelto lei e non lo si cambia sotto le mani. Al passo
         dell'attività ripristinato si applica subito; all'email si tiene da
         parte e la consuma la verifica. Va **prima** di `vestiEmail()`: il
         titolo del passo email la deve già vedere per rispecchiarla. */
      if (attivitaEsiste(attivita)) {
        if (dati.passo === 'attivita') scegliAttivita(attivita);
        else if (dati.passo === 'email') preselezioneAttivita = attivita;
      }
      /* L'intento del pulsante plasma l'apertura, ma solo per una chat che
         parte ora (passo email): una conversazione già avviata tiene la sua, e
         chi la riapre non deve vederla cambiare per il pulsante di stavolta. Il
         titolo del passo email lo rispecchia già qui, prima ancora dell'email. */
      if (dati.passo === 'email') {
        dati.ctaIntento = intentoDaCta(ctaTesto);
        vestiEmail();
      }
      // Una conversazione già avviata riprende da dove stava: chiudere il
      // modal per sbaglio non deve costare l'email e il ramo.
      if (dati.passo === 'email') mostra('email');
      else mostra(dati.passo);
      /* E il silenzio si rimisura da qui. Riaprire una conversazione e non
         scrivere niente è lo stesso momento del saluto rimasto senza risposta,
         e da quando la chat sopravvive al cambio di pagina è anche il modo
         normale di ritrovarla. `sollecitato` e `richiamoProposto` lo tengono
         comunque a uno per conversazione. */
      if (dati.passo === 'chat') {
        armaSollecito();
        armaRichiamoInattivo();
      }
    },
    reset: function () {
      pulisciStato();
      onChiudi();
    },
  };
}
