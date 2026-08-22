/**
 * Il contenuto di `/privacy`.
 *
 * Sta in un file di dati e non nella pagina perché è di due nature diverse, e
 * mescolarle sarebbe il modo di sbagliare entrambe:
 *
 *  - **la parte tecnica** — cosa il sito scrive nel browser, quali form ci
 *    sono, dove finiscono i dati — è verificabile dal codice, e va tenuta in
 *    pari col codice. Se un giorno si aggiunge un identificativo o un servizio
 *    terzo, si aggiorna qui;
 *  - **l'informativa** è un documento del club, non del sito: la scrive chi ne
 *    risponde. Finché `INFORMATIVA` è vuota la pagina lo dice, invece di far
 *    finta.
 *
 * Vale qui la regola di `club.ts`: **un dato inventato è peggio di un dato
 * assente**. Nessuna finalità, nessun termine di conservazione e nessuna base
 * giuridica plausibile-ma-non-verificata. Solo ciò che il repository sa.
 */
import { CLUB } from './club';

/** Chi risponde del trattamento, con i soli dati che il repository ha. */
export const TITOLARE = {
  ragioneSociale: CLUB.legale.ragione,
  nomeCommerciale: CLUB.brand,
  email: CLUB.email,
};

export interface Voce {
  chiave: string;
  dove: string;
  cosa: string;
  durata: string;
  categoria: 'necessario' | 'funzionale' | 'marketing';
}

/**
 * Cosa il sito scrive nel browser di chi lo visita, per intero.
 *
 * Non sono cookie in senso tecnico — sono `localStorage` e `sessionStorage` —
 * ma la regola che li governa è la stessa: è archiviazione nel terminale, e
 * quella che non serve al servizio richiesto va chiesta.
 *
 * L'elenco corrisponde a `scripts/attribuzione.ts`, `lib/chatAssistente.client.js`
 * e `components/clublife/HelpDesk.astro`. Toccare uno di quelli senza toccare
 * questo elenco vuol dire un'informativa che descrive un altro sito.
 */
export const STORAGE: Voce[] = [
  {
    chiave: 'athlon_vid',
    dove: 'localStorage',
    cosa: 'Un identificativo casuale del browser, senza dati personali dentro. Serve a riconoscere una richiesta che arriva dalla stessa persona quando torna, anche con un indirizzo email diverso.',
    durata: 'Finché non si svuota il browser',
    categoria: 'marketing',
  },
  {
    chiave: 'athlon_utm',
    dove: 'sessionStorage',
    cosa: 'La campagna da cui la visita è arrivata (parametri utm_*, gclid, fbclid), letta una volta al primo tocco.',
    durata: 'La sessione del browser',
    categoria: 'marketing',
  },
  {
    chiave: 'athlon_email',
    dove: 'localStorage',
    cosa: "L'indirizzo email che hai già lasciato in un modulo, per non chiedertelo di nuovo la volta successiva. Resta sul tuo dispositivo: non viene riletto dai nostri sistemi, e sul totem in ingresso al club non viene mai memorizzato né mostrato.",
    durata: 'Finché non si svuota il browser',
    categoria: 'funzionale',
  },
  {
    chiave: 'athlon:assistente:sessione',
    dove: 'sessionStorage',
    cosa: "L'identificativo della conversazione con l'assistente, perché una risposta sappia cosa è stato chiesto prima.",
    durata: 'La sessione del browser',
    categoria: 'necessario',
  },
  {
    chiave: 'athlon:helpdesk',
    dove: 'sessionStorage',
    cosa: 'Il punto a cui si è arrivati nel box delle domande frequenti, per non ricominciare da capo cambiando pagina.',
    durata: 'La sessione del browser',
    categoria: 'necessario',
  },
  {
    chiave: 'athlon_sid',
    dove: 'sessionStorage',
    cosa: "Un identificativo della visita, senza dati personali dentro, che raggruppa le pagine viste nella stessa scheda: dice quante pagine ha avuto una visita, non chi l'ha fatta. Come per athlon_utm, non serve il tuo consenso perché muore con la scheda e non identifica nessuno da solo.",
    durata: 'La sessione del browser',
    categoria: 'necessario',
  },
  {
    chiave: 'athlon_notrack',
    dove: 'localStorage',
    cosa: "Il contrassegno di chi ha chiesto di non essere conteggiato fra le visite: lo usa chi lavora al sito, perché le sue prove non falsino i numeri. Esiste solo se è stato acceso, e il suo effetto è che da questo browser non viene registrata nessuna pagina vista.",
    durata: 'Finché non si svuota il browser',
    categoria: 'necessario',
  },
];

