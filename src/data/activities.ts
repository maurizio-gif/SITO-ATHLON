/**
 * The club's macro activities, as the home page carousels name them.
 *
 * They are the vocabulary for the `attivita` field on articles, events, news
 * and services, and they are what the Help Desk asks for before the question:
 * "disdetta", "recuperi" and "cambio orario" are different procedures for a gym
 * membership and for the children's swimming school, and the activity is what
 * tells them apart.
 *
 * Leaving `attivita` empty is a real choice, not a gap: a piece about the
 * medical certificate or the changing rooms applies to everyone, and tagging it
 * with all twelve would only make it look activity-specific. Empty means
 * "valid for every activity", and the box treats it that way.
 */
export interface ActivityTag {
  id: string;
  label: string;
  /** Which of the two carousels it belongs to — and, in the Help Desk, whether
      an article filed under `adulti` or under `snb` is the relevant one. */
  audience: 'adulti' | 'junior';
}

export const ACTIVITY_TAGS: ActivityTag[] = [
  { id: 'gym-floor', label: 'Gym Floor', audience: 'adulti' },
  { id: 'corsi-fitness', label: 'Corsi Fitness', audience: 'adulti' },
  { id: 'group-reformer', label: 'Group Reformer', audience: 'adulti' },
  { id: 'personal-training', label: 'Personal Training', audience: 'adulti' },
  { id: 'nuoto-libero', label: 'Nuoto Libero Assistito', audience: 'adulti' },
  { id: 'aqua-fitness', label: 'Aqua Fitness', audience: 'adulti' },
  { id: 'scuola-nuoto-adulti', label: 'Scuola Nuoto Adulti', audience: 'adulti' },
  { id: 'gestanti', label: 'Corso Gestanti', audience: 'adulti' },
  { id: 'baby-nuoto', label: 'Baby Nuoto', audience: 'junior' },
  { id: 'scuola-nuoto-bambini', label: 'Scuola Nuoto Bambini', audience: 'junior' },
  { id: 'pallanuoto', label: 'Pallanuoto', audience: 'junior' },
  { id: 'nuoto-agonistico', label: 'Nuoto Agonistico', audience: 'junior' },
];

/** Tuple form, for the Zod enum that validates the frontmatter. */
export const ACTIVITY_IDS = ACTIVITY_TAGS.map((a) => a.id) as [string, ...string[]];

export const ACTIVITY_LABEL: Record<string, string> = Object.fromEntries(
  ACTIVITY_TAGS.map((a) => [a.id, a.label])
);

export const ACTIVITY_AUDIENCE: Record<string, 'adulti' | 'junior'> = Object.fromEntries(
  ACTIVITY_TAGS.map((a) => [a.id, a.audience])
);

/** Everything that happens in the water: the pool closure and the guaranteed
    temperatures concern exactly these, and not the gym floor. */
export const WATER_ACTIVITIES = [
  'nuoto-libero',
  'aqua-fitness',
  'scuola-nuoto-adulti',
  'gestanti',
  'baby-nuoto',
  'scuola-nuoto-bambini',
  'pallanuoto',
  'nuoto-agonistico',
];
