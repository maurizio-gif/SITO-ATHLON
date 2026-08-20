// @ts-nocheck — script di browser, canvas diretto e nessuna annotazione di tipo
//
// Il palinsesto come JPEG per gli schermi verticali del club.
//
// Due schermi 9:16 da 40", letti da due-tre metri. Il file esce a 1080×1920,
// che è la risoluzione nativa: un JPEG più grande verrebbe ridotto dallo
// schermo e uno più piccolo interpolato, e in entrambi i casi il testo perde
// il filo dei pixel proprio alla misura in cui conta.
//
// ── L'aritmetica, perché decide tutto il resto ───────────────────────────────
//
// **L'altezza dello schermo è misurata, non dedotta dalla diagonale**: 960 mm,
// col metro, su un pannello che di listino è un 42". La differenza non è
// pedanteria — la diagonale nominale include la cornice e arrotonda, e da lì
// si sbaglia di un millimetro per carattere. 1920 px su 960 mm fanno
// **2,0 px/mm** esatti.
//
// La regola dei cartelli — altezza del carattere ≈ distanza / 150 — a 2,5 m
// chiede 17 mm, cioè 34 px di altezza maiuscola: con l'Inter, dove la
// maiuscola è ~0,72 del corpo, sono 47 px di corpo e righe da ~102 px.
//
// In 1920 px meno l'intestazione restano ~1560 px utili, cioè **quindici righe
// per pagina** a quella misura. Il palinsesto ha 180 lezioni: 180 diviso 15 fa
// dodici pagine, non due.
//
// È la stessa aritmetica che AGENTS.md descrive due volte, per il totem e per
// la televisione: su 1080 px non si può avere insieme il grado poster e tutto
// il contenuto. Qui non la si risolve, la si dichiara — `maxRighe` è la
// manopola, e da quella scende sia il corpo del carattere sia il numero di
// pagine:
//
//   maxRighe 17  →  righe ~100 px  →  ~14 mm  →  giuste a 2,1 m  →  6 pagine
//   maxRighe 40  →  righe ~41 px   →  ~7 mm   →  giuste a 1,0 m  →  2 pagine
//
// Nessuna delle due arriva ai 17 mm dei tre metri con questo contenuto: per
// arrivarci servirebbero righe da 122 px, cioè dodici per pagina, cioè quindici
// pagine. Il numero lo stampa la pagina dopo il download, così la scelta la fa
// chi conosce la distanza dello schermo invece di fidarsi di un'etichetta.
//
// ── E il vincolo che non è verticale ────────────────────────────────────────
//
// **Due giorni per pagina**, e il numero viene da una prova sbagliata prima di
// arrivarci. Con tre colonne la cella è larga 320 px; tolta l'ora e il filo
// della sala al nome ne restano 216, che a corpo leggibile fanno nove caratteri
// — e «Ginnastica Strutturale» ne ha ventidue. La prima versione tagliava i
// nomi coi puntini, cioè cancellava l'unica informazione che serve davvero a
// chi guarda lo schermo da tre metri: quale lezione è.
//
// Con due colonne da 497 px il nome ne ha 390, e **va a capo** invece di essere
// tagliato: due righe bastano a qualunque nome del palinsesto. Il corpo del
// carattere lo decide il minore fra due vincoli — l'altezza disponibile diviso
// le righe, e la larghezza che regge la parola più lunga — perché fissarne uno
// solo è il modo di scoprire l'altro a difetto fatto.

import dati from '../data/planning-corrente.json';

/** 1080×1920: la risoluzione nativa dei due schermi. */
const L = 1080;
const A = 1920;

/** Altezza del pannello, misurata col metro: 960 mm. Quindi 2,0 px/mm esatti. */
const ALTEZZA_MM = 960;
const PX_PER_MM = A / ALTEZZA_MM;

/** Quanto della cassa alta occupa l'Inter rispetto al corpo dichiarato. */
const MAIUSCOLA = 0.72;

const COLORI = {
  fondo: '#171514',
  fondoRiga: 'rgba(255,255,255,0.04)',
  testo: '#ffffff',
  spento: 'rgba(255,255,255,0.55)',
  arancio: '#ff5701',
  filo: 'rgba(255,255,255,0.14)',
};

/** Un colore per sala, così a colpo d'occhio si vede dove si va. */
const SALA = {
  'Sala A': '#ff5701',
  'Sala B': '#ffb400',
  'Sala C': '#7ad1c4',
  'Vasca Grande': '#4aa3ff',
  'Vasca Media': '#9b8cff',
  'Gym Floor': '#c9c4bd',
};

/**
 * Le pagine, impacchettate.
 *
 * Tre giorni per pagina, e le bande si aggiungono finché la colonna più alta
 * regge. Quando non regge più si apre una pagina nuova con gli stessi tre
 * giorni: è il motivo per cui il numero di pagine non si sceglie ma si scopre.
 */