export interface Destinatario {
  nome: string;
  dominio: string;
  perche: string;
  /**
   * Esiste solo quando il banner c'è. Elencare CookieYes fra i destinatari
   * mentre il banner non è attivo sarebbe scrivere una cosa falsa in
   * un'informativa, che è il posto peggiore dove scriverne una.
   */
  soloConBanner?: boolean;
}

/**
 * I servizi di terzi che ricevono dati, o che possono scriverne, quando si usa
 * il sito. Corrisponde agli endpoint in `lib/provaForm.client.js` e
 * `lib/chatAssistente.client.js` e agli `iframe` del sito.
 */
export const DESTINATARI: Destinatario[] = [
  {
    nome: 'n8n (automazione del club)',
    dominio: 'automazione.n8ndevelop.it',
    perche:
      /* Non «prova gratuita»: il Guest Pass costa 19 € (data/abbonamenti.ts).
         La stessa confusione era già stata corretta una volta sulla f.a.q.
         del sito (vedi il commento su GUEST_PASS in data/faq.ts) — il nome
         vero, quello che compare sul pulsante e nel modal, è «Prova Athlon». */
      "Riceve i dati del modulo «Prova Athlon» e dell'assistente: nome, cognome, email, cellulare, l'attività di interesse e, se acconsentito, l'attribuzione della campagna. Riceve anche, ad ogni pagina caricata, l'identificativo di visita e la pagina stessa: è il conteggio di quante pagine vengono viste, non un modulo compilato.",
  },
  {
    nome: 'Calendly',
    dominio: 'calendly.com',
    perche:
      "Prenotazione del richiamo telefonico. Il link arriva precompilato con i dati già lasciati e con la conversazione avuta con l'assistente.",
  },
  {
    nome: 'PerfectGym',
    dominio: 'athlon.perfectgym.com',
    perche: 'Il portale del club: registrazione, abbonamenti, prenotazione delle lezioni.',
  },
  {
    nome: 'Google Tag Manager e Google Maps',
    dominio: 'googletagmanager.com, google.com',
    perche:
      'Gestione dei tag di misurazione e la mappa della sede in fondo a ogni pagina.',
  },
  {
    nome: 'Vimeo',
    dominio: 'player.vimeo.com',
    perche:
      'I video di Athlon TV e delle pagine delle attività, richiesti in modalità «do not track».',
  },
  {
    nome: 'MPSkin',
    dominio: 'my.mpskin.com',
    perche: 'Il tour virtuale della struttura.',
  },
  {
    nome: 'CookieYes',
    dominio: 'cdn-cookieyes.com',
    perche: 'Raccoglie e conserva la scelta sui cookie, e la ripresenta a ogni visita.',
    soloConBanner: true,
  },
];

export interface Sezione {
  titolo: string;
  /**
   * Blocchi di HTML, non capoversi: il documento ha tabelle ed elenchi, e
   * appiattirli in prosa perderebbe metà di quello che dicono. Ogni voce porta
   * il suo tag — `<p>`, `<table>`, `<ul>` — e la pagina la stampa così com'è.
   * Gli stili sono quelli di `prosa.css`, gli stessi degli articoli.
   */
  corpo: string[];
}

