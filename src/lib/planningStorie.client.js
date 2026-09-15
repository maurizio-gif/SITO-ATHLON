// @ts-nocheck — script di browser, canvas diretto e nessuna annotazione di tipo
//
// Le storie Instagram del giorno: un JPEG 1080×1920 **per area del club** —
// non sei foto separate, ma tre: acqua, palestra (Gym Floor + Group Reformer)
// e Corsi Fitness da sola — diversamente dai due fogli per gli schermi della
// sede (`planningJpeg.client.js`, che restano il loro strumento e non
// vengono toccati qui). Ogni foglio impila le sue sotto-sezioni una sopra
// l'altra — la Gym Floor come una fascia oraria, gli altri come elenchi —
// con un'altezza di riga che si restringe da sola finché tutte le lezioni di
// oggi ci stanno in una sola immagine, e una sezione affollata (Corsi
// Fitness arriva a diciassette il martedì) passa da sola a due colonne
// invece di lasciare che il corpo del testo si schiacci: è quello che tiene
// il carattere grande anche nei giorni pieni. Tenere i Corsi Fitness sul loro
// foglio, senza dover condividere lo spazio con Gym Floor e Reformer, è
// quello che li fa venire ancora più grandi.
//
// Solo se nemmeno le due colonne bastassero — non succede con il palinsesto
// attuale — un foglio si spezzerebbe in una seconda pagina, riprendendo la
// sotto-sezione interrotta con "(continua)" invece di perderne il titolo.

import dati from '../data/planning-corrente.json';
import { roomColor } from '../data/planning';

const L = 1080;
const A = 1920;

const C = {
  carta: '#eeeae3',
  scuro: '#171514',
  bianco: '#ffffff',
  arancio: '#ff5701',
  accento: '#bb4001',
  spento: 'rgba(39,36,35,0.55)',
  filo: 'rgba(39,36,35,0.14)',
};

const NOMI = {
  Lun: 'Lunedì', Mar: 'Martedì', Mer: 'Mercoledì',
  Gio: 'Giovedì', Ven: 'Venerdì', Sab: 'Sabato', Dom: 'Domenica',
};

/** Il giorno della settimana corrente, nel fuso di Roma — non quello del browser. */
export function oggiRoma() {
  const parti = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  }).formatToParts(new Date());
  const w = (parti.find((p) => p.type === 'weekday') || {}).value || '';
  const mappa = { lun: 'Lun', mar: 'Mar', mer: 'Mer', gio: 'Gio', ven: 'Ven', sab: 'Sab', dom: 'Dom' };
  const chiave = Object.keys(mappa).find((k) => w.toLowerCase().startsWith(k));
  const giorno = (parti.find((p) => p.type === 'day') || {}).value || '';
  const mese = (parti.find((p) => p.type === 'month') || {}).value || '';
  return { short: mappa[chiave] || 'Lun', dataEsteso: `${giorno} ${mese}` };
}

