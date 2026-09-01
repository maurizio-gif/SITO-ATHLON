// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// Il calendario del club dentro una pagina, al posto dell'embed di Calendly.
//
// È il gemello incorporabile di `appuntamentoForm.client.js`: quello è il
// percorso completo — email, dati, quando, di cosa — per chi arriva da una CTA
// e non ha ancora lasciato niente; questo è solo l'ultimo pezzo, per i tre
// posti in cui la persona **ha già compilato tutto** e manca soltanto il
// quando. Il form dei contatti, quello della prova e l'assistente in chat
// sanno già nome, email e cellulare: richiederli sarebbe la domanda che fa
// chiudere la pagina.
//
// Sostituisce `montaCalendario` di `calendario.client.js` uno a uno, e la
// differenza che conta non è estetica:
//
//   - **gli orari sono veri.** Si chiedono al pannello al momento in cui il
//     riquadro si apre, e il pannello è l'unico posto che sa cosa c'è già in
//     agenda: un tour messo a mano dal desk toglie lo slot subito.
//   - **la prenotazione torna indietro.** Con Calendly giorno, ora e contesto
//     finivano in un servizio terzo; qui nascono dentro l'agenda, con
//     l'oggetto della chiamata nel campo del briefing.
//   - **non c'è uno script di terzi.** Nessun dominio esterno, quindi niente
//     da bloccare: il calendario compare anche a chi non ha accettato i
//     cookie. Era il caso per cui `calendario.client.js` teneva un ripiego con
//     il link «apri in una scheda nuova», e adesso quel caso non esiste.
//
// Chi lo monta passa il precompilato e il contesto; questo file non sa niente
// del form da cui arriva, e non deve.

import { API_PRENOTA, API_SLOT, WEBHOOK_APPUNTAMENTO, WEBHOOK_EMAIL_APPUNTAMENTO } from '../data/appuntamento';

var ERR = {
  orari: 'Non riusciamo a leggere gli orari disponibili. Riprova fra poco.',
  vuoti: 'Non ci sono orari liberi nei prossimi giorni. Scrivici e troviamo un momento.',
  slot: 'Scegli un giorno e un orario.',
  oggetto: 'Scrivi due parole sull’argomento: servono a chi ti chiama.',
  presa: 'Quell’orario è appena stato preso. Scegline un altro.',
  invio: 'Non siamo riusciti a registrare l’appuntamento. Riprova fra poco.',
};

/** L'attribuzione, se il Layout l'ha caricata. Senza, si parte lo stesso. */
function utm() {
  return window.athlonGetUtm ? window.athlonGetUtm() : {};
}
function vid() {
  return window.athlonGetVid ? window.athlonGetVid() : null;
}
function sid() {
  return window.athlonGetSid ? window.athlonGetSid() : null;
}

function el(tag, classe, testo) {
  var n = document.createElement(tag);
  if (classe) n.className = classe;
  if (testo != null) n.textContent = testo;
  return n;
}

/**
 * Monta il calendario dentro `riquadro` e restituisce `{ distruggi }`.
 *
 * @param {object} o
 * @param {HTMLElement} o.riquadro dove disegnare
 * @param {object} o.prefill `{ email, nome, cognome, telefono, privacy, marketing }`
 * @param {object} [o.contesto] pagina, origine, cta e tutto ciò che va nel CRM
 * @param {string} [o.oggetto] l'argomento già noto **nelle parole della
 *   persona**: la richiesta che ha scritto lei stessa qualche schermata fa.
 *   Riempie il campo, che resta modificabile — è testo suo, e deve poterlo
 *   correggere prima che parta. Non usare per un riassunto scritto da noi:
 *   per quello c'è `contestoNascosto`.
 * @param {string} [o.contestoNascosto] il briefing per chi chiama, quando
 *   **non** è nelle parole della persona — il riassunto della conversazione
 *   con l'assistente, per dire. Arriva comunque a chi chiama, in coda
 *   all'oggetto della voce d'agenda, ma non entra mai nel campo: mostrarglielo
 *   come se l'avesse scritto lei significherebbe farglielo correggere (o
 *   cancellare) come fosse un testo suo, quando è un nostro riassunto. Con
 *   questo presente il campo visibile diventa facoltativo: quello che la
 *   persona ci scrive si aggiunge al contesto, non lo sostituisce.
 * @param {string} [o.invito] la riga sopra il campo dell'argomento
 * @param {function} [o.onPrenotato] chiamata con l'esito quando è fatta
 */
