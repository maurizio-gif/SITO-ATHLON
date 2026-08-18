/**
 * L'elenco unico delle pagine attività, per i rimandi fra pagine.
 *
 * Serve a una cosa sola: quando una pagina consiglia un'altra attività, la
 * scheda (nome e foto) va trovata sia fra i corsi per adulti sia fra quelli per
 * bambini — un genitore che guarda il Baby Nuoto va mandato all'Aqua Fitness, e
 * dalla Scuola Nuoto Bambini alla Pallanuoto.
 */
import { CORSI } from './corsi';
import { JUNIOR } from './junior';

export interface SchedaPagina {
  slug: string;
  nome: string;
  hero: string;
}

/**
 * Gym Floor e Group Reformer hanno una pagina propria, scritta a mano prima di
 * questo modello, quindi nome e foto vanno indicati qui: la foto è la stessa
 * che apre le loro pagine.
 */
const A_MANO: SchedaPagina[] = [
  {
    slug: 'gym-floor',
    nome: 'Gym Floor',
    hero: '/wp-content/uploads/2024/08/ACK2162Giacomo-lattanzio_-1-1024x683.jpg',
  },
  { slug: 'reformer', nome: 'Group Reformer', hero: '/wp-content/uploads/2025/03/Athlon130-scaled.jpg' },
];

export const PAGINE: SchedaPagina[] = [
  ...CORSI.map((c) => ({ slug: c.slug, nome: c.nome, hero: c.hero })),
  ...JUNIOR.map((c) => ({ slug: c.slug, nome: c.nome, hero: c.hero })),
  ...A_MANO,
];

/** Le pagine per adulti: tutto tranne i corsi per bambini. */
export const PAGINE_ADULTI: SchedaPagina[] = [
  ...CORSI.map((c) => ({ slug: c.slug, nome: c.nome, hero: c.hero })),
  ...A_MANO,
];

/** La scheda di una pagina, o null se lo slug non esiste. */
export function scheda(slug: string): SchedaPagina | null {
  return PAGINE.find((p) => p.slug === slug) ?? null;
}
