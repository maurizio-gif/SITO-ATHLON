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
  WEBHOOK_RESET,
  ISCRIZIONI,
  ISTRUZIONI,
  PORTALE,
  MACRO_BY_ID,
  ATTIVITA_ADULTI,
  haGiaAccount,
} from '../data/contatto';
import { SITE } from '../data/sito';
import { validaTelefono } from '../data/prefissi';
import { leggi as emailConosciuta } from '../scripts/emailNota';
import { leggi as userNumberConosciuto } from '../scripts/numeroSocio';
import { montaAppuntamento } from './appuntamentoInline.client.js';

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
      /** Il numero socio, quando la verifica è partita da un link invece che
          da un'email digitata. Vedi `numeroSocio.ts`. */
      userNumber: '',
      // Quello che la verifica ha trovato su PerfectGym.
      statoPgm: 'nuovo',
      statoNucleo: 'nuovo',
      /** Quanti contratti vivi ha il nucleo: il numero da cui nasce `abbonato()`. */
      contrattiVivi: 0,
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
  /* L'id della visita, accanto al vid e non al suo posto: senza consenso
     pubblicitario il vid vale una pagina sola, mentre il sid regge tutta la
     sessione — è lui a legare questa richiesta alle pagine viste prima
     (vista `percorso_conversione`), anche per chi resta anonimo. */
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
    email: q('#' + P + '-step-email'),
    macro: q('#' + P + '-step-macro'),
    adulti: q('#' + P + '-step-adulti'),
    assistenza: q('#' + P + '-step-assistenza'),
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
  /**
   * «Passo N di M», con M che dipende da chi sta compilando.
   *
   * Due cose lo accorciano, e si sommano: l'area già scelta dal pulsante di
   * partenza toglie il primo passo, e un abbonamento vivo toglie l'ultimo —
   * quello dei dati, che a un iscritto non si chiedono. Un contatore che dice
   * «di 3» a chi ne compilerà due è una promessa di lavoro che non arriva, e
   * si nota: è il numero che una persona guarda per decidere se ha tempo.
   *
   * Per questo va richiamata **dopo la verifica dell'email**, che è il momento
   * in cui si sa se il nucleo è abbonato: all'apertura del pannello non lo
   * sappiamo ancora.
   */
  function numeraPassi() {
    var salta = !!dati.macroDaCta;
    var totale = (salta ? 0 : 1) + 1 + (abbonato() ? 0 : 1);
    qa('[data-cf-passo]').forEach(function (el) {
      var n = parseInt(el.dataset.cfPasso, 10);
      if (salta) n -= 1;
      el.textContent = 'Passo ' + n + ' di ' + totale;
      /* Tre modi in cui un contatore non ha senso, e tutti e tre capitano.
         Con l'area già scelta il passo «1» non esiste, e il suo occhiello
         sparisce invece di dire «Passo 0». Un contatore «di 1» non conta
         niente — è una schermata sola, e dirlo la fa sembrare l'inizio di
         qualcosa di più lungo. E un passo **oltre** il totale è il caso
         dell'abbonato: il passo dei dati non lo farà mai, ma il suo occhiello
         diceva «Passo 3 di 2». Sta dentro una sezione nascosta, quindi non si
         vedeva — ed è esattamente il tipo di frase che ricompare il giorno che
         qualcuno riusa quel passo. */
      el.hidden = n < 1 || n > totale || totale <= 1;
    });
  }

  /** La riga «stai scrivendo per …», e l'occhiello del primo passo. */
  function mostraContesto() {
    var riga = q('[data-cf-contesto]');
    var area = q('[data-cf-contesto-area]');
    var occhiello = q('[data-cf-occhiello]');
    var titolo = q('#cf-titolo-corrente');
    var leadTeam = q('[data-cf-lead-team]');
    var macro = dati.macroDaCta ? MACRO_BY_ID[dati.macroDaCta] : null;
    if (riga) riga.hidden = !macro;
    if (macro) {
      /* L'etichetta dell'attività precisa quando c'è, l'area quando non c'è:
         chi arriva dalla pagina del reformer legge «Group Reformer», non
         «Adulti», perché è quello che ha in mente. */
      var precisa = ATTIVITA_ADULTI.filter(function (a) { return a.id === dati.attivitaOrigine; })[0];
      if (area) area.textContent = precisa ? precisa.label : macro.label;
      if (occhiello) occhiello.textContent = 'Richiesta · ' + macro.label;
      /* Chi arriva da un pulsante junior/baby («trova il corso giusto per tuo
         figlio») sa già perché sta scrivendo: il titolo lungo e il paragrafo
         sul Team di Assistenza sono per l'adulto che scrive di sé, dove il
         motivo non è già dichiarato dal pulsante che ha premuto. */
      var junior = macro.ramo !== 'adulti';
      if (titolo) titolo.textContent = junior ? 'Richiesta informazioni.' : 'Contatta il nostro team.';
      if (leadTeam) leadTeam.hidden = junior;
    } else {
      if (occhiello) occhiello.textContent = 'Richiesta al team';
      if (titolo) titolo.textContent = 'Contatta il nostro team.';
      if (leadTeam) leadTeam.hidden = false;
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
    pulisciErrore(steps.email);
    togliSegno(campoEmail);

    if (!viaNumero) {
      if (!emailValida(campoEmail.value)) {
        mostraErrore(steps.email, ERR.email);
        segnala(campoEmail);
        return;
      }
      dati.email = campoEmail.value.trim().toLowerCase();
      if (window.athlonRicordaEmail) window.athlonRicordaEmail(dati.email);
    } else {
      dati.userNumber = viaNumero;
    }
    attendi(btnVerifica, true);

    try {
      /* Con le UTM oltre al `vid`: la verifica registra ogni email su
         `eventi_email`, ed è il primo tocco. Senza, un contatto nato da qui
         risultava senza provenienza fino al secondo invio. */
      var corpo = viaNumero ? { userNumber: viaNumero } : { email: dati.email };
      corpo.pagina = dati.pagina;
      corpo.utm = utm();
      corpo.vid = vid();
      corpo.sid = sid();
      var r = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      var body = await r.json();
      if (body && body.stato) {
        dati.statoPgm = String(body.stato);
        dati.statoNucleo = String(body.statoNucleo || body.stato);
        dati.contrattiVivi = Number(body.contrattiVivi) || 0;
        dati.memberId = body.memberId || null;
        dati.memberType = String(body.memberType || '');
        /* Il number di PerfectGym, qualunque sia stata la chiave di ricerca:
           ricordato come l'email, così una verifica partita da un indirizzo
           digitato riconosce da qui in poi anche i link di newsletter della
           stessa persona. */
        if (body.number && window.athlonRicordaUserNumber) {
          window.athlonRicordaUserNumber(body.number);
        }
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

    /* Ora si sa se il nucleo è abbonato, quindi si sa quanti passi restano:
       per un iscritto quello dei dati non ci sarà. */
    numeraPassi();

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

    /* **L'abbonamento vince su tutto il resto, e si controlla per primo.**
       Chi ha un abbonamento vivo — suo o del nucleo — non sta chiedendo
       informazioni commerciali: sta chiedendo assistenza, e va servito come
       tale in tutti e tre i rami.

       Quindi salta il passo dei dati, e non e' una scorciatoia: nome, cognome e
       cellulare li abbiamo gia' da PerfectGym, e ripresentarli precompilati
       chiede a un iscritto di confermare quello che il club sa di lui da anni.
       Restano in back end, dove sono.

       E soprattutto **non vede il calendario**: l'appuntamento telefonico e' lo
       strumento di chi deve ancora decidere se iscriversi. Offrirlo a un
       abbonato che segnala un problema significa rispondergli «ti richiamiamo
       fra tre giorni» quando la sua domanda ne ha una da due righe.

       Vale anche per junior e baby: la schermata «ecco come iscriverti» non
       serve a chi e' gia' dentro, e l'email con le modalita' di iscrizione
       suonerebbe come una lettera al cliente sbagliato. */
    if (abbonato()) {
      mostraAssistenza();
      mostraStep('assistenza');
      return;
    }

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
    /* Junior e baby: **il bambino si chiede sempre**, anche a un genitore che
       il portale conosce già.

       Prima non era così, e costava la cosa per cui questo percorso esiste. Chi
       aveva un account saltava questo passo e finiva dritto sulla schermata del
       portale: il payload partiva senza `bambino`, quindi su n8n `haBambino`
       era falso e `stradaPgm` diventava `nessuna` — nessuna anagrafica del
       figlio, nessun legame col nucleo. Il genitore leggeva «accedi e prenota»
       e nel portale non trovava nessun bambino da prenotare.

       La ragione è la stessa del totem: di un genitore PerfectGym ci ha già
       detto tutto, **del bambino non ci ha mai detto niente** — nemmeno per il
       socio più vecchio del club. Un corso per bambini vuole due anagrafiche
       legate, e la seconda non ce l'ha nessuno.

       Quello che resta saltato è il passo del *genitore*, che è giusto: nome,
       cognome e cellulare li abbiamo, e la strada `figlio` di n8n aggancia il
       bambino al nucleo leggendo `memberId`. */
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

  /**
   * Se il nucleo di chi scrive ha un abbonamento vivo.
   *
   * `statoNucleo` è `iscritto` quando il titolare **o uno dei suoi primi tre
   * figli** ha un contratto `Current`, `NotStarted` o `Freezed` con quota
   * diversa da zero: lo calcola `athlon-verifica-iscritto` interrogando
   * PerfectGym, e il browser ce l'ha già dal primo passo. Non è la stessa
   * domanda di `vaAlPortale()` — quella chiede «può fare login», questa
   * «frequenta».
   *
   * **È la domanda del nucleo e non della persona**, e la differenza è il caso
   * normale del club: il genitore che paga l'abbonamento del figlio non ha un
   * contratto suo, ma è di casa e le sue domande sono quelle di chi frequenta.
   * `stato === 'iscritto'` guarda la singola anagrafica e lo lascerebbe fuori.
   */
  function abbonato() {
    return dati.statoNucleo === 'iscritto';
  }

  /** Come si chiama questa richiesta, per il desk e per chi la scrive. */
  function tipoRichiesta() {
    return abbonato() ? 'assistenza' : 'informazioni';
  }

  // ── L'assistenza: il percorso di chi ha già un abbonamento ────────────────
  var campoAssistenza = q('#' + P + '-assistenza-testo');

  /** Scrive l'area scelta nella schermata: è l'unica cosa che la contestualizza,
   *  visto che qui non ci sono né pastiglie né dati. */
  function mostraAssistenza() {
    var area = q('[data-cf-assistenza-area]');
    if (area) area.textContent = (MACRO_BY_ID[dati.macro] || {}).label || '';
  }

  async function inviaAssistenza() {
    pulisciErrore(steps.assistenza);
    togliSegno(campoAssistenza);

    if (!campoAssistenza.value.trim()) {
      mostraErrore(steps.assistenza, ERR.richiesta);
      segnala(campoAssistenza);
      return;
    }
    dati.richiesta = campoAssistenza.value.trim();

    /* I dati di chi scrive non si chiedono, ma il payload li porta: la
       verifica dell'email li ha già presi da PerfectGym (`precompila`), e
       senza di loro l'email al desk arriverebbe senza un nome da chiamare per
       una persona che il club conosce. È la differenza fra «non li chiediamo»
       e «non li abbiamo».

       `privacy` resta falsa e va bene: non e' un consenso mancante, e' un
       consenso che questa persona ha già dato quando si e' iscritta. Chiederlo
       di nuovo a un socio per rispondergli su un badge sospeso non aggiunge
       nulla a quello che il club puo' già fare con i suoi dati. */
    await spedisci(q('[data-cf-invia-assistenza]'));
    mostraEsito('assistenza');
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

  async function avantiBambino() {
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
    /* Chi ha già l'account non ridigita i propri dati: si spedisce di qui — con
       il bambino nel payload — e si mostra la schermata del portale. */
    if (vaAlPortale()) {
      await inviaEPortale(q('[data-cf-avanti-bambino]'));
      return;
    }

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
      come iscriversi, invece di creare un secondo profilo.
 *
 *  Due blocchi, uno per ramo, perché le due strade finiscono in due posti: la
 *  scuola nuoto sceglie un turno nella scheda, il baby nuoto compra dentro il
 *  portale. Il blocco sbagliato non si nasconde e basta — con `hidden`
 *  scompare dal giro del tab, che è la regola del sito per gli overlay
 *  chiusi. */
  async function inviaEPortale(bottone) {
    await spedisci(bottone || null);
    var per = q('[data-cf-portale-ramo]');
    if (per) per.textContent = dati.ramo === 'baby' ? 'il baby nuoto' : 'i corsi junior';
    qa('[data-cf-portale-blocco]').forEach(function (blocco) {
      blocco.hidden = blocco.dataset.cfPortaleBlocco !== dati.ramo;
    });
    /* Il pannello si riapre senza ricaricare la pagina: un esito del reset
       lasciato acceso parlerebbe di una mail mandata all'indirizzo di prima. */
    resetPulito();
    mostraStep('portale');
  }

  /* ── Il reset della password, senza uscire da qui ──────────────────────────
     Lo stesso meccanismo di `IscrizioneModal`, e per la stessa ragione: la
     pagina `ForgotPassword` del portale chiede di **ridigitare** l'indirizzo
     che la persona ha appena scritto qui, in un'altra applicazione e in
     un'altra scheda. `WEBHOOK_RESET` esisteva già e questo form non lo usava.

     Tre scelte prese da là, che valgono qui uguali: l'email è quella
     verificata e non quella nel campo; l'attesa è di dieci secondi, perché chi
     ha appena chiesto una cosa sola la aspetta; e in caso di errore non si
     scrive niente, si apre il portale — che è dove la persona voleva
     andare. */
  var btnReset = q('[data-cf-reset]');
  var resetRiga = q('[data-cf-reset-riga]');
  var resetFatto = q('[data-cf-reset-fatto]');
  var resetEmail = q('[data-cf-reset-email]');
  var resetSpinner = q('[data-cf-reset-spinner]');

  function resetPulito() {
    if (resetRiga) resetRiga.hidden = false;
    if (resetFatto) resetFatto.hidden = true;
    /* Anche l'indirizzo, non solo il blocco che lo contiene: nascosto non è
       cancellato, e su un dispositivo condiviso il testo di chi è passato prima
       resta nel documento fino al ricaricamento. */
    if (resetEmail) resetEmail.textContent = '';
    if (btnReset) btnReset.disabled = false;
    if (resetSpinner) resetSpinner.hidden = true;
  }

  async function chiediReset() {
    if (!btnReset || !dati.email) return;
    btnReset.disabled = true;
    if (resetSpinner) resetSpinner.hidden = false;

    var esito = null;
    try {
      var taglia = new AbortController();
      var orologio = setTimeout(function () {
        taglia.abort();
      }, 10000);
      var r = await fetch(WEBHOOK_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dati.email,
          pagina: dati.pagina,
          origine: 'contattaci-reset',
          vid: vid(),
          sid: sid(),
        }),
        signal: taglia.signal,
      });
      clearTimeout(orologio);
      esito = await r.json();
    } catch (e) {
      esito = null;
    }

    if (resetSpinner) resetSpinner.hidden = true;

    if (esito && esito.esito === 'inviata') {
      if (resetEmail) resetEmail.textContent = dati.email;
      if (resetRiga) resetRiga.hidden = true;
      if (resetFatto) resetFatto.hidden = false;
      return;
    }

    /* Qualunque altra cosa — `errore`, `email_non_valida`, risposta
       illeggibile, timeout, rete giù — per chi guarda è la stessa: la mail non
       è partita. Si va sulla pagina del portale che chiede il reset.

       Il pulsante torna premibile **prima** di andare: se la scheda si apre,
       questo pannello resta dietro intatto invece di mostrare uno spinner
       fermo a chi ci ritorna. La scheda nuova può essere bloccata — siamo dopo
       un `await`, quindi fuori dal gesto dell'utente — e allora si naviga
       nella stessa. */
    btnReset.disabled = false;
    var scheda = null;
    try {
      scheda = window.open(PORTALE.reset, '_blank', 'noopener');
    } catch (e) {
      scheda = null;
    }
    if (!scheda) window.location.href = PORTALE.reset;
  }

  if (btnReset) btnReset.addEventListener('click', chiediReset);

  // ── L'invio ───────────────────────────────────────────────────────────────
  function payload(extra) {
    var base = {
      tipo: 'contatto',
      /** Quale ramo del form: `adulti`, `baby` o `junior`. */
      flow: dati.ramo,
      /**
       * `assistenza` se il nucleo ha un abbonamento vivo, `informazioni` per
       * tutti gli altri.
       *
       * n8n **non si fida di questo campo e lo ricalcola** da `statoNucleo`, e
       * non è sfiducia nel browser: la verifica dell'email può essere di dieci
       * minuti prima, il pannello può essere rimasto aperto, e la
       * classificazione che finisce nell'oggetto di un'email al desk e in una
       * colonna di Airtable deve nascere dal dato e non da uno stato di
       * interfaccia. Qui serve perché è quello che la **persona ha visto**, e
       * le due cose vanno confrontate quando divergono.
       */
      tipoRichiesta: tipoRichiesta(),
      contrattiVivi: dati.contrattiVivi,
      /**
       * L'indirizzo assoluto della pagina con le istruzioni di iscrizione,
       * per il ramo di questa richiesta.
       *
       * Lo manda il sito e non lo scrive n8n, ed è la scelta che evita la
       * divergenza: il giorno che quella scheda si sposta, il redirect e
       * questo campo cambiano insieme in un commit solo, mentre un percorso
       * scritto dentro un template su n8n resterebbe indietro senza dare
       * errore — un'email con un link morto non fallisce, arriva.
       *
       * Assoluto perché finisce in un'email: `SITE` porta il dominio giusto
       * anche da un deploy di anteprima. Vuoto per il ramo adulti, che non ha
       * una pagina di istruzioni e non riceve questa email.
       */
      istruzioniUrl: ISTRUZIONI[dati.ramo] ? SITE + ISTRUZIONI[dati.ramo] : '',
      macro: dati.macro,
      gruppoAttivita: dati.gruppo,
      attivita: dati.attivita,
      richiesta: dati.richiesta,
      email: dati.email,
      userNumber: dati.userNumber || '',
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
      sid: sid(),
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
      /* **E una richiesta di assistenza non è un lead**, quindi non manda
         `lead_submit`: chi ha un abbonamento vivo è già cliente, e contarlo
         fra le conversioni gonfia il numero con cui si giudicano le campagne —
         proprio col traffico che non viene da nessuna campagna. Il gesto si
         conta comunque, con un nome suo, così la distinzione esiste nel
         `dataLayer` invece di sparire. Il tag su GTM va aggiunto lì; qui il
         punto è che il conteggio dei lead resti vero da subito. */
      if (!extra || !extra.aggiornamento) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(
          abbonato()
            ? { event: 'assistenza_submit', lead_source: 'contatti' }
            : { event: 'lead_submit', lead_source: 'contatti' }
        );
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
  // Il calendario è quello del club: gli orari li serve il pannello, che è
  // l'unico posto che sa cosa c'è già in agenda, e l'appuntamento nasce lì
  // dentro. Prima era l'embed di Calendly, e la differenza non è estetica —
  // giorno, ora e testo della richiesta finivano in un servizio terzo e non
  // tornavano più indietro, mentre adesso il desk apre l'agenda e li trova.
  //
  // Il come — orari veri al caricamento, campo dell'argomento, presa dello
  // slot, le due email — sta in `appuntamentoInline.client.js`, condiviso con
  // il form della prova e con la chat. Qui resta solo cosa prenota questo
  // form: con quali dati, con quale argomento già scritto e cosa fare quando
  // è fissato.

  var calendario = null;

  async function apriCalendario() {
    if (calendario) calendario.distruggi();
    calendario = await montaAppuntamento({
      riquadro: q('[data-cf-calendario]'),
      prefill: {
        email: dati.email,
        nome: dati.nome,
        cognome: dati.cognome,
        telefono: dati.cellulare,
        privacy: dati.privacy,
        marketing: dati.marketing,
      },
      /* L'argomento arriva già scritto: è la richiesta che la persona ha
         appena lasciato qualche schermata fa. Il campo resta modificabile —
         chi ha scritto tre righe di problema può volerne mettere una di
         riassunto per la telefonata — ma partire dal vuoto qui vorrebbe dire
         far riscrivere a mano una cosa già detta, che è l'attrito per cui
         questo passo si abbandona. */
      oggetto: dati.richiesta || '',
      invito:
        'È quello che abbiamo letto nella tua richiesta. Correggilo pure: lo legge chi ti chiama, prima di comporre il numero.',
      contesto: {
        pagina: dati.pagina,
        origine: dati.origine || 'form-contatti',
        cta: dati.cta,
        /* Tutto il resto della conversazione va con l'appuntamento: il ramo,
           le attività scelte, lo stato su PerfectGym e l'id della richiesta
           già scritta. Nel pannello questa telefonata deve leggersi insieme a
           ciò che l'ha generata, non come una chiamata da nessun luogo. */
        extra: {
          ramo: dati.ramo,
          macro: dati.macro,
          attivita: dati.attivita,
          richiesta: dati.richiesta,
          richiestaId: dati.richiestaId,
          userNumber: dati.userNumber,
          stato: dati.statoPgm,
          statoNucleo: dati.statoNucleo,
          memberId: dati.memberId,
          memberType: dati.memberType,
          bambino: dati.bambino,
          attivitaOrigine: dati.attivitaOrigine,
        },
      },
      onPrenotato: function () {
        dati.richiamo = true;
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
    qa('[data-cf-iscrizioni]').forEach(function (el) {
      el.href = ISCRIZIONI;
    });
    /* **Il calendario non esiste per chi ha un abbonamento**, e il blocco si
       toglie dal documento invece di essere solo nascosto: `hidden` lo fa
       uscire anche dal giro del tab, che è la regola del sito per tutto quello
       che non deve essere raggiungibile.

       L'appuntamento telefonico serve a chi deve decidere se iscriversi. A un
       socio che segnala un problema offrirebbe un'attesa al posto di una
       risposta — e il pannello, che è la cosa che legge, direbbe due cose
       diverse: «richiesta presa in carico» e «scegli quando ti chiamiamo». */
    var cal = q('[data-cf-cal-blocco]');
    var conCalendario = variante !== 'assistenza';
    if (cal) cal.hidden = !conCalendario;

    // Il pannello si allarga prima di montare il calendario, così la griglia
    // degli orari misura la larghezza definitiva e non quella di mezzo
    // passaggio. Senza calendario non c'è niente da allargare, e una schermata
    // di tre righe larga il doppio sembra un errore di caricamento.
    root.classList.toggle('cf--largo', conCalendario);
    mostraStep('esito');
    if (conCalendario) apriCalendario();
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

  var btnInviaAssistenza = q('[data-cf-invia-assistenza]');
  if (btnInviaAssistenza) btnInviaAssistenza.addEventListener('click', inviaAssistenza);

  var btnAvantiBambino = q('[data-cf-avanti-bambino]');
  if (btnAvantiBambino) btnAvantiBambino.addEventListener('click', avantiBambino);

  var btnInviaGenitore = q('[data-cf-invia-genitore]');
  if (btnInviaGenitore) btnInviaGenitore.addEventListener('click', inviaGenitore);

  /* «cambia» rinuncia alla preselezione: da qui in poi i passi tornano tre, e
     il contatore lo dice. Non salta a `mostraStep('macro')` — e prima lo
     faceva, saltando anche `verifica()`: chi cambiava attività proseguiva
     senza email né stato PGM, e il resto del flusso (precompilazione, wiki
     dell'anagrafica, statoPgm nel payload) restava vuoto per l'intera
     richiesta. Il pulsante compare solo sul passo email (`cf-step-email`),
     quindi restarci — e lasciare che sia `verifica()` a portare al passo
     macro una volta verificata l'email, come nel percorso senza contesto —
     è tutto quello che serve. */
  var btnCambia = q('[data-cf-contesto-cambia]');
  if (btnCambia) {
    btnCambia.addEventListener('click', function () {
      dati.macroDaCta = '';
      numeraPassi();
      mostraContesto();
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
    /* L'esito del reset non è un campo, quindi il giro qui sopra non lo
       tocca: è un indirizzo email scritto in `textContent`, cioè esattamente
       il dato che sul totem non deve arrivare alla persona dopo. */
    resetPulito();
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

      /* UserNumber prima dell'email: chi arriva da un link di newsletter è
         già una persona nota, e non deve nemmeno vedere il campo. */
      var numeroGiaNoto = userNumberConosciuto();
      if (numeroGiaNoto) {
        verifica(numeroGiaNoto);
        return;
      }

      /* Un'email già nota — dall'URL o ricordata da un altro form — salta il
         passo, non solo lo precompila: chi l'ha già data una volta non deve
         scriverla una seconda volta. `pulisci()` qui sopra ha già riportato
         tutto al passo 'email'. */
      var emailGiaNota = emailConosciuta();
      if (emailGiaNota && campoEmail) {
        campoEmail.value = emailGiaNota;
        verifica();
      }
    },
    reset: function () {
      pulisci();
      mostraStep('email', true);
      onReset();
    },
  };
}
