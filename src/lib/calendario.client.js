// @ts-nocheck — script di browser, DOM diretto e nessuna annotazione di tipo
//
// Il calendario di Calendly incorporato, per i tre posti del sito che lo usano:
// il form dei contatti, il form della prova e l'assistente in chat.
//
// Esiste perché la terza copia era il momento di fermarsi. La logica non è due
// righe: c'è il caricamento pigro dello script, il montaggio del widget, la
// conferma della prenotazione via `postMessage`, e **due** reti di sicurezza
// diverse che sono il vero motivo per cui questo file esiste — tre copie di
// quelle divergono al primo bug corretto in una sola.
//
// ── Le due reti di sicurezza, e perché sono due ──────────────────────────────
//
// La prima guarda lo **script**: se `window.Calendly` non compare, il widget
// non si monta e si mostra il link. Il caso che la fa scattare è il blocco
// automatico dei cookie — CookieYes ferma gli script di terzi finché non c'è
// consenso, e Calendly è fra quelli — oppure un blocco pubblicitario.
//
// La seconda guarda il **contenuto dell'iframe**, e senza di lei il caso
// peggiore resta scoperto: lo script c'è, il widget si monta, e il frame non
// carica mai. Il risultato è una rotellina che gira per sempre, senza ripiego e
// senza spiegazione. Calendly annuncia la pagina pronta con
// `event_type_viewed`: se non arriva entro l'attesa, si mostra il link
// **accanto** al riquadro e non al suo posto, perché il calendario può ancora
// comparire — e se compare, il ripiego se ne va da sé.
//
// Dodici secondi di attesa, e la misura viene da una prova: su una rete lenta
// il calendario è arrivato dopo dieci, e con la soglia a otto la persona
// leggeva «non si carica» un istante prima di vederlo caricato. Meglio tardi e
// giusto che presto e sbagliato.

import { CALENDLY_SCRIPT, CALENDLY_ASPETTO } from '../data/calendly';

/** Lo script è uno per pagina, anche se i posti che lo chiedono sono tre. */
var caricamento = null;

function caricaScript() {
  if (caricamento) return caricamento;
  caricamento = new Promise(function (risolvi) {
    if (window.Calendly) return risolvi(true);
    var tag = document.createElement('script');
    tag.src = CALENDLY_SCRIPT;
    tag.async = true;
    tag.onload = function () {
      risolvi(!!window.Calendly);
    };
    tag.onerror = function () {
      risolvi(false);
    };
    document.head.appendChild(tag);
    // Il caso che conta non passa da `onerror`: un blocco dei cookie o
    // un'estensione che neutralizza lo script non fanno scattare né `load` né
    // `error`, e la promessa resterebbe appesa per sempre — cioè il riquadro
    // vuoto senza nemmeno il ripiego.
    window.setTimeout(function () {
      risolvi(!!window.Calendly);
    }, 6000);
  });
  return caricamento;
}

/**
 * Il montaggio attivo, uno solo.
 *
 * Un ascoltatore di `message` per il documento e non uno per calendario: i
 * messaggi di Calendly non dicono da quale iframe arrivano, e con tre
 * ascoltatori registrati la prenotazione fatta in un pannello farebbe scattare
 * la conferma anche negli altri due. Di calendari visibili insieme non ce n'è
 * mai più di uno — sono tre pannelli modali diversi — quindi l'ultimo montato
 * è quello che ascolta.
 */
var attivo = null;

window.addEventListener('message', function (e) {
  if (!attivo) return;
  if (!e.data || typeof e.data.event !== 'string') return;
  if (e.data.event.indexOf('calendly.') !== 0) return;

  if (e.data.event === 'calendly.event_type_viewed') {
    attivo.visto = true;
    window.clearTimeout(attivo.guardiano);
    if (attivo.ripiego) attivo.ripiego.hidden = true;
    return;
  }

  if (e.data.event === 'calendly.event_scheduled') {
    if (attivo.prenotato) return;
    attivo.prenotato = true;
    if (attivo.onPrenotato) attivo.onPrenotato();
  }
});

