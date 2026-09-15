// @ts-nocheck — script di browser, canvas diretto e nessuna annotazione di tipo
//
// Le storie Instagram del giorno: un JPEG 1080×1920 per ogni area del club,
// con gli orari di **oggi** soltanto — non tutta la settimana come i due fogli
// per gli schermi della sede (`planningJpeg.client.js`), che restano il loro
// strumento e non vengono toccati qui.
//
// Il vestito è lo stesso: crema di fondo, carte bianche, occhiello arancione,
// titolo nel carattere display, colori delle sale da `roomColor()`. Il corpo
// del testo è più grande — queste si guardano su un telefono per pochi secondi,
// non su un pannello da un metro e mezzo — quindi ogni sezione ha meno righe
// per pagina e, quando un giorno ne porta di più (il martedì dei corsi fitness
// arriva a 17), si spezza in più storie invece di rimpicciolire il carattere.
//
// La sala pesi non ha lezioni ma un orario di apertura solo: la sua storia
// mostra quello, non un elenco vuoto.

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

/** Le lezioni di una fascia in un giorno, ordinate per ora. */
function minuti(t) {
  const m = String(t).match(/(\d{1,2})[:.](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

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

/** Titolo di sezione: occhiello dell'area più titolo grande, come sul sito. */
function disegnaTitoloSezione(x, yTop, eyebrow, titolo, pagina, totalePagine) {
  x.fillStyle = C.arancio;
  x.font = '700 28px Inter, sans-serif';
  x.fillText(eyebrow.toUpperCase(), 64, yTop + 46);

  x.fillStyle = C.scuro;
  x.font = "700 76px 'Tusker-Grotesk', sans-serif";
  let titoloMostrato = titolo.toUpperCase();
  if (totalePagine > 1) titoloMostrato += ` · ${pagina}/${totalePagine}`;
  x.fillText(titoloMostrato, 64, yTop + 130);

  return yTop + 160;
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

/** Una riga di lezione: carta bianca, filo colorato a sinistra, ora e nome. */
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

  x.fillStyle = C.scuro;
  x.font = '700 44px Inter, sans-serif';
  scrivi(x, orario, 96, gy + h * 0.42, 340);

  x.fillStyle = C.scuro;
  x.font = '600 40px Inter, sans-serif';
  const largoNome = item.sala ? L - 128 - 340 - 40 - 220 : L - 128 - 340 - 40;
  scrivi(x, item.name, 420, gy + h * 0.4, largoNome);

  if (item.sala) {
    x.fillStyle = C.spento;
    x.font = '600 28px Inter, sans-serif';
    const sala = String(item.sala);
    scrivi(x, sala, 420, gy + h * 0.72, largoNome);
  }
}

/** La storia della Gym Floor: non un elenco, un orario di apertura. */
function disegnaSezioneOrari(giorno) {
  const c = document.createElement('canvas');
  c.width = L;
  c.height = A;
  const x = c.getContext('2d');
  x.fillStyle = C.carta;
  x.fillRect(0, 0, L, A);
  x.textBaseline = 'alphabetic';

  const yTesta = disegnaTestata(x, giorno);
  let y = disegnaTitoloSezione(x, yTesta + 40, 'Sala pesi', 'Gym Floor', 1, 1);

  const gruppo = giorno.short === 'Sab' ? 1 : giorno.short === 'Dom' ? 2 : 0;
  const h = dati.gymFloor.hours[gruppo];

  x.fillStyle = C.bianco;
  carta(x, 64, y + 40, L - 128, 260, 24);
  x.fill();
  x.strokeStyle = C.filo;
  x.lineWidth = 2;
  x.stroke();

  x.fillStyle = C.spento;
  x.font = '600 32px Inter, sans-serif';
  x.fillText('Aperta con prenotazione — Con Assistenza o Allenamento Libero', 96, y + 40 + 66);

  x.fillStyle = C.accento;
  x.font = "700 108px 'Tusker-Grotesk', sans-serif";
  x.fillText(h.hours, 96, y + 40 + 200);

  disegnaPiede(x);
  return c;
}

/**
 * Il canvas come URL scaricabile, senza avviare nessun download.
 *
 * Il browser blocca i download in sequenza avviati da script — dopo il primo
 * o il secondo, silenziosamente, senza un errore da intercettare — quindi
 * mandare `a.click()` per ognuna delle sei-otto storie del giorno ne faceva
 * arrivare una sola (l'ultima, quella per cui l'utente aveva ancora un
 * "consenti" da dare). Il rimedio non è nel codice: ogni storia deve essere un
 * link che la persona preme di suo pugno, perché solo un click vero passa il
 * filtro del browser una volta per file.
 */
function comeUrl(canvas) {
  return new Promise((risolvi) => {
    canvas.toBlob((blob) => risolvi(URL.createObjectURL(blob)), 'image/jpeg', 0.94);
  });
}

/* Le sei aree, nell'ordine in cui vengono scaricate. Un id di `bands` per
   quelle a lezioni, e `orari: true` per la sola sala pesi. */
const AREE = [
  { id: 'gym-floor', eyebrow: 'Sala pesi', titolo: 'Gym Floor', orari: true },
  { id: 'nuoto-libero', eyebrow: 'In acqua', titolo: 'Nuoto Libero' },
  { id: 'scuola-nuoto-adulti', eyebrow: 'In acqua', titolo: 'Scuola Nuoto Adulti' },
  { id: 'aqua-fitness', eyebrow: 'In acqua', titolo: 'Aqua Fitness' },
  { id: 'corsi-fitness', eyebrow: 'In sala', titolo: 'Corsi Fitness' },
  { id: 'group-reformer', eyebrow: 'In sala', titolo: 'Group Reformer' },
];

/**
 * Genera le storie del giorno indicato (di default oggi, fuso di Roma) e
 * restituisce l'elenco, senza scaricare niente: ogni voce porta `nome` e
 * `url` (un object URL), e il download parte quando la persona preme il
 * link — deve essere il suo click, non uno script, o il browser ne blocca
 * tutti tranne il primo. Un'area senza lezioni quel giorno non compare —
 * succede di sabato per la scuola nuoto adulti, e ogni giorno tranne oggi
 * per le altre quattro fasce se `giorno` è la domenica.
 */
export async function generaStorieDelGiorno(giorno) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const g = giorno || oggiRoma();
  const slug = String(g.short).toLowerCase();
  const file = [];

  for (const area of AREE) {
    if (area.orari) {
      const canvas = disegnaSezioneOrari(g);
      file.push({ nome: `storia-${slug}-gym-floor.jpg`, etichetta: 'Gym Floor', url: await comeUrl(canvas) });
      continue;
    }

    const items = classiDelGiorno(area.id, g.short);
    if (!items.length) continue;

    const pagine = disegnaPagineArea(area, items, g);
    for (let i = 0; i < pagine.length; i++) {
      const suffix = pagine.length > 1 ? `-${i + 1}` : '';
      file.push({
        nome: `storia-${slug}-${area.id}${suffix}.jpg`,
        etichetta: pagine.length > 1 ? `${area.titolo} ${i + 1}/${pagine.length}` : area.titolo,
        url: await comeUrl(pagine[i]),
      });
    }
  }

  return { file, giorno: `${NOMI[g.short]} ${g.dataEsteso}` };
}

/** Le pagine (canvas) necessarie per l'elenco di lezioni di un'area, un giorno solo. */
function disegnaPagineArea(area, items, giorno) {
  const RIGA_H = 132;
  const RIGA_GAP = 20;
  const yInizioTesta = 322 + 40;
  const spazioTitolo = 160;
  const disponibile = yPiede - 40 - (yInizioTesta + spazioTitolo);
  const perPagina = Math.max(3, Math.floor(disponibile / (RIGA_H + RIGA_GAP)));

  const pagine = [];
  for (let i = 0; i < items.length; i += perPagina) pagine.push(items.slice(i, i + perPagina));

  return pagine.map((righe, indice) => {
    const c = document.createElement('canvas');
    c.width = L;
    c.height = A;
    const x = c.getContext('2d');
    x.fillStyle = C.carta;
    x.fillRect(0, 0, L, A);
    x.textBaseline = 'alphabetic';

    disegnaTestata(x, giorno);
    let y = disegnaTitoloSezione(x, yInizioTesta, area.eyebrow, area.titolo, indice + 1, pagine.length);

    righe.forEach((item) => {
      disegnaRiga(x, y, RIGA_H, item);
      y += RIGA_H + RIGA_GAP;
    });

    disegnaPiede(x);
    return c;
  });
}
