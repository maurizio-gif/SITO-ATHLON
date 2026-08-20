import { defineConfig } from 'tinacms';
import { ACTIVITY_TAGS } from '../src/data/activities';
import { SALE } from '../src/data/sale';

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

// Credenziali TinaCloud.
//
// Il **client id** sta qui in chiaro e va bene così: è l'identificativo con cui
// il pannello, che gira nel browser di chi scrive, dice a TinaCloud di quale
// progetto si tratta. Finisce comunque dentro il bundle di /admin, quindi
// tenerlo in una variabile d'ambiente darebbe l'illusione di un segreto senza
// nasconderlo a nessuno — e costerebbe un deploy rotto ogni volta che qualcuno
// dimentica di impostarla. La variabile resta come scavalco, per puntare un
// altro progetto senza toccare il codice.
//
// Il **token** invece è un segreto vero — legge il contenuto del repository —
// e sta solo fra le variabili d'ambiente:
//   TINA_TOKEN  →  Vercel: Project Settings > Environment Variables
//
// Il progetto è https://app.tina.io/projects/f1554e47-10b5-4176-b73b-89a13f5529b4
// (uno per repository: quello del TCA non vale qui).

export default defineConfig({
  branch:
    process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_BRANCH || process.env.HEAD || 'main',
  clientId: process.env.TINA_CLIENT_ID || 'f1554e47-10b5-4176-b73b-89a13f5529b4',
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
      // ─── PLANNING ──────────────────────────────────────────────────────────
      // Il palinsesto della settimana, e da qui si muove mezzo sito.
      //
      // È un documento solo — il palinsesto corrente — quindi non si crea e non
      // si cancella: si riscrive. Ogni pagina che mostra orari legge da questo
      // file attraverso `data/planning.ts`, così una lezione spostata cambia
      // insieme /planning, /corsi-fitness, le quindici pagine dei corsi, la
      // pagina di ogni attività in acqua e i conteggi che il sito stampa
      // («N lezioni a settimana», «più di N ore»): sono calcolati, non scritti.
      //
      // Il nome della lezione è la chiave con cui la pagina del corso trova i
      // suoi orari, e la sala è la chiave del colore in legenda: la prima è
      // testo libero perché un corso nuovo deve poter entrare in palinsesto, la
      // seconda è una tendina perché le sale sono sei e sono quelle.
      // ───────────────────────────────────────────────────────────────────────
      {
        name: 'planning',
        label: 'Planning (orari settimanali)',
        path: 'src/data',
        format: 'json',
        match: { include: 'planning-corrente' },
        ui: {
          // Uno e uno solo: un secondo palinsesto sarebbe un palinsesto che
          // nessuna pagina legge, e cancellare questo lascerebbe il sito senza
          // orari da mostrare.
          allowedActions: { create: false, delete: false },
          // **Niente `router` qui.** Sembra il modo di dare al documento un link
          // alla sua pagina, e invece dice a Tina un'altra cosa: che quel
          // documento si modifica *visualmente*, sulla pagina. Al click il
          // pannello va su `#/~/planning` invece che sul modulo, la pagina è
          // Astro statico e non ha gli hook di Tina, e chi ci arriva legge
          // «Looks like there's nothing to edit on this page» — cioè la
          // collezione risulta vuota pur essendo piena. È l'unica che l'aveva
          // ed era l'unica che non si apriva.
        },
        fields: [
          {
            type: 'string',
            name: 'mese',
            label: 'Mese coperto da questo palinsesto',
            description:
              'Non compare nelle pagine — un orario giusto con un mese vecchio accanto sembra vecchio. Serve a te per sapere cosa è caricato, e all’assistente della chat, che lo cita.',
            required: true,
          },

          {
            type: 'object',
            name: 'gymFloor',
            label: 'Gym Floor · sala aperta',
            description:
              'La Gym Floor non ha lezioni: ha orari di apertura. Da qui esce anche il totale di ore di sala aperta che il sito mostra.',
            fields: [
              { type: 'string', name: 'title', label: 'Titolo', required: true },
              {
                type: 'string',
                name: 'planTags',
                label: 'Compresa negli abbonamenti',
                list: true,
                options: [
                  { value: 'smart', label: 'Smart' },
                  { value: 'premium', label: 'Premium' },
                ],
                required: true,
              },
              {
                type: 'string',
                name: 'lede',
                label: 'Testo di presentazione',
                ui: { component: 'textarea' },
                required: true,
              },
              {
                type: 'object',
                name: 'hours',
                label: 'Orari di apertura',
                list: true,
                ui: { itemProps: (i) => ({ label: [i?.label, i?.hours].filter(Boolean).join(' · ') }) },
                fields: [
                  {
                    type: 'string',
                    name: 'label',
                    label: 'Giorni (es. Lunedì – Venerdì)',
                    required: true,
                  },
                  {
                    type: 'string',
                    name: 'hours',
                    label: 'Dalle – alle (es. 06:00 – 22:00)',
                    description:
                      'Le ore si sommano da sole: una fascia scritta male non fa errore, fa un totale sbagliato.',
                    required: true,
                  },
                ],
              },
            ],
          },

          {
            type: 'object',
            name: 'bands',
            label: 'Fasce di palinsesto',
            list: true,
            ui: { itemProps: (i) => ({ label: i?.title }) },
            fields: [
              {
                type: 'string',
                name: 'id',
                label: 'Codice della fascia',
                description:
                  'NON cambiarlo: è il nome con cui le pagine chiedono questa fascia (corsi-fitness, group-reformer, scuola-nuoto-adulti, nuoto-libero, aqua-fitness). Cambiandolo il sito non compila più.',
                required: true,
              },
              { type: 'string', name: 'title', label: 'Titolo della fascia', required: true },
              {
                type: 'string',
                name: 'planTags',
                label: 'Compresa negli abbonamenti',
                list: true,
                options: [
                  { value: 'smart', label: 'Smart' },
                  { value: 'premium', label: 'Premium' },
                ],
                required: true,
              },
              {
                type: 'string',
                name: 'lede',
                label: 'Testo di presentazione',
                description:
                  'Scrivi {n} dove va il numero di lezioni della fascia e {ore} dove vanno le sue ore: li sostituisce il sito contando il palinsesto, così non restano indietro.',
                ui: { component: 'textarea' },
                required: true,
              },
              {
                type: 'object',
                name: 'days',
                label: 'Giorni',
                list: true,
                ui: {
                  itemProps: (i) => ({
                    label: `${i?.full ?? 'Giorno'} · ${i?.classes?.length ?? 0} lezioni`,
                  }),
                },
                fields: [
                  { type: 'string', name: 'short', label: 'Sigla (Lun)', required: true },
                  { type: 'string', name: 'full', label: 'Giorno (Lunedì)', required: true },
                  {
                    type: 'object',
                    name: 'classes',
                    label: 'Lezioni del giorno',
                    list: true,
                    ui: {
                      itemProps: (i) => ({
                        label: [i?.time, i?.name, i?.sala].filter(Boolean).join(' · '),
                      }),
                    },
                    fields: [
                      {
                        type: 'string',
                        name: 'time',
                        label: 'Orario (es. 07:40–08:30)',
                        description:
                          'Con il trattino lungo e senza spazi. Da qui il sito calcola la durata, quindi le ore totali dipendono da come è scritto.',
                        required: true,
                      },
                      {
                        type: 'string',
                        name: 'name',
                        label: 'Lezione',
                        description:
                          'Scrivilo **come si chiama nella sua pagina**: è con questo nome che la pagina del corso trova i suoi orari e che si apre la scheda della lezione. Cambiandolo, quella pagina scrive «questo mese non è in palinsesto».',
                        required: true,
                      },
                      {
                        type: 'string',
                        name: 'sala',
                        label: 'Sala',
                        description: 'Vuoto per le attività che non stanno in una sala.',
                        options: SALE.map((s) => ({ value: s, label: s })),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

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
            /* «News» non c'è più: quella era la chiusura della vasca, che è una
               notizia e ora vive fra le news con una pagina sua. Lasciare
               l'opzione qui vorrebbe dire poter rimettere un avviso in un
               elenco di procedure. */
            options: ['Generali', 'Adulti – Club', 'Scuola Nuoto Bambini'],
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

      // ─── NEWS ──────────────────────────────────────────────────────────────
      // Ogni news è un articolo con un indirizzo suo: /news/<nome-file>. Il
      // nome del file lo fa lo slug del titolo, quindi il titolo si scrive
      // pensando anche al link.
      //
      // La differenza con l'Help Desk è il tempo, non il tono: una news è
      // datata e invecchia, una scheda dell'Help Desk risponde a una domanda
      // che si ripete. Se una comunicazione vale ancora fra un anno, è una
      // scheda.
      // ───────────────────────────────────────────────────────────────────────
      {
        name: 'news',
        label: 'News',
        path: 'src/content/news',
        format: 'md',
        ui: {
          filename: {
            slugify: (values) =>
              (values?.title || 'nuova-news')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
          },
          defaultItem: () => ({
            date: new Date().toISOString(),
            category: 'Club',
          }),
        },
        fields: [
          { type: 'string', name: 'title', label: 'Titolo', isTitle: true, required: true },
          {
            type: 'datetime',
            name: 'date',
            label: 'Data',
            required: true,
            ui: { dateFormat: 'DD/MM/YYYY' },
            description: 'Ordina le news: la più recente compare prima.',
          },
          {
            type: 'string',
            name: 'category',
            label: 'Categoria (l’etichetta sulla card)',
            options: ['Club', 'Struttura', 'Corsi', 'Orari', 'Scuola Nuoto', 'Eventi'],
          },
          {
            type: 'string',
            name: 'excerpt',
            label: 'Riassunto (la card mostra questo, e i motori lo usano come descrizione)',
            required: true,
            ui: { component: 'textarea' },
          },
          { type: 'image', name: 'image', label: 'Immagine' },
          {
            type: 'string',
            name: 'imageAlt',
            label: 'Descrizione immagine (per accessibilità e SEO)',
          },
          {
            type: 'string',
            name: 'ctaLabel',
            label: 'Pulsante · testo',
            description:
              'Facoltativo. Il pulsante appare in fondo all’articolo, non sulla card: dalla card si va a leggere la notizia.',
          },
          { type: 'string', name: 'ctaHref', label: 'Pulsante · link' },
          attivitaField,
          { type: 'boolean', name: 'draft', label: 'Bozza (non pubblicare)' },
          {
            type: 'rich-text',
            name: 'body',
            label: 'La notizia',
            isBody: true,
            description:
              'Il testo dell’articolo. Il riassunto sopra non va ripetuto qui: sulla pagina compare già in cima.',
          },
        ],
      },

      // ─── SERVIZI ───────────────────────────────────────────────────────────
      // Le voci della sezione Servizi del Club Life. Non hanno una pagina
      // loro: sono una riga sempre visibile e un testo che si apre.
      // ───────────────────────────────────────────────────────────────────────
      {
        name: 'servizi',
        label: 'Servizi',
        path: 'src/content/servizi',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Nome del servizio', isTitle: true, required: true },
          {
            type: 'number',
            name: 'order',
            label: 'Ordine nell’elenco (numero più basso = più in alto)',
          },
          {
            type: 'string',
            name: 'desc',
            label: 'Una riga, sempre visibile',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'detail',
            label: 'Il resto, che si apre al tocco',
            required: true,
            ui: { component: 'textarea' },
          },
          { type: 'string', name: 'href', label: 'Link (una pagina del sito o un indirizzo esterno)' },
          { type: 'string', name: 'hrefLabel', label: 'Testo del link' },
          attivitaField,
          { type: 'boolean', name: 'draft', label: 'Bozza (non pubblicare)' },
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
