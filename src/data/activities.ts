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

/**
 * Un glifo per attività, e la chiave è l'**etichetta** con cui l'attività
 * compare in `plans` — non lo slug di `ACTIVITY_TAGS`.
 *
 * Le due liste non coincidono e non devono: qui c'è `Athlon TV`, che è un
 * servizio in streaming e non un'attività taggabile, e non ci sono i corsi
 * junior, che negli abbonamenti adulti non entrano. La chiave è l'etichetta
 * perché è quella che l'elenco delle attività comprese stampa e che
 * `AttivitaModal` usa per trovare la spiegazione.
 *
 * Stavano dentro `abbonamenti.astro`, e ci sono rimaste finché le mostrava solo
 * quella pagina. Da quando le mostra anche `/prova` sono qui: un'attività
 * nuova prende la sua icona una volta, e chi non ce l'ha ricade sul pallino.
 *
 * Icone di linea in `currentColor`, così prendono l'inchiostro della scheda che
 * le ospita — chiara o scura.
 */
export const ICONE_ATTIVITA: Record<string, string> = {
  'Athlon TV': `<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>`,
  'Gym Floor': `<path d="M6.5 6.5v11"/><path d="M17.5 6.5v11"/><path d="M3.5 9v6"/><path d="M20.5 9v6"/><path d="M6.5 12h11"/>`,
  'Corsi Fitness': `<circle cx="9" cy="7" r="3"/><path d="M2 21v-1.5A4.5 4.5 0 0 1 6.5 15h5A4.5 4.5 0 0 1 16 19.5V21"/><circle cx="18" cy="8" r="2.5"/><path d="M22 21v-1a3.5 3.5 0 0 0-3-3.46"/>`,
  'Group Reformer': `<path d="M3 17h18"/><path d="M6 17v-3.5A2.5 2.5 0 0 1 8.5 11h7a2.5 2.5 0 0 1 2.5 2.5V17"/><circle cx="12" cy="6" r="2.5"/>`,
  'Aqua Fitness': `<path d="M2 8.5c2.5-2 4.5 2 7 0s4.5 2 7 0 3.5 1 4 1.2"/><path d="M2 14c2.5-2 4.5 2 7 0s4.5 2 7 0 3.5 1 4 1.2"/><path d="M2 19.5c2.5-2 4.5 2 7 0s4.5 2 7 0 3.5 1 4 1.2"/>`,
  'Scuola Nuoto Adulti': `<circle cx="17" cy="7" r="2"/><path d="M3 14c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3-.4 4.2.6"/><path d="M6 10.5 11 8l4 3"/>`,
  'Nuoto Libero Assistito': `<circle cx="7" cy="8" r="2"/><path d="M10 11.5 15.5 9 21 12"/><path d="M2 17c1.8-1.6 3.6 1.6 5.4 0s3.6 1.6 5.4 0 3.6 1.6 5.4 0 1.4-.6 1.8-.9"/>`,
  'Corso Gestanti': `<path d="M12 21s-7-4.3-7-9.4A4.1 4.1 0 0 1 12 8.6a4.1 4.1 0 0 1 7 3c0 5.1-7 9.4-7 9.4Z"/><circle cx="12" cy="4" r="1.6"/>`,
};
