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
import data from './planning-settembre.json';
import lessonData from './planning-lessons.json';

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

const planning = data as unknown as { gymFloor: GymFloor; bands: Band[] };

/** The month this planning covers, for labelling. Update with the data. */
export const PLANNING_MONTH = 'Settembre 2026';

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

/** Rooms actually used by a band, in a stable order, for its legend. */
/**
 * Tutte le lezioni della settimana, in tutte le fasce: corsi fitness, group
 * reformer, scuola nuoto adulti, nuoto libero e aqua fitness.
 *
 * Esiste perché il numero girava scritto a mano in tre posti diversi e in tre
 * unità diverse — «200+ corsi a settimana» sulla home, «180 lezioni» in una
 * news, «200+ ore settimanali» sugli abbonamenti. Una lezione è una lezione:
 * qui si conta quella, e chi la mostra la chiama col suo nome.
 */
export function totalLessons(): number {
  return bands.reduce((n, b) => n + countLessons(b), 0);
}

export function roomsOf(band: Band): string[] {
  const order = ['Sala A', 'Sala B', 'Sala C', 'Vasca Media', 'Vasca Grande'];
  const used = new Set(band.days.flatMap((d) => d.classes.map((c) => c.sala)).filter(Boolean));
  return order.filter((r) => used.has(r));
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

/** Room colours are functional here — they are the timetable's legend. */
export const ROOM_COLORS: Record<string, string> = {
  'Sala A': '#c45010',
  'Sala B': '#9a8c18',
  'Sala C': '#5a9970',
  'Vasca Media': '#3a9fc4',
  'Vasca Grande': '#2d4f8a',
  'Gym Floor': '#ff5701',
};
