import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { ACTIVITY_IDS } from './data/activities';

/**
 * Which of the club's macro activities a piece of content belongs to.
 *
 * Validated against the list in data/activities.ts, so a typo fails the build
 * instead of silently producing a tag nothing matches. An empty list is the
 * normal case for anything that applies to everyone — the medical certificate,
 * the changing rooms, the payment method — and the Help Desk reads it as
 * "valid for every activity" rather than "untagged".
 */
const attivita = z.array(z.enum(ACTIVITY_IDS)).optional().default([]);

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
    /**
     * Il titolo per i motori, quando quello della pagina è una domanda troppo
     * lunga per starci. La pagina continua a mostrare `title`: le domande scritte
     * come le si fanno sono buone intestazioni, e non vanno accorciate per stare
     * in un tag. Serve solo dove il `<title>` supererebbe i sessanta caratteri.
     */
    seoTitle: z.string().optional(),
    description: z.string(),
    // One article can belong to more than one area, so this is a string or a list.
    area: z.union([z.string(), z.array(z.string())]),
    tags: z.array(z.string()).optional().default([]),
    order: z.number().optional().default(99),
    attivita,
    draft: z.boolean().optional().default(false),
    /**
     * Fuori dai motori di ricerca, pur restando pubblicata.
     *
     * Serve alle schede che sono la destinazione di un percorso — la chat manda
     * qui il genitore che ha appena lasciato i dati — e che si vogliono
     * raggiungere solo da lì. La pagina emette `noindex` **e** sparisce dalla
     * sitemap: dichiarare una pagina nella sitemap e poi dirle di non
     * indicizzarla è una contraddizione che i motori segnalano.
     */
    noindex: z.boolean().optional().default(false),
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
    /* La destinazione di default è la registrazione al portale, quindi
       l'etichetta dice quello: «prenota il tuo posto» sarebbe una promessa che
       quella pagina non mantiene. Un evento con un vero link di prenotazione
       mette la sua etichetta nel suo file. */
    ctaLabel: z.string().default('Registrati per partecipare'),
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
    attivita,
    draft: z.boolean().optional().default(false),
  }),
});

/**
 * Club news — short announcements with a date, the sort of thing that used to
 * go out only on social. Dated so the newest surfaces first and the archive
 * keeps itself in order.
 */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** Small label on the card, e.g. "Struttura" or "Corsi". */
    category: z.string().default('Club'),
    excerpt: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    attivita,
    draft: z.boolean().optional().default(false),
  }),
});

/**
 * Club services — the things that are neither an activity nor a subscription:
 * the app, the changing rooms, the guest pass. Each carries a short line for
 * the list and a longer one behind it.
 */
const servizi = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servizi' }),
  schema: z.object({
    title: z.string(),
    /** Lower sorts first. */
    order: z.number().default(99),
    /** One line, always visible. */
    desc: z.string(),
    /** The rest, revealed on demand. */
    detail: z.string(),
    /** Where to send someone who wants it — a page or an external link. */
    href: z.string().optional(),
    hrefLabel: z.string().optional(),
    attivita,
    draft: z.boolean().optional().default(false),
  }),
});

/**
 * La landing della promozione del mese: /promo.
 *
 * È una collezione di un documento solo, non una lista. Sta qui e non in un
 * file di dati perché la promo cambia ogni mese e a cambiarla è chi la decide,
 * non chi tocca il codice: da Tina si riscrive il titolo, la scadenza del
 * conto alla rovescia e i passaggi dell'iscrizione, e la pagina segue.
 *
 * I prezzi **non** stanno qui: la pagina legge i piani annuali da
 * `data/abbonamenti.ts`, che è già l'unico posto dove vivono. Un listino
 * ricopiato in una landing è un listino che diverge al primo ritocco.
 */
const promo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/promo' }),
  schema: z.object({
    titolo: z.string(),
    occhiello: z.string(),
    claim: z.string(),
    sommario: z.string(),
    validoSu: z.string(),
    /** Il momento in cui il conto alla rovescia arriva a zero. */
    scadenza: z.coerce.date(),
    scadenzaLabel: z.string(),
    /** La quota di attivazione barrata, in euro e senza simbolo. */
    quotaBarrata: z.string(),
    foto: z.string(),
    /* Le due vie per arrivare all'abbonamento. Sono due perché il portale ne
       ha due davvero: chi non è registrato crea l'account dentro l'iscrizione,
       chi lo è già entra e attiva da dentro — e sono i cinque passi qui sotto,
       che valgono solo per lui. */
    senzaAccountTitolo: z.string(),
    senzaAccountTesto: z.string(),
    conAccountTitolo: z.string(),
    conAccountTesto: z.string(),
    proceduraTitolo: z.string(),
    /* Facoltativa: i quattro passi si spiegano da soli, e una riga di
       introduzione sopra un elenco numerato è spesso solo un'altra cosa da
       leggere. Resta il campo, così tornare a metterla è scrivere in Tina. */
    proceduraIntro: z.string().optional().default(''),
    procedura: z.array(z.string()),
    /** La riga in fondo ai passaggi: cosa si accetta come metodo di pagamento. */
    proceduraNota: z.string(),
    faqTitolo: z.string(),
    /* Le domande che uno si fa prima di firmare, non dopo: il pro-rata, il
       certificato, la disdetta. Stanno qui e non in un componente perché sono
       la parte della pagina che cambia col listino e con le regole, e a
       cambiarla è chi le conosce. */
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    chiSiamoTitolo: z.string(),
    chiSiamo: z.array(z.string()),
    strutturaTitolo: z.string(),
    strutturaTesto: z.string(),
    struttura: z.array(z.string()),
    contattiTitolo: z.string(),
    contattiTesto: z.string(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { articles, eventi, news, promo, servizi };
