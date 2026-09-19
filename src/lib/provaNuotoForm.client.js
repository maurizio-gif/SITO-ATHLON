// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// La logica del modulo «Richiedi la prova di inserimento». Vive qui e non
// dentro il componente per la stessa ragione degli altri moduli del sito: il
// giorno in cui servirà una versione incorporata in pagina — in fondo a
// /pallanuoto, per dire — le due copie divergerebbero al primo bug corretto in
// una sola delle due.
//
// Il percorso e la regola che lo decide:
//
//   categoria → requisiti ─┬ tutti sì → giorno → dati → prenotata
//                          └ un no    → scuola nuoto, e finisce qui
//
// Il questionario sta **prima** del calendario. Chi non è al livello non deve
// arrivare a scegliere un giorno: vedere le date e poi sentirsi dire «non sei
// idoneo» è la sequenza che fa arrabbiare, sentirselo dire prima con
// l'indicazione del corso giusto è un'informazione utile.
//
// Un solo «no» chiude il ramo. Le domande restano tutte visitabili all'indietro
// — «torna alle domande» dal ramo chiuso — perché il caso del genitore che ha
// capito male una parola da piscina esiste, e non deve costargli la riapertura
// del modulo da zero.

import {
  API_PRENOTA,
  API_SESSIONI,
  notaCertificato,
  WEBHOOK_ANAGRAFICA,
  WEBHOOK_PROVA_NUOTO,
  WEBHOOK_VERIFICA,
  categorieDi,
  categoriaProva,
} from '../data/proveNuoto';
import { anagraficaNota, servonoISuoiDati } from '../data/contatto';
import { validaTelefono } from '../data/prefissi';
import { leggi as emailConosciuta } from '../scripts/emailNota';