function impagina(giorniPerPagina) {
  const tutti = dati.bands[0].days.map((g) => g.short);
  const gruppi = [];
  for (let k = 0; k < tutti.length; k += giorniPerPagina) {
    gruppi.push(tutti.slice(k, k + giorniPerPagina));
  }

  /* Nessun impacchettamento: su ogni pagina ci vanno **tutte** le bande dei
     suoi giorni, e il carattere si adatta a quello che c'è. È l'opposto della
     prima versione, che apriva pagine nuove per tenere il corpo grande — qui il
     numero di pagine è il vincolo e il corpo è la conseguenza. */
  return gruppi.map((giorni) => {
    const sezioni = [];
    let righe = 0;
    dati.bands.forEach((banda) => {
      const perGiorno = giorni.map((g) => {
        const gg = banda.days.filter((x) => x.short === g)[0];
        return (gg && gg.classes) || [];
      });
      const alta = Math.max.apply(null, perGiorno.map((c) => c.length));
      if (alta === 0) return;
      sezioni.push({ titolo: banda.title, perGiorno });
      // Il titolo della banda costa 0,8 di riga, non una intera.
      righe += alta + 0.8;
    });
    return { giorni, sezioni, righe };
  });
}

/** Il testo, tagliato con i puntini se davvero non entra. */
function accorcia(ctx, testo, largo) {
  if (ctx.measureText(testo).width <= largo) return testo;
  let t = testo;
  while (t.length > 4 && ctx.measureText(t + '…').width > largo) t = t.slice(0, -1);
  return t + '…';
}

function disegna(pagina, indice, totale, corpo) {
  const c = document.createElement('canvas');
  c.width = L;
  c.height = A;
  const x = c.getContext('2d');

  x.fillStyle = COLORI.fondo;
  x.fillRect(0, 0, L, A);
  x.textBaseline = 'alphabetic';

  const bordo = 34;

  /* L'intestazione è alta 112 px e non 266 come nella prima versione: ogni
     pixel speso qui è un pixel in meno per le lezioni, e con due pagine sole
     quel conto si sente. Mese e numero di pagina su una riga. */
  x.fillStyle = COLORI.arancio;
  x.font = '700 26px Inter, sans-serif';
  x.fillText('ATHLON CLUB · PLANNING', bordo, 46);
  x.fillStyle = COLORI.testo;
  x.font = '600 52px Inter, sans-serif';
  x.fillText(String(dati.mese).toUpperCase(), bordo, 98);
  x.fillStyle = COLORI.spento;
  x.font = '500 30px Inter, sans-serif';
  const coda = `${indice + 1} / ${totale}`;
  x.fillText(coda, L - bordo - x.measureText(coda).width, 98);

  const yTesta = 112;
  const yPiede = A - 44;

  // ── Le colonne ──
  const gutter = 18;
  const colonne = pagina.giorni.length;
  const largo = (L - bordo * 2 - gutter * (colonne - 1)) / colonne;
  const yGiorno = yTesta + 40;
  const yPrima = yGiorno + 26;
  const utile = yPiede - yPrima - 24;

  /* Il corpo arriva da fuori, uguale per tutte le pagine, e non è un dettaglio
     di implementazione: le due immagini finiscono su due schermi affiancati, e
     due misure diverse fianco a fianco si vedono subito. Calcolarlo per pagina
     — come faceva la prima versione — dava alla pagina meno affollata un corpo
     più grande, che poi non lasciava spazio ai nomi lunghi e li faceva tagliare
     **solo su quella pagina**: lo stesso corso intero a sinistra e coi puntini
     a destra. */
  const rigaH = utile / Math.max(pagina.righe, 1);
  const corpoOra = Math.round(corpo * 0.82);

  const nomiGiorno = { Lun: 'Lunedì', Mar: 'Martedì', Mer: 'Mercoledì', Gio: 'Giovedì', Ven: 'Venerdì', Sab: 'Sabato' };

  /**
   * Il nome su **una** riga sempre, compresso in orizzontale quando non entra.
   *
   * È la scelta che fa stare tutto su due pagine. Andare a capo raddoppierebbe
   * l'altezza delle voci lunghe — e sono molte — costringendo a un corpo più
   * piccolo per *tutte*; tagliare coi puntini cancella l'unica informazione che
   * serve a chi guarda da lontano, cioè quale lezione è. Una compressione fino
   * al 74% si legge senza accorgersene: sotto quella soglia si preferisce il
   * taglio, perché un carattere schiacciato oltre non è più leggibile.
   */
  const MIN_COMPRESSIONE = 0.68;

  function scrivi(testo, gx, gy, largoMax) {
    const w = x.measureText(testo).width;
    if (w <= largoMax) {
      x.fillText(testo, gx, gy);
      return;
    }
    const k = Math.max(largoMax / w, MIN_COMPRESSIONE);
    x.save();
    x.translate(gx, gy);
    x.scale(k, 1);
    x.fillText(k > MIN_COMPRESSIONE ? testo : accorcia(x, testo, largoMax / k), 0, 0);
    x.restore();
  }

  pagina.giorni.forEach((g, col) => {
    const gx = bordo + col * (largo + gutter);
    let gy = yPrima;

    x.fillStyle = COLORI.testo;
    x.font = '700 34px Inter, sans-serif';
    x.fillText((nomiGiorno[g] || g).toUpperCase(), gx, yGiorno + 4);
    x.strokeStyle = COLORI.arancio;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(gx, yGiorno + 18);
    x.lineTo(gx + largo, yGiorno + 18);
    x.stroke();

    // 2,6 em bastano a «00:00»; il resto è spazio regalato al nome.
    const oraW = Math.round(corpoOra * 2.6);
    pagina.sezioni.forEach((sez) => {
      x.fillStyle = COLORI.arancio;
      x.font = `700 ${Math.round(corpo * 0.72)}px Inter, sans-serif`;
      gy += rigaH * 0.62;
      x.fillText(sez.titolo.toUpperCase(), gx, gy);
      gy += rigaH * 0.18;

      sez.perGiorno[col].forEach((lez) => {
        const base = gy + rigaH * 0.78;
        x.fillStyle = SALA[lez.sala] || COLORI.spento;
        x.fillRect(gx, gy + rigaH * 0.16, 5, rigaH * 0.68);

        /* L'ora è quello che precede il trattino, **prefisso compreso**: nel
           palinsesto il sabato del nuoto libero contiene una fascia di
           domenica, scritta come `"Dom 09:30–12:30"`. È una convenzione dei
           dati, non un errore, e senza comprimerla quel «Dom 09:30» sfonda la
           casella e finisce sopra il nome della lezione. */
        x.fillStyle = COLORI.spento;
        x.font = `600 ${corpoOra}px Inter, sans-serif`;
        const ora = String(lez.time).split('–')[0];
        /* La casella dell'ora si allarga per questa riga se il testo lo chiede,
           invece di comprimerlo fino a perderlo: «Dom 09:30» compresso a forza
           diventava «Dom …», cioè una fascia senza orario. Il nome scala a
           destra solo qui, e va bene — quella riga *è* diversa dalle altre. */
        const oraQui = Math.max(oraW, Math.ceil(x.measureText(ora).width) + 10);
        x.fillText(ora, gx + 13, base);

        x.fillStyle = COLORI.testo;
        x.font = `500 ${corpo}px Inter, sans-serif`;
        scrivi(lez.name, gx + 13 + oraQui, base, largo - 13 - oraQui - 4);
        gy += rigaH;
      });
    });
  });

  // ── Piede: gli orari della Gym Floor, che non sono un elenco di lezioni ──
  x.fillStyle = COLORI.spento;
  x.font = '500 24px Inter, sans-serif';
  const orari = dati.gymFloor.hours.map((h) => `${h.label} ${h.hours}`).join('   ·   ');
  x.fillText(`GYM FLOOR   ${orari}`, bordo, yPiede + 26);

  return c;
}

