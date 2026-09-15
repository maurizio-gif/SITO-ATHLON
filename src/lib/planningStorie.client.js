// @ts-nocheck — script di browser, canvas diretto e nessuna annotazione di tipo
//
// Le storie Instagram del giorno: un JPEG 1080×1920 **per area del club** —
// non sei foto separate, ma due: acqua e sala, come i due fogli per gli
// schermi della sede (`planningJpeg.client.js`, che restano il loro strumento
// e non vengono toccati qui). Ogni foglio impila le sue sotto-sezioni una
// sopra l'altra — la Gym Floor come una fascia oraria, Corsi Fitness e Group
// Reformer come elenchi — con un'altezza di riga che si restringe da sola
// finché tutte le lezioni di oggi ci stanno in una sola immagine: è lo stesso
// principio di `planningJpeg.client.js` applicato a un giorno solo invece che
// a una settimana intera, e per questo quasi sempre basta una pagina.
//
// Solo quando anche la riga più stretta non basta — un martedì con diciassette
// corsi fitness più il reformer — un foglio si spezza in una seconda pagina,
// che riprende l'ultima sotto-sezione interrotta con "(continua)" invece di
// perderne il titolo.

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
  x.fillText('Aperta con prenotazione — Con Assistenza o Allenamento Libero', 96, y + 46);

  x.fillStyle = C.accento;
  x.font = "700 64px 'Tusker-Grotesk', sans-serif";
  x.fillText(hours, 96, y + 118);

  return H + 36;
}

const ALTEZZA_ORARIO_SOTTOSEZIONE = 176;

/**
 * Una riga di lezione: carta bianca, filo colorato a sinistra, ora e nome.
 * I corpi del testo sono proporzionali all'altezza della riga, perché quella
 * altezza cambia da un giorno all'altro — è quello che permette a un foglio
 * di restringersi da solo invece di spezzarsi in due pagine.
 */
function disegnaRiga(x, gy, h, item) {
  const colore = roomColor(item.sala, 'light') || C.accento;
  x.fillStyle = C.bianco;
  carta(x, 64, gy, L - 128, h, 16);
  x.fill();
  x.strokeStyle = C.filo;
  x.lineWidth = 1.5;
  x.stroke();

  x.fillStyle = colore;
  carta(x, 64, gy, 8, h, 4);
  x.fill();

  const orario = String(item.time).replace(/^Dom\s*/, '');
  const fOrario = Math.max(20, Math.round(h * 0.4));
  const fNome = Math.max(18, Math.round(h * 0.34));
  const fSala = Math.max(14, Math.round(h * 0.24));
  const largoOrario = Math.round(h * 3.1);

  x.fillStyle = C.scuro;
  x.font = `700 ${fOrario}px Inter, sans-serif`;
  scrivi(x, orario, 96, gy + h * 0.42, largoOrario);

  const largoNome = item.sala ? L - 128 - largoOrario - 40 - 220 : L - 128 - largoOrario - 40;

  x.font = `600 ${fNome}px Inter, sans-serif`;
  scrivi(x, item.name, 96 + largoOrario, gy + h * 0.4, largoNome);

  if (item.sala) {
    x.fillStyle = C.spento;
    x.font = `600 ${fSala}px Inter, sans-serif`;
    scrivi(x, String(item.sala), 96 + largoOrario, gy + h * 0.72, largoNome);
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

/* I due fogli, nello stesso raggruppamento dei fogli per gli schermi della
   sede: acqua e sala. `orari: true` sulla Gym Floor la disegna come fascia
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
    nome: 'sala',
    etichetta: 'In sala',
    sezioni: [
      { id: 'gym-floor', titolo: 'Gym Floor', orari: true },
      { id: 'corsi-fitness', titolo: 'Corsi Fitness' },
      { id: 'group-reformer', titolo: 'Group Reformer' },
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
      disegnaRiga(x, y, rowH, blocco.item);
      y += rowH + 18;
    }
  });

  disegnaPiede(x);
  return c;
}

/**
 * Un foglio — «In acqua» o «In sala» — con le lezioni di oggi soltanto.
 * Quasi sempre una pagina sola: l'altezza di riga si restringe finché tutto
 * ci sta, fra `RIGA_MAX` (comoda) e `RIGA_MIN` (il fondo leggibile). Solo
 * quando nemmeno `RIGA_MIN` basta il foglio si spezza in più pagine.
 */
function disegnaFoglio(gruppo, giorno) {
  const blocchi = costruisciBlocchi(gruppo, giorno);
  if (!blocchi.length) return [];

  const righe = blocchi.filter((b) => b.tipo === 'riga').length;
  const disponibile = yPiede - 40 - Y_CONTENUTO;
  const fisso = blocchi.reduce((n, b) => n + (b.tipo === 'riga' ? 0 : altezzaBlocco(b, 0)), 0);

  let rowH = righe > 0 ? Math.floor((disponibile - fisso) / righe) - 18 : RIGA_MAX;
  rowH = Math.min(RIGA_MAX, rowH || RIGA_MAX);

  if (rowH >= RIGA_MIN) {
    return [disegnaPagina(gruppo, giorno, blocchi, rowH, 1, 1)];
  }

  const pagine = impaginaBlocchi(blocchi, RIGA_MIN, disponibile);
  return pagine.map((pblocchi, i) => disegnaPagina(gruppo, giorno, pblocchi, RIGA_MIN, i + 1, pagine.length));
}

/**
 * Genera le storie del giorno indicato (di default oggi, fuso di Roma) e
 * restituisce l'elenco, senza scaricare niente: ogni voce porta `nome`,
 * `etichetta` e `url` (un object URL), e il download parte quando la persona
 * preme il link — deve essere il suo click, non uno script, o il browser ne
 * blocca tutti tranne il primo. Sono due fogli, acqua e sala; un foglio senza
 * niente da dire quel giorno — non capita mai a entrambi insieme — non genera
 * nessun file.
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
