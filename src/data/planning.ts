/**
 * Single source of truth for the weekly planning.
 *
 * Every page that shows hours — the full /planning page and the per-activity
 * sections inside the activity pages — reads from here, so editing the JSON
 * updates all of them at once. Nothing else should import the JSON directly:
 * keeping the access in one module is what makes it possible to switch where
 * the data comes from (a local file today, a fetch from the Decap-edited
 * planning repo, a CMS in this project) by changing this file alone.
 */
import data from './planning-corrente.json';
import lessonData from './planning-lessons.json';
import { SALE } from './sale';

export type PlanTag = 'smart' | 'premium';

export interface OpeningRow {
  /** e.g. "Lunedì – Venerdì" */
  label: string;
  /** e.g. "06:00 – 22:00" */
  hours: string;
}

export interface Lesson {
  /** e.g. "07:40–08:30" */
  time: string;
  name: string;
  /** Absent for activities that are not tied to a room. */
  sala?: string;
}

export interface Day {
  /** "Lun" */
  short: string;
  /** "Lunedì" */
  full: string;
  classes: Lesson[];
}

export interface Band {
  id: string;
  title: string;
  planTags: PlanTag[];
  lede: string;
  days: Day[];
}

export interface GymFloor {
  title: string;
  planTags: PlanTag[];
  lede: string;
  hours: OpeningRow[];
}

const planning = data as unknown as { mese: string; gymFloor: GymFloor; bands: Band[] };

/**
 * Il mese che questo planning copre, e lo dice il palinsesto stesso: è il campo
 * `mese` del JSON, quindi si riscrive da Tina insieme agli orari. Era una
 * costante qui dentro, e cambiare il palinsesto senza toccare il codice
 * lasciava indietro il mese.
 *
 * **Non va stampato in pagina**: un'etichetta con il mese invecchia da sola e fa
 * sembrare vecchio un orario che è quello giusto. Gli orari si presentano come
 * la settimana tipo, che è ciò che sono. Serve a dire quale palinsesto è
 * caricato — a chi lo sostituisce, e all'assistente, che lo cita nella sua
 * knowledge base (`kb.json.ts`).
 */
export const PLANNING_MONTH: string = planning.mese;

export const gymFloor: GymFloor = planning.gymFloor;
export const bands: Band[] = planning.bands;

/** Look up one band by id — the activity pages each embed a single band. */
export function getBand(id: string): Band {
  const band = planning.bands.find((b) => b.id === id);
  // Loud on purpose: a typo in an activity page should fail the build rather
  // than silently render an empty timetable.
  if (!band) {
    throw new Error(
      `Fascia planning "${id}" non trovata. Disponibili: ${planning.bands.map((b) => b.id).join(', ')}`
    );
  }
  return band;
}

/** Total lessons in a band, for the "N lezioni a settimana" labels. */
export function countLessons(band: Band): number {
  return band.days.reduce((n, d) => n + d.classes.length, 0);
}

/**
 * Le fasce che si contano in ore e non in lezioni.
 *
 * Il nuoto libero non ha lezioni: ha corsie aperte in fasce da una o più ore, e
 * chiamarle lezioni dice il numero sbagliato — diciotto «lezioni» per
 * quarantaquattro ore d'acqua. Vale ovunque nel sito: l'occhiello del planning,
 * la landing della promo, la scheda orari della pagina dell'attività e il
 * totale qui sotto, che quelle diciotto non le somma più.
 *
 * Una fascia sola oggi, ma è un insieme e non un `if`: il giorno che si apre
 * una seconda vasca a ingresso libero, si aggiunge qui e la seguono tutti.
 */
export const FASCE_A_ORE = new Set(['nuoto-libero']);

/** Se questa fascia si racconta in ore invece che in lezioni. */
export function siContaAOre(id: string): boolean {
  return FASCE_A_ORE.has(id);
}

