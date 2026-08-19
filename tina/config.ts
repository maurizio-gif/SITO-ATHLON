import { defineConfig } from 'tinacms';
import { ACTIVITY_TAGS } from '../src/data/activities';

// Le attività sono definite una volta sola in src/data/activities.ts: lo stesso
// elenco valida il frontmatter, popola questa tendina e disegna il primo passo
// del box dell'Help Desk. Aggiungerne una lì la fa comparire in tutti e tre.
const attivitaField = {
  type: 'string' as const,
  name: 'attivita',
  label: 'Attività di riferimento (lascia vuoto se vale per tutte)',
  description:
    'Serve al box dell’Help Desk: chi cerca sceglie prima l’attività, e questi tag portano in cima la risposta giusta. Vuoto = vale per ogni attività.',
  list: true,
  options: ACTIVITY_TAGS.map((a) => ({ value: a.id, label: a.label })),
};

// Credenziali TinaCloud — da aggiungere come variabili d'ambiente:
//   TINA_CLIENT_ID  →  Vercel: Project Settings > Environment Variables
//   TINA_TOKEN      →  stessa posizione
// Si ottengono creando un progetto per QUESTO repo su https://app.tina.io
// (uno per repository: quello del TCA non vale qui).

export default defineConfig({
  branch:
    process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_BRANCH || process.env.HEAD || 'main',
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },

  media: {
    tina: {
      // Le immagini del sito stanno sotto public/wp-content/uploads/
      mediaRoot: 'wp-content/uploads',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      // ─── EVENTI ────────────────────────────────────────────────────────────
      // Template standard: ogni evento ha la stessa struttura, e "Crea nuovo"
      // parte già compilato (defaultItem) con una sala e due lezioni da
      // modificare. Il testo libero vive solo nel corpo; tutto il resto è un
      // campo, così la pagina viene sempre uguale.
      // ───────────────────────────────────────────────────────────────────────
      {
        name: 'eventi',
        label: 'Eventi',
        path: 'src/content/eventi',
        format: 'md',
        ui: {
          // Il nome file diventa lo slug dell'URL: /eventi/<slug>
          filename: {
            slugify: (values) =>
              (values?.title || 'nuovo-evento')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
          },
          defaultItem: () => ({
            kicker: 'Masterclass',
            date: new Date().toISOString(),
            time: '09:30 – 13:00',
            image: '/wp-content/uploads/2025/11/ATHLON79-scaled.jpg',
            excerpt: '',
            free: true,
            ctaLabel: 'Prenota ora',
            ctaHref: 'https://athlon.perfectgym.com/ClientPortal2/#/Registration',
            notes: ['Prenotazione dall’app o dal portale'],
            program: [
              {
                room: 'Sala A',
                slots: [
                  { time: '09:30', lesson: '', trainer: '' },
                  { time: '10:20', lesson: '', trainer: '' },
                ],
              },
            ],
          }),
        },
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Titolo evento',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'kicker',
            label: 'Tipo di evento (etichetta sopra al titolo)',
            required: true,
            options: ['Masterclass', 'Open Day', 'Evento', 'Gara', 'Stage'],
          },
          {
            type: 'datetime',
            name: 'date',
            label: 'Data',
            required: true,
            ui: { dateFormat: 'DD/MM/YYYY' },
            description:
              'Il giorno della settimana viene calcolato dal sito: non va scritto a mano.',
          },
          {
            type: 'string',
            name: 'time',
            label: 'Orario (es. 09:30 – 13:00)',
          },
          {
            type: 'image',
            name: 'image',
            label: 'Immagine di copertina',
            required: true,
          },
          {
            type: 'string',
            name: 'imageAlt',
            label: 'Descrizione immagine (per accessibilità e SEO)',
          },
          {
            type: 'string',
            name: 'excerpt',
            label: 'Riassunto breve (una o due righe, appare nelle card in home)',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'boolean',
            name: 'free',
            label: 'Evento gratuito (mostra il badge "Gratuito")',
          },
          {
            type: 'string',
            name: 'price',
            label: 'Prezzo, se a pagamento (es. €10)',
          },
          {
            type: 'string',
            name: 'notes',
            label: 'Informazioni pratiche',
            list: true,
            description: 'Cosa portare, cosa serve. Una voce per riga.',
          },
          {
            type: 'object',
            name: 'program',
            label: 'Programma',
            list: true,
            ui: { itemProps: (item) => ({ label: item?.room || 'Sala' }) },
            fields: [
              {
                type: 'string',
                name: 'room',
                label: 'Sala o spazio (es. Sala A, Vasca Grande, Gym Floor)',
                required: true,
              },
              {
                type: 'object',
                name: 'slots',
                label: 'Lezioni',
                list: true,
                ui: {
                  itemProps: (item) => ({
                    label: [item?.time, item?.lesson].filter(Boolean).join(' — ') || 'Lezione',
                  }),
                },
                fields: [
                  { type: 'string', name: 'time', label: 'Orario (es. 09:30)', required: true },
                  { type: 'string', name: 'lesson', label: 'Lezione', required: true },
                  { type: 'string', name: 'trainer', label: 'Trainer' },
                ],
              },
            ],
          },
          {
            type: 'string',
            name: 'ctaLabel',
            label: 'Testo del pulsante',
          },
          {
            type: 'string',
            name: 'ctaHref',
            label: 'Link del pulsante',
          },
          attivitaField,
          {
            type: 'boolean',
            name: 'draft',
            label: 'Bozza (non pubblicare)',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Descrizione dell’evento',
            isBody: true,
            description:
              'Il racconto dell’evento. Le informazioni pratiche vanno nel campo sopra, non qui.',
          },
        ],
      },

      // ─── HELP DESK (la wiki) ───────────────────────────────────────────────
      // Attenzione: la cartella determina l'URL, /wikiathlon/<cartella>/<file>.
      // Spostare un articolo di cartella ne cambia il link.
      // ───────────────────────────────────────────────────────────────────────
      {
        name: 'articles',
        label: 'Help Desk',
        path: 'src/content/articles',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Titolo', isTitle: true, required: true },
          {
            type: 'string',
            name: 'description',
            label: 'Sottotitolo / riassunto',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'area',
            label: 'Area',
            list: true,
            options: ['Generali', 'Adulti – Club', 'Scuola Nuoto Bambini', 'News'],
          },
          { type: 'string', name: 'tags', label: 'Tag', list: true },
          attivitaField,
          {
            type: 'number',
            name: 'order',
            label: 'Ordine nell’elenco (numero più basso = più in alto)',
          },
          { type: 'string', name: 'updatedDate', label: 'Data aggiornamento' },
          { type: 'boolean', name: 'draft', label: 'Bozza (non pubblicare)' },
          { type: 'rich-text', name: 'body', label: 'Contenuto', isBody: true },
        ],
      },

      // ─── PROMO ─────────────────────────────────────────────────────────────
      // La landing /promo, che cambia ogni mese. È un documento solo: non si
      // crea e non si cancella, si riscrive. Da qui si cambiano il titolo, la
      // scadenza del conto alla rovescia e i passaggi dell'iscrizione.
      //
      // I prezzi non ci sono, ed è voluto: la pagina li legge dal listino in
      // src/data/abbonamenti.ts, l'unico posto dove vivono. Metterli anche qui
      // vorrebbe dire poterli cambiare in un posto solo dei due.
      // ───────────────────────────────────────────────────────────────────────
      {
        name: 'promo',
        label: 'Promo del mese (/promo)',
        path: 'src/content/promo',
        format: 'md',
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'string',
            name: 'titolo',
            label: 'Titolo della promo',
            description: 'Es. «Promo Agosto 2026». Diventa anche il titolo della pagina nei motori di ricerca.',
            isTitle: true,
            required: true,
          },
          { type: 'string', name: 'occhiello', label: 'Occhiello sopra il titolo', required: true },
          {
            type: 'string',
            name: 'claim',
            label: 'L’offerta in una riga',
            description: 'Es. «Quota di attivazione in omaggio». È la frase arancione sotto il titolo.',
            required: true,
          },
          {
            type: 'string',
            name: 'sommario',
            label: 'Sommario',
            ui: { component: 'textarea' },
            required: true,
          },
          { type: 'string', name: 'validoSu', label: 'Su cosa è valida', required: true },
          {
            type: 'datetime',
            name: 'scadenza',
            label: 'Scadenza (il conto alla rovescia arriva a zero qui)',
            description: 'Passata questa data la pagina lo dice da sola e il conto sparisce.',
            required: true,
          },
          { type: 'string', name: 'scadenzaLabel', label: 'Etichetta sopra il conto alla rovescia', required: true },
          {
            type: 'string',
            name: 'quotaBarrata',
            label: 'Quota di attivazione barrata (solo il numero)',
            description: 'Il prezzo che compare sbarrato sulle schede. Senza il simbolo €.',
            required: true,
          },
          { type: 'image', name: 'foto', label: 'Foto di sfondo dell’apertura', required: true },

          {
            type: 'string',
            name: 'senzaAccountTitolo',
            label: 'Chi non ha un account · titolo',
            required: true,
          },
          {
            type: 'string',
            name: 'senzaAccountTesto',
            label: 'Chi non ha un account · testo',
            ui: { component: 'textarea' },
            required: true,
          },
          { type: 'string', name: 'conAccountTitolo', label: 'Chi ha già un account · titolo', required: true },
          {
            type: 'string',
            name: 'conAccountTesto',
            label: 'Chi ha già un account · testo',
            ui: { component: 'textarea' },
            required: true,
          },

          { type: 'string', name: 'proceduraTitolo', label: 'Procedura · titolo', required: true },
          {
            type: 'string',
            name: 'proceduraIntro',
            label: 'Procedura · introduzione (facoltativa)',
            description: 'Lasciala vuota e sopra i passaggi non compare niente.',
            ui: { component: 'textarea' },
          },
          { type: 'string', name: 'procedura', label: 'Procedura · passaggi', list: true, required: true },
          {
            type: 'string',
            name: 'proceduraNota',
            label: 'Procedura · nota sul metodo di pagamento',
            ui: { component: 'textarea' },
            required: true,
          },

          { type: 'string', name: 'faqTitolo', label: 'Domande · titolo', required: true },
          {
            type: 'object',
            name: 'faq',
            label: 'Domande frequenti',
            list: true,
            ui: { itemProps: (i) => ({ label: i?.q }) },
            fields: [
              { type: 'string', name: 'q', label: 'Domanda', required: true },
              {
                type: 'string',
                name: 'a',
                label: 'Risposta (ammette link HTML)',
                ui: { component: 'textarea' },
                required: true,
              },
            ],
          },

          { type: 'string', name: 'chiSiamoTitolo', label: 'Chi siamo · titolo', required: true },
          {
            type: 'string',
            name: 'chiSiamo',
            label: 'Chi siamo · capoversi',
            list: true,
            ui: { component: 'textarea' },
            required: true,
          },

          { type: 'string', name: 'strutturaTitolo', label: 'La struttura · titolo', required: true },
          {
            type: 'string',
            name: 'strutturaTesto',
            label: 'La struttura · testo',
            ui: { component: 'textarea' },
            required: true,
          },
          { type: 'string', name: 'struttura', label: 'La struttura · spazi', list: true, required: true },

          { type: 'string', name: 'contattiTitolo', label: 'Contatti · titolo', required: true },
          {
            type: 'string',
            name: 'contattiTesto',
            label: 'Contatti · testo',
            ui: { component: 'textarea' },
            required: true,
          },

          { type: 'boolean', name: 'draft', label: 'Bozza (la pagina non si pubblica)' },
        ],
      },
    ],
  },
});
