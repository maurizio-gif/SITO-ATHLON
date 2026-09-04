/**
 * I personal trainer del club, una volta sola.
 *
 * Il numero stava scritto a mano in sette punti — l'occhiello della hero, la
 * riga di fiducia, il meta, lo schema, una f.a.q., la card della home e
 * `llms.txt` — e sarebbe divergito al primo trainer aggiunto, come era già
 * successo ai corsi fitness. Qui la lista è la fonte e il numero si conta.
 */

export type GruppoTrainer = {
  /** L'intestazione del blocco: `Laurea`, `Specializzazioni`, `Servizi proposti`. */
  label: string;
  items: string[];
};

export type Trainer = {
  name: string;
  image: string;
  /** Facoltativa: chi non l'ha data non ne ha una, e non se ne inventa una. */
  quote?: string;
  /** L'id PerfectGym del calendario personale, `null` se non ce l'ha ancora. */
  trainerId: string | null;
  groups: GruppoTrainer[];
};

/**
 * Trainer roster, in the same order as the old site's accordion. `trainerId` is
 * the PerfectGym id used to open that coach's own availability calendar —
 * Filippo has none yet, so his CTA falls back to the general booking page.
 *
 * `quote` is optional: a coach who has not given one gets no quote, because an
 * invented one is worse than a missing one.
 */
export const TRAINER: Trainer[] = [
  {
    name: 'Giulia Pagliaccia',
    image: '/wp-content/uploads/2024/08/pt-giulia-pagliaccia.jpg',
    quote: 'Chi non balla non sa cosa succede',
    trainerId: '42',
    groups: [
      {
        label: 'Laurea',
        items: [
          'Magistrale in Scienze Motorie Preventive Adattate presso il Foro Italico',
          'Magistrale in Tecniche Ortopediche',
        ],
      },
      {
        label: 'Specializzazioni',
        items: ['Diploma di Alta Formazione per Ballerini', 'Pilates Reformer Balanced Body'],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Percorsi posturali',
          'Lezioni individuali di Pilates, GPassè, Yoga e Reformer',
          'Percorsi di recupero funzionale post infortunio',
        ],
      },
    ],
  },
  {
    name: 'Manuel Di Censi',
    image: '/wp-content/uploads/2024/08/pt-manuel-di-censi.jpg',
    quote: "L'unica competizione che non possiamo permetterci il lusso di perdere è quella contro noi stessi",
    trainerId: '43',
    groups: [
      {
        label: 'Laurea',
        items: [
          "Magistrale al Foro Italico in scienza e tecnica delle attività motorie preventive ed adattate",
        ],
      },
      {
        label: 'Specializzazioni',
        items: [
          'Istruttore primo livello per la Jury Chechi Academy',
          'Master Elav Personal Training Specialist',
          'Antigravity Trainer',
        ],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Schede di allenamento personalizzate',
          "Percorsi personalizzati per il dimagrimento e l'ipertrofia",
          'Percorsi posturali',
          'Allenamento funzionale',
          'Allenamento calistenico',
        ],
      },
    ],
  },
  {
    name: 'Valerio Palermo',
    image: '/wp-content/uploads/2024/08/pt-valerio-palermo.jpg',
    quote: 'Intensità e concentrazione sono la chiave di ogni allenamento ben riuscito',
    trainerId: '44',
    groups: [
      {
        label: 'Laurea',
        items: ['Magistrale in Scienze Motorie Preventive Adattate presso Tor Vergata'],
      },
      {
        label: 'Specializzazioni',
        items: [
          'Master Elav, Fitness Instructor',
          'Master Elav, Personal Trainer Specialist',
          'Master Elav, Hypertrophy Specialist',
          'Master Elav, Slimming Trainer Specialist',
        ],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Schede di allenamento personalizzate',
          "Percorsi per l'ipertrofia e la tonificazione",
          'Percorsi per il dimagrimento',
          'Allenamento in gravidanza e post parto',
          'Percorsi di recupero funzionale post infortunio',
        ],
      },
    ],
  },
  {
    name: 'Dario Rossini',
    image: '/wp-content/uploads/2024/08/pt-dario-rossini.jpg',
    quote: 'Se vuoi realmente fare qualcosa troverai il modo. Se non vuoi veramente troverai una scusa',
    trainerId: '98',
    groups: [
      {
        label: 'Laurea',
        items: ['Magistrale in Scienze e Tecniche dello Sport presso il Foro Italico'],
      },
      {
        label: 'Specializzazioni',
        items: ['Personal Trainer FIPE livello 2', 'Master Elav Personal Trainer Specialist'],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Schede di allenamento personalizzate',
          'Percorsi posturali',
          "Percorsi per l'ipertrofia e il dimagrimento",
          'Preparazione atletica sport specifica',
        ],
      },
    ],
  },
  {
    name: 'Alessandra Re',
    image: '/wp-content/uploads/2024/08/pt-alessandra-re.jpg',
    quote: "Fissare degli obiettivi è il primo passo per trasformare l'invisibile nel visibile",
    trainerId: '210',
    groups: [
      {
        label: 'Laurea',
        items: ['Magistrale in attività motoria preventiva e adattata presso il Foro Italico'],
      },
      {
        label: 'Specializzazioni',
        items: [
          'Master Clinical Exercises ELAV',
          'Corso di specializzazione Posturalmed per il riequilibrio posturale',
          'Reformer Balanced Body',
        ],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Percorsi individuali per contrastare o ridurre le malattie metaboliche',
          'Percorsi posturali',
          'Percorsi di riabilitazione post intervento',
          'Percorsi di tonificazione e dimagrimento',
        ],
      },
    ],
  },
  {
    name: 'Filippo Fiorita',
    image: '/wp-content/uploads/2024/08/pt-filippo-fiorita.jpg',
    quote: 'Anche per arrivare in cima alla montagna più alta si comincia con un passo',
    trainerId: null,
    groups: [
      {
        label: 'Specializzazioni',
        items: [
          'Istruttore Pesistica FIPE 1° livello',
          'Istruttore Fitness e Bodybuilding Nonsolofitness 1° livello',
        ],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Schede di allenamento personalizzate',
          'Preparazione atletica generale e specifica',
          'Personal di ginnastica posturale',
        ],
      },
    ],
  },
  {
    name: 'Barbata Battilana',
    image: '/wp-content/uploads/2026/09/pt-barbata-battilana.jpg',
    trainerId: '232',
    groups: [
      {
        label: 'Specializzazioni',
        items: [
          'Tecnico Federale FIPE 1° livello Cultura Fisica',
          'Tecnico Federale FGI 1° livello "Ginnastica per tutti"',
          'Tecnico Federale FIPE Strength Yoga, Strength Pilates e Calistenic',
          'Tecnico CSEN "Ginnastica in acqua"',
          'Pilates Reformer Balanced Body',
          'Area 4.1 Matwork',
        ],
      },
      {
        label: 'Servizi proposti',
        items: [
          'Schede base di avviamento alla sala pesi',
          'Riequilibrio posturale',
          'Lezioni individuali di Pilates e Reformer',
        ],
      },
    ],
  },
];

