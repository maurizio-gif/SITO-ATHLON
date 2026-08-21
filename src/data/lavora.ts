/**
 * `/lavora`: i vantaggi, le posizioni aperte e le costanti del modulo.
 *
 * Sta qui e non nel CMS per la stessa ragione dei prezzi: la pagina elenca gli
 * annunci e il form li offre nella tendina, e da due posti diversi
 * divergerebbero — con il risultato che qualcuno si candida a un ruolo che
 * l'elenco non mostra più. Aggiungere una posizione è aggiungere una voce a
 * `POSIZIONI`, e compare in tutti e due.
 *
 * **Un annuncio inventato è peggio di un annuncio assente**, e qui più che
 * altrove: manda una persona a scrivere una lettera per un posto che non
 * esiste. Se non sai se una posizione è ancora aperta, toglila — la pagina
 * regge benissimo l'elenco vuoto, perché la candidatura spontanea resta.
 */

/**
 * Un pezzo di annuncio: un titoletto con sotto un testo, un elenco, o
 * entrambi. Gli annunci non hanno tutti la stessa forma — uno ha «Cosa
 * cerchiamo» e «Plus», un altro «Le tue sfide quotidiane» e «Cosa offriamo» —
 * e un'interfaccia con i campi fissi costringerebbe a piegarli.
 */
export interface Blocco {
  titolo?: string;
  testo?: string;
  voci?: string[];
}

export interface Posizione {
  /** Va nella tendina e nel database: minuscolo, con i trattini. */
  id: string;
  titolo: string;
  /** Il paragrafo che apre l'annuncio, prima dei blocchi. */
  apertura?: string[];
  blocchi: Blocco[];
  /** La riga del contratto, che tutti e tre hanno e dicono in modo diverso. */
  contratto?: string;
  contrattoNota?: string;
  /** L'ultima riga, quella che invita a mandare il CV. */
  chiusura?: string;
}

/** I quattro punti di «Unisciti al team Athlon», in cima alla pagina. */
export const VANTAGGI = [
  'Ambiente professionale e stimolante',
  'Formazione continua e affiancamento tecnico',
  'Possibilità di crescita interna',
  'Team giovane, dinamico e appassionato',
];

const CONTRATTO_SPORTIVO = 'CCNL Impianti Sportivi / Collaborazione Sportiva (CO.CO.CO) / Partita IVA';
const CONTRATTO_NOTA = 'In base al profilo e alla disponibilità';

