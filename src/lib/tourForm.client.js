// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica di `/tour`, la pagina che sta aperta sul totem all'ingresso.
//
// ── Il percorso ─────────────────────────────────────────────────────────────
//
//   email → verifica → attività ─┬─ ADULTI → i tuoi dati ────┬─ conferma
//                                └─ JUNIOR → bambino          │      ↓
//                                            + genitore ──────┘  si azzera
//
// **L'attività si chiede prima dei dati perché è lei a decidere quali dati
// servono.** Una attività junior vuole il bambino e il genitore, perché da lì
// n8n crea il **nucleo familiare** su PerfectGym (`PGM Crea Genitore` +
// `PGM Crea Figlio`); una attività adulti vuole solo la persona che ha
// davanti, e il suo lead si crea con nome, cognome, email e telefono.
//
// Se sono spuntate tutte e due — il caso normale al totem, il genitore che
// porta il figlio in piscina e intanto ha guardato la sala pesi — **vince il
// ramo junior**: il bambino va registrato comunque, e le attività adulti
// restano nell'email e nelle note del tour.
//
// Tre passi e non sei, e la ragione sta scritta in `data/tour.ts`: qui
// l'operatore è nella stanza, quindi le domande che «Contattaci» fa per capire
// di cosa si tratta sono già state fatte a voce.
//
// ── Le tre cose che questo file fa e gli altri form no ──────────────────────
//
// **Si dimentica, e per due strade.** Ogni form del sito vive su un dispositivo
// personale e può permettersi di ricordare; questo no. Alla conferma parte un
// conto alla rovescia visibile che riporta al primo passo e svuota tutto — è la
// strada del modulo che arriva in fondo. L'altra copre quello che si ferma a
// metà, che è il caso vero da temere: qualcuno digita nome, cognome e numero,
// si distrae, e se ne va senza premere «Ho finito». Dopo tre minuti di silenzio
// quel modulo si svuota da sé, a qualunque passo sia.
//
// **E niente si scrive nel browser.** Nessun `localStorage`, nessun
// `sessionStorage`, nessuna chiamata a `athlonRicordaEmail` o
// `athlonRicordaUserNumber` — che sono i due meccanismi con cui il resto del
// sito ricorda chi ha compilato, e che qui non si usano di proposito. Fuori
// dalla memoria di questa funzione non resta niente, quindi non c'è niente da
// ripulire al caricamento successivo: un `F5` riparte vuoto per costruzione.
// Stessa regola per cui `emailNota.ts` non precompila sul totem e la chat
// dimentica dopo tre minuti.
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

import {
  API_TOUR,
  WEBHOOK_VERIFICA,
  WEBHOOK_CONTATTO,
  SECONDI_CONFERMA,
  SECONDI_OBLIO,
} from '../data/tour';
import { validaTelefono } from '../data/prefissi';
import { haGiaAccount } from '../data/contatto';

