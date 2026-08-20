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
  /* L'area «Avvisi» non c'è più: il suo unico articolo era la chiusura della
     vasca, che è una notizia e adesso vive fra le news, con una pagina sua. Un
     avviso e una scheda di assistenza si leggono in due momenti diversi della
     vita di un socio, e tenerli nello stesso elenco significava che chi cercava
     «come disdico» trovava «a luglio la vasca è chiusa». */
};

/** Index order for the help-desk section. */
export const AREA_ORDER = ['generali', 'adulti', 'snb'] as const;
