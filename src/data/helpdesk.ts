/**
 * Help-desk categories.
 *
 * Keyed by the folder the articles live in, which is also the first segment of
 * their URL. The wiki's own `area` frontmatter is free text and can hold more
 * than one value, so grouping goes by folder instead — one article, one place
 * in the index.
 */
export interface AreaMeta {
  label: string;
  /** One line under the category heading, for people scanning the index. */
  blurb: string;
}

export const AREA_LABELS: Record<string, AreaMeta> = {
  generali: {
    label: 'Generali',
    blurb: 'Certificato medico, prenotazioni, pagamenti, documenti e spogliatoi.',
  },
  adulti: {
    label: 'Adulti e Club',
    blurb: 'Abbonamenti, sospensioni, disdette, sala pesi e norme del club.',
  },
  snb: {
    label: 'Scuola Nuoto Bambini',
    blurb: 'Iscrizioni, livelli, recuperi, brevetti e organizzazione dei corsi.',
  },
  news: {
    label: 'Avvisi',
    blurb: 'Comunicazioni e variazioni di orario in corso.',
  },
};

/** Index order for the help-desk section. */
export const AREA_ORDER = ['generali', 'adulti', 'snb', 'news'] as const;
