import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Help-desk articles — the Athlon wiki, moved in from its own project.
 *
 * The glob loader gives each entry an id that keeps its folder, so
 * src/content/articles/generali/certificato-medico.md becomes
 * /wikiathlon/generali/certificato-medico — the exact path the standalone wiki
 * served. That is deliberate: articles cross-link to each other with absolute
 * /wikiathlon/... URLs, /abbonamenti links to four of them, and the paths are
 * indexed. Changing the shape would break all three at once.
 */
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // One article can belong to more than one area, so this is a string or a list.
    area: z.union([z.string(), z.array(z.string())]),
    tags: z.array(z.string()).optional().default([]),
    order: z.number().optional().default(99),
    draft: z.boolean().optional().default(false),
    updatedDate: z.string().optional(),
  }),
});

/**
 * Events — modelled on the masterclasses the old site ran: a discipline, a
 * date, and a programme split by room with a lesson/time/trainer line-up.
 *
 * The date is a real date, not a formatted string, so the site can tell an
 * upcoming event from a past one and print the weekday itself.
 */
const eventi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/eventi' }),
  schema: z.object({
    title: z.string(),
    /** Small label above the title, e.g. "Masterclass" or "Open Day". */
    kicker: z.string().default('Evento'),
    date: z.coerce.date(),
    /** Shown next to the date when the event does not run all day. */
    time: z.string().optional(),
    image: z.string(),
    imageAlt: z.string().optional(),
    /** One or two lines for the cards and previews. */
    excerpt: z.string(),
    /** Free events say so loudly — it is the strongest thing on the card. */
    free: z.boolean().default(false),
    price: z.string().optional(),
    ctaLabel: z.string().default('Prenota ora'),
    ctaHref: z.string().default('https://athlon.perfectgym.com/ClientPortal2/#/Registration'),
    /**
     * Practical notes — what to bring, what is required. A list rather than a
     * paragraph so every event renders it the same way and the CMS form has a
     * field for it instead of relying on the editor to remember the pattern.
     */
    notes: z.array(z.string()).optional().default([]),
    /** Line-up per room, as the old masterclass pages laid it out. */
    program: z
      .array(
        z.object({
          room: z.string(),
          slots: z.array(
            z.object({
              time: z.string(),
              lesson: z.string(),
              trainer: z.string().optional(),
            })
          ),
        })
      )
      .optional()
      .default([]),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { articles, eventi };