/**
 * Il nome nelle tre forme che Calendly può chiedere.
 *
 * **Un evento con «Nome» e «Cognome» in due campi ignora `name`**, e questo è
 * il difetto che questa funzione chiude: il calendario della chat ha il nome
 * diviso in due, quindi arrivava con i due campi vuoti mentre l'email era
 * compilata — e i due campi sono obbligatori, quindi la persona che voleva
 * essere richiamata doveva ridigitare quello che il club sapeva già.
 *
 * Si mandano **tutte e tre** le chiavi: un evento a campo unico legge `name` e
 * scarta le altre due, uno a campi separati fa il contrario. Nessuna delle due
 * configurazioni va dichiarata da questa parte, ed è il punto — quale sia lo
 * decide chi configura l'evento su Calendly, e da qui non si vede.
 *
 * Se il chiamante ha già nome e cognome separati li passa (`firstName`,
 * `lastName`) ed è la strada giusta; se ha solo la stringa intera si divide sul
 * primo spazio. La divisione è un ripiego e sbaglia sui nomi doppi — «Maria
 * Teresa Rossi» diventa «Maria» + «Teresa Rossi» — quindi vale la pena passarli
 * separati dove ci sono.
 */
function nomiCompleti(prefill) {
  var d = Object.assign({}, prefill || {});
  var intero = String(d.name || '').trim();
  var primo = String(d.firstName || '').trim();
  var resto = String(d.lastName || '').trim();

  if (!primo && !resto && intero) {
    var pezzi = intero.split(/\s+/);
    primo = pezzi.shift() || '';
    resto = pezzi.join(' ');
  }
  if (!intero) intero = [primo, resto].filter(Boolean).join(' ');

  if (intero) d.name = intero;
  if (primo) d.firstName = primo;
  if (resto) d.lastName = resto;
  return d;
}

/**
 * Monta il calendario, e restituisce una maniglia per smontarlo.
 *
 * @param {object} o
 * @param {HTMLElement} o.riquadro   dove va il widget
 * @param {HTMLElement} [o.ripiego]  il blocco col link, mostrato se il widget non arriva
 * @param {HTMLAnchorElement} [o.link] l'ancora dentro il ripiego, di cui si scrive l'href
 * @param {string} o.url             l'evento, senza parametri
 * @param {object} [o.prefill]       `name`, `email`, `location`, `customAnswers`
 * @param {function} [o.onPrenotato] chiamata quando Calendly conferma
 * @param {number} [o.attesa]        millisecondi prima di mostrare il ripiego
 */
export async function montaCalendario(o) {
  var riquadro = o.riquadro;
  if (!riquadro) return null;

  // Il link del ripiego porta i dati in query string, e **senza** i parametri
  // d'aspetto: là il titolo dell'evento serve.
  if (o.link) o.link.href = linkDiretto(o.url, o.prefill);

  riquadro.innerHTML = '';
  riquadro.hidden = false;
  if (o.ripiego) o.ripiego.hidden = true;

  var pronto = await caricaScript();
  if (!pronto || !window.Calendly) {
    riquadro.hidden = true;
    if (o.ripiego) o.ripiego.hidden = false;
    return null;
  }

  window.Calendly.initInlineWidget({
    url: o.url + '?' + CALENDLY_ASPETTO,
    parentElement: riquadro,
    prefill: nomiCompleti(o.prefill),
  });

  var montaggio = {
    riquadro: riquadro,
    ripiego: o.ripiego || null,
    onPrenotato: o.onPrenotato || null,
    visto: false,
    prenotato: false,
    guardiano: null,
  };
  montaggio.guardiano = window.setTimeout(function () {
    if (montaggio.visto) return;
    if (montaggio.ripiego) montaggio.ripiego.hidden = false;
  }, o.attesa || 12000);

  attivo = montaggio;
  return {
    distruggi: function () {
      window.clearTimeout(montaggio.guardiano);
      if (attivo === montaggio) attivo = null;
      riquadro.innerHTML = '';
    },
  };
}

/**
 * L'indirizzo di Calendly da aprire in una scheda nuova, col precompilato in
 * query string. È il ripiego, e serve anche a chi preferisce la scheda nuova.
 *
 * Le domande personalizzate si passano come `a1`, `a2`… nell'ordine del modulo,
 * che è la convenzione di Calendly e non una nostra.
 */
export function linkDiretto(url, prefill) {
  var p = new URLSearchParams();
  p.set('hide_gdpr_banner', '1');
  var d = nomiCompleti(prefill);
  if (d.name) p.set('name', d.name);
  /* `first_name` e `last_name` oltre a `name`: gli eventi con il nome in due
     campi ignorano il secondo, e gli altri ignorano i primi due. Vedi
     `nomiCompleti`. */
  if (d.firstName) p.set('first_name', d.firstName);
  if (d.lastName) p.set('last_name', d.lastName);
  if (d.email) p.set('email', d.email);
  if (d.location) p.set('location', d.location);
  var risposte = d.customAnswers || {};
  Object.keys(risposte).forEach(function (k) {
    if (risposte[k]) p.set(k, risposte[k]);
  });
  return url + '?' + p.toString();
}