/**
 * L'informativa, rivista sul sito nuovo.
 *
 * Il testo di partenza è quello pubblicato su athlonroma.it in WordPress
 * (versione 2.0). La revisione non è cosmetica: quel documento descriveva un
 * sito che faceva altre cose, e quattro punti erano diventati falsi.
 *
 *  - **Il Facebook Pixel non c'è.** Era il perno delle sezioni su destinatari,
 *    trasferimenti e cookie, e in questo sito non esiste: l'unico strumento in
 *    pagina è Google Tag Manager, che è il sistema *attraverso* cui un tag
 *    pubblicitario può essere attivato. Dire «il sito usa il pixel» sarebbe
 *    falso; dire «i tag si attivano da GTM col tuo consenso» è vero e resta
 *    vero se domani il pixel viene aggiunto.
 *  - **I moduli non stanno su un server del club.** Il testo diceva
 *    «infrastruttura tecnica di proprietà di Point 2000»: vanno a una
 *    piattaforma di automazione, e la banca dati è in Irlanda — verificato, non
 *    supposto.
 *  - **L'assistente e il richiamo telefonico non erano nominati**, e il secondo
 *    è il punto più significativo della catena: prenotando, a Calendly arriva
 *    anche il testo della conversazione.
 *  - **I trasferimenti fuori UE erano solo quelli di Meta.** Oggi sono anche
 *    Google, Calendly e Vimeo.
 *
 * Due cose del testo originale sono state **togliere e non riscritte**: la
 * partita IVA, che era un segnaposto «[DA VERIFICARE]» e un'informativa non la
 * richiede, e la data di revisione, che era «[DATA DA INSERIRE]» e ora è quella
 * vera. Un segnaposto pubblicato è peggio di un dato assente.
 *
 * Quello che invece **non ho toccato** sono le scelte del club: il consenso
 * unico per tutti i canali, il soft spam, i tempi di conservazione, il DPO. Non
 * sono fatti tecnici e non sono miei da cambiare.
 */