export const POSIZIONI: Posizione[] = [
  {
    id: 'istruttore-scuola-nuoto',
    titolo: 'Istruttore Scuola Nuoto e Baby Nuoto',
    apertura: [
      'Da oltre 50 anni insegniamo a nuotare con passione, professionalità e dedizione.',
      'Siamo **Scuola Nuoto Federale FIN dal 2014** e accompagniamo i nostri allievi dal livello base fino a quello avanzato, con un’attenzione particolare allo sviluppo delle loro capacità in acqua e nella vita.',
    ],
    blocchi: [
      {
        titolo: 'Cosa cerchiamo',
        voci: [
          'Ottime capacità relazionali con bambini e ragazzi',
          'Energia, motivazione e spirito di iniziativa',
          'Competenze tecnico-didattiche e gestione di gruppi',
          '**Certificazione FIN Istruttore Scuola Nuoto**',
          'Disponibilità a lavorare su turni e nei weekend',
        ],
      },
      { titolo: 'Esperienza', testo: 'Anche prima esperienza.' },
    ],
    contratto: CONTRATTO_SPORTIVO,
    contrattoNota: CONTRATTO_NOTA,
  },

  {
    id: 'trainer-fitness',
    titolo: 'Trainer Fitness, Aqua Fitness & Assistente Sala Pesi',
    apertura: [
      'Vuoi crescere in un ambiente dinamico e stimolante? Athlon Club è in continua evoluzione e cerca nuovi talenti nel mondo del fitness.',
    ],
    blocchi: [
      {
        titolo: 'Cosa cerchiamo',
        voci: [
          'Attitudine positiva e ottime doti comunicative',
          'Esperienza (anche minima) come trainer o assistente sala',
          'Tesseramento presso un Ente di Promozione Sportiva riconosciuto dal **CONI**',
          'Disponibilità part-time o full-time, anche nel weekend',
        ],
      },
      {
        titolo: 'Plus',
        voci: [
          'Laurea in Scienze Motorie',
          'Passione per il movimento come stile di vita',
          '**Trainer specializzati nel settore MIND** (Yoga, Pilates, Group Reformer) con disponibilità soprattutto **il sabato e la domenica mattina**',
        ],
      },
    ],
    contratto: CONTRATTO_SPORTIVO,
    contrattoNota: CONTRATTO_NOTA,
  },

  {
    id: 'accoglienza',
    titolo: 'Addetto/a Accoglienza e Gestione Utenti',
    apertura: [
      'Il nostro **Addetto/a all’Accoglienza e Gestione Utenti** è il vero motore del club. Non è un semplice addetto all’accoglienza, ma una figura solare, proattiva e digitale, capace di guidare verso i servizi più adatti alle diverse esigenze.',
    ],
    blocchi: [
      {
        titolo: 'Questo è il lavoro ideale per te se',
        voci: [
          'Lo sport non è solo un hobby, ma il tuo stile di vita.',
          'Hai una naturale predisposizione al contatto con il pubblico e alle relazioni umane.',
          'Sei un «nativo digitale» o comunque ami utilizzare la tecnologia per ottimizzare il lavoro.',
          'Non temi i cambiamenti, ma li vedi come un’opportunità di crescita.',
        ],
      },
      {
        titolo: 'Le tue sfide quotidiane',
        voci: [
          'Gestione del front-desk e accoglienza calorosa degli utenti.',
          'Supporto nei processi di acquisizione e gestione degli utenti.',
          'Gestione dei processi gestionali e digitali del club.',
          'Collaborazione attiva con il team per garantire un servizio d’eccellenza.',
        ],
      },
      {
        titolo: 'Requisiti',
        voci: [
          'Ottime capacità comunicative e relazionali.',
          'Spiccata propensione al lavoro di squadra.',
          'Disponibilità a lavorare su turni, inclusi i fine settimana.',
        ],
      },
      {
        titolo: 'Cosa offriamo',
        voci: [
          '**Contratto Full Time** (CCNL Impianti Sportivi).',
          '**Crescita professionale:** ti supporteremo con una formazione dedicata per renderti un esperto del settore. Valutiamo con piacere candidature di ambo i sessi, anche se alla prima esperienza lavorativa.',
          '**Un ambiente stimolante:** entrerai a far parte di una vera community, in un contesto moderno e orientato al futuro.',
        ],
      },
    ],
    chiusura:
      '**Sei pronto a metterti in gioco e a entrare nella nostra squadra?** Inviaci il tuo CV e raccontaci perché sei tu la persona che stiamo cercando!',
  },
];

/**
 * La voce che c'è sempre, anche quando l'elenco è pieno: un club assume anche
 * fuori dagli annunci, e chi si presenta prima che il posto si apra è
 * esattamente la persona che si vorrebbe avere in archivio.
 */
export const SPONTANEA = {
  id: 'spontanea',
  titolo: 'Candidatura spontanea',
} as const;

/** Il tetto del curriculum, in byte. Lo stesso dell'allegato dell'Help Desk. */
export const CV_MAX_BYTE = 5 * 1024 * 1024;

/** Cosa accetta il campo del curriculum. PDF in testa, che è quello giusto. */
export const CV_TIPI = '.pdf,.doc,.docx,application/pdf,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Il webhook n8n che salva su Supabase e manda il curriculum al club. */
export const ENDPOINT_CANDIDATURA =
  'https://automazione.n8ndevelop.it/webhook/athlon-candidatura';

/**
 * Il grassetto degli annunci, che nei testi è scritto `**così**`.
 *
 * Markdown vero sarebbe una dipendenza per una sola sintassi; qui basta questa,
 * e il testo resta leggibile nel file. L'HTML in ingresso viene scappato prima,
 * quindi un annuncio non può iniettare markup anche se lo contenesse.
 */
export function conGrassetto(testo: string): string {
  const scappato = testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return scappato.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
