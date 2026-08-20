// @ts-nocheck — script di browser, canvas diretto e nessuna annotazione di tipo
//
// Il palinsesto come due JPEG per gli schermi verticali del club.
//
// ── Da dove viene questo disegno ─────────────────────────────────────────────
//
// Non è inventato: ricostruisce i due fogli che il club faceva a mano in Canva,
// e che funzionavano. Tre scelte loro che qui sono regole, perché sono le tre
// che risolvono i problemi in cui le mie prime due versioni erano finite.
//
// **Il taglio è per ambiente, non per giorno.** Acqua su un foglio — scuola
// nuoto adulti, nuoto libero, aqua fitness — e sala sull'altro: gym floor,
// corsi fitness, group reformer. Così ogni foglio ha tutti e sei i giorni della
// sua area, che è il modo in cui uno cerca: chi viene a nuotare non legge la
// colonna dei corsi in Sala A. Tagliare per giorno, come facevo prima, spezza a
// metà ogni attività e obbliga a guardare due fogli per sapere quando c'è aqua
// fitness.
//
// **Il nome sta su una riga sua e l'ora sotto**, in due barre sovrapposte. È la
// soluzione al vincolo orizzontale su cui mi ero incagliato: con ora e nome
// sulla stessa riga, in una colonna da 165 px al nome ne restavano 90, e
// «Pilates Matwork» andava compresso o tagliato. Impilandoli il nome prende
// tutta la larghezza della cella e ci sta senza deformarsi.
//
// **Il colore identifica la sezione**, quindi non serve una legenda: viola la
// scuola nuoto, blu il nuoto libero, turchese l'acqua, arancio il fitness,
// verde il reformer. La sala resta scritta nella barra dell'ora, perché il
// colore dice l'attività e non la stanza.
//
// ── L'aritmetica, che resta quella ──────────────────────────────────────────
//
// L'altezza del pannello è **misurata**, 960 mm col metro su un 42" di listino:
// 1920 px fanno 2,0 px/mm esatti. La diagonale nominale include la cornice e
// arrotonda, e da lì si sbaglia di un millimetro per carattere.
//
// Ogni foglio si adatta al suo contenuto e non all'altro, al contrario di
// quando le due pagine erano le due metà della stessa tabella: là due misure
// diverse fianco a fianco erano un difetto, qui sono due fogli di due materie e
// il foglio dell'acqua — che ha meno lezioni — può respirare. È anche quello
// che fanno i due originali.
//
// Quello che questi JPEG **non** riproducono sono i marchi dentro i nomi: sui
// fogli in Canva «HBX boxing», «Les Mills BODYPUMP», «Antigravity» e «MOTR®»
// sono lockup grafici. Qui sono testo, perché i file dei marchi non stanno nel
// repository e inventarli male sarebbe peggio che scriverli.

import dati from '../data/planning-corrente.json';
import { CLUB } from '../data/club';

const L = 1080;
const A = 1920;

/** Altezza del pannello, misurata col metro: 960 mm. Quindi 2,0 px/mm esatti. */
const ALTEZZA_MM = 960;
const PX_PER_MM = A / ALTEZZA_MM;
/** Quanto della cassa alta occupa l'Inter rispetto al corpo dichiarato. */
const MAIUSCOLA = 0.72;

const C = {
  carta: '#f0ede8',
  scuro: '#171514',
  bianco: '#ffffff',
  spento: '#6b6560',
};

/** I due fogli, con le sezioni nell'ordine degli originali. */
const FOGLI = [
  {
    nome: 'acqua',
    sezioni: [
      { id: 'scuola-nuoto-adulti', titolo: 'Scuola Nuoto Adulti', colore: '#5b6ef5' },
      { id: 'nuoto-libero', titolo: 'Nuoto Libero Assistito', colore: '#1a56d6' },
      { id: 'aqua-fitness', titolo: 'Aqua Fitness', colore: '#17b6c4' },
    ],
  },
  {
    nome: 'sala',
    sezioni: [
      { id: 'gym-floor', titolo: 'Gym Floor', colore: '#171514', orari: true },
      { id: 'corsi-fitness', titolo: 'Corsi Fitness', colore: '#ff5701' },
      { id: 'group-reformer', titolo: 'Group Reformer', colore: '#3f9c6d', soloOra: true },
    ],
  },
];

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const NOMI = {
  Lun: 'Lunedì', Mar: 'Martedì', Mer: 'Mercoledì',
  Gio: 'Giovedì', Ven: 'Venerdì', Sab: 'Sabato',
};

