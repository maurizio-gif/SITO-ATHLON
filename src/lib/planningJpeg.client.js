// @ts-nocheck — script di browser, canvas diretto e nessuna annotazione di tipo
//
// Il palinsesto come due JPEG per gli schermi verticali del club.
//
// ── Cosa viene dai fogli in Canva e cosa dal sito ───────────────────────────
//
// Dai due fogli che il club faceva a mano vengono le tre scelte di **struttura**,
// che erano quelle giuste e che le mie prime versioni avevano sbagliate:
//
//  - **il taglio è per ambiente, non per giorno.** Acqua su un foglio — scuola
//    nuoto, nuoto libero, aqua fitness — e sala sull'altro. Così ogni foglio ha
//    tutti e sei i giorni della sua area, che è come uno cerca: chi viene a
//    nuotare non legge la colonna dei corsi in Sala A;
//  - **il nome su una riga e l'ora sotto.** È la soluzione al vincolo
//    orizzontale: con ora e nome sulla stessa riga, in una colonna da 168 px al
//    nome ne restavano 90 e «Pilates Matwork» andava compresso o tagliato;
//  - **le due fasce allineate.** Mattina fino alle 14, pomeriggio dopo, con
//    l'inizio del pomeriggio alla stessa altezza su tutti i giorni: è quello che
//    permette di confrontare due colonne a colpo d'occhio, e il bianco cade dove
//    il club è vuoto.
//
// Il **vestito** invece è quello del sito, non quello dei fogli. Crema di fondo,
// carte bianche con il filo sottile, occhiello arancione più titolo nel carattere
// display, e i colori delle sale che arrivano da `roomColor()` — la stessa
// funzione che colora la legenda del planning in pagina. Le bande nere con i
// blocchi colorati, il richiamo «PRENOTA» ripetuto per sezione e il blocco
// legale in fondo erano del disegno in Canva: il primo è un altro linguaggio, il
// secondo si dice una volta, il terzo mangiava 128 px che ora vanno al testo.
//
// Semplificato dove ripetere non aggiunge: il **group reformer** non ripete il
// proprio nome trentaquattro volte — la sezione lo dice già nel titolo, la cella
// porta solo sala e ora. E i marchi dentro i nomi (Les Mills, HBX, Antigravity)
// restano testo: sono lockup grafici che non stanno nel repository.
//
// ── L'aritmetica ────────────────────────────────────────────────────────────
//
// L'altezza del pannello è **misurata**, 960 mm col metro su un 42" di listino:
// 1920 px fanno 2,0 px/mm esatti. La diagonale nominale include la cornice e
// arrotonda, e da lì si sbaglia di un millimetro per carattere.
//
// Ogni foglio si adatta al suo contenuto e non all'altro: sono due fogli di due
// materie, e quello dell'acqua — che ha meno lezioni — può respirare. Diverso
// dal caso in cui le due pagine erano le due metà della stessa tabella, dove due
// misure diverse fianco a fianco erano un difetto.

import dati from '../data/planning-corrente.json';
import { roomColor } from '../data/planning';

const L = 1080;
const A = 1920;

/** Altezza del pannello, misurata col metro: 960 mm. Quindi 2,0 px/mm esatti. */
const ALTEZZA_MM = 960;
const PX_PER_MM = A / ALTEZZA_MM;
/** Quanto della cassa alta occupa l'Inter rispetto al corpo dichiarato. */
const MAIUSCOLA = 0.72;

/** I colori del sito, non una tavolozza per questi fogli. */
const C = {
  carta: '#eeeae3',
  scuro: '#171514',
  bianco: '#ffffff',
  arancio: '#ff5701',
  accento: '#bb4001',
  spento: 'rgba(39,36,35,0.52)',
  filo: 'rgba(39,36,35,0.12)',
};