export function initProvaNuotoForm(root, options) {
  var P = options.prefix;

  var ERR = {
    email: 'Controlla l’indirizzo email: manca qualcosa.',
    atleta: 'Serve il nome di chi fa la prova.',
    nome: 'Serve il tuo nome.',
    cognome: 'Serve il tuo cognome.',
    telefono: 'Controlla il numero: è quello su cui ti chiamiamo.',
    privacy: 'Serve il consenso al trattamento dei dati per poter prenotare la prova.',
    giorno: 'Scegli un giorno.',
    giornoPreso: 'Quel giorno è appena stato preso. Scegline un altro.',
    nascitaAtleta: 'Serve la data di nascita di chi fa la prova.',
    nascitaGenitore: 'Serve anche la tua data di nascita: la scheda va creata adesso.',
    futuro: 'La data di nascita non può essere nel futuro.',
    eta: 'Quell’anno di nascita non è nella fascia di questo gruppo.',
    date: 'Non riusciamo a leggere le date disponibili. Riprova fra poco.',
    invio: 'Non siamo riusciti a registrare la prova. Riprova tra poco.',
  };

  function stato() {
    return {
      categoria: '',
      /* Le risposte nell'ordine delle domande: [{ id, domanda, risposta }]. È
         esattamente ciò che finisce nella riga del pannello, ed è il documento
         su cui l'allenatore decide se scendere in vasca. */
      requisiti: [],
      indice: 0,
      data: '',
      atletaNome: '',
      atletaCognome: '',
      atletaNascita: '',
      nome: '',
      cognome: '',
      genitoreNascita: '',
      email: '',
      cellulare: '',
      /* Quello che la verifica ha detto di questa email. `memberId` è il
         cardine: con lui su PerfectGym si crea **solo** il figlio, sotto il
         genitore che già esiste; senza, va creato anche il genitore — ed è per
         questo che la sua data di nascita si chiede solo in quel caso. */
      statoPgm: 'nuovo',
      statoNucleo: '',
      memberId: '',
      memberType: '',
      userNumber: '',
      conosciuto: false,
      privacy: false,
      marketing: false,
      pagina: '',
      attivita: '',
      origine: '',
      cta: '',
    };
  }
  var dati = stato();
  var giorni = [];

  // ── Attribuzione ──────────────────────────────────────────────────────────
  // Da `scripts/attribuzione.ts`, caricato dal Layout. Se non ci fossero, il
  // payload parte senza attribuzione invece di non partire.
  function utm() {
    return window.athlonGetUtm ? window.athlonGetUtm() : {};
  }
  function vid() {
    return window.athlonGetVid ? window.athlonGetVid() : null;
  }
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
    categoria: q('#' + P + '-step-categoria'),
    requisiti: q('#' + P + '-step-requisiti'),
    stop: q('#' + P + '-step-stop'),
    quando: q('#' + P + '-step-quando'),
    email: q('#' + P + '-step-email'),
    dati: q('#' + P + '-step-dati'),
    esito: q('#' + P + '-step-esito'),
  };
  var elencoCategorie = q('[data-pn-categorie]');
  var elencoGiorni = q('[data-pn-giorni]');
  var campoAtletaNome = q('#' + P + '-atleta-nome');
  var campoAtletaCognome = q('#' + P + '-atleta-cognome');
  var campoAtletaNascita = q('#' + P + '-atleta-nascita');
  var campoNome = q('#' + P + '-nome');
  var campoCognome = q('#' + P + '-cognome');
  var campoGenitoreNascita = q('#' + P + '-genitore-nascita');
  var campoEmail = q('#' + P + '-email');
  var campoCellulare = q('#' + P + '-cellulare');
  var campoPrivacy = q('#' + P + '-privacy');
  var campoMarketing = q('#' + P + '-marketing');

  // ── Schermate, errori, attese ─────────────────────────────────────────────
  function mostraStep(nome) {
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== nome;
    });
    var fuoco = steps[nome] && steps[nome].querySelector('[data-pn-fuoco]');
    if (fuoco) fuoco.focus();
    /* Il pannello torna in cima ad ogni passo: senza, chi arriva in fondo alla
       schermata dei dati apre quella dopo già scrollato a metà. */
    var pannello = root.querySelector('.pn__panel');
    if (pannello) pannello.scrollTop = 0;
  }

  function mostraErrore(step, messaggio) {
    var p = step && step.querySelector('[data-pn-errore]');
    if (!p) return;
    p.textContent = messaggio;
    p.hidden = false;
  }
  function pulisciErrore(step) {
    var p = step && step.querySelector('[data-pn-errore]');
    if (!p) return;
    p.textContent = '';
    p.hidden = true;
  }
  function segnala(campo) {
    if (campo) campo.classList.add('pn__input--errore');
  }
  function togliSegno(campo) {
    if (campo) campo.classList.remove('pn__input--errore');
  }
  function attesa(bottone, attiva) {
    if (!bottone) return;
    bottone.classList.toggle('is-attesa', attiva);
    bottone.disabled = attiva;
  }

  function emailValida(v) {
    return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(String(v).trim());
  }
  function telefonoDa(campo) {
    var pref = q('#' + P + '-cellulare-prefisso');
    return validaTelefono(pref ? pref.value : '+39', campo ? campo.value : '');
  }

  // ── 1. La categoria ───────────────────────────────────────────────────────

  function disegnaCategorie() {
    var categorie = categorieDi(dati.attivita);
    elencoCategorie.innerHTML = '';
    categorie.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pn__scelta-btn';
      b.innerHTML =
        '<span class="pn__scelta-nome">' + c.nome + '</span>' +
        '<span class="pn__scelta-annate">' + c.annate + '</span>' +
        '<span class="pn__scelta-quando">Prove: ' + c.quando + '</span>';
      b.addEventListener('click', function () {
        scegliCategoria(c.chiave);
      });
      elencoCategorie.appendChild(b);
    });
  }

  /* La frase sul certificato compare in due punti — la scelta del giorno e la
     conferma — e la scrive la categoria, perché il tipo di certificato è suo.
     Si riempiono entrambe alla scelta del corso: sono la stessa frase, e
     riempirle in due momenti diversi è il modo di farle divergere. */
  function scriviCertificato() {
    var c = categoriaProva(dati.categoria);
    qa('[data-pn-certificato]').forEach(function (el) {
      el.textContent = c ? notaCertificato(c) : '';
    });
  }

  function scegliCategoria(chiave) {
    dati.categoria = chiave;
    dati.requisiti = [];
    dati.indice = 0;
    dati.data = '';
    scriviCertificato();
    mostraDomanda();
  }

  // ── 2. I requisiti ────────────────────────────────────────────────────────

  function requisitiDellaCategoria() {
    var c = categoriaProva(dati.categoria);
    return c ? c.requisiti : [];
  }

  function mostraDomanda() {
    var elenco = requisitiDellaCategoria();
    if (dati.indice >= elenco.length) {
      // Finite le domande, e tutte con un sì: il «no» avrebbe già dirottato.
      vaiAlleDate();
      return;
    }
    var r = elenco[dati.indice];
    q('[data-pn-passo]').textContent = 'Domanda ' + (dati.indice + 1) + ' di ' + elenco.length;
    q('[data-pn-domanda]').textContent = r.domanda;
    var aiuto = q('[data-pn-aiuto]');
    aiuto.textContent = r.aiuto || '';
    aiuto.hidden = !r.aiuto;
    /* Il ritorno alla domanda precedente c'è solo se una precedente esiste:
       sulla prima porterebbe alla scelta della categoria, che ha già il suo
       posto nel percorso. */
    var indietro = q('[data-pn-indietro-requisito]');
    if (indietro) indietro.hidden = dati.indice === 0;
    mostraStep('requisiti');
  }

  function rispondi(affermativa) {
    var elenco = requisitiDellaCategoria();
    var r = elenco[dati.indice];
    if (!r) return;

    /* Si sovrascrive invece di accodare: tornando indietro e rispondendo di
       nuovo, la risposta di prima non deve restare in coda — nel pannello si
       leggerebbero due volte la stessa domanda con esiti opposti. */
    dati.requisiti[dati.indice] = { id: r.id, domanda: r.domanda, risposta: affermativa };

    if (!affermativa) {
      fermati(r);
      return;
    }
    dati.indice += 1;
    mostraDomanda();
  }

  // ── 3. Non è il momento della prova ───────────────────────────────────────

  function fermati(requisito) {
    /* Si nomina la prova che manca, e non «non hai i requisiti»: un genitore
       che legge «riesce a nuotare 25 metri di fila?» sa cosa deve accadere
       prima di riprovare, mentre da un giudizio generico non sa niente. */
    var perche = q('[data-pn-stop-perche]');
    if (perche) {
      perche.textContent =
        'Hai risposto «no» a una cosa che in questo gruppo si dà per acquisita: ' +
        requisito.domanda.charAt(0).toLowerCase() +
        requisito.domanda.slice(1, -1) +
        '.';
    }
    mostraStep('stop');
  }

  // ── 4. Il giorno ──────────────────────────────────────────────────────────

  /**
   * Le date si chiedono qui e non all'apertura del modulo: sono l'unica cosa
   * che invecchia mentre si risponde alle domande, e caricarle tardi vuol dire
   * mostrarle vere. Chi non arriva fin qui non paga la chiamata.
   */
  async function vaiAlleDate() {
    mostraStep('quando');
    var step = steps.quando;
    pulisciErrore(step);
    elencoGiorni.innerHTML = '<p class="pn__attesa">Cerco le date disponibili…</p>';
    aggiornaSceltaGiorno();

    var c = categoriaProva(dati.categoria);
    var lead = q('[data-pn-quando-lead]');
    if (lead && c) {
      lead.textContent =
        c.nome + ' · ' + c.quando + '. La prova si fa dentro l’allenamento del gruppo, e ogni giorno tiene due posti.';
    }

    try {
      var risposta = await fetch(API_SESSIONI + '?categoria=' + encodeURIComponent(dati.categoria), {
        headers: { Accept: 'application/json' },
      });
      if (!risposta.ok) throw new Error('sessioni');
      var body = await risposta.json();
      giorni = (body && body.giorni) || [];
    } catch (e) {
      elencoGiorni.innerHTML = '';
      mostraErrore(step, ERR.date);
      return;
    }

    if (giorni.length === 0) {
      elencoGiorni.innerHTML = '';
      mostraErrore(
        step,
        'Non ci sono più date libere per questo gruppo. Scrivici: se si libera un posto lo teniamo per te.'
      );
      return;
    }

    disegnaGiorni();
  }

  function disegnaGiorni() {
    elencoGiorni.innerHTML = '';
    giorni.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pn__giorno';
      b.dataset.pnGiorno = g.data;
      /* 'lunedì 7 settembre' → le tre parole separate: il nome del giorno, il
         numero grande, il mese piccolo. Il mese serve solo quando l'elenco
         scavalca ottobre, ma toglierlo lo renderebbe ambiguo proprio lì. */
      var parti = String(g.etichetta).split(' ');
      b.innerHTML =
        '<span class="pn__giorno-nome">' + parti[0] + '</span>' +
        '<span class="pn__giorno-num">' + (parti[1] || '') + '</span>' +
        '<span class="pn__giorno-mese">' + (parti[2] || '') + '</span>' +
        '<span class="pn__giorno-posti">' +
        (g.postiLiberi === 1 ? 'ultimo posto' : g.postiLiberi + ' posti') +
        '</span>';
      b.addEventListener('click', function () {
        dati.data = g.data;
        qa('[data-pn-giorno]').forEach(function (x) {
          x.classList.toggle('is-scelto', x === b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        aggiornaSceltaGiorno();
        pulisciErrore(steps.quando);
      });
      elencoGiorni.appendChild(b);
    });
  }

  function giornoScelto() {
    return giorni.filter(function (g) {
      return g.data === dati.data;
    })[0];
  }

  function aggiornaSceltaGiorno() {
    var avanti = q('[data-pn-avanti-quando]');
    if (avanti) avanti.disabled = !dati.data;
    var riassunto = q('[data-pn-scelta]');
    if (!riassunto) return;
    var g = giornoScelto();
    if (!g) {
      riassunto.textContent = '';
      riassunto.hidden = true;
      return;
    }
    riassunto.textContent = g.etichetta + ' alle ' + g.ora;
    riassunto.hidden = false;
  }

  // ── 5. L'email, e cosa PerfectGym sa già ──────────────────────────────────

  /**
   * Lo stesso passo della chat e del totem, e volutamente lo stesso codice
   * intorno: `anagraficaNota` e `servonoISuoiDati` decidono anche qui, perché
   * una regola come «i suoi dati ce li abbiamo» scritta in due posti a un certo
   * punto risponde in due modi.
   *
   * Se PerfectGym non risponde si prosegue come se non lo conoscessimo: i campi
   * si chiedono. È il verso giusto in cui sbagliare — una domanda in più costa
   * un campo, una in meno costa un'anagrafica senza nome.
   */
  async function verifica() {
    var step = steps.email;
    pulisciErrore(step);
    togliSegno(campoEmail);

    var email = String(campoEmail.value || '').trim();
    if (!emailValida(email)) {
      mostraErrore(step, ERR.email);
      segnala(campoEmail);
      return;
    }
    dati.email = email;
    /* Ricordata subito: chi apre una pagina del sito a metà modulo non deve
       ridigitarla, ed è la stessa memoria che gli altri moduli leggono. Dal
       `window` e non da un import, come fanno gli altri: la funzione che
       *scrive* la memoria è quella che `scripts/emailNota.ts` pubblica, e
       rispetta il consenso e il totem. */
    if (window.athlonRicordaEmail) window.athlonRicordaEmail(email);

    var bottone = q('[data-pn-verifica]');
    attesa(bottone, true);

    var esito = null;
    try {
      var risposta = await fetch(WEBHOOK_VERIFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      });
      esito = await risposta.json();
    } catch (e) {
      esito = null;
    }

    attesa(bottone, false);

    dati.statoPgm = (esito && esito.stato) || 'errore';
    /* `statoNucleo` è la domanda «questo nucleo è di casa?», e risponde anche
       per un genitore senza contratto suo ma con un figlio iscritto. Se
       rispondesse una versione più vecchia del workflow il campo non c'è, e si
       ricade su `stato`. */
    dati.statoNucleo = (esito && esito.statoNucleo) || dati.statoPgm;
    dati.memberId = (esito && esito.memberId) || '';
    dati.memberType = (esito && esito.memberType) || '';
    dati.userNumber = (esito && esito.number) || '';
    dati.conosciuto = anagraficaNota({ stato: dati.statoPgm, statoNucleo: dati.statoNucleo });

    /* I campi si riempiono, non si saltano: restano visibili e modificabili.
       Un nome sbagliato in anagrafica lo correggiamo qui, e non dopo la prova. */
    if (esito) {
      if (esito.nome && !campoNome.value) campoNome.value = esito.nome;
      if (esito.cognome && !campoCognome.value) campoCognome.value = esito.cognome;
      if (esito.telefono && !campoCellulare.value) campoCellulare.value = esito.telefono;
    }

    var riga = q('[data-pn-riconosciuto]');
    if (riga) {
      var noti = !serveGenitore();
      riga.textContent = noti
        ? 'Ti abbiamo riconosciuto: controlla che sia tutto giusto e correggi quello che serve.'
        : '';
      riga.hidden = !noti;
    }

    /* La data di nascita del genitore compare solo se la sua scheda va creata
       adesso: con un `memberId` si crea soltanto il figlio, sotto di lui. */
    var blocco = q('[data-pn-genitore-nascita]');
    if (blocco) blocco.hidden = !!dati.memberId;

    mostraStep('dati');
  }

  /**
   * Se i dati del genitore vanno chiesti, o se li abbiamo già tutti e tre.
   *
   * Non è la negazione di «lo conosciamo»: un'anagrafica può essere nata da un
   * modulo che chiedeva solo l'email, o portare un fisso al posto di un
   * cellulare. Basta che ne manchi uno perché il blocco torni intero.
   */
  function serveGenitore() {
    return servonoISuoiDati({
      nota: dati.conosciuto,
      id: dati.memberId,
      nome: String(campoNome.value || '') || dati.nome,
      cognome: String(campoCognome.value || '') || dati.cognome,
      telefono: String(campoCellulare.value || '') || dati.cellulare,
    });
  }

  // ── 6. I dati, e l'invio ──────────────────────────────────────────────────

  async function invia() {
    var step = steps.dati;
    pulisciErrore(step);
    [campoAtletaNome, campoAtletaCognome, campoNome, campoEmail, campoCellulare].forEach(togliSegno);

    dati.atletaNome = String(campoAtletaNome.value || '').trim();
    dati.atletaCognome = String(campoAtletaCognome.value || '').trim();
    dati.atletaNascita = String(campoAtletaNascita.value || '').trim();
    dati.nome = String(campoNome.value || '').trim();
    dati.cognome = String(campoCognome.value || '').trim();
    dati.genitoreNascita = String(campoGenitoreNascita ? campoGenitoreNascita.value || '' : '').trim();
    dati.privacy = !!(campoPrivacy && campoPrivacy.checked);
    dati.marketing = !!(campoMarketing && campoMarketing.checked);

    var oggi = new Date().toISOString().slice(0, 10);
    var c = categoriaProva(dati.categoria);

    if (!dati.atletaNome || !dati.atletaCognome) {
      mostraErrore(step, ERR.atleta);
      segnala(dati.atletaNome ? campoAtletaCognome : campoAtletaNome);
      return;
    }
    /* La data di nascita del minore è obbligatoria, e non per completezza: è
       con lei che la sua scheda nasce su PerfectGym, e senza non si può
       comporre il nucleo familiare. */
    if (!dati.atletaNascita) {
      mostraErrore(step, ERR.nascitaAtleta);
      segnala(campoAtletaNascita);
      return;
    }
    if (dati.atletaNascita > oggi) {
      mostraErrore(step, ERR.futuro);
      segnala(campoAtletaNascita);
      return;
    }
    /* L'età non è un dettaglio del corso, è il primo filtro — indipendente
       dai requisiti tecnici della schermata 2: un bambino può saper nuotare
       benissimo ed essere comunque fuori dalla fascia di quel gruppo. È lo
       stesso errore che la chat ha fatto due volte dicendo che il livello
       tecnico bastava a scavalcare l'anno di nascita: qui non si scopre alla
       fine, si blocca prima di occupare un posto che non tocca a lei. */
    if (c) {
      var anno = Number(dati.atletaNascita.slice(0, 4));
      if (anno < c.anni.da || anno > c.anni.a) {
        mostraErrore(
          step,
          c.nome + ' è per i nati fra il ' + c.anni.da + ' e il ' + c.anni.a +
            ': quell’anno di nascita non ci rientra. Torna indietro e scegli il gruppo giusto.'
        );
        segnala(campoAtletaNascita);
        return;
      }
    }
    if (!dati.nome) {
      mostraErrore(step, ERR.nome);
      segnala(campoNome);
      return;
    }
    if (!dati.cognome) {
      mostraErrore(step, ERR.cognome);
      segnala(campoCognome);
      return;
    }
    if (!emailValida(dati.email)) {
      /* Non dovrebbe capitare: l'email l'ha già validata il passo prima. Se
         succede si torna là, invece di segnalare un campo che qui non c'è. */
      mostraStep('email');
      mostraErrore(steps.email, ERR.email);
      return;
    }
    var tel = telefonoDa(campoCellulare);
    if (!tel.ok) {
      /* Il messaggio arriva da `validaTelefono`, non da ERR: quella funzione sa
         *perche'* il numero non va — fisso invece di cellulare, cifre in
         sequenza, troppo corto — e un generico «controlla il numero» al suo
         posto farebbe ricontrollare a caso un numero magari giusto tranne il
         prefisso. ERR.telefono resta il ripiego se un giorno non lo dicesse. */
      mostraErrore(step, tel.motivo || ERR.telefono);
      segnala(campoCellulare);
      return;
    }
    dati.cellulare = tel.e164;
    /* La tua data di nascita, ma solo se la tua scheda va creata adesso: con un
       `memberId` il webhook dell'anagrafica crea soltanto il figlio, sotto di
       te, e quel campo non lo legge nessuno. Pretenderlo comunque butterebbe
       una richiesta buona per un dato che il modulo non ha nemmeno mostrato. */
    if (!dati.memberId) {
      if (!dati.genitoreNascita) {
        mostraErrore(step, ERR.nascitaGenitore);
        segnala(campoGenitoreNascita);
        return;
      }
      if (dati.genitoreNascita > oggi) {
        mostraErrore(step, ERR.futuro);
        segnala(campoGenitoreNascita);
        return;
      }
    }
    if (!dati.privacy) {
      mostraErrore(step, ERR.privacy);
      return;
    }
    if (!dati.data) {
      mostraStep('quando');
      mostraErrore(steps.quando, ERR.giorno);
      return;
    }

    var bottone = q('[data-pn-invia]');
    attesa(bottone, true);

    /* Prima il posto, che è la cosa contesa e che sono in due a potersi
       prendere, poi le email. Se le email non partono resta una prova in
       elenco con nome e telefono dentro, e il desk può chiamare; all'inverso
       resterebbe un genitore con la conferma di una prova che non esiste da
       nessuna parte. */
    var esito;
    try {
      var risposta = await fetch(API_PRENOTA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: dati.categoria,
          data: dati.data,
          email: dati.email,
          atleta: {
            nome: dati.atletaNome,
            cognome: dati.atletaCognome,
            dataNascita: dati.atletaNascita,
          },
          nome: dati.nome,
          cognome: dati.cognome,
          telefono: dati.cellulare,
          requisiti: dati.requisiti,
          /* Non serve a prenotare — la deduplica passa dall'email — e serve al
             pannello: è il punto da cui si apre il nucleo familiare e la scheda
             del ragazzo, dove dopo la prova si cambia il livello. */
          memberId: dati.memberId || null,
          privacy: dati.privacy,
          marketing: dati.marketing,
          pagina: dati.pagina,
          origine: dati.origine,
          cta: dati.cta,
          utm: utm(),
          vid: vid(),
          sid: sid(),
        }),
      });
      esito = await risposta.json();
      if (!risposta.ok) {
        attesa(bottone, false);
        if (esito && esito.sessionePiena) {
          // Il posto è sparito mentre compilava: si torna alla scelta con le
          // date ricaricate, non si lascia la persona davanti a un errore.
          await vaiAlleDate();
          mostraErrore(steps.quando, ERR.giornoPreso);
          return;
        }
        mostraErrore(step, (esito && esito.errore) || ERR.invio);
        return;
      }
    } catch (e) {
      attesa(bottone, false);
      mostraErrore(step, ERR.invio);
      return;
    }

    /* L'anagrafica e il nucleo familiare: **lo stesso webhook della chat**.
       Crea il genitore se non c'è, poi cerca il minore fra i `familyChildren`
       del suo `memberId` confrontando nome e cognome, e lo aggiunge al nucleo
       solo se non lo trova. Qui non si decide niente di tutto questo: si manda
       il payload che quel workflow si aspetta, con `ambito: 'junior'` — una
       prova di inserimento è per definizione un minore e il suo genitore.

       Se fallisce non si blocca: il posto in vasca è già occupato e la riga nel
       pannello porta nome, cognome e telefono, quindi la prova si fa comunque e
       l'anagrafica la sistema il desk. All'inverso — creare la scheda e non
       avere il posto — resterebbe una famiglia nuova su PerfectGym senza
       nessuna prova a cui presentarsi. */
    try {
      await fetch(WEBHOOK_ANAGRAFICA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambito: 'junior',
          /* Il ramo dice **come** parlargli, l'ambito **cosa** creare: un socio
             che porta suo figlio a una prova ha ramo `iscritto` e ambito
             `junior`, e sono due schede guest, non un lead. */
          ramo: dati.statoNucleo === 'iscritto' ? 'iscritto' : 'junior',
          attivita: [],
          attivitaJunior: c ? c.attivita : '',
          email: dati.email,
          memberId: dati.memberId || null,
          userNumber: dati.userNumber || null,
          statoPgm: dati.statoPgm,
          statoNucleo: dati.statoNucleo,
          pagina: dati.pagina,
          genitore: {
            nome: dati.nome,
            cognome: dati.cognome,
            cellulare: dati.cellulare,
            /* Vuota quando la scheda del genitore esiste già: il workflow la
               pretende solo se deve crearla, ed è la stessa regola per cui il
               campo non gli è stato mostrato. */
            nascita: dati.genitoreNascita,
          },
          bambino: {
            nome: dati.atletaNome,
            cognome: dati.atletaCognome,
            nascita: dati.atletaNascita,
          },
          consenso: dati.privacy,
          utm: utm(),
          vid: vid(),
          sid: sid(),
        }),
      });
    } catch (e) {
      /* Vedi sopra: la prova è già prenotata, e vale più della scheda. */
    }

    /* Le tre email — conferma al genitore, avviso a desk@ e a nuoto@ — le
       compone n8n, come per tutti gli altri moduli. Anche qui, se fallisce la
       prova resta prenotata. */
    var g = giornoScelto();
    try {
      await fetch(WEBHOOK_PROVA_NUOTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'prova_nuoto',
          provaId: esito && esito.id,
          categoria: dati.categoria,
          categoriaNome: c ? c.nome : dati.categoria,
          attivita: c ? c.attivita : '',
          certificato: c ? c.certificato : '',
          data: dati.data,
          dataEtichetta: g ? g.etichetta : dati.data,
          ora: esito && esito.ora,
          durataMinuti: esito && esito.durataMinuti,
          atleta: {
            nome: dati.atletaNome,
            cognome: dati.atletaCognome,
            dataNascita: dati.atletaNascita,
          },
          requisiti: dati.requisiti,
          nome: dati.nome,
          cognome: dati.cognome,
          email: dati.email,
          cellulare: dati.cellulare,
          telefono: dati.cellulare,
          privacy: dati.privacy,
          marketing: dati.marketing,
          memberId: dati.memberId,
          statoPgm: dati.statoPgm,
          statoNucleo: dati.statoNucleo,
          pagina: dati.pagina,
          origine: dati.origine,
          cta: dati.cta,
          utm: utm(),
          vid: vid(),
          sid: sid(),
        }),
      });
    } catch (e) {
      /* Vedi sopra: la prova è già prenotata, e vale più dell'email. */
    }

    attesa(bottone, false);

    if (window.dataLayer) {
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'prova_nuoto' });
    }

    var riepilogo = q('[data-pn-riepilogo]');
    if (riepilogo) {
      riepilogo.textContent =
        (c ? c.nome + ' · ' : '') + (g ? g.etichetta + ' alle ' + g.ora : dati.data);
    }
    mostraStep('esito');
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  /* Si svuota sia in chiusura sia in apertura, e non è ridondanza: il sito gira
     anche sul totem all'ingresso del club, e i dati di un visitatore non devono
     restare visibili al successivo. */
  function pulisci() {
    dati = stato();
    giorni = [];
    [
      campoAtletaNome,
      campoAtletaCognome,
      campoAtletaNascita,
      campoNome,
      campoCognome,
      campoGenitoreNascita,
      campoEmail,
      campoCellulare,
    ].forEach(function (c) {
      if (c) {
        c.value = '';
        togliSegno(c);
      }
    });
    [campoPrivacy, campoMarketing].forEach(function (c) {
      if (c) c.checked = false;
    });
    if (elencoGiorni) elencoGiorni.innerHTML = '';
    var riga = q('[data-pn-riconosciuto]');
    if (riga) {
      riga.textContent = '';
      riga.hidden = true;
    }
    /* La data di nascita del genitore riparte nascosta: la mostra la verifica
       quando scopre che la sua scheda va creata. */
    var blocco = q('[data-pn-genitore-nascita]');
    if (blocco) blocco.hidden = true;
    aggiornaSceltaGiorno();
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) pulisciErrore(steps[k]);
    });
    mostraStep('categoria');
  }

  // ── Aggancio ──────────────────────────────────────────────────────────────
  qa('[data-pn-risposta]').forEach(function (b) {
    b.addEventListener('click', function () {
      rispondi(b.dataset.pnRisposta === 'si');
    });
  });

  var bIndietroReq = q('[data-pn-indietro-requisito]');
  if (bIndietroReq) {
    bIndietroReq.addEventListener('click', function () {
      if (dati.indice > 0) dati.indice -= 1;
      mostraDomanda();
    });
  }

  var bRiprova = q('[data-pn-riprova]');
  if (bRiprova) {
    bRiprova.addEventListener('click', function () {
      /* Si torna alla domanda che ha chiuso il ramo, non alla prima: il dubbio
         è su quella, e rifare tutte le precedenti sarebbe la punizione per
         aver riletto. */
      mostraDomanda();
    });
  }

  var bAvanti = q('[data-pn-avanti-quando]');
  if (bAvanti) bAvanti.addEventListener('click', function () { mostraStep('email'); });

  var bVerifica = q('[data-pn-verifica]');
  if (bVerifica) bVerifica.addEventListener('click', verifica);

  var bInvia = q('[data-pn-invia]');
  if (bInvia) bInvia.addEventListener('click', invia);

  qa('[data-pn-indietro]').forEach(function (b) {
    b.addEventListener('click', function () {
      var dove = b.dataset.pnIndietro;
      if (dove === 'categoria') {
        /* Indietro dalle date porta alla categoria e non all'ultima domanda:
           chi torna da lì di solito ha sbagliato gruppo, non risposta. Le
           risposte si azzerano, perché i requisiti dell'altro gruppo sono
           altri. */
        dati.requisiti = [];
        dati.indice = 0;
        dati.data = '';
        mostraStep('categoria');
        return;
      }
      mostraStep(dove);
    });
  });

  // Invio da tastiera sui campi di testo: su un modulo a passi, premere Invio
  // deve fare la stessa cosa del pulsante che si ha davanti.
  [
    [campoEmail, verifica],
    [campoAtletaNome, invia],
    [campoAtletaCognome, invia],
    [campoNome, invia],
    [campoCognome, invia],
    [campoCellulare, invia],
  ].forEach(function (coppia) {
    if (!coppia[0]) return;
    coppia[0].addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        coppia[1]();
      }
    });
  });

  return {
    apri: function (contesto) {
      pulisci();
      dati.pagina = (contesto && contesto.pagina) || location.pathname;
      dati.attivita = (contesto && contesto.attivita) || '';
      dati.origine = (contesto && contesto.origine) || '';
      dati.cta = (contesto && contesto.cta) || '';
      disegnaCategorie();
      /* Se l'email è già nota da un altro modulo si riempie il campo, ma non si
         verifica e non si salta niente: qui il primo passo è la categoria, e
         l'indirizzo serve dopo il giorno. Chi arriva a quel passo lo trova
         scritto e preme «Continua» — la verifica parte da lì. */
      var nota = emailConosciuta();
      if (nota && campoEmail) campoEmail.value = nota;
    },
    chiudi: pulisci,
  };
}
