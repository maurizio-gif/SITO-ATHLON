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
import { anagraficaNota, servonoISuoiDati } from '../data/contatto';

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
    cf: 'Il codice fiscale è di sedici caratteri: controlla, o lascialo vuoto.',
    bcf: 'Il codice fiscale del bambino è di sedici caratteri: controlla, o lascialo vuoto.',
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
  var campoCf = q('#tt-cf');
  var campoBCf = q('#tt-b-cf');
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
      /** Il codice fiscale, che PerfectGym chiama `personalId`. Facoltativo di
          qui fino a n8n: se manca, la scheda si crea senza e il campo resta da
          completare a mano — che è esattamente com'era prima che questo campo
          esistesse. */
      codiceFiscale: '',
      cellulare: '',
      bambino: { nome: '', cognome: '', dataNascita: '', codiceFiscale: '' },
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

  /* Il codice fiscale come lo vuole PerfectGym: stampatello, senza spazi.
     Chi lo copia da una tessera ci mette dentro un separatore o lo scrive
     minuscolo, e rifiutarglielo per quello vorrebbe dire far ridigitare
     sedici caratteri a una persona in piedi. */
  function normalizzaCf(valore) {
    return String(valore || '').replace(/\s+/g, '').toUpperCase();
  }

  /* **Sedici alfanumerici, e non lo schema completo.** La forma canonica —
     sei lettere, due cifre, una lettera del mese… — la rompe l'**omocodia**:
     quando due persone si scontrano sullo stesso codice, l'Agenzia sostituisce
     una cifra con una lettera, e quei codici sono veri e in tasca a qualcuno.
     Un controllo che li rifiuta blocca un dato buono; questo prende quello che
     serve davvero, cioè il codice troncato o incollato a metà.

     Non c'è il carattere di controllo, e nemmeno quello è una svista: chi si
     sbaglia di una lettera qui davanti ha comunque l'operatore accanto, e il
     dato lo si vede nella scheda. */
  function cfValido(valore) {
    return /^[A-Z0-9]{16}$/.test(valore);
  }

  /* Un campo dentro un accordion chiuso non si può segnalare: `focus()` su un
     elemento non renderizzato non fa niente, e il modulo si fermerebbe
     mostrando un errore che parla di un campo che non è a schermo. Quindi
     prima si apre il riquadro, poi si punta il campo. */
  function apriExtra(campo) {
    var box = campo && campo.closest ? campo.closest('[data-tt-extra]') : null;
    if (box) box.open = true;
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
        dati.conosciuto = anagraficaNota({ stato: dati.statoPgm, statoNucleo: dati.statoNucleo });
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
    [
      [campoNome, dati.nome],
      [campoCognome, dati.cognome],
      [campoCellulare, dati.cellulare],
    ].forEach(function (coppia) {
      if (coppia[0] && !coppia[0].value && coppia[1]) coppia[0].value = coppia[1];
    });
  }

  /* **La domanda non e' «lo conosciamo», e' «abbiamo i suoi dati».** Sta in
     `data/contatto.ts` e non qui, perche' e' la stessa della chat: quello e' lo
     stesso percorso — email, poi i dati solo se mancano — e due copie della
     condizione risponderebbero in due modi al primo ritocco.

     La differenza fra le due domande e' tutta nel Lead: non puo' fare login,
     quindi `haGiaAccount` dice no, ma i suoi dati ce li abbiamo perche' e' a
     sistema da una prova. E basta che ne manchi uno — un'anagrafica nata da un
     form con la sola email, un fisso al posto del cellulare — perche' il blocco
     torni intero. */
  function serveGenitore() {
    return servonoISuoiDati({
      nota: dati.conosciuto,
      id: dati.memberId,
      nome: dati.nome,
      cognome: dati.cognome,
      telefono: dati.cellulare,
    });
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
    var suoi = serveGenitore();

    /* **Il bambino si chiede sempre**, e non dipende da chi e' il genitore: di
       lui PerfectGym non ci ha mai detto niente, nemmeno al socio piu' vecchio
       del club. E' la stessa riga della chat: un corso per bambini vuole due
       anagrafiche, e la seconda non ce l'ha nessuno. */
    if (bloccoBambino) bloccoBambino.hidden = !junior;

    /* **Del genitore si chiede tutto o niente.** Chiedere due campi su tre
       lascia a indovinare perche' proprio quelli, e un modulo che cambia forma
       campo per campo si legge come un guasto: o si chiede, o si conferma. */
    if (bloccoPersona) bloccoPersona.hidden = !suoi;
    if (bloccoCellulare) bloccoCellulare.hidden = !suoi;
    if (bloccoNoto) bloccoNoto.hidden = suoi;
    if (nomeNoto) {
      nomeNoto.textContent = (dati.nome + ' ' + dati.cognome).trim() || dati.email;
    }

    /* La data di nascita del genitore serve a `personalData.birthDate` della
       chiamata che crea la sua anagrafica, e quella chiamata parte solo se non
       ce l'ha gia'. Quindi la si chiede esattamente quando si chiedono i suoi
       dati, e mai da sola. */
    if (bloccoNascita) bloccoNascita.hidden = !(junior && suoi);
    if (leadGenitore) leadGenitore.hidden = !(junior && suoi);

    if (titoloDati) {
      titoloDati.textContent = !junior
        ? suoi
          ? 'Come ti chiami?'
          : 'Ci siamo quasi'
        : suoi
          ? 'Chi porti in acqua?'
          : 'I dati di tuo figlio';
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
    /* La stessa domanda che ha dato forma al passo: i campi nascosti non si
       leggono e non si pretendono. Rileggerli darebbe la stringa vuota di un
       campo che nessuno ha visto, e poi rifiuterebbe l'invio per un campo che
       non c'e' — un modulo che si blocca su niente. */
    var suoi = serveGenitore();

    /* Il bambino per primo, perché è il primo blocco a schermo: un errore che
       parla di un campo più in basso di quello che si sta guardando manda a
       cercarlo. */
    if (junior) {
      dati.bambino = {
        nome: campoBNome.value.trim(),
        cognome: campoBCognome.value.trim(),
        dataNascita: campoBNascita.value,
        codiceFiscale: normalizzaCf(campoBCf && campoBCf.value),
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
      /* Facoltativo vuol dire «puoi non darmelo», non «puoi darmelo
         sbagliato»: è la stessa regola del cellulare, che si può lasciare
         vuoto ma non si può lasciare a metà. Un `personalId` troncato non
         fallisce la creazione della scheda — ci si siede dentro, e da lì lo
         corregge solo chi va a guardarlo. */
      if (dati.bambino.codiceFiscale && !cfValido(dati.bambino.codiceFiscale)) {
        mostraErrore(steps.dati, ERR.bcf);
        apriExtra(campoBCf);
        segnala(campoBCf);
        return;
      }
    } else {
      dati.bambino = { nome: '', cognome: '', dataNascita: '', codiceFiscale: '' };
    }

    /* **I campi nascosti non si leggono e non si pretendono.** Quando
       l'anagrafica c'è già, `dati.nome` e `dati.cognome` li ha messi la
       verifica: rileggerli dai campi vorrebbe dire prendere la stringa vuota
       di un campo che nessuno ha visto, e poi rifiutare l'invio per un campo
       che non c'è — un modulo che si blocca su niente. */
    if (suoi) {
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
    dati.nascita = junior && suoi ? campoNascita.value : '';
    if (junior && suoi && !dati.nascita) {
      mostraErrore(steps.dati, ERR.nascita);
      segnala(campoNascita);
      return;
    }

    /* **Il codice fiscale si chiede a chi si sta registrando, e a nessun
       altro.** Il campo sta dentro `data-tt-persona`, quindi è a schermo
       esattamente quando lo sono nome e cognome — cioè quando l'anagrafica la
       crea n8n e `personalId` ha un posto dove andare. Con l'anagrafica già su
       PerfectGym quella chiamata non parte: leggere il campo darebbe la
       stringa vuota di un riquadro che nessuno ha visto, e mandarla vorrebbe
       dire proporsi di svuotare un dato che il gestionale ha già. */
    dati.codiceFiscale = suoi ? normalizzaCf(campoCf && campoCf.value) : '';
    if (dati.codiceFiscale && !cfValido(dati.codiceFiscale)) {
      mostraErrore(steps.dati, ERR.cf);
      apriExtra(campoCf);
      segnala(campoCf);
      return;
    }

    /* Il cellulare è facoltativo, e al totem è la scelta giusta: la persona è
       qui, l'email l'ha già data, e un campo obbligatorio in più davanti a
       qualcuno che ha fretta di andarsene è il punto in cui il modulo non si
       compila. Ma se è scritto dev'essere un numero vero, o il richiamo parte
       verso il nulla. */
    if (!suoi) {
      /* Il campo non è a schermo perché il numero ce l'abbiamo già, e
         `servonoISuoiDati` l'ha appena fatto passare da `validaTelefono`: qui
         serve solo la forma E.164, che nessuna tendina di prefissi può comporre
         su un campo che non c'è. */
      dati.cellulare = validaTelefono('+39', dati.cellulare).e164 || dati.cellulare;
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
      /* In italiano come tutto il resto del payload — `dataNascita` non si
         chiama `birthDate` — e la traduzione la fa n8n, che è il posto dove
         PerfectGym si parla. Il bambino se lo porta dentro `bambino`. */
      codiceFiscale: dati.codiceFiscale,
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
            /* **I due codici fiscali col nome che PerfectGym gli dà**, come
               `cellulare` qui sopra ripete `telefono` con il nome che quel
               workflow si aspetta. Vanno in `personalData.personalId`: il primo
               nella chiamata che crea l'adulto — `PGM Crea Lead` per il ramo
               adulti, `PGM Crea Genitore` per il nucleo — il secondo in
               `PGM Crea Figlio`.

               **Una stringa vuota non è un campo da scrivere.** Il codice
               fiscale è facoltativo, quindi il caso normale è che non ci sia:
               mandare `''` a PerfectGym vuol dire proporsi di azzerare un
               `personalId` che magari l'anagrafica ha già. `undefined` sparisce
               da `JSON.stringify`, quindi la chiave non parte proprio — è la
               stessa regola del sync, «un campo assente non è un campo
               svuotato». */
            personalId: dati.codiceFiscale || undefined,
            personalIdFiglio: dati.bambino.codiceFiscale || undefined,
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
    /* **Anche il pannello dell'assistenza si svuota**, e non è un di più:
       chiuderlo non azzera i suoi campi — lo fa solo un invio riuscito —
       quindi l'email e il testo di chi ci ha ripensato resterebbero a schermo
       per il visitatore dopo. È lo stesso motivo per cui questa pagina non
       scrive niente nello storage. */
    if (window.__athlonChiudiSupport) window.__athlonChiudiSupport();
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
    /* Gli accordion tornano chiusi. Il campo dentro lo svuota il giro qui
       sopra — porta `.tt__input` — ma un riquadro rimasto aperto direbbe al
       visitatore dopo che il codice fiscale è una cosa che gli stiamo
       chiedendo, e questa pagina esiste anche per non lasciargli addosso le
       scelte di quello prima. */
    qa('[data-tt-extra]').forEach(function (d) {
      d.open = false;
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

  /* Il comando in fondo apre il pannello dell'assistenza, quello di
     `/club-life`. Si chiama la maniglia globale e non si porta
     `data-open-support`: quell'attributo lo ascolta uno script di
     `HelpDesk.astro`, legato alla sezione `.hd` che qui non esiste. */
  var btnAssistenza = q('[data-tt-assistenza]');
  if (btnAssistenza) {
    btnAssistenza.addEventListener('click', function () {
      if (window.__athlonOpenSupport) window.__athlonOpenSupport();
    });
  }

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