const FOGLI = [
  {
    nome: 'acqua',
    etichetta: 'In acqua',
    sezioni: [
      { id: 'scuola-nuoto-adulti', titolo: 'Scuola Nuoto Adulti' },
      { id: 'nuoto-libero', titolo: 'Nuoto Libero Assistito' },
      { id: 'aqua-fitness', titolo: 'Aqua Fitness' },
    ],
  },
  {
    nome: 'sala',
    etichetta: 'In sala',
    sezioni: [
      { id: 'gym-floor', titolo: 'Gym Floor', orari: true },
      { id: 'corsi-fitness', titolo: 'Corsi Fitness' },
      /* Una lezione sola per tutta la sezione: il nome lo dice il titolo, e
         ripeterlo in ogni cella costava metà dell'altezza di ogni blocco. */
      { id: 'group-reformer', titolo: 'Group Reformer', soloOra: true },
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

/** Le lezioni di una sezione, per giorno e divise nelle due fasce. */
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
  return {
    giorni,
    /* Dichiarato sulla sezione e non dedotto da «tutte le lezioni hanno lo
       stesso nome»: quell'euristica degradava anche scuola nuoto e nuoto
       libero, dove il nome dentro la cella è quello che si legge da lontano. */
    soloOra: !!sezione.soloOra,
    mattina: Math.max.apply(null, giorni.map((g) => g.mattina.length)),
    pomeriggio: Math.max.apply(null, giorni.map((g) => g.pomeriggio.length)),
  };
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
  x.scale(Math.max(k, 0.72), 1);
  let t = testo;
  if (k < 0.72) {
    while (t.length > 3 && x.measureText(t + '…').width * 0.72 > largoMax) t = t.slice(0, -1);
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

  const bordo = 30;
  const colW = (L - bordo * 2 - 5 * 7) / 6;

  /* ── Testata: occhiello e titolo, come le sezioni del sito ──
     Le due linee di base sono 34 e 112, e la distanza non è a occhio: il Tusker
     disegna le maiuscole fino a 1,047em sopra la linea di base — è la stessa
     cosa per cui `global.css` tiene una riserva sopra ogni h1 — e a corpo 68
     sono 71 px. Con la base a 98, come avevo messo, la cima del mese arrivava a
     27 e finiva dentro l'occhiello. Su canvas non c'è nessuna regola che
     compensi: la riserva va contata a mano. */
  x.fillStyle = C.arancio;
  x.font = '700 25px Inter, sans-serif';
  x.fillText('ATHLON CLUB · PLANNING', bordo, 34);

  x.fillStyle = C.scuro;
  x.font = "700 68px 'Tusker-Grotesk', sans-serif";
  x.fillText(String(dati.mese).toUpperCase(), bordo, 112);

  x.fillStyle = C.spento;
  x.font = '600 25px Inter, sans-serif';
  const et = foglio.etichetta.toUpperCase();
  x.fillText(et, L - bordo - x.measureText(et).width, 34);
  x.font = '500 24px Inter, sans-serif';
  const nota = "Prenoti dall'app Athlon Club o dal portale";
  x.fillText(nota, L - bordo - x.measureText(nota).width, 108);

  x.strokeStyle = C.filo;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(bordo, 130);
  x.lineTo(L - bordo, 130);
  x.stroke();

  const testaH = 148;
  /* Il piede è una riga sola: mese e numero di foglio. Il blocco legale che
     stava qui — propaganda, ragione sociale, affiliazione, indirizzo — è via, e
     sono 128 px tornati al testo. Su uno schermo appeso in sede nessuno legge
     la partita IVA, e chi la deve leggere la trova nel footer del sito. */
  const yPiede = A - 42;

  // ── Quanto spazio hanno le sezioni ──
  const sezioni = foglio.sezioni
    .map((sz) => Object.assign({}, sz, { dati: sz.orari ? null : perFascia(sz) }))
    .filter((sz) => sz.orari || sz.dati);

  const TITOLO = 44;
  const RIGA_GIORNI = 30;
  const ARIA = 22;
  const fisso = sezioni.reduce(
    (n, sz) => n + TITOLO + RIGA_GIORNI + ARIA + (sz.orari ? 46 + 26 : 0),
    0
  );
  const blocchi = sezioni.reduce((n, sz) => {
    if (sz.orari) return n;
    const righe = sz.dati.mattina + sz.dati.pomeriggio + 0.4;
    // La sezione a barra sola costa 0,58: ha una riga di testo invece di due.
    return n + righe * (sz.dati.soloOra ? 0.58 : 1);
  }, 0);

  const disponibile = yPiede - testaH - 10;
  const bloccoH = Math.max(34, Math.min((disponibile - fisso) / blocchi, 96));
  const cellaH = Math.round(bloccoH * 0.9);
  const corpoNome = Math.max(13, Math.round(cellaH * 0.33));
  const corpoOra = Math.max(13, Math.round(cellaH * 0.29));

  let y = testaH;

  sezioni.forEach((sez) => {
    /* Solo il titolo nel carattere display, senza occhiello: sul sito ogni
       sezione ne ha uno perché dice una cosa diversa, qui avrebbe detto «ORARI»
       tre volte di fila. Ripetizione tolta, e sono 54 px tornati al testo. */
    x.fillStyle = C.scuro;
    x.font = "700 42px 'Tusker-Grotesk', sans-serif";
    // 44 px di riserva sopra la base per lo stesso motivo della testata: a
    // corpo 42 il Tusker sale di 44, e «ATTIVITÀ» toccherebbe la riga sopra.
    x.fillText(sez.titolo.toUpperCase(), bordo, y + 40);
    y += TITOLO;

    // Riga dei giorni: piccola, spenta, con il filo. Non una banda piena.
    GIORNI.forEach((g, i) => {
      const gx = bordo + i * (colW + 7);
      x.fillStyle = C.spento;
      x.font = '700 19px Inter, sans-serif';
      scrivi(x, NOMI[g].toUpperCase(), gx + colW / 2, y + 20, colW - 6, true);
    });
    x.strokeStyle = C.filo;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(bordo, y + RIGA_GIORNI - 2);
    x.lineTo(L - bordo, y + RIGA_GIORNI - 2);
    x.stroke();
    y += RIGA_GIORNI + 8;

    if (sez.orari) {
      /* La Gym Floor non è un elenco di lezioni ma una fascia di apertura, e
         `gymFloor.hours` la dà per gruppi: 0 lunedì-venerdì, 1 sabato, 2
         domenica. La domenica sta a parte perché nella griglia dei sei giorni
         non ha una colonna. */
      GIORNI.forEach((g, i) => {
        const gx = bordo + i * (colW + 7);
        const h = dati.gymFloor.hours[g === 'Sab' ? 1 : 0];
        x.fillStyle = C.bianco;
        carta(x, gx, y, colW, 46, 10);
        x.fill();
        x.strokeStyle = C.filo;
        x.lineWidth = 1.5;
        x.stroke();
        x.fillStyle = C.scuro;
        x.font = '700 21px Inter, sans-serif';
        scrivi(x, h.hours, gx + colW / 2, y + 30, colW - 12, true);
      });
      const dom = dati.gymFloor.hours[2];
      if (dom) {
        x.fillStyle = C.spento;
        x.font = '600 20px Inter, sans-serif';
        x.fillText(`${dom.label} ${dom.hours}`, bordo, y + 46 + 24);
      }
      y += 46 + 26 + ARIA;
      return;
    }

    const passo = sez.dati.soloOra ? bloccoH * 0.58 : bloccoH;
    const inizio = y;
    const yPom = inizio + sez.dati.mattina * passo + bloccoH * 0.4;

    sez.dati.giorni.forEach((giorno, i) => {
      const gx = bordo + i * (colW + 7);
      [['mattina', inizio], ['pomeriggio', yPom]].forEach((coppia) => {
        giorno[coppia[0]].forEach((lez, n) => {
          const by = coppia[1] + n * passo;
          const h = sez.dati.soloOra ? Math.round(passo * 0.86) : cellaH;
          const colore = roomColor(lez.sala, 'light') || C.accento;

          // La carta: bianca, filo sottile, angoli tondi. Come sul sito.
          x.fillStyle = C.bianco;
          carta(x, gx, by, colW, h, 10);
          x.fill();
          x.strokeStyle = C.filo;
          x.lineWidth = 1.5;
          x.stroke();

          // Il filo verticale del colore della sala, sul bordo sinistro: dice
          // la stanza senza spendere una parola.
          x.fillStyle = colore;
          carta(x, gx, by, 5, h, 2.5);
          x.fill();

          const ora = String(lez.time).split('–')[0].replace(':', '.');
          const sala = String(lez.sala || '').replace(/^(Sala|Vasca)\s+/i, '');

          if (sez.dati.soloOra) {
            x.fillStyle = C.scuro;
            x.font = `700 ${Math.round(h * 0.44)}px Inter, sans-serif`;
            x.fillText(ora, gx + 14, by + h * 0.66);
            x.fillStyle = C.spento;
            x.font = `600 ${Math.round(h * 0.32)}px Inter, sans-serif`;
            const ws = x.measureText(sala).width;
            if (14 + x.measureText(ora).width + ws + 22 <= colW) {
              x.fillText(sala.toUpperCase(), gx + colW - 10 - ws, by + h * 0.64);
            }
            return;
          }

          x.fillStyle = C.scuro;
          x.font = `600 ${corpoNome}px Inter, sans-serif`;
          const rr = righeNome(x, lez.name, colW - 22);
          if (rr.length === 1) {
            scrivi(x, rr[0], gx + 14, by + h * 0.42, colW - 22, false);
          } else {
            x.font = `600 ${Math.round(corpoNome * 0.86)}px Inter, sans-serif`;
            scrivi(x, rr[0], gx + 14, by + h * 0.3, colW - 22, false);
            scrivi(x, rr[1], gx + 14, by + h * 0.53, colW - 22, false);
          }

          /* L'ora prima della sala, e la sala solo se ci sta davvero. Il sabato
             del nuoto libero porta una fascia di domenica scritta «Dom 09:30»,
             larga il doppio di un orario: disegnando la sala comunque si
             leggeva «GRANDEom 09.30». Fra le due vince l'ora, che è il dato —
             la vasca la dice già il filo colorato. */
          x.fillStyle = C.accento;
          x.font = `700 ${corpoOra}px Inter, sans-serif`;
          const wOra = x.measureText(ora).width;
          x.fillText(ora, gx + 14, by + h * 0.84);

          x.font = `600 ${Math.round(corpoOra * 0.84)}px Inter, sans-serif`;
          const ws = x.measureText(sala).width;
          if (sala && 14 + wOra + ws + 24 <= colW) {
            x.fillStyle = C.spento;
            x.fillText(sala.toUpperCase(), gx + colW - 10 - ws, by + h * 0.83);
          }
        });
      });
    });

    y = yPom + sez.dati.pomeriggio * passo + ARIA;
  });

  // ── Piede: una riga sola ──
  x.fillStyle = C.spento;
  x.font = '600 20px Inter, sans-serif';
  const coda = `${String(dati.mese)} · foglio ${indice + 1} di ${totale} · ${foglio.etichetta}`;
  x.fillText(coda, bordo, yPiede + 22);
  const dir = 'athlonroma.it';
  x.fillText(dir, L - bordo - x.measureText(dir).width, yPiede + 22);

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