export const INFORMATIVA: Sezione[] = [
  {
    titolo: 'Titolare del trattamento e responsabile della protezione dei dati',
    corpo: [
      `<p><strong>Titolare del trattamento</strong> è ${TITOLARE.ragioneSociale} (Athlon Club), con sede in Via Ugo Ojetti 134, 00137 Roma. Puoi scrivere a <a href="mailto:desk@athlonroma.it">desk@athlonroma.it</a> oppure, per le comunicazioni che richiedono valore legale, a <a href="mailto:point2000srl@pec.it">point2000srl@pec.it</a>.</p>`,
      '<p><strong>Responsabile della protezione dei dati (DPO)</strong> è Mario Cuccia, che risponde all\'indirizzo <a href="mailto:desk@athlonroma.it">desk@athlonroma.it</a>. È l\'indirizzo a cui rivolgersi per qualunque richiesta sui tuoi dati.</p>',
    ],
  },
  {
    titolo: 'Dati trattati e canali di raccolta',
    corpo: [
      '<p>Trattiamo i tuoi dati personali attraverso i canali qui sotto. Per il dettaglio tecnico di cosa questo sito scrive nel tuo browser e a quali servizi trasmette i dati, vedi <a href="#cosa-scriviamo">più avanti in questa pagina</a>.</p>',
      '<h3>a) Navigazione sul sito</h3>',
      '<p>Durante la navigazione i sistemi acquisiscono automaticamente alcuni dati tecnici necessari al funzionamento e alla sicurezza del sito: indirizzo IP, tipo di browser, sistema operativo, pagine visitate, data e ora dell\'accesso. Sono usati per finalità statistiche in forma aggregata e per la sicurezza.</p>',
      '<h3>b) Moduli di contatto</h3>',
      '<p>Il sito ha due punti in cui puoi lasciarci i tuoi dati: il modulo <strong>«Prova Athlon»</strong> e l\'<strong>assistente</strong> del Club Life. In entrambi i casi raccogliamo nome, cognome, indirizzo email, numero di cellulare e l\'attività che ti interessa, più quello che scegli di scriverci.</p>',
      '<p>I moduli non sono gestiti da un server del club: i dati vengono trasmessi a una <strong>piattaforma di automazione</strong> che li instrada verso i nostri sistemi e verso la banca dati del club, ospitata su server nell\'Unione Europea (Irlanda). Chi la gestisce agisce come responsabile del trattamento.</p>',
      '<h3>c) L\'assistente e la richiesta di richiamo telefonico</h3>',
      '<p>L\'assistente del Club Life è una conversazione: quello che scrivi viene trasmesso alla piattaforma di automazione per produrre la risposta e per permetterci di ricontattarti.</p>',
      '<p>Se durante la conversazione ti proponiamo un <strong>richiamo telefonico</strong> e scegli di prenotarlo, il collegamento che apri porta a <strong>Calendly</strong> già compilato con nome, cognome, email e cellulare, e con il <strong>testo della conversazione</strong> riportato nel campo delle note, perché chi ti richiama sappia di cosa avete parlato. Prenotando, quei dati sono trattati anche da Calendly, società statunitense: se preferisci non trasmetterli, non prenotare da lì e scrivici all\'indirizzo del club.</p>',
      '<h3>d) Identificativo del browser e provenienza della visita</h3>',
      '<p>Se acconsenti ai cookie di marketing, il sito conserva nel tuo browser un <strong>identificativo casuale</strong> — non contiene dati personali — e i parametri della campagna da cui la visita è arrivata. Servono a riconoscere una richiesta che proviene dalla stessa persona e a capire quale campagna l\'ha portata. Vengono allegati ai moduli che invii: dal momento in cui viaggiano insieme al tuo nome e alla tua email, sono dati personali a tutti gli effetti.</p>',
      '<p><strong>Senza il tuo consenso non vengono conservati</strong>, e i moduli funzionano esattamente allo stesso modo: manca solo l\'informazione sulla provenienza.</p>',
      '<h3>e) Iscrizione e rapporto con la struttura</h3>',
      '<p>Al momento dell\'iscrizione e durante il rapporto raccogliamo i dati anagrafici e di contatto necessari per erogare i servizi, e — dove richiesti dalla legge o dalla pratica sportiva — i dati sanitari, come il certificato medico di idoneità. La gestione degli abbonamenti, delle prenotazioni e degli accessi avviene sul portale del club, fornito da un gestore terzo che agisce come responsabile del trattamento.</p>',
      '<h3>f) Dati particolari (sanitari)</h3>',
      '<p>Le informazioni sullo stato di salute, come il certificato medico, sono trattate esclusivamente sulla base del tuo consenso esplicito e per l\'erogazione del servizio richiesto. Non sono comunicate a terzi, salvo gli obblighi previsti dalla legge.</p>',
      '<h3>g) Altri canali</h3>',
      '<p>Se ci scrivi su WhatsApp o sui social, la conversazione avviene sulla piattaforma di <strong>Meta Platforms Ireland Ltd</strong>, che è titolare autonomo del trattamento per quanto la riguarda: nome dell\'account, numero di telefono e contenuto dei messaggi sono soggetti anche all\'<a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener">informativa di WhatsApp</a>. Noi trattiamo quello che emerge dalla conversazione per gestire la tua richiesta e, con il tuo consenso, per finalità di marketing.</p>',
    ],
  },
  {
    titolo: 'Finalità e basi giuridiche',
    corpo: [
      '<h3>A) Finalità di servizio, senza consenso</h3>',
      '<p>Per queste finalità il consenso non serve, perché il trattamento poggia su altre basi giuridiche.</p>',
      '<table><thead><tr><th>Finalità</th><th>Base giuridica (art. 6 GDPR)</th></tr></thead><tbody><tr><td>Gestione delle richieste di informazioni, dei moduli e delle conversazioni con l\'assistente</td><td>Misure precontrattuali su richiesta dell\'interessato — lett. b)</td></tr><tr><td>Conclusione e gestione del contratto di abbonamento</td><td>Esecuzione del contratto — lett. b)</td></tr><tr><td>Adempimenti fiscali, contabili e amministrativi</td><td>Obbligo legale — lett. c)</td></tr><tr><td>Tesseramento all\'Ente di Promozione Sportiva o alla Federazione di riferimento</td><td>Obbligo legale ed esecuzione del contratto — lett. b) e c)</td></tr><tr><td>Tutela dei diritti del titolare in sede giudiziaria e stragiudiziale</td><td>Legittimo interesse — lett. f)</td></tr><tr><td>Sicurezza informatica e corretto funzionamento del sito</td><td>Legittimo interesse — lett. f)</td></tr></tbody></table>',
      '<h3>B) Finalità di marketing e misurazione, con il tuo consenso</h3>',
      '<p>Con il tuo <strong>consenso libero, specifico e informato</strong> possiamo inviarti comunicazioni commerciali, newsletter, offerte e aggiornamenti sui servizi del club via email, SMS, WhatsApp, telefono e posta.</p>',
      '<p>Con il consenso ai cookie di marketing, inoltre, conserviamo nel browser l\'identificativo e la provenienza descritti sopra, e attiviamo gli strumenti di misurazione delle campagne. Sono due consensi distinti: puoi accettare le comunicazioni e rifiutare i cookie, o il contrario.</p>',
      '<p><strong>Il consenso alle comunicazioni è unico per tutti i canali.</strong> Revocarlo da un canale qualsiasi interrompe le comunicazioni su tutti: non è possibile gestirlo canale per canale.</p>',
      '<p>Se sei già iscritto, potremo inviarti comunicazioni su servizi analoghi a quelli di cui hai già usufruito anche senza un nuovo consenso, salvo tua opposizione (art. 130 co. 4 del D.Lgs. 196/2003). Puoi opporti in qualsiasi momento.</p>',
      '<p>Non cediamo i tuoi dati a terzi per il marketing di quei terzi, e non effettuiamo profilazioni automatizzate che producano effetti giuridici nei tuoi confronti.</p>',
    ],
  },
  {
    titolo: 'Destinatari dei dati',
    corpo: [
      '<p>I tuoi dati possono essere resi accessibili o comunicati soltanto ai soggetti qui indicati. L\'elenco dei servizi tecnici, con il dominio di ciascuno e il perché, è <a href="#destinatari">più avanti in questa pagina</a> e viene tenuto aggiornato insieme al sito.</p>',
      '<h3>All\'interno del club</h3>',
      '<p>Dipendenti e collaboratori autorizzati al trattamento — reception, team commerciale, istruttori, amministrazione — vincolati da obbligo di riservatezza.</p>',
      '<h3>Responsabili del trattamento (art. 28 GDPR)</h3>',
      '<ul><li>Consulenti esterni — commercialista, consulente del lavoro, legale — per gli adempimenti fiscali, contabili e legali.</li><li>Il fornitore della <strong>piattaforma di automazione</strong> che riceve i moduli e le conversazioni, e il fornitore della <strong>banca dati</strong> su cui sono conservati, con server nell\'Unione Europea.</li><li>Il fornitore del <strong>portale del club</strong> per abbonamenti, prenotazioni e accessi.</li><li>Il fornitore del <strong>sistema di raccolta del consenso</strong> ai cookie.</li><li>Il fornitore dell\'<strong>infrastruttura di pubblicazione</strong> del sito.</li></ul>',
      '<h3>Titolari autonomi</h3>',
      '<ul><li><strong>Ente di Promozione Sportiva o Federazione di riferimento</strong>, per i soli adempimenti obbligatori di tesseramento.</li><li><strong>Google Ireland Ltd</strong>, per la gestione dei tag di misurazione e per la mappa della sede.</li><li><strong>Calendly LLC</strong>, quando prenoti un richiamo telefonico.</li><li><strong>Meta Platforms Ireland Ltd</strong>, per le conversazioni avviate sui suoi canali e per gli eventuali strumenti pubblicitari attivati con il tuo consenso.</li><li><strong>Vimeo</strong> e il fornitore del <strong>tour virtuale</strong>, per i contenuti multimediali che il sito incorpora.</li><li><strong>Autorità giudiziarie e amministrative</strong>, nei casi previsti dalla legge.</li></ul>',
      '<p>I tuoi dati <strong>non vengono venduti, ceduti per il marketing di terzi né diffusi pubblicamente</strong>.</p>',
    ],
  },
  {
    titolo: 'Trasferimenti fuori dall\'Unione Europea',
    corpo: [
      '<p>La banca dati del club è ospitata su <strong>server nell\'Unione Europea (Irlanda)</strong>, e i dati che trattiamo direttamente restano lì.</p>',
      '<p>Alcuni dei servizi che il sito utilizza sono però forniti da società statunitensi, e comportano il trasferimento di dati verso gli Stati Uniti:</p>',
      '<ul><li><strong>Google</strong>, per la gestione dei tag e per la mappa;</li><li><strong>Calendly</strong>, quando prenoti un richiamo — e in quel caso il trasferimento riguarda anche il testo della conversazione;</li><li><strong>Vimeo</strong>, per i video incorporati;</li><li><strong>Meta</strong>, per i suoi canali e per gli eventuali strumenti pubblicitari.</li></ul>',
      '<p>Il trasferimento avviene sulla base della <strong>decisione di adeguatezza</strong> adottata dalla Commissione Europea per gli Stati Uniti (EU-US Data Privacy Framework) per i fornitori che vi hanno aderito, e delle <strong>Clausole Contrattuali Standard</strong> dove quella non è applicabile.</p>',
      '<p>Gli strumenti che richiedono il tuo consenso non vengono attivati, e quindi non trasferiscono nulla, finché non lo dai.</p>',
    ],
  },
  {
    titolo: 'Per quanto tempo conserviamo i dati',
    corpo: [
      '<table><thead><tr><th>Tipo di dati</th><th>Conservazione</th></tr></thead><tbody><tr><td>Dati contrattuali e di abbonamento</td><td>10 anni dalla fine del rapporto</td></tr><tr><td>Fatture e documenti contabili e fiscali</td><td>11 anni, per obbligo di legge</td></tr><tr><td>Dati di contatto per il marketing</td><td>2 anni dalla raccolta o dall\'ultimo consenso, salvo revoca anticipata</td></tr><tr><td>Richieste dai moduli e conversazioni con l\'assistente</td><td>2 anni, con la stessa regola dei dati di contatto</td></tr><tr><td>Dati sanitari, come il certificato medico</td><td>Per la durata del rapporto e fino all\'adempimento degli obblighi di legge</td></tr><tr><td>Dati tecnici di navigazione</td><td>Fino a 12 mesi, salvo obblighi di legge sulla sicurezza informatica</td></tr><tr><td>Identificativo del browser e provenienza della visita</td><td>Finché non revochi il consenso o non svuoti il browser. Le durate esatte sono <a href="#cosa-scriviamo">più avanti in questa pagina</a></td></tr><tr><td>Dati per cui hai chiesto la cancellazione</td><td>Conservati in forma protetta e ad accesso limitato per un massimo di 12 mesi, poi cancellati o resi anonimi</td></tr></tbody></table>',
    ],
  },
  {
    titolo: 'I tuoi diritti',
    corpo: [
      '<p>Come interessato hai i diritti previsti dagli articoli 15–21 e 77 del GDPR:</p>',
      '<ul><li><strong>Accesso</strong> (art. 15): sapere se trattiamo i tuoi dati e riceverne una copia.</li><li><strong>Rettifica</strong> (art. 16): correggere dati inesatti o incompleti.</li><li><strong>Cancellazione</strong> (art. 17): ottenere la cancellazione dei tuoi dati, nei casi previsti.</li><li><strong>Limitazione</strong> (art. 18): limitare il trattamento in determinati casi.</li><li><strong>Portabilità</strong> (art. 20): ricevere i tuoi dati in un formato leggibile da una macchina.</li><li><strong>Opposizione</strong> (art. 21): opporti al trattamento per marketing o per motivi legittimi personali.</li><li><strong>Revoca del consenso</strong> (art. 7): revocarlo quando vuoi, senza che questo tocchi i trattamenti già svolti.</li><li><strong>Reclamo</strong> (art. 77): rivolgerti al <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener">Garante per la protezione dei dati personali</a>.</li></ul>',
      '<p><strong>Per uscire dal marketing</strong> puoi revocare il consenso quando vuoi, con effetto su tutti i canali: scrivi a <a href="mailto:desk@athlonroma.it">desk@athlonroma.it</a> o usa il link di disiscrizione in fondo a ogni nostra comunicazione. <strong>Per i cookie</strong> c\'è il pulsante <a href="#cambia-scelta">più avanti in questa pagina</a>.</p>',
    ],
  },
  {
    titolo: 'Come esercitare i tuoi diritti',
    corpo: [
      `<p>Scrivi al DPO all'indirizzo <a href="mailto:desk@athlonroma.it">desk@athlonroma.it</a>, oppure al titolare: ${TITOLARE.ragioneSociale}, Via Ugo Ojetti 134, 00137 Roma — <a href="mailto:desk@athlonroma.it">desk@athlonroma.it</a>, <a href="mailto:point2000srl@pec.it">point2000srl@pec.it</a>.</p>`,
      '<p>Rispondiamo entro <strong>30 giorni</strong> dalla ricezione, come prevede l\'art. 12 del GDPR. Nei casi complessi il termine può essere prorogato di altri 60 giorni, e in quel caso te lo comunichiamo spiegando perché.</p>',
    ],
  },
  {
    titolo: 'Cookie e strumenti di tracciamento',
    corpo: [
      '<p>Il sito usa cookie e tecnologie analoghe, divise nelle categorie che il banner ti presenta al primo accesso: <strong>necessari</strong>, <strong>funzionali</strong>, <strong>statistici</strong>, <strong>prestazionali</strong> e <strong>di marketing</strong>. Solo i necessari non richiedono il tuo consenso, perché senza di loro il sito non funziona.</p>',
      '<p>Una cosa che vale la pena dire, perché non è ovvia: parte di ciò che questo sito conserva nel tuo browser <strong>non sono cookie in senso tecnico</strong> ma spazi di memoria del browser. La regola che li governa è la stessa, e li trovi elencati uno per uno, con durata e categoria, <a href="#cosa-scriviamo">più avanti in questa pagina</a>.</p>',
      '<p>Gli strumenti di misurazione e pubblicitari sono gestiti attraverso <strong>Google Tag Manager</strong>, che è il sistema con cui vengono attivati o disattivati: nessuno di quelli soggetti a consenso parte prima che tu l\'abbia dato. Quali siano attivi in un dato momento lo dice il pannello delle preferenze, che si aggiorna dalla scansione del sito.</p>',
      '<p>Il sito incorpora inoltre contenuti di terzi che possono impostare cookie propri: la mappa della sede, i video e il tour virtuale. Finché non acconsenti non vengono caricati, e al loro posto compare un segnaposto.</p>',
      '<h3>Come gestire i cookie</h3>',
      '<p>Al primo accesso un banner ti chiede le tue preferenze. Puoi cambiarle quando vuoi dal <a href="#cambia-scelta">pannello delle preferenze</a> in questa pagina. Puoi anche gestire o cancellare i cookie dalle impostazioni del browser, e disattivare la pubblicità basata sugli interessi su <a href="https://www.youronlinechoices.eu/it/" target="_blank" rel="noopener">youronlinechoices.eu</a>.</p>',
      '<p><strong>Scorrere o navigare il sito non equivale ad accettare.</strong> Il consenso lo raccogliamo solo con un\'azione tua sul banner.</p>',
    ],
  },
  {
    titolo: 'Modifiche a questa informativa',
    corpo: [
      '<p>Questa informativa può essere aggiornata per adeguarla a cambiamenti normativi, tecnologici o organizzativi. Se le modifiche sono sostanziali lo segnaliamo sul sito o con una comunicazione diretta. La versione in vigore è sempre quella pubblicata qui, con la data di ultima revisione.</p>',
      '<p><strong>Ultima revisione:</strong> 20 agosto 2026 · <strong>versione</strong> 2.1</p>',
    ],
  },
];