/**
 * Tutte le lezioni della settimana: corsi fitness, group reformer, scuola nuoto
 * adulti e aqua fitness. Il nuoto libero **non** ci sta dentro — sono corsie,
 * non lezioni, e le sue ore si contano con `bandHours`.
 *
 * Esiste perché il numero girava scritto a mano in tre posti diversi e in tre
 * unità diverse — «200+ corsi a settimana» sulla home, «180 lezioni» in una
 * news, «200+ ore settimanali» sugli abbonamenti. Una lezione è una lezione:
 * qui si conta quella, e chi la mostra la chiama col suo nome.
 */
export function totalLessons(): number {
  return bands.filter((b) => !siContaAOre(b.id)).reduce((n, b) => n + countLessons(b), 0);
}

/** Minuti di un intervallo del planning: `07:40–08:30`, o `Dom 09:30–12:30`. */
function durata(time: string): number {
  const [da, a] = time.replace(/^[A-Za-z]{3}\s*/, '').replace(/\s/g, '').split(/[–-]/);
  const min = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
  return min(a) - min(da);
}

/**
 * Ore di palinsesto in una settimana: la somma della durata di ogni lezione,
 * corsie del nuoto libero comprese — nel planning sono fasce come le altre.
 *
 * Arrotondate per difetto, perché è un numero che si mostra: dire «più di N ore»
 * di un totale di N,9 è vero, il contrario no.
 */
export function totalHours(): number {
  return Math.floor(bands.reduce((n, b) => n + minuti(b), 0) / 60);
}

/** Minuti di palinsesto in una fascia. */
function minuti(band: Band): number {
  return band.days.reduce((n, d) => n + d.classes.reduce((m, c) => m + durata(c.time), 0), 0);
}

/**
 * Ore di palinsesto in una fascia, arrotondate per difetto come il totale.
 *
 * Serve dove contare le lezioni direbbe il numero sbagliato: il nuoto libero
 * non ha lezioni ma corsie aperte in fasce da una o più ore, e diciotto
 * «lezioni» stanno per quarantaquattro ore d'acqua.
 */
export function bandHours(band: Band): number {
  return Math.floor(minuti(band) / 60);
}

/**
 * Il testo di presentazione di una fascia, coi numeri sostituiti da quelli veri.
 *
 * Il palinsesto cambia ogni mese, i numeri scritti a mano dentro il testo no: i
 * corsi fitness hanno dichiarato «80 lezioni» sotto un occhiello che ne contava
 * 79, cioè lo stesso dato in due versioni nella stessa schermata. Nel JSON il
 * testo porta i segnaposto `{n}` — le lezioni della fascia — e `{ore}`, le sue
 * ore; qui diventano il conteggio del momento. Aggiungendo o togliendo una
 * lezione dal palinsesto si aggiornano da soli, come l'occhiello.
 */
export function ledeOf(band: Band): string {
  return band.lede
    .replace(/\{n\}/g, String(countLessons(band)))
    .replace(/\{ore\}/g, String(bandHours(band)));
}

/**
 * Ore di sala aperta in una settimana, dagli orari della Gym Floor: la fascia
 * infrasettimanale conta cinque volte, sabato e domenica una.
 */
export function openHours(): number {
  return Math.floor(
    gymFloor.hours.reduce((n, h) => n + durata(h.hours) * (/venerd/i.test(h.label) ? 5 : 1), 0) / 60
  );
}

/**
 * Le sale che una fascia usa davvero, nell'ordine della legenda.
 *
 * L'ordine è quello di `SALE`, che è la lista condivisa: qui c'era una copia
 * delle stesse sale, e una copia è una cosa in più da ricordare di aggiornare.
 */
export function roomsOf(band: Band): string[] {
  const used = new Set(band.days.flatMap((d) => d.classes.map((c) => c.sala)).filter(Boolean));
  return SALE.filter((r) => used.has(r));
}

/* ---- Lesson cards (description, video, characteristics) ---------------- */

export interface LessonStat {
  /** Label, e.g. "Intensità muscolare" */
  l: string;
  /** 0–100 */
  v: number;
}