export function initTourForm(root) {
  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    nome: 'Serve il nome.',
    cognome: 'Serve il cognome.',
    bnome: 'Serve il nome del bambino.',
    bcognome: 'Serve il cognome del bambino.',
    bnascita: 'Serve la data di nascita del bambino: è quella che decide il corso.',
    nascita: 'Serve la tua data di nascita: la chiede il portale per creare l’anagrafica.',
    cellulareNucleo: 'Per registrare il nucleo serve un cellulare.',
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
    attivita: q('#tt-step-attivita'),
    dati: q('#tt-step-dati'),
    fatto: q('#tt-step-fatto'),
  };

  var campoEmail = q('#tt-email');
  var campoNome = q('#tt-nome');
  var campoCognome = q('#tt-cognome');
  var campoNascita = q('#tt-nascita');
  var campoBNome = q('#tt-b-nome');
  var campoBCognome = q('#tt-b-cognome');
  var campoBNascita = q('#tt-b-nascita');
  var campoCellulare = q('#tt-cellulare');
  var campoPrivacy = q('#tt-privacy');
  var campoMarketing = q('#tt-marketing');

  var dati = vuoto();

  function vuoto() {
    return {
      email: '',
      nome: '',
      cognome: '',
      nascita: '',
      cellulare: '',
      bambino: { nome: '', cognome: '', dataNascita: '' },
      attivita: [],
      /** `adulti` o `junior`: lo decide l'attività, e con lui cambia il passo
          dei dati e la strada su PerfectGym (`lead` o `nucleo`). */
      ramo: 'adulti',
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
      /** Se PerfectGym ha gia' l'anagrafica di chi sta compilando. Decide due
          cose insieme: quali campi si mostrano — i suoi non si chiedono — e
          quale strada prende n8n, che con un'anagrafica esistente non crea
          nessun genitore. */
      conosciuto: false,
      /** Il telefono che PerfectGym ci ha restituito. Vale come i suoi dati:
          se ce l'abbiamo, il campo non si mostra. */
      telefonoNoto: '',
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

  /* `2018-04-23` diventa `23/04/2018`. La data finisce in un'email che legge
     una persona, e la forma ISO la si legge al contrario per un istante. */
  function giorno(iso) {
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso || '');
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
        dati.conosciuto = riconosciuto();
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

    mostraStep('attivita');
    /* Qui nasce lo stato: da questo momento c'è qualcosa da dimenticare, e il
       conto parte anche se la persona non tocca più niente. */
    armaOblio();
  }

  /* Chi il club conosce già non ridigita quello che il club sa. Solo nei campi
     vuoti: se l'operatore ha già corretto un cognome, la correzione vince. */
  function precompila(body) {
    if (body.nome) dati.nome = String(body.nome);
    if (body.cognome) dati.cognome = String(body.cognome);
    if (body.telefono) dati.cellulare = String(body.telefono);
    dati.telefonoNoto = normalizzaNoto(dati.cellulare);
    [
      [campoNome, dati.nome],
      [campoCognome, dati.cognome],
      [campoCellulare, dati.cellulare],
    ].forEach(function (coppia) {
      if (coppia[0] && !coppia[0].value && coppia[1]) coppia[0].value = coppia[1];
    });
  }

  /* Il numero che arriva da PerfectGym esce in E.164 come tutti gli altri del
     sito: quando il campo non e' a schermo non c'e' nessuna tendina di prefissi
     a comporlo, quindi lo si compone qui.

     **Un numero gia' internazionale si prende com'e'**, e ricomporlo su `+39`
     e' esattamente il bug che `CampoTelefono` ha chiuso: `+44 7911…` diventerebbe
     un italiano che non esiste, e il WhatsApp partirebbe verso il nulla senza
     dare errore.

     **E non si giudica se e' plausibile, perche' non e' un dato di adesso.**
     `validaTelefono` esiste per quello che una persona sta digitando; questo e'
     il numero che il club ha in archivio, e rifiutarlo qui vorrebbe dire
     bloccare un tour — nel ramo junior il cellulare e' obbligatorio — su una
     cifra che chi sta davanti allo schermo non ha scritto e magari non sa
     nemmeno. Vale la regola dei form: non si fermano mai. Se e' sbagliato lo
     e' gia' su PerfectGym, e si corregge la' e non da qui.

     Quello che si controlla e' solo che sia componibile: se non lo e' torna
     vuoto, il campo ricompare e la domanda si fa. */
  function normalizzaNoto(numero) {
    var grezzo = String(numero || '').trim();
    if (!grezzo) return '';
    if (grezzo.charAt(0) === '+') return grezzo.replace(/[^\d+]/g, '');
    var esito = validaTelefono('+39', grezzo);
    return esito.ok ? esito.e164 : '';
  }

  /* **La domanda e' «abbiamo la sua anagrafica», e la risponde `memberType`.**
     E' la stessa `haGiaAccount()` che governa i pulsanti d'iscrizione e
     «contattaci», e sta la' una volta sola di proposito: un Lead e' un contatto
     e non un'anagrafica da cui appendere un figlio.

     **E serve anche l'id**, che qui non e' un dettaglio: e' la chiave con cui
     n8n attacca il bambino al genitore. Senza, nascondere i campi vorrebbe dire
     non chiedere dei dati *e* non avere niente a cui legare il figlio — quindi
     in quel caso si chiede tutto, e a valle non si crea niente comunque.

     Il verso dell'errore e' controllato: questa condizione e' sempre piu'
     stretta di `haAnagrafica` su n8n, che aggiunge `statoNucleo === 'iscritto'`.
     Quindi il sito non puo' mai nascondere un campo che l'automazione poi si
     aspetta di trovare pieno per creare un'anagrafica. */
  function riconosciuto() {
    return haGiaAccount({ memberType: dati.memberType, stato: dati.statoPgm }) && !!dati.memberId;
  }

  if (btnVerifica) btnVerifica.addEventListener('click', verifica);
  if (campoEmail) {
    campoEmail.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') verifica();
    });
  }

  // ── 2. Le attività, che decidono il ramo ──────────────────────────────────
  function attivitaScelte() {
    return qa('[data-tt-attivita]:checked').map(function (c) {
      return {
        id: c.value,
        label: c.dataset.ttEtichetta || c.value,
        gruppo: c.dataset.ttGruppo || 'adulti',
      };
    });
  }

  /* Il gruppo lo porta la casella (`data-tt-gruppo`), che il markup riempie da
     `GRUPPI_ATTIVITA` — cioè da `ACTIVITY_TAGS`. Un elenco di slug scritto qui
     divergerebbe il giorno che si aggiunge un corso. */
  function ramoDa(scelte) {
    var junior = scelte.some(function (a) { return a.gruppo === 'junior'; });
    return junior ? 'junior' : 'adulti';
  }

  var btnAvantiAttivita = q('[data-tt-avanti-attivita]');

  function avantiAttivita() {
    pulisciErrore(steps.attivita);
    var scelte = attivitaScelte();
    if (!scelte.length) {
      mostraErrore(steps.attivita, ERR.attivita);
      return;
    }
    dati.attivita = scelte;
    dati.ramo = ramoDa(scelte);
    vestiPassoDati();
    mostraStep('dati');
    armaOblio();
  }

  if (btnAvantiAttivita) btnAvantiAttivita.addEventListener('click', avantiAttivita);

  /* Il passo dei dati cambia forma col ramo. Si tocca solo quello che cambia —
     titolo, blocchi nascosti, etichette — e non si ricostruisce il markup: i
     campi che restano devono conservare quello che la persona ci ha già
     scritto se torna indietro e cambia idea sull'attività. */
  var bloccoBambino = q('[data-tt-bambino]');
  var leadGenitore = q('[data-tt-lead-genitore]');
  var bloccoNascita = q('[data-tt-nascita-adulto]');
  var titoloDati = q('[data-tt-titolo-dati]');
  var etichettaNome = q('[data-tt-etichetta-nome]');
  var notaCellulare = q('[data-tt-cellulare-nota]');
  var bloccoPersona = q('[data-tt-persona]');
  var bloccoCellulare = q('[data-tt-cellulare-blocco]');
  var bloccoNoto = q('[data-tt-noto]');
  var nomeNoto = q('[data-tt-noto-nome]');

  function vestiPassoDati() {
    var junior = dati.ramo === 'junior';
    /* **Il bambino si chiede sempre**, e non dipende da chi e' il genitore:
       lui in anagrafica non c'e' — o se c'e' non lo sappiamo da qui — ed e'
       l'unica persona di cui il club non ha ancora niente. */
    if (bloccoBambino) bloccoBambino.hidden = !junior;

    /* **Del genitore si chiede solo quello che non abbiamo.** Con l'anagrafica
       gia' su PerfectGym non c'e' nessun `personalData` da comporre, quindi
       nome, cognome e data di nascita non servono a niente: chiederli e' far
       ricopiare a una persona in piedi quello che il club ha gia' scritto. */
    if (bloccoPersona) bloccoPersona.hidden = dati.conosciuto;
    if (bloccoNoto) bloccoNoto.hidden = !dati.conosciuto;
    if (nomeNoto) {
      nomeNoto.textContent = (dati.nome + ' ' + dati.cognome).trim() || dati.email;
    }

    if (leadGenitore) leadGenitore.hidden = !junior || dati.conosciuto;
    /* La data di nascita dell'adulto la chiede PerfectGym solo per il nucleo:
       `PGM Crea Lead` non la vuole, e per chi ha gia' l'anagrafica non si crea
       niente — quindi resta al solo genitore nuovo di un bambino. */
    if (bloccoNascita) bloccoNascita.hidden = !junior || dati.conosciuto;

    /* Il cellulare e' un dato suo come gli altri: se la verifica ce l'ha
       restituito non si richiede. Se PerfectGym lo conosce ma non ce l'ha —
       succede — il campo resta, perche' senza numero il richiamo del desk non
       parte e il bambino nasce senza `phoneNumber`. */
    var telefonoDaChiedere = !dati.conosciuto || !dati.telefonoNoto;
    if (bloccoCellulare) bloccoCellulare.hidden = !telefonoDaChiedere;

    if (titoloDati) {
      titoloDati.textContent = junior
        ? 'Chi porti in acqua?'
        : dati.conosciuto
          ? 'Ci siamo quasi'
          : 'Come ti chiami?';
    }
    if (etichettaNome) etichettaNome.textContent = junior ? 'Il tuo nome' : 'Nome';
    if (notaCellulare) {
      notaCellulare.textContent = junior ? 'serve per registrarvi' : 'facoltativo';
    }
  }

  var btnInvia = q('[data-tt-invia]');

  async function invia() {
    pulisciErrore(steps.dati);

    var junior = dati.ramo === 'junior';

    /* Il bambino per primo, perché è il primo blocco a schermo: un errore che
       parla di un campo più in basso di quello che si sta guardando manda a
       cercarlo. */
    if (junior) {
      dati.bambino = {
        nome: campoBNome.value.trim(),
        cognome: campoBCognome.value.trim(),
        dataNascita: campoBNascita.value,
      };
      if (!dati.bambino.nome) {
        mostraErrore(steps.dati, ERR.bnome);
        segnala(campoBNome);
        return;
      }
      if (!dati.bambino.cognome) {
        mostraErrore(steps.dati, ERR.bcognome);
        segnala(campoBCognome);
        return;
      }
      if (!dati.bambino.dataNascita) {
        mostraErrore(steps.dati, ERR.bnascita);
        segnala(campoBNascita);
        return;
      }
    } else {
      dati.bambino = { nome: '', cognome: '', dataNascita: '' };
    }

    /* **I campi nascosti non si leggono e non si pretendono.** Quando
       l'anagrafica c'è già, `dati.nome` e `dati.cognome` li ha messi la
       verifica: rileggerli dai campi vorrebbe dire prendere la stringa vuota
       di un campo che nessuno ha visto, e poi rifiutare l'invio per un campo
       che non c'è — un modulo che si blocca su niente. */
    if (!dati.conosciuto) {
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
    }

    /* La data di nascita del genitore la vuole `personalData.birthDate` della
       chiamata che crea l'anagrafica: senza, il nucleo non nasce — e non nasce
       in silenzio, perché quel nodo ha `continueRegularOutput`. Con
       l'anagrafica già lì quella chiamata non parte, quindi non serve. */
    dati.nascita = junior && !dati.conosciuto ? campoNascita.value : '';
    if (junior && !dati.conosciuto && !dati.nascita) {
      mostraErrore(steps.dati, ERR.nascita);
      segnala(campoNascita);
      return;
    }

    /* Il cellulare è facoltativo, e al totem è la scelta giusta: la persona è
       qui, l'email l'ha già data, e un campo obbligatorio in più davanti a
       qualcuno che ha fretta di andarsene è il punto in cui il modulo non si
       compila. Ma se è scritto dev'essere un numero vero, o il richiamo parte
       verso il nulla. */
    if (dati.conosciuto && dati.telefonoNoto) {
      /* Il campo non è a schermo: il numero è quello che PerfectGym ci ha
         appena dato, e vale come se fosse stato digitato. */
      dati.cellulare = dati.telefonoNoto;
    } else if (campoCellulare.value.trim()) {
      var tel = telefono();
      if (!tel.ok) {
        mostraErrore(steps.dati, tel.motivo);
        segnala(campoCellulare);
        return;
      }
      dati.cellulare = tel.e164;
    } else if (junior) {
      /* Nel ramo junior smette di essere facoltativo: `phoneNumber` viaggia
         sia nell'anagrafica del genitore sia in quella del figlio. */
      mostraErrore(steps.dati, ERR.cellulareNucleo);
      segnala(campoCellulare);
      return;
    } else {
      dati.cellulare = '';
    }

    var scelte = attivitaScelte();
    if (!scelte.length) {
      /* Non dovrebbe succedere — si passa di qui solo dopo il passo delle
         attività — ma se qualcuno torna indietro e le toglie tutte, meglio
         rimandarlo là che spedire un tour senza. */
      mostraStep('attivita');
      mostraErrore(steps.attivita, ERR.attivita);
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
      dataNascita: dati.nascita,
      bambino: dati.bambino,
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
            /* **`flow` decide la strada su PerfectGym**, e non è più fisso:
               `Normalizza e Componi Email` ne ricava `stradaPgm`, che vale
               `lead` per gli adulti e `nucleo` per i junior — cioè
               `PGM Crea Genitore` seguito da `PGM Crea Figlio`. Era
               `'adulti'` scritto a mano, quindi un tour per un bambino creava
               un lead a nome del genitore e il figlio non esisteva. */
            flow: dati.ramo,
            gruppoAttivita: dati.ramo === 'junior' ? 'junior' : 'adulti',
            cellulare: dati.cellulare,
            /* La richiesta non la scrive nessuno al totem: quello che c'è è
               l'elenco delle attività, ed è quello che il desk legge
               nell'email. */
            richiesta: 'Tour in sede. Attività di interesse: ' +
              scelte.map(function (a) { return a.label; }).join(', ') + '.' +
              (junior && dati.bambino.nome
                ? ' Per ' + dati.bambino.nome + ' ' + dati.bambino.cognome +
                  ' (' + giorno(dati.bambino.dataNascita) + ').'
                : ''),
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
    fermaOblio();
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
    fermaOblio();
    dati = vuoto();
    /* Il passo dei dati torna alla forma adulti, o il prossimo visitatore
       trova a schermo i campi del bambino di quello prima. */
    vestiPassoDati();
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

  /* «Non sei tu?»: si riparte dall'email, che e' l'unica cosa da cui il
     riconoscimento dipende. Non e' un ripensamento raro — al totem l'email la
     digita chi ha davanti l'operatore, e un indirizzo di famiglia riconosce il
     coniuge — e senza questo comando quella persona registrerebbe il tour a
     nome di un altro senza niente da toccare. Si azzera tutto e non solo il
     riconoscimento: dopo un'email diversa nome, cognome e telefono precompilati
     sono quelli sbagliati. */
  var btnNonSeiTu = q('[data-tt-non-sei-tu]');
  if (btnNonSeiTu) btnNonSeiTu.addEventListener('click', azzera);

  // ── L'oblio di un modulo lasciato a metà ──────────────────────────────────
  //
  // Il conto della conferma copre chi arriva in fondo. Questo copre chi non ci
  // arriva, ed è il caso da temere: i campi del passo 2 — nome, cognome,
  // numero — restano a schermo finché qualcuno non li tocca, e chi arriva dopo
  // li legge.
  //
  // **Il conto segue il dato, non il dito**, ed è la lezione già pagata dalla
  // chat: armarlo sui soli eventi di interazione vuol dire che parte perché
  // qualcuno ha toccato lo schermo, non perché c'è qualcosa da dimenticare. Un
  // percorso che arriva a destinazione senza un `pointerdown` — un invio da
  // tastiera, l'`Enter` sul campo email — lascerebbe i dati lì per sempre.
  // Quindi si arma **anche** dove lo stato nasce: dopo la verifica dell'email,
  // e a ogni carattere digitato.
  var orologioOblio = null;

  function armaOblio() {
    fermaOblio();
    orologioOblio = setTimeout(function () {
      orologioOblio = null;
      /* Non si azzera sopra la conferma: quella ha il suo conto, visibile, e
         interromperlo vorrebbe dire togliere di mezzo un «Grazie, Giulia» che
         la persona sta ancora leggendo. */
      if (steps.fatto && !steps.fatto.hidden) return;
      azzera();
    }, SECONDI_OBLIO * 1000);
  }

  function fermaOblio() {
    if (orologioOblio) clearTimeout(orologioOblio);
    orologioOblio = null;
  }

  root.addEventListener('input', armaOblio);
  root.addEventListener('change', armaOblio);
  root.addEventListener('pointerdown', armaOblio);
  root.addEventListener('keydown', armaOblio);

  /* Il ritorno da un'altra pagina — l'informativa si apre in una scheda nuova,
     ma un «indietro» resta possibile — non deve rimettere in pagina i campi
     che il browser aveva conservato nella cache di navigazione. `persisted`
     dice esattamente questo: la pagina non è stata ricostruita, è tornata
     com'era. */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) azzera();
  });

  mostraStep('email');
}