/** L'ora d'inizio in minuti, per ordinare e per riconoscere le classi di domenica. */
function minuti(t) {
  const m = String(t).match(/(\d{1,2})[:.](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/** Le lezioni di una fascia in un giorno, ordinate per ora. */
function classiDelGiorno(bandId, giornoShort) {
  const banda = dati.bands.filter((b) => b.id === bandId)[0];
  if (!banda) return [];
  if (giornoShort === 'Dom') {
    // Nessuna colonna della domenica nel palinsesto: l'unica eccezione è la
    // fascia di nuoto libero infilata nella cella del sabato come "Dom …".
    if (bandId !== 'nuoto-libero') return [];
    const sab = banda.days.filter((d) => d.short === 'Sab')[0];
    return ((sab && sab.classes) || []).filter((c) => /^Dom\s/.test(String(c.time)));
  }
  const gg = banda.days.filter((d) => d.short === giornoShort)[0];
  return ((gg && gg.classes) || [])
    .filter((c) => !/^Dom\s/.test(String(c.time)))
    .slice()
    .sort((a, b) => minuti(a.time) - minuti(b.time));
}

/** Un rettangolo con gli angoli tondi, come le carte del sito. */
function carta(x, gx, gy, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  x.beginPath();
  x.moveTo(gx + rr, gy);
  x.arcTo(gx + w, gy, gx + w, gy + h, rr);
  x.arcTo(gx + w, gy + h, gx, gy + h, rr);
  x.arcTo(gx, gy + h, gx, gy, rr);
  x.arcTo(gx, gy, gx + w, gy, rr);
  x.closePath();
}

/** Testo compresso in orizzontale se non entra, tagliato solo all'estremo. */
function scrivi(x, testo, gx, cy, largoMax) {
  const w = x.measureText(testo).width;
  if (w <= largoMax) {
    x.fillText(testo, gx, cy);
    return;
  }
  const k = Math.max(largoMax / w, 0.74);
  x.save();
  x.translate(gx, cy);
  x.scale(k, 1);
  let t = testo;
  if (k <= 0.741) {
    while (t.length > 3 && x.measureText(t + '…').width * k > largoMax) t = t.slice(0, -1);
    t += '…';
  }
  x.fillText(t, 0, 0);
  x.restore();
}

/** Testata comune a tutte le storie: occhiello, "OGGI", giorno e data. */
function disegnaTestata(x, giorno) {
  x.fillStyle = C.arancio;
  x.font = '700 30px Inter, sans-serif';
  x.fillText('ATHLON CLUB · TALENTI', 64, 96);

  // Riserva sopra la base per il Tusker: a corpo 108 sale di ~113px.
  x.fillStyle = C.scuro;
  x.font = "700 108px 'Tusker-Grotesk', sans-serif";
  x.fillText('OGGI', 64, 240);

  x.fillStyle = C.accento;
  x.font = '700 42px Inter, sans-serif';
  x.fillText(`${NOMI[giorno.short]} ${giorno.dataEsteso}`, 64, 292);

  x.strokeStyle = C.filo;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(64, 322);
  x.lineTo(L - 64, 322);
  x.stroke();

  return 322;
}

/**
 * Il titolo del foglio — "IN ACQUA", "IN SALA" — senza l'occhiello che la
 * testata già dà: qui sotto ci vanno più sotto-sezioni, quindi il titolo
 * dice l'area e basta, e il numero di pagina compare solo quando il giorno
 * ne ha richieste più di una.
 */
function disegnaTitoloGruppo(x, yTop, etichetta, pagina, totalePagine) {
  x.fillStyle = C.scuro;
  x.font = "700 70px 'Tusker-Grotesk', sans-serif";
  let titolo = etichetta.toUpperCase();
  if (totalePagine > 1) titolo += ` · ${pagina}/${totalePagine}`;
  x.fillText(titolo, 64, yTop + 70);
  return yTop + 96;
}

const yPiede = A - 70;

/** Piede comune: richiamo alla prenotazione e dominio. */
function disegnaPiede(x) {
  x.strokeStyle = C.filo;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(64, yPiede - 24);
  x.lineTo(L - 64, yPiede - 24);
  x.stroke();

  x.fillStyle = C.spento;
  x.font = '600 30px Inter, sans-serif';
  x.fillText('Prenota dall’app Athlon Club o dal portale', 64, yPiede + 18);
  const dir = 'athlonroma.it';
  x.font = '700 30px Inter, sans-serif';
  x.fillStyle = C.accento;
  x.fillText(dir, L - 64 - x.measureText(dir).width, yPiede + 18);
}

/** Il titolo di una sotto-sezione dentro il foglio: "CORSI FITNESS", "GYM FLOOR". */
function disegnaTitoloSottosezione(x, y, testo) {
  x.fillStyle = C.accento;
  x.font = '700 38px Inter, sans-serif';
  x.fillText(testo.toUpperCase(), 64, y + 34);
  x.strokeStyle = C.filo;
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(64, y + 50);
  x.lineTo(L - 64, y + 50);
  x.stroke();
  return 78;
}

const ALTEZZA_TITOLO_SOTTOSEZIONE = 78;

/** La Gym Floor non ha lezioni: una fascia con l'orario di apertura. */
function disegnaOrarioSottosezione(x, y, hours) {
  const H = 140;
  x.fillStyle = C.bianco;
  carta(x, 64, y, L - 128, H, 20);
  x.fill();
  x.strokeStyle = C.filo;
  x.lineWidth = 2;
  x.stroke();

  x.fillStyle = C.spento;
  x.font = '600 28px Inter, sans-serif';
  x.fillText('Aperta', 96, y + 46);

  x.fillStyle = C.accento;
  x.font = "700 64px 'Tusker-Grotesk', sans-serif";
  x.fillText(hours, 96, y + 118);

  return H + 36;
}

const ALTEZZA_ORARIO_SOTTOSEZIONE = 176;

/**
 * Una riga di lezione: carta bianca, filo colorato a sinistra, ora e nome.
 * `gx` e `w` sono il bordo sinistro e la larghezza della carta — parametrici
 * perché una sezione affollata (Corsi Fitness) disegna le sue righe su due
 * colonne strette invece che su una sola larga. I corpi del testo sono
 * proporzionali all'altezza della riga, perché quella altezza cambia da un
 * giorno all'altro: è quello che permette a un foglio di restringersi da solo
 * invece di spezzarsi subito in due pagine.
 */
function disegnaRiga(x, gx, gy, w, h, item) {
  const colore = roomColor(item.sala, 'light') || C.accento;
  x.fillStyle = C.bianco;
  carta(x, gx, gy, w, h, 16);
  x.fill();
  x.strokeStyle = C.filo;
  x.lineWidth = 1.5;
  x.stroke();

  x.fillStyle = colore;
  carta(x, gx, gy, 8, h, 4);
  x.fill();

  const orario = String(item.time).replace(/^Dom\s*/, '');
  const fOrario = Math.max(20, Math.round(h * 0.4));
  const fNome = Math.max(18, Math.round(h * 0.34));
  const fSala = Math.max(14, Math.round(h * 0.24));
  const largoOrario = Math.min(Math.round(h * 3.1), Math.round(w * 0.5));
  // Uno spazio fisso fra la colonna dell'orario e il nome: senza, un orario
  // che riempie quasi tutta la sua colonna (le due colonne strette dei Corsi
  // Fitness, con orari come "07:40–08:30") tocca il nome che segue.
  const GAP_ORARIO_NOME = 20;

  x.fillStyle = C.scuro;
  x.font = `700 ${fOrario}px Inter, sans-serif`;
  scrivi(x, orario, gx + 32, gy + h * 0.42, largoOrario);

  const largoNome = Math.max(48, w - largoOrario - 40 - GAP_ORARIO_NOME - (item.sala ? 32 : 0));

  x.font = `600 ${fNome}px Inter, sans-serif`;
  scrivi(x, item.name, gx + 32 + largoOrario + GAP_ORARIO_NOME, gy + h * 0.4, largoNome);

  if (item.sala) {
    x.fillStyle = C.spento;
    x.font = `600 ${fSala}px Inter, sans-serif`;
    scrivi(x, String(item.sala), gx + 32 + largoOrario + GAP_ORARIO_NOME, gy + h * 0.72, largoNome);
  }
}

/**
 * Il canvas come URL scaricabile, senza avviare nessun download.
 *
 * Il browser blocca i download in sequenza avviati da script — dopo il primo
 * o il secondo, silenziosamente, senza un errore da intercettare — quindi
 * mandare `a.click()` per ognuna delle storie del giorno ne faceva arrivare
 * una sola. Il rimedio non è nel codice: ogni storia deve essere un link che
 * la persona preme di suo pugno, perché solo un click vero passa il filtro
 * del browser una volta per file.
 */
function comeUrl(canvas) {
  return new Promise((risolvi) => {
    canvas.toBlob((blob) => risolvi(URL.createObjectURL(blob)), 'image/jpeg', 0.94);
  });
}

/* Tre fogli: acqua, e la sala divisa in due — Gym Floor e Group Reformer da
   una parte, i Corsi Fitness da sola dall'altra. Divisi perché i Corsi
   Fitness sono la sezione più affollata (arriva a diciassette lezioni il
   martedì) e tenerla da sola su un foglio le lascia tutta l'altezza
   disponibile, invece di doverla dividere con Gym Floor e Reformer: a parità
   di spazio verticale, ogni riga — e ogni colonna, quando ne servono due —
   viene più grande. `orari: true` sulla Gym Floor la disegna come fascia
   oraria invece che come elenco di lezioni — non ne ha. */
const GRUPPI = [
  {
    nome: 'acqua',
    etichetta: 'In acqua',
    sezioni: [
      { id: 'nuoto-libero', titolo: 'Nuoto Libero' },
      { id: 'scuola-nuoto-adulti', titolo: 'Scuola Nuoto Adulti' },
      { id: 'aqua-fitness', titolo: 'Aqua Fitness' },
    ],
  },
  {
    nome: 'palestra',
    etichetta: 'In sala',
    sezioni: [
      { id: 'gym-floor', titolo: 'Gym Floor', orari: true },
      { id: 'group-reformer', titolo: 'Group Reformer' },
    ],
  },
  {
    nome: 'corsi-fitness',
    etichetta: 'Corsi Fitness',
    sezioni: [
      { id: 'corsi-fitness', titolo: 'Corsi Fitness' },
    ],
  },
];

/** I blocchi verticali di un foglio: intestazioni, la fascia oraria, le righe. */
function costruisciBlocchi(gruppo, giorno) {
  const blocchi = [];
  for (const sez of gruppo.sezioni) {
    if (sez.orari) {
      const indice = giorno.short === 'Sab' ? 1 : giorno.short === 'Dom' ? 2 : 0;
      const h = dati.gymFloor.hours[indice];
      if (!h) continue;
      blocchi.push({ tipo: 'titolo', testo: sez.titolo });
      blocchi.push({ tipo: 'orari', hours: h.hours });
      continue;
    }
    const items = classiDelGiorno(sez.id, giorno.short);
    if (!items.length) continue;
    blocchi.push({ tipo: 'titolo', testo: sez.titolo });
    items.forEach((item) => blocchi.push({ tipo: 'riga', item }));
  }
  return blocchi;
}

/** L'altezza che un blocco occupa, a una data altezza di riga. */
function altezzaBlocco(blocco, rowH) {
  if (blocco.tipo === 'titolo') return ALTEZZA_TITOLO_SOTTOSEZIONE;
  if (blocco.tipo === 'orari') return ALTEZZA_ORARIO_SOTTOSEZIONE;
  return rowH + 18;
}

/**
 * Spezza i blocchi in più pagine quando anche la riga più stretta non basta.
 * Non taglia mai una fascia oraria a metà (ce n'è al più una), e se la pagina
 * si interrompe in mezzo a un elenco ne riprende il titolo con "(continua)":
 * senza, la seconda pagina inizierebbe con righe senza dire di che corso sono.
 */
function impaginaBlocchi(blocchi, rowH, disponibile) {
  const pagine = [];
  let corrente = [];
  let altezza = 0;
  let ultimoTitolo = null;

  for (const blocco of blocchi) {
    if (blocco.tipo === 'titolo') ultimoTitolo = blocco.testo;
    const h = altezzaBlocco(blocco, rowH);

    if (altezza + h > disponibile && corrente.length) {
      pagine.push(corrente);
      corrente = [];
      altezza = 0;
      if (blocco.tipo === 'riga' && ultimoTitolo) {
        const continua = { tipo: 'titolo', testo: `${ultimoTitolo} (continua)` };
        corrente.push(continua);
        altezza += altezzaBlocco(continua, rowH);
      }
    }

    corrente.push(blocco);
    altezza += h;
  }
  if (corrente.length) pagine.push(corrente);
  return pagine;
}

const RIGA_MIN = 40;
const RIGA_MAX = 100;
/** Il margine massimo usato per centrare un foglio con poche righe — oltre
 *  questa soglia lo spazio in eccesso diventa respiro fra le righe, non un
 *  vuoto sotto il titolo. */
const CENTRATURA_MAX = 90;
const Y_CONTENUTO = 322 + 96; // testata + titolo del foglio

/** Disegna un foglio a partire dai suoi blocchi, con l'altezza di riga data. */
function disegnaPagina(gruppo, giorno, blocchi, rowH, pagina, totalePagine) {
  const c = document.createElement('canvas');
  c.width = L;
  c.height = A;
  const x = c.getContext('2d');
  x.fillStyle = C.carta;
  x.fillRect(0, 0, L, A);
  x.textBaseline = 'alphabetic';

  disegnaTestata(x, giorno);
  let y = disegnaTitoloGruppo(x, 322, gruppo.etichetta, pagina, totalePagine);

  blocchi.forEach((blocco) => {
    if (blocco.tipo === 'titolo') {
      y += disegnaTitoloSottosezione(x, y, blocco.testo);
    } else if (blocco.tipo === 'orari') {
      y += disegnaOrarioSottosezione(x, y, blocco.hours);
    } else {
      disegnaRiga(x, 64, y, L - 128, rowH, blocco.item);
      y += rowH + 18;
    }
  });

  disegnaPiede(x);
  return c;
}

/** Le colonne di una sezione: due quando l'elenco è affollato, o il corpo
 *  della riga scenderebbe troppo per restare leggibile — la sala pesa più,
 *  perché è lì che i corsi fitness arrivano a diciassette in un giorno. */
const SOGLIA_DUE_COLONNE = 6;
const GAP_COLONNE = 24;

function decidiColonne(numeroRighe) {
  return numeroRighe > SOGLIA_DUE_COLONNE ? 2 : 1;
}

/** Le sotto-sezioni di un foglio, con le lezioni di oggi e — se affollate —
 *  già divise in due colonne. */
function costruisciSezioni(gruppo, giorno) {
  const sezioni = [];
  for (const sez of gruppo.sezioni) {
    if (sez.orari) {
      const indice = giorno.short === 'Sab' ? 1 : giorno.short === 'Dom' ? 2 : 0;
      const h = dati.gymFloor.hours[indice];
      if (!h) continue;
      sezioni.push({ tipo: 'orari', titolo: sez.titolo, hours: h.hours });
      continue;
    }
    const items = classiDelGiorno(sez.id, giorno.short);
    if (!items.length) continue;
    sezioni.push({ tipo: 'lezioni', titolo: sez.titolo, items, colonne: decidiColonne(items.length) });
  }
  return sezioni;
}

/** Quante righe verticali occupa davvero una sezione, colonne comprese. */
function righeVerticali(sezione) {
  if (sezione.tipo === 'orari') return 0;
  return Math.ceil(sezione.items.length / sezione.colonne);
}

/** L'altezza fissa di una sezione — tutto tranne le righe di lezioni. */
function altezzaFissaSezione(sezione) {
  return ALTEZZA_TITOLO_SOTTOSEZIONE + (sezione.tipo === 'orari' ? ALTEZZA_ORARIO_SOTTOSEZIONE : 0);
}

/**
 * Disegna un foglio a partire dalle sue sezioni, su una sola pagina.
 *
 * `centratura` è il margine in più, oltre al normale spazio sotto il titolo
 * del foglio, prima della prima sotto-sezione; `gap` è lo spazio verticale
 * dopo ogni riga, di norma 18px. Quando le righe sono già alla loro altezza
 * massima (`RIGA_MAX`) e il foglio ha poche lezioni — la Gym Floor con
 * poche prenotazioni di Group Reformer, per dire — crescere ancora le carte
 * le farebbe sproporzionate. Lo spazio libero si divide allora in due: un
 * margine sopra e sotto il contenuto per centrarlo nel foglio, e un respiro
 * fra le righe perché il contenuto non resti comunque appiccicato in un
 * blocco isolato subito sotto il titolo.
 */
function disegnaPaginaSezioni(gruppo, giorno, sezioni, rowH, pagina, totalePagine, centratura = 0, gap = 18) {
  const c = document.createElement('canvas');
  c.width = L;
  c.height = A;
  const x = c.getContext('2d');
  x.fillStyle = C.carta;
  x.fillRect(0, 0, L, A);
  x.textBaseline = 'alphabetic';

  disegnaTestata(x, giorno);
  let y = disegnaTitoloGruppo(x, 322, gruppo.etichetta, pagina, totalePagine) + centratura;

  sezioni.forEach((sezione) => {
    y += disegnaTitoloSottosezione(x, y, sezione.titolo);

    if (sezione.tipo === 'orari') {
      y += disegnaOrarioSottosezione(x, y, sezione.hours);
      return;
    }

    if (sezione.colonne === 1) {
      sezione.items.forEach((item) => {
        disegnaRiga(x, 64, y, L - 128, rowH, item);
        y += rowH + gap;
      });
      return;
    }

    // Due colonne: la prima metà a sinistra, il resto a destra, fianco a
    // fianco — l'elenco occupa la metà delle righe verticali.
    const perColonna = Math.ceil(sezione.items.length / 2);
    const colonna1 = sezione.items.slice(0, perColonna);
    const colonna2 = sezione.items.slice(perColonna);
    const colW = (L - 128 - GAP_COLONNE) / 2;
    const gx2 = 64 + colW + GAP_COLONNE;

    for (let i = 0; i < perColonna; i++) {
      if (colonna1[i]) disegnaRiga(x, 64, y, colW, rowH, colonna1[i]);
      if (colonna2[i]) disegnaRiga(x, gx2, y, colW, rowH, colonna2[i]);
      y += rowH + gap;
    }
  });

  disegnaPiede(x);
  return c;
}

/**
 * Un foglio — «In acqua» o «In sala» — con le lezioni di oggi soltanto.
 * Quasi sempre una pagina sola: l'altezza di riga si restringe finché tutto
 * ci sta, fra `RIGA_MAX` (comoda) e `RIGA_MIN` (il fondo leggibile), e una
 * sezione affollata passa a due colonne prima ancora che il restringimento
 * la costringa a un corpo minuscolo. Solo quando nemmeno questo basta — non
 * succede con il palinsesto di oggi, ma il giorno che ne aggiungesse molte
 * di più potrebbe — il foglio si spezza in una seconda pagina.
 */
function disegnaFoglio(gruppo, giorno) {
  const sezioni = costruisciSezioni(gruppo, giorno);
  if (!sezioni.length) return [];

  const righe = sezioni.reduce((n, s) => n + righeVerticali(s), 0);
  const disponibile = yPiede - 40 - Y_CONTENUTO;
  const fisso = sezioni.reduce((n, s) => n + altezzaFissaSezione(s), 0);

  let rowH = righe > 0 ? Math.floor((disponibile - fisso) / righe) - 18 : RIGA_MAX;
  rowH = Math.min(RIGA_MAX, rowH || RIGA_MAX);

  if (rowH >= RIGA_MIN) {
    // Il resto dello spazio, se le righe sono già al loro massimo, non va
    // tutto sopra come un unico vuoto sotto il titolo: un margine — sopra e
    // sotto, per centrare il blocco — resta contenuto entro `CENTRATURA_MAX`,
    // e quel che avanza si spalma come respiro in più fra una riga e
    // l'altra. Poche prenotazioni di Group Reformer sul foglio della
    // palestra, per dire, restano un gruppo compatto ancorato sotto il
    // titolo invece di un blocco isolato a metà pagina.
    const usato = fisso + Math.max(0, righe - 1) * (rowH + 18) + (righe > 0 ? rowH : 0);
    const avanzo = Math.max(0, disponibile - usato);
    const centratura = Math.min(Math.floor(avanzo / 2), CENTRATURA_MAX);
    const restante = avanzo - centratura * 2;
    const gap = righe > 0 ? 18 + Math.floor(restante / righe) : 18;
    return [disegnaPaginaSezioni(gruppo, giorno, sezioni, rowH, 1, 1, centratura, gap)];
  }

  // Ripiego raro: anche a due colonne non basta. Si torna all'elenco piatto,
  // una colonna sola, spezzato in più pagine come farebbe qualunque foglio.
  const blocchi = costruisciBlocchi(gruppo, giorno);
  const pagine = impaginaBlocchi(blocchi, RIGA_MIN, disponibile);
  return pagine.map((pblocchi, i) => disegnaPagina(gruppo, giorno, pblocchi, RIGA_MIN, i + 1, pagine.length));
}

/**
 * Genera le storie del giorno indicato (di default oggi, fuso di Roma) e
 * restituisce l'elenco, senza scaricare niente: ogni voce porta `nome`,
 * `etichetta` e `url` (un object URL), e il download parte quando la persona
 * preme il link — deve essere il suo click, non uno script, o il browser ne
 * blocca tutti tranne il primo. Sono tre fogli — acqua, palestra, Corsi
 * Fitness; un foglio senza niente da dire quel giorno non genera nessun
 * file.
 */
export async function generaStorieDelGiorno(giorno) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const g = giorno || oggiRoma();
  const slug = String(g.short).toLowerCase();
  const file = [];

  for (const gruppo of GRUPPI) {
    const pagine = disegnaFoglio(gruppo, g);
    for (let i = 0; i < pagine.length; i++) {
      const suffix = pagine.length > 1 ? `-${i + 1}` : '';
      file.push({
        nome: `storia-${slug}-${gruppo.nome}${suffix}.jpg`,
        etichetta: pagine.length > 1 ? `${gruppo.etichetta} ${i + 1}/${pagine.length}` : gruppo.etichetta,
        url: await comeUrl(pagine[i]),
      });
    }
  }

  return { file, giorno: `${NOMI[g.short]} ${g.dataEsteso}` };
}