export interface LessonCard {
  /** Rich text — contains <b> and <br> from the source, rendered as HTML. */
  desc: string;
  videoUrl?: string;
  /** Seconds to seek to before showing the frame, when the opening is dull. */
  videoStart?: number;
  stats?: LessonStat[];
}

const cards = lessonData as unknown as Record<string, LessonCard>;

/**
 * Timetable names and card keys do not match exactly, so lookups normalise:
 * trademark symbols, punctuation and spacing are dropped. "MOTR®" in the
 * timetable is "MOTR" in the cards, for instance.
 */
function normalise(name: string): string {
  return name
    .toUpperCase()
    .replace(/[®™]/g, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Names the normaliser cannot resolve on its own because the timetable is
 * shorter than the card title, and the short form is ambiguous.
 */
const LESSON_ALIASES: Record<string, string> = {
  PILATES: 'PILATES MATWORK',
  'BODY PUMP': 'LES MILLS BODY PUMP',
};

const cardsByKey = new Map(Object.entries(cards).map(([k, v]) => [normalise(k), v]));

/** The card for a timetable entry, or null when none is written yet. */
export function getLessonCard(name: string): LessonCard | null {
  const key = normalise(name);
  return cardsByKey.get(LESSON_ALIASES[key] ?? key) ?? cardsByKey.get(key) ?? null;
}

/**
 * Cards for every lesson in the given bands, keyed by the exact timetable name
 * so the client can look them up without repeating the normalising rules.
 * Lessons with no card are left out — they render as plain, non-clickable
 * entries rather than opening an empty panel.
 */
export function lessonCardsFor(bandIds: string[]): Record<string, LessonCard> {
  const out: Record<string, LessonCard> = {};
  for (const id of bandIds) {
    for (const day of getBand(id).days) {
      for (const lesson of day.classes) {
        const card = getLessonCard(lesson.name);
        if (card) out[lesson.name] = card;
      }
    }
  }
  return out;
}

/**
 * Room colours are functional here — they are the timetable's legend.
 *
 * Questi sono i valori per le bande chiare, e il fondo è bianco puro: misurato
 * su tutte le pagine che le usano, `/planning` e gli orari dentro le attività,
 * non c'è una crema di mezzo. Il nome della sala è testo da 11,5px, quindi
 * servono 4,5:1.
 *
 * Quattro dei sei colori originali non ci arrivavano — stavano tra 3,0 e 3,4:1 —
 * e sono stati scuriti col minimo nero che porta a soglia. Due erano già a
 * norma e non si toccano:
 *
 * | sala | originale | prima | ora | contrasto |
 * | --- | --- | --- | --- | --- |
 * | Sala A | `#c45010` | 4,66:1 | invariato | 4,66:1 |
 * | Sala B | `#9a8c18` | 3,42:1 | `#837714` (15% nero) | 4,55:1 |
 * | Sala C | `#5a9970` | 3,37:1 | `#4c815e` (16%) | 4,56:1 |
 * | Vasca Piccola | `#3a9fc4` | 3,03:1 | `#2e7f9d` (20%) | 4,53:1 |
 * | Vasca Grande | `#2d4f8a` | 8,09:1 | invariato | 8,09:1 |
 * | Gym Floor | `#ff5701` | 3,17:1 | `#bb4001` | 5,46:1 |
 *
 * Il Gym Floor non è stato scurito del suo minimo — sarebbe finito su `#d14701`,
 * troppo vicino al `#c45010` della Sala A per una legenda — ma porta `#bb4001`,
 * lo stesso valore di `--accent-text` in global.css, che è l'arancione che il
 * sito usa già quando il marchio pieno non regge il contrasto. Oggi comunque
 * nessuna lezione ha «Gym Floor» come sala: il colore serve solo alla legenda.
 *
 * Le due tavolozze restano distinguibili dentro ogni banda: le legende che
 * compaiono davvero accostano Sala A e Sala B (ruggine e oliva) e Vasca Piccola e
 * Vasca Grande (foglia di tè e blu).
 */
export const ROOM_COLORS: Record<string, string> = {
  'Sala A': '#c45010',
  'Sala B': '#837714',
  'Sala C': '#4c815e',
  'Vasca Piccola': '#2e7f9d',
  'Vasca Grande': '#2d4f8a',
  'Gym Floor': '#bb4001',
};

/**
 * Gli stessi colori per la banda scura, dove i primi non si leggono.
 *
 * La tavolozza qui sopra vale sul bianco. Il planning e le fasce dentro le
 * pagine delle attività girano anche in versione scura, e lì il nome della sala
 * è testo da 11,5px su una card che risulta `rgb(63,60,59)`: la Vasca Grande
 * scendeva a **1,35:1**, cioè spariva, e nessuna delle sei arrivava al 4,5:1.
 * I valori qui sotto partono dai colori originali, non da quelli scuriti per il
 * bianco: schiarire un colore già scurito perderebbe la tinta due volte.
 *
 * Ogni valore è il colore originale schiarito col bianco della quantità minima
 * che porta a 4,5:1 su quel fondo: dal 19% della Vasca Piccola al 51% della Vasca
 * Grande. Il minimo, non una quantità uguale per tutte, perché la tinta resta
 * più vicina possibile a quella della legenda:
 *
 * | sala | originale | su fondo scuro | schiarito | contrasto |
 * | --- | --- | --- | --- | --- |
 * | Sala A | `#c45010` | 2,34:1 | `#dc9872` (41%) | 4,57:1 |
 * | Sala B | `#9a8c18` | 3,20:1 | `#b3a952` (25%) | 4,54:1 |
 * | Sala C | `#5a9970` | 3,24:1 | `#82b192` (24%) | 4,50:1 |
 * | Vasca Piccola | `#3a9fc4` | 3,61:1 | `#5fb1cf` (19%) | 4,52:1 |
 * | Vasca Grande | `#2d4f8a` | 1,35:1 | `#98a9c6` (51%) | 4,59:1 |
 * | Gym Floor | `#ff5701` | 3,44:1 | `#ff8648` (28%) | 4,56:1 |
 *
 * Aggiungendo una sala, il valore scuro si calcola così: si mischia col bianco
 * finché il contrasto su `rgb(63,60,59)` non passa 4,5:1, e si tiene il primo
 * che ce la fa.
 */
export const ROOM_COLORS_ON_DARK: Record<string, string> = {
  'Sala A': '#dc9872',
  'Sala B': '#b3a952',
  'Sala C': '#82b192',
  'Vasca Piccola': '#5fb1cf',
  'Vasca Grande': '#98a9c6',
  'Gym Floor': '#ff8648',
};

/** Il colore della sala per il fondo su cui va: chiaro o scuro. */
export function roomColor(sala: string, variant: 'light' | 'dark' = 'light'): string | undefined {
  return (variant === 'dark' ? ROOM_COLORS_ON_DARK : ROOM_COLORS)[sala];
}

/*
 * Ogni sala dell'elenco condiviso ha i suoi due colori.
 *
 * Un controllo al build e non un tipo: `Record<Sala, string>` non ferma una
 * chiave che manca, e stringere il tipo delle due tavolozze romperebbe chi le
 * indicizza con una stringa qualunque. Questo invece si fa sentire subito, ed è
 * il momento giusto per accorgersene: una sala senza colore non dà errore in
 * pagina, sparisce dalla legenda in silenzio.
 */
for (const sala of SALE) {
  for (const [dove, tavolozza] of [
    ['chiaro', ROOM_COLORS],
    ['scuro', ROOM_COLORS_ON_DARK],
  ] as const) {
    if (!tavolozza[sala]) {
      throw new Error(
        `La sala "${sala}" non ha un colore per il fondo ${dove}. ` +
          `Aggiungilo in planning.ts, o togli la sala da SALE in data/sale.ts.`
      );
    }
  }
}