/** Quanti sono. Non si scrive: si conta. */
export const NUMERO_TRAINER = TRAINER.length;

const PAROLE = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];

/**
 * Il numero a parole, per le frasi in cui una cifra stonerebbe («Sette trainer
 * qualificati»). Oltre il dieci torna la cifra, che a quel punto è la forma
 * giusta comunque.
 */
export const NUMERO_TRAINER_PAROLA = PAROLE[NUMERO_TRAINER] ?? String(NUMERO_TRAINER);

/** La stessa parola a inizio frase. */
export const NUMERO_TRAINER_PAROLA_CAP =
  NUMERO_TRAINER_PAROLA.charAt(0).toUpperCase() + NUMERO_TRAINER_PAROLA.slice(1);

/**
 * Le aree su cui il personal training lavora, una volta sola.
 *
 * Stavano scritte a mano in tre punti della sola `/personal-training` — il
 * sottotitolo della hero, la descrizione dello schema e la f.a.q. su come si
 * scegle il trainer — e **già divergevano**: «recupero funzionale post
 * infortunio», «recupero funzionale», «recupero post infortunio» sono la stessa
 * area scritta in tre modi. Con la promo di settembre, che regala due sedute e
 * quindi deve raccontare il servizio dentro la landing, la quarta copia sarebbe
 * arrivata su una pagina che nessuno rilegge quando il servizio cambia.
 *
 * Sono le aree dichiarate dal club, non la somma dei «Servizi proposti» dei
 * trainer: quella lista è di ognuno di loro e cambia col roster, questa è il
 * perimetro del servizio.
 */
export const AREE_TRAINER = [
  'Postura',
  'Ipertrofia',
  'Dimagrimento',
  'Recupero funzionale post infortunio',
  'Gravidanza e post parto',
] as const;

/**
 * Le stesse aree dentro una frase: minuscole, virgole, e la «e» prima
 * dell'ultima — «postura, ipertrofia, dimagrimento, recupero funzionale post
 * infortunio, gravidanza e post parto».
 *
 * L'ultima area porta già una «e» dentro di sé («Gravidanza e post parto»),
 * quindi la congiunzione la fa la virgola e non un «e» aggiunto, che darebbe
 * «gravidanza e post parto e gravidanza». Da qui il `join(', ')` secco: la
 * lista finisce con un'area che si legge come una coppia.
 */
export const AREE_TRAINER_TESTO = AREE_TRAINER.map((a) => a.toLowerCase()).join(', ');