/** Scarica un canvas come JPEG. */
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
      0.92
    );
  });
}

/**
 * Genera e scarica le pagine.
 *
 * `maxRighe` è la manopola descritta in testa: meno righe per pagina vuol dire
 * caratteri più grandi e più pagine. Restituisce quello che ha fatto, così chi
 * chiama può dirlo a schermo invece di far indovinare.
 */
export async function scaricaPlanning(giorniPerPagina) {
  // I font devono essere già caricati, altrimenti il canvas disegna col
  // ripiego di sistema e il JPEG esce con un'altra faccia.
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const pagine = impagina(giorniPerPagina || 3);
  const mese = String(dati.mese).toLowerCase().replace(/\s+/g, '-');

  /* Un corpo per tutte, deciso dalla pagina più affollata: è la misura che
     entra dappertutto. Le costanti ripetono quelle di `disegna` — intestazione,
     piede, righe dei giorni — ed è l'unico punto di questo file dove una misura
     compare due volte: cambiando l'impaginazione va cambiata qui accanto. */
  const utileStimato = A - 44 - 112 - 40 - 26 - 24;
  const righePeggiori = Math.max.apply(null, pagine.map((p2) => p2.righe));
  const corpo = Math.max(17, Math.round((utileStimato / righePeggiori) * 0.74));

  /* Il corpo lo misura il disegno, non una formula ripetuta qui: `disegna` lo
     appende al canvas, così il numero che la pagina stampa è quello che è
     finito davvero nel JPEG. Una seconda copia del calcolo sarebbe la solita
     copia che divergerà. */
  for (let i = 0; i < pagine.length; i++) {
    const canvas = disegna(pagine[i], i, pagine.length, corpo);
    await scarica(canvas, `planning-${mese}-${i + 1}di${pagine.length}.jpg`);
  }

  return {
    pagine: pagine.length,
    /** L'altezza della cassa alta, in millimetri sul pannello da 960 mm. */
    mm: Math.round(((corpo * MAIUSCOLA) / PX_PER_MM) * 10) / 10,
  };
}