export async function montaAppuntamento(o) {
  var riquadro = o.riquadro;
  if (!riquadro) return { distruggi: function () {} };

  var prefill = o.prefill || {};
  var contesto = o.contesto || {};
  var vivo = true;

  var giorni = [];
  var scelta = { data: '', ora: '' };

  riquadro.innerHTML = '';
  riquadro.classList.add('apx');

  var elencoGiorni = el('div', 'ap__giorni');
  elencoGiorni.setAttribute('role', 'group');
  elencoGiorni.setAttribute('aria-label', 'Scegli il giorno');
  var elencoOrari = el('div', 'apx__orari-blocco');
  var riassunto = el('p', 'apx__scelta');
  riassunto.hidden = true;

  // Il campo dell'argomento sta **sotto** gli orari, e l'ordine è quello del
  // form completo: prima il quando, che è la cosa per cui la persona è qui e
  // che può sparire mentre esita — gli slot sono contesi — poi di cosa, a cui
  // si risponde volentieri una volta che l'orario è al sicuro.
  //
  // Quando c'è un `contestoNascosto` il campo non è più l'unica fonte
  // dell'argomento — lo è già il contesto — quindi diventa facoltativo, e lo
  // dicono sia l'etichetta sia il testo sopra.
  var haContesto = !!(o.contestoNascosto && String(o.contestoNascosto).trim());
  var etichetta = el('label', 'apx__label', 'Di cosa vuoi parlare?' + (haContesto ? ' (facoltativo)' : ''));
  var campoOggetto = el('textarea', 'ap__input ap__textarea');
  campoOggetto.rows = 3;
  campoOggetto.placeholder = haContesto
    ? 'Vuoi aggiungere qualcosa a quello che ci siamo già detti?'
    : 'Bastano poche parole: abbonamenti, scuola nuoto per un figlio, orari…';
  // Solo `o.oggetto` riempie il campo — è testo della persona. Il contesto
  // nascosto non ci finisce mai: vedi il commento di `montaAppuntamento`.
  campoOggetto.value = o.oggetto || '';
  var id = 'apx-oggetto-' + Math.random().toString(36).slice(2, 8);
  campoOggetto.id = id;
  etichetta.htmlFor = id;
  var aiuto = el(
    'p',
    'apx__aiuto',
    o.invito ||
      (haContesto
        ? 'Il contesto della conversazione arriva comunque a chi ti chiama: qui puoi aggiungere altro, se vuoi.'
        : 'Lo legge chi ti chiama, prima di comporre il numero. Puoi correggerlo.')
  );

  var errore = el('p', 'apx__errore');
  errore.hidden = true;

  var bottone = el('button', 'btn btn-primary apx__btn');
  bottone.type = 'button';
  var testoBottone = el('span', 'apx__btn-testo', 'Prenota la chiamata');
  var rotella = el('span', 'apx__spinner');
  rotella.setAttribute('aria-hidden', 'true');
  bottone.appendChild(testoBottone);
  bottone.appendChild(rotella);
  bottone.disabled = true;

  var fatto = el('div', 'apx__fatto');
  fatto.hidden = true;

  [elencoGiorni, elencoOrari, riassunto, etichetta, campoOggetto, aiuto, errore, bottone, fatto].forEach(
    function (n) {
      riquadro.appendChild(n);
    }
  );

  function mostraErrore(testo) {
    errore.textContent = testo;
    errore.hidden = false;
  }
  function pulisciErrore() {
    errore.textContent = '';
    errore.hidden = true;
  }
  function attesa(acceso) {
    bottone.disabled = acceso || !scelta.ora;
    bottone.classList.toggle('is-attesa', acceso);
  }

  // ── Gli orari ─────────────────────────────────────────────────────────────

  /**
   * Li chiede adesso, e li richiede ad ogni ricarica: la disponibilità è
   * l'unica cosa che invecchia mentre la persona guarda il riquadro, e un
   * orario offerto e non più libero si scopre altrimenti solo all'invio.
   */
  async function caricaOrari() {
    elencoGiorni.innerHTML = '';
    elencoGiorni.appendChild(el('p', 'ap__attesa', 'Cerco gli orari liberi…'));
    elencoOrari.innerHTML = '';
    scelta = { data: '', ora: '' };
    aggiornaScelta();

    try {
      var risposta = await fetch(API_SLOT, { headers: { Accept: 'application/json' } });
      if (!risposta.ok) throw new Error('slot');
      var body = await risposta.json();
      giorni = (body && body.giorni) || [];
    } catch (e) {
      if (!vivo) return;
      elencoGiorni.innerHTML = '';
      mostraErrore(ERR.orari);
      return;
    }
    if (!vivo) return;

    if (giorni.length === 0) {
      elencoGiorni.innerHTML = '';
      mostraErrore(ERR.vuoti);
      return;
    }
    disegnaGiorni();
    elencoOrari.innerHTML = '';
    elencoOrari.appendChild(el('p', 'ap__invito', 'Scegli un giorno per vedere gli orari liberi.'));
  }

  function disegnaGiorni() {
    elencoGiorni.innerHTML = '';
    giorni.forEach(function (g) {
      var b = el('button', 'ap__giorno');
      b.type = 'button';
      b.dataset.apxGiorno = g.data;
      var parti = String(g.etichetta).split(' ');
      b.appendChild(el('span', 'ap__giorno-nome', parti[0]));
      b.appendChild(el('span', 'ap__giorno-num', parti[1]));
      b.appendChild(el('span', 'ap__giorno-mese', parti[2] || ''));
      b.appendChild(el('span', 'ap__giorno-quanti', String(g.slot.length)));
      b.addEventListener('click', function () {
        apriGiorno(g.data);
      });
      elencoGiorni.appendChild(b);
    });
  }

  /* Mattina e pomeriggio separati: due dozzine di orari in fila sono un muro
     di numeri, due gruppi con il loro titolo si leggono a colpo d'occhio. È la
     stessa divisione del form completo, e non è una scelta grafica ripetuta
     per caso — è la stessa domanda, e deve avere la stessa forma. */
  function apriGiorno(data) {
    scelta = { data: '', ora: '' };
    aggiornaScelta();
    Array.prototype.forEach.call(elencoGiorni.querySelectorAll('[data-apx-giorno]'), function (b) {
      var attivo = b.dataset.apxGiorno === data;
      b.classList.toggle('is-scelto', attivo);
      b.setAttribute('aria-pressed', attivo ? 'true' : 'false');
    });

    var giorno = giorni.filter(function (g) {
      return g.data === data;
    })[0];
    elencoOrari.innerHTML = '';
    if (!giorno) return;

    [['mattina', 'Mattina'], ['pomeriggio', 'Pomeriggio']].forEach(function (coppia) {
      var orari = giorno.slot.filter(function (ora) {
        var mattina = Number(ora.slice(0, 2)) < 13;
        return coppia[0] === 'mattina' ? mattina : !mattina;
      });
      if (orari.length === 0) return;

      var gruppo = el('div', 'ap__fascia');
      gruppo.appendChild(el('h4', 'ap__fascia-titolo', coppia[1]));
      var griglia = el('div', 'ap__orari');
      orari.forEach(function (ora) {
        var b = el('button', 'ap__ora', ora);
        b.type = 'button';
        b.dataset.apxOra = ora;
        b.addEventListener('click', function () {
          scelta = { data: data, ora: ora };
          Array.prototype.forEach.call(elencoOrari.querySelectorAll('[data-apx-ora]'), function (x) {
            x.classList.toggle('is-scelto', x === b);
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
          pulisciErrore();
          aggiornaScelta();
        });
        griglia.appendChild(b);
      });
      gruppo.appendChild(griglia);
      elencoOrari.appendChild(gruppo);
    });
  }

  function etichettaScelta() {
    var giorno = giorni.filter(function (g) {
      return g.data === scelta.data;
    })[0];
    return (giorno ? giorno.etichetta : scelta.data) + ' alle ' + scelta.ora;
  }

  function aggiornaScelta() {
    bottone.disabled = !scelta.ora;
    if (!scelta.ora) {
      riassunto.textContent = '';
      riassunto.hidden = true;
      return;
    }
    riassunto.textContent = etichettaScelta();
    riassunto.hidden = false;
  }

  // ── La presa ──────────────────────────────────────────────────────────────

  /** Il corpo che va a n8n: uno solo, per tutti e due i webhook. */
  function payloadLead(oggetto, esito) {
    return {
      tipo: 'contatto',
      tipoRichiesta: 'appuntamento',
      richiesta: oggetto,
      richiamoTelefonico: true,
      appuntamento: {
        id: esito && esito.id,
        data: scelta.data,
        ora: scelta.ora,
        etichetta: etichettaScelta(),
        durataMinuti: esito && esito.durataMinuti,
        urlGestione: esito && esito.urlGestione,
      },
      email: prefill.email,
      nome: prefill.nome,
      cognome: prefill.cognome,
      cellulare: prefill.telefono,
      telefono: prefill.telefono,
      privacy: !!prefill.privacy,
      marketing: !!prefill.marketing,
      pagina: contesto.pagina || location.pathname,
      origine: contesto.origine || '',
      cta: contesto.cta || '',
      utm: utm(),
      vid: vid(),
      sid: sid(),
      ...(contesto.extra || {}),
    };
  }


  async function prenota() {
    pulisciErrore();
    if (!scelta.data || !scelta.ora) {
      mostraErrore(ERR.slot);
      return;
    }
    var scrittoDallaPersona = String(campoOggetto.value || '').trim();
    var contestoNascosto = String(o.contestoNascosto || '').trim();
    // Obbligatorio solo se non c'è già un contesto a monte: senza, l'oggetto
    // sarebbe vuoto e la telefonata partirebbe senza sapere di cosa parlare.
    // Con un contesto nascosto, il campo visibile aggiunge e non sostituisce
    // — può restare bianco.
    if (!scrittoDallaPersona && !contestoNascosto) {
      mostraErrore(ERR.oggetto);
      campoOggetto.focus();
      return;
    }
    // Quello che arriva a chi chiama: il contesto nascosto per primo, e
    // quanto la persona ha aggiunto — se ha aggiunto qualcosa — in coda,
    // marcato come suo così chi legge distingue le due fonti.
    var oggetto = contestoNascosto
      ? contestoNascosto + (scrittoDallaPersona ? '\n\nAggiunto dalla persona: ' + scrittoDallaPersona : '')
      : scrittoDallaPersona;

    attesa(true);

    /* Prima lo slot, poi il lead: l'ordine è quello del form completo e della
       rotta che riceve. Se il secondo passo non riesce resta un appuntamento
       con nome e telefono dentro, e il desk chiama comunque; al contrario
       sarebbe rimasta la promessa di una telefonata che non esiste in nessuna
       agenda. */
    var esito;
    try {
      var risposta = await fetch(API_PRENOTA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: scelta.data,
          ora: scelta.ora,
          email: prefill.email,
          nome: prefill.nome,
          cognome: prefill.cognome,
          telefono: prefill.telefono,
          oggetto: oggetto,
          privacy: !!prefill.privacy,
          marketing: !!prefill.marketing,
          // Da dove arriva: la pagina, il pulsante che ha aperto il riquadro e
          // l'attribuzione. Finiscono nel `payload` della voce d'agenda, che è
          // quello che il pannello legge per sapere da dove nasce la chiamata.
          pagina: contesto.pagina || location.pathname,
          origine: contesto.origine || '',
          cta: contesto.cta || '',
          utm: utm(),
          vid: vid(),
          sid: sid(),
          ...(contesto.extra || {}),
        }),
      });
      esito = await risposta.json();
      if (!risposta.ok) {
        attesa(false);
        if (esito && esito.slotOccupato) {
          // L'orario è sparito mentre compilava: si ricaricano gli orari veri
          // invece di lasciarla davanti a un errore secco.
          await caricaOrari();
          mostraErrore(ERR.presa);
          return;
        }
        mostraErrore((esito && esito.errore) || ERR.invio);
        return;
      }
    } catch (e) {
      attesa(false);
      mostraErrore(ERR.invio);
      return;
    }

    /* Il lead e le email, e sono due chiamate perché sono due lavori: il primo
       webhook crea l'anagrafica su PerfectGym e conosce i rami del form, il
       secondo manda la conferma a chi ha prenotato e l'avviso al desk. Stesso
       corpo, così chi legge i log di n8n vede la stessa cosa da tutte e due le
       parti.

       `urlGestione` arriva dal pannello, che è l'unico che sa firmarlo, e
       diventa il pulsante «sposta o annulla» dentro la conferma.

       Se una delle due non riesce l'appuntamento resta: vale più della posta,
       e il desk lo vede in agenda comunque. */
    var corpo = JSON.stringify(payloadLead(oggetto, esito));
    [WEBHOOK_APPUNTAMENTO, WEBHOOK_EMAIL_APPUNTAMENTO].forEach(function (indirizzo) {
      fetch(indirizzo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
      }).catch(function () {
        /* Vedi sopra. */
      });
    });

    attesa(false);
    if (window.dataLayer) {
      window.dataLayer.push({ event: 'lead_submit', lead_source: 'appuntamento_telefonico' });
    }

    // Il riquadro diventa la conferma: lasciare il calendario aperto sotto un
    // «✓ fissato» invita a prenotarne un secondo per sbaglio.
    [elencoGiorni, elencoOrari, riassunto, etichetta, campoOggetto, aiuto, bottone].forEach(function (n) {
      n.hidden = true;
    });
    fatto.innerHTML = '';
    fatto.appendChild(el('p', 'apx__fatto-titolo', '✓ Ti chiamiamo noi ' + etichettaScelta().toLowerCase()));
    fatto.appendChild(
      el('p', 'apx__aiuto', 'Ti arriva l’email di conferma: da lì puoi spostare o annullare quando vuoi.')
    );
    fatto.hidden = false;

    if (o.onPrenotato) o.onPrenotato(esito || {});
  }

  bottone.addEventListener('click', prenota);

  await caricaOrari();

  return {
    distruggi: function () {
      vivo = false;
      riquadro.innerHTML = '';
      riquadro.classList.remove('apx');
    },
  };
}
