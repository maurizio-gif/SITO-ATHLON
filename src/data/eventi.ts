import { getCollection, type CollectionEntry } from 'astro:content';

export type Evento = CollectionEntry<'eventi'>;

/** Midnight today, so an event still counts as upcoming on the day it runs. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function published(): Promise<Evento[]> {
  return (await getCollection('eventi')).filter((e) => !e.data.draft);
}

/** Upcoming events, soonest first — the order every listing wants. */
export async function upcomingEvents(limit?: number): Promise<Evento[]> {
  const today = startOfToday();
  const list = (await published())
    .filter((e) => e.data.date >= today)
    .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
  return limit ? list.slice(0, limit) : list;
}

/** Past events, most recent first, for the archive further down the page. */
export async function pastEvents(limit?: number): Promise<Evento[]> {
  const today = startOfToday();
  const list = (await published())
    .filter((e) => e.data.date < today)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return limit ? list.slice(0, limit) : list;
}

const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/**
 * "domenica 27 settembre" — the weekday is derived from the date rather than
 * typed into the content, so it can never disagree with it.
 */
export function formatEventDate(date: Date, withYear = false): string {
  const base = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

/** Compact form for badges and cards: "27 SET". */
export function formatEventBadge(date: Date): { day: string; month: string } {
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS[date.getMonth()].slice(0, 3).toUpperCase(),
  };
}