/** L'ora d'inizio in minuti, per ordinare e per dividere le due fasce. */
function minuti(t) {
  const m = String(t).match(/(\d{1,2})[:.](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/**
 * Le lezioni di una sezione, per giorno e divise in due fasce.
 *
 * Mattina fino alle 14, pomeriggio dopo: è la spaccatura che hanno i fogli
 * originali, e non è arbitraria — nel palinsesto fra le 14 e le 16 non c'è
 * quasi niente, quindi il bianco cade dove il club è vuoto. Serve a leggere in
 * orizzontale: allineando l'inizio del pomeriggio su tutti i giorni, due
 * colonne accanto si confrontano a colpo d'occhio.
 */
function perFascia(sezione) {
  const banda = dati.bands.filter((b) => b.id === sezione.id)[0];
  if (!banda) return null;
  const giorni = GIORNI.map((g) => {
    const gg = banda.days.filter((d) => d.short === g)[0];
    const classi = ((gg && gg.classes) || []).slice().sort((a, b) => minuti(a.time) - minuti(b.time));
    return {
      mattina: classi.filter((k) => minuti(k.time) < 14 * 60),
      pomeriggio: classi.filter((k) => minuti(k.time) >= 14 * 60),
    };
  });
  /* `soloOra` **si dichiara sulla sezione, non si deduce**, e ci sono arrivato
     sbagliando: dedurlo da «tutte le lezioni hanno lo stesso nome» sembrava
     elegante e degradava anche scuola nuoto e nuoto libero, che nei fogli
     originali la barra del nome ce l'hanno. I fogli sono la specifica, e
     contraddicono l'euristica: al reformer il nome non serve perché la sezione
     lo dice già nel banner e la cella non aggiunge niente, mentre «SCUOLA
     NUOTO» dentro la cella è quello che si legge da lontano. */
  return {
    giorni,
    soloOra: !!sezione.soloOra,
    mattina: Math.max.apply(null, giorni.map((g) => g.mattina.length)),
    pomeriggio: Math.max.apply(null, giorni.map((g) => g.pomeriggio.length)),
  };
}

/** Testo compresso in orizzontale se non entra, tagliato solo all'estremo. */
function scrivi(x, testo, cx, cy, largoMax, centrato) {
  const w = x.measureText(testo).width;
  const k = Math.min(1, largoMax / w);
  const gx = centrato ? cx - Math.min(w, largoMax) / 2 : cx;
  if (k >= 0.999) {
    x.fillText(testo, gx, cy);
    return;
  }
  x.save();
  x.translate(gx, cy);
  x.scale(Math.max(k, 0.7), 1);
  let t = testo;
  if (k < 0.7) {
    while (t.length > 3 && x.measureText(t + '…').width * 0.7 > largoMax) t = t.slice(0, -1);
    t += '…';
  }
  x.fillText(t, 0, 0);
  x.restore();
}

/** Il nome su una o due righe, spezzato fra le parole. */
function righeNome(x, testo, largoMax) {
  if (x.measureText(testo).width <= largoMax) return [testo];
  const parole = String(testo).split(' ');
  let a = '';
  const resto = [];
  parole.forEach((w) => {
    const prova = a ? a + ' ' + w : w;
    if (!a || x.measureText(prova).width <= largoMax) a = prova;
    else resto.push(w);
  });
  return resto.length ? [a, resto.join(' ')] : [a];
}

function disegnaFoglio(foglio, indice, totale) {
  const c = document.createElement('canvas');
  c.width = L;
  c.height = A;
  const x = c.getContext('2d');
  x.fillStyle = C.carta;
  x.fillRect(0, 0, L, A);
  x.textBaseline = 'alphabetic';

  const bordo = 22;
  const colW = (L - bordo * 2 - 5 * 6) / 6;

  // ── Testata: il marchio, come sui fogli originali ──
  const testaH = 104;
  x.fillStyle = C.scuro;
  x.fillRect(bordo, 12, L - bordo * 2, testaH - 24);
  x.font = "700 66px 'Tusker-Grotesk', sans-serif";
  const wM = x.measureText('ATHLON CLUB').width;
  x.font = "700 46px 'Tusker-Grotesk', sans-serif";
  const wV = x.measureText(' 4.0').width;
  const x0 = (L - (wM + wV)) / 2;
  x.fillStyle = C.bianco;
  x.font = "700 66px 'Tusker-Grotesk', sans-serif";
  x.fillText('ATHLON CLUB', x0, 68);
  x.fillStyle = '#ff5701';
  x.font = "700 46px 'Tusker-Grotesk', sans-serif";
  x.fillText(' 4.0', x0 + wM, 68);

  // ── Piede: il blocco legale, che sta sui fogli e serve a norma ──
  const yPiede = A - 128;
  x.fillStyle = C.spento;
  x.font = 'italic 500 23px Inter, sans-serif';
  x.fillText('propaganda attività fisica sportiva dilettantistica', bordo + 6, yPiede + 32);
  x.fillStyle = C.scuro;
  x.font = '700 25px Inter, sans-serif';
  x.fillText(CLUB.legale.ragione.toUpperCase(), bordo + 6, yPiede + 64);
  x.fillStyle = C.spento;
  x.font = '600 20px Inter, sans-serif';
  x.fillText(`AFFILIAZIONE ASI: ${CLUB.legale.asi}`, bordo + 6, yPiede + 90);
  x.font = '500 20px Inter, sans-serif';
  x.fillText(
    `${CLUB.street}, ${CLUB.postalCode} ${CLUB.city}  |  www.athlonroma.it  |  ${CLUB.email}`,
    bordo + 6,
    yPiede + 114
  );

  // ── L'altezza del blocco: una volta per foglio, non a tentativi ──
  const sezioni = foglio.sezioni
    .map((s) => Object.assign({}, s, { dati: s.orari ? null : perFascia(s) }))
    .filter((s) => s.orari || s.dati);

  const disponibile = yPiede - testaH - 14;
  const BANNER = 54;
  const RIGA_GIORNI = 34;
  const ARIA = 16;
  const fisso = sezioni.reduce(
    (n, sz) => n + BANNER + RIGA_GIORNI + ARIA + (sz.orari ? 34 + 26 : 0),
    0
  );
  /* Le sezioni a nome unico costano 0,62 di blocco invece di 1: hanno la sola
     barra dell'ora. Contarle piene voleva dire togliere quell'altezza a tutte
     le altre — ed è il motivo per cui il foglio della sala era a 5,4 mm. */
  const blocchi = sezioni.reduce((n, sz) => {
    if (sz.orari) return n;
    const righe = sz.dati.mattina + sz.dati.pomeriggio + 0.4;
    return n + righe * (sz.dati.soloOra ? 0.62 : 1);
  }, 0);
  const bloccoH = Math.max(34, Math.min((disponibile - fisso) / blocchi, 92));
  const nomeH = Math.round(bloccoH * 0.55);
  const oraH = Math.round(bloccoH * 0.39);
  const corpoNome = Math.max(12, Math.round(nomeH * 0.58));
  const corpoOra = Math.max(12, Math.round(oraH * 0.62));

  let y = testaH;

  sezioni.forEach((sez) => {
    // Banner: titolo nel carattere display, e a destra il richiamo alla
    // prenotazione nel colore della sezione, come sugli originali.
    const bh = BANNER;
    const wPren = 320;
    x.fillStyle = C.scuro;
    x.fillRect(bordo, y, L - bordo * 2 - wPren - 6, bh);
    x.fillStyle = C.bianco;
    x.font = "700 42px 'Tusker-Grotesk', sans-serif";
    x.fillText(sez.titolo.toUpperCase(), bordo + 20, y + 43);

    x.fillStyle = sez.colore;
    x.fillRect(L - bordo - wPren, y, wPren, bh);
    x.fillStyle = C.bianco;
    x.font = "700 28px 'Tusker-Grotesk', sans-serif";
    scrivi(x, 'PRENOTA', L - bordo - wPren / 2, y + 30, wPren - 20, true);
    x.font = 'italic 700 16px Inter, sans-serif';
    scrivi(x, "CON L'APP ATHLONCLUB", L - bordo - wPren / 2, y + 49, wPren - 20, true);
    y += bh + 8;

    // Riga dei giorni
    GIORNI.forEach((g, i) => {
      const gx = bordo + i * (colW + 6);
      x.fillStyle = C.bianco;
      x.fillRect(gx, y, colW, RIGA_GIORNI);
      x.fillStyle = C.scuro;
      x.font = '700 19px Inter, sans-serif';
      scrivi(x, NOMI[g].toUpperCase(), gx + colW / 2, y + 23, colW - 8, true);
    });
    y += RIGA_GIORNI + 6;

    if (sez.orari) {
      /* La Gym Floor non è un elenco di lezioni ma una fascia di apertura, e
         `gymFloor.hours` la dà per gruppi di giorni: indice 0 lunedì-venerdì,
         1 sabato, 2 domenica. La domenica sta a parte perché nella griglia dei
         sei giorni non ha una colonna. */
      GIORNI.forEach((g, i) => {
        const gx = bordo + i * (colW + 6);
        const h = dati.gymFloor.hours[g === 'Sab' ? 1 : 0];
        x.fillStyle = C.scuro;
        x.fillRect(gx, y, colW, 34);
        x.fillStyle = C.bianco;
        x.font = '700 19px Inter, sans-serif';
        scrivi(x, h.hours, gx + colW / 2, y + 23, colW - 8, true);
      });
      const dom = dati.gymFloor.hours[2];
      if (dom) {
        x.fillStyle = C.spento;
        x.font = '600 18px Inter, sans-serif';
        x.fillText(`${dom.label.toUpperCase()}  ${dom.hours}`, bordo + 4, y + 56);
      }
      y += 34 + 40;
      return;
    }

    // Le due fasce, allineate: il pomeriggio parte alla stessa altezza su tutti
    // i giorni, ed è quello che permette di confrontarli in orizzontale.
    const inizio = y;
    const passoQui = sez.dati.soloOra ? bloccoH * 0.62 : bloccoH;
    const yPom = inizio + sez.dati.mattina * passoQui + bloccoH * 0.4;

    sez.dati.giorni.forEach((giorno, i) => {
      const gx = bordo + i * (colW + 6);
      [['mattina', inizio], ['pomeriggio', yPom]].forEach((coppia) => {
        const solo = sez.dati.soloOra;
        const passo = solo ? bloccoH * 0.62 : bloccoH;
        giorno[coppia[0]].forEach((lez, n) => {
          const by = coppia[1] + n * passo;

          if (solo) {
            x.fillStyle = sez.colore;
            x.fillRect(gx, by, colW, oraH + 4);
            /* La stringa vera e non «Sala » più il resto: le vasche si chiamano
               «Vasca Grande», e comporre «SALA GRANDE» era sbagliato di fatto
               oltre che troppo lungo per la barra. */
            x.fillStyle = 'rgba(255,255,255,0.82)';
            x.font = `600 ${Math.round(corpoOra * 0.86)}px Inter, sans-serif`;
            if (lez.sala) x.fillText(String(lez.sala).toUpperCase(), gx + 8, by + oraH * 0.78);
            x.fillStyle = C.bianco;
            x.font = `700 ${Math.round(corpoOra * 1.06)}px Inter, sans-serif`;
            const o = String(lez.time).split('–')[0].replace(':', '.');
            x.fillText(o, gx + colW - 8 - x.measureText(o).width, by + oraH * 0.8);
            return;
          }

          x.fillStyle = C.scuro;
          x.fillRect(gx, by, colW, nomeH);
          x.fillStyle = C.bianco;
          x.font = `700 ${corpoNome}px Inter, sans-serif`;
          const rr = righeNome(x, lez.name.toUpperCase(), colW - 10);
          if (rr.length === 1) {
            scrivi(x, rr[0], gx + colW / 2, by + nomeH * 0.68, colW - 10, true);
          } else {
            x.font = `700 ${Math.round(corpoNome * 0.84)}px Inter, sans-serif`;
            scrivi(x, rr[0], gx + colW / 2, by + nomeH * 0.45, colW - 8, true);
            scrivi(x, rr[1], gx + colW / 2, by + nomeH * 0.87, colW - 8, true);
          }

          x.fillStyle = sez.colore;
          x.fillRect(gx, by + nomeH + 1, colW, oraH);
          // «Sala A» → «A», «Vasca Media» → «MEDIA»: nella barra colorata la
          // parola «sala» non aggiunge niente e mangia lo spazio dell'ora.
          const sala = String(lez.sala || '').replace(/^(Sala|Vasca)\s+/i, '');
          const ora = String(lez.time).split('–')[0].replace(':', '.');

          /* L'ora prima della sala, e la sala solo se ci sta davvero.
             Il sabato del nuoto libero porta una fascia di domenica scritta
             «Dom 09:30», che è larga il doppio di un orario normale: con la
             sala disegnata comunque le due scritte si sovrapponevano —
             «GRANDEom 09.30». Fra le due l'ora vince, perché è il dato, e la
             vasca la dice già il colore della sezione. */
          x.fillStyle = C.bianco;
          x.font = `700 ${corpoOra}px Inter, sans-serif`;
          const wOra = x.measureText(ora).width;
          x.fillText(ora, gx + colW - 7 - wOra, by + nomeH + oraH * 0.74);

          if (sala) {
            x.font = `600 ${Math.round(corpoOra * 0.8)}px Inter, sans-serif`;
            if (x.measureText(sala).width + wOra + 20 <= colW) {
              x.fillStyle = 'rgba(255,255,255,0.82)';
              x.fillText(sala.toUpperCase(), gx + 7, by + nomeH + oraH * 0.72);
            }
          }
        });
      });
    });

    const passoSez = sez.dati.soloOra ? bloccoH * 0.62 : bloccoH;
    y = yPom + sez.dati.pomeriggio * passoSez + ARIA;
  });

  x.fillStyle = C.spento;
  x.font = '600 19px Inter, sans-serif';
  const coda = `${String(dati.mese).toUpperCase()}  ·  ${indice + 1}/${totale}`;
  x.fillText(coda, L - bordo - 6 - x.measureText(coda).width, yPiede + 32);

  c.dataset.corpo = String(corpoNome);
  return c;
}

function scarica(canvas, nome) {
  return new Promise((risolvi) => {
    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Il revoke immediato annulla il download su Safari: un attimo dopo.
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        risolvi();
      },
      'image/jpeg',
      0.94
    );
  });
}

/** Genera e scarica i due fogli. Restituisce cosa ha fatto, per dirlo a schermo. */
export async function scaricaPlanning() {
  // I font devono essere già caricati, altrimenti il canvas disegna col ripiego
  // di sistema e il JPEG esce con un'altra faccia.
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const mese = String(dati.mese).toLowerCase().replace(/\s+/g, '-');
  const corpi = [];
  for (let i = 0; i < FOGLI.length; i++) {
    const canvas = disegnaFoglio(FOGLI[i], i, FOGLI.length);
    corpi.push(Number(canvas.dataset.corpo));
    await scarica(canvas, `planning-${mese}-${FOGLI[i].nome}.jpg`);
  }

  return {
    pagine: FOGLI.length,
    /** L'altezza della cassa alta del nome, in millimetri sul pannello. */
    mm: Math.round(((Math.min.apply(null, corpi) * MAIUSCOLA) / PX_PER_MM) * 10) / 10,
  };
}
