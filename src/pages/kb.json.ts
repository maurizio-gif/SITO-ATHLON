/**
 * `/kb.json` — tutto il sito spezzato in voci, per l'assistente dell'Help Desk.
 *
 * `/llms.txt` racconta il club in una pagina: serve a chi passa e vuole i fatti.
 * Questo file fa il lavoro opposto — non riassume niente e non lascia fuori
 * niente, perché chi lo legge deve poter rispondere a «quanto costa sospendere
 * ad agosto» con la frase esatta che c'è scritta sul sito, e citare la pagina
 * da cui l'ha presa.
 *
 * **Vale la stessa regola di `/llms.txt`: tutto è generato dai dati.** Nessun
 * testo è ricopiato qui dentro. Un listino o una procedura trascritti a mano in
 * una knowledge base sono la ragione per cui un assistente, sei mesi dopo,
 * risponde con sicurezza una cosa che il club non fa più — ed è un danno
 * peggiore del non avere l'assistente.
 *
 * Ogni voce porta il proprio `url`: la risposta senza il link alla pagina che la
 * contiene non è verificabile, e una risposta non verificabile su un
 * regolamento contrattuale non vale.
 *
 * **Gli indirizzi email non ci sono**, perché li toglie `data/testo.ts` da tutto
 * quello che ci passa. È la scelta dell'Help Desk, non una dimenticanza: la
 * sezione manda al modulo di assistenza, che finisce in coda al desk con la
 * domanda già scritta dentro.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CORSI, type Corso } from '../data/corsi';
import { conNumeri } from '../data/servizi';
import { JUNIOR, type CorsoJunior, type CorsoStagione } from '../data/junior';
import { clausole, urlClausola, TERMINI_VERSIONE } from '../data/termini';
import {
  bands,
  gymFloor,
  countLessons,
  totalLessons,
  totalHours,
  openHours,
  lessonCardsFor,
  PLANNING_MONTH,
} from '../data/planning';
import { CLUB, DOMENICA, ORARIO_ECCEZIONALE, orarioEccezionaleAttivo, finestraEstiva } from '../data/club';
import {
  plans,
  GUEST_PASS,
  SOSPENSIONE,
  activityInfo,
  SINGOLI,
  ATTIVAZIONE,
  DATA_INIZIO,
  PERSONAL,
  ETA_MINIMA_ADULTI,
  ATTIVITA_GUEST_PASS,
  JUNIOR_MENSILE,
  PREISCRIZIONE,
} from '../data/abbonamenti';
import { ACTIVITY_TAGS, ACTIVITY_IDS } from '../data/activities';
import { AREA_LABELS } from '../data/helpdesk';
import { vociFaq } from '../data/faq';
import { PG, APP } from '../data/cta';
import { testoCompleto, toPlain } from '../data/testo';
import { SITE } from '../data/sito';



/**
 * Una voce è un pezzo di sito che sta in piedi da solo: una scheda, una
 * clausola, un corso, un servizio. Il taglio è quello delle pagine e non un
 * numero di caratteri, perché è il taglio con cui il contenuto è stato scritto:
 * spezzare una clausola a metà per farla stare in una misura fissa produce due
 * frammenti che non dicono nessuno dei due quello che diceva l'originale.
 */
interface Voce {
  id: string;
  tipo:
    | 'scheda'
    | 'clausola'
    | 'corso'
    | 'corso-junior'
    | 'lezione'
    | 'servizio'
    | 'evento'
    | 'news'
    | 'promo'
    | 'faq'
    | 'abbonamento'
    | 'club';
  titolo: string;
  /** Assoluto: chi legge questo file non sta necessariamente sul sito. */
  url: string;
  /** L'etichetta leggibile della sezione da cui viene. */
  area: string;
  /** Tag delle attività, vuoto = vale per tutte. Vedi `data/activities.ts`. */
  attivita: string[];
  testo: string;
}

/**
 * Una foglia di testo, ripulita.
 *
 * Parecchi campi dei dati ammettono HTML in linea per scelta — `attrezzatura`
 * di un corso lo dichiara nella sua interfaccia, e ci sta dentro un link a un
 * negozio — quindi la ripulitura non è una cortesia ma la regola: basta un
 * campo lasciato passare grezzo perché in mezzo a una risposta compaia un
 * `<a href="…" target="_blank">`. Si applica a ogni foglia, non a quelle che
 * sembrano sporche, perché il campo che diventerà HTML domani non si sa quale è.
 */
const pulito = toPlain;

/** Più capoversi: ognuno ripulito per conto suo, gli a capo fra loro restano. */
const capoversi = (parti?: (string | false | null | undefined)[]) =>
  (parti ?? []).filter(Boolean).map((s) => pulito(s as string)).filter(Boolean).join('\n\n');

/**
 * Unisce blocchi già composti saltando quelli vuoti. Non tocca gli a capo.
 *
 * Accetta anche un numero perché è quello che i chiamanti passano davvero:
 * `c.punti?.length && blocchi(…)` vale `0` quando l'elenco è vuoto, non
 * `false`. Il `filter(Boolean)` lo scartava già — era solo la firma a non
 * dirlo, e sono due dei cinque errori che `tsc` segnalava su questo repo.
 */
const blocchi = (...parti: (string | number | false | null | undefined)[]) =>
  parti.filter(Boolean).join('\n\n').trim();

/** Un elenco puntato, o niente se non ci sono voci. */
const elenco = (voci?: (string | false | null | undefined)[]) => {
  const righe = (voci ?? []).filter(Boolean).map((v) => pulito(v as string)).filter(Boolean);
  return righe.length ? righe.map((v) => `- ${v}`).join('\n') : '';
};

/** Le coppie etichetta/valore che le pagine junior mostrano come tabella. */
const coppie = (dati?: { l: string; v: string }[]) =>
  elenco((dati ?? []).map((d) => `${d.l}: ${d.v}`));

/**
 * I link di iscrizione per fascia di nascita della scuola nuoto bambini.
 *
 * `testoCompleto` butta via l'indirizzo di ogni link markdown e lascia solo
 * il testo cliccabile — corretto per leggere la scheda, sbagliato per questi
 * otto: quale sia quello giusto dipende dall'anno di nascita del bambino, e
 * senza l'indirizzo la chat non può citarlo, solo descriverlo. Le righe
 * `FONTE:` qui sotto seguono lo stesso formato con cui `Componi contesto` ne
 * cita già altre (il planning, il calendario prenotazioni): il validatore
 * delle fonti scandisce ogni riga che comincia per `FONTE: ` in tutto il
 * contesto, non solo la prima di ogni voce.
 */
function turniScuolaNuoto(md: string): string {
  const righe: string[] = [];
  // Il sorgente porta questi link come ancore HTML (serve `target="_blank"`,
  // che il markdown puro non esprime), non come `[testo](url)`: un regex
  // scritto per la sintassi markdown non trovava più niente qui, e gli otto
  // link sparivano dal contesto senza errore. Vedi il commento sopra la
  // funzione.
  const rx = /^\*\s+(.+?)\s+→\s+<a\s+href="([^"]+)"[^>]*>[^<]*<\/a>/gm;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(md))) {
    righe.push(`${pulito(m[1])}:\nFONTE: ${m[2].replace(/&amp;/g, '&').replace(/\\&/g, '&')}`);
  }
  return righe.length
    ? blocchi('Link diretti di iscrizione per fascia di nascita', righe.join('\n'))
    : '';
}

/**
 * A quale attività appartiene un corso.
 *
 * Per le attività in acqua lo slug della pagina *è* già l'id dell'attività
 * (`aqua-fitness`, `nuoto-libero`), mentre i quindici corsi di sala sono tutti
 * dentro `corsi-fitness` e si distinguono per fascia di planning. Il fallback è
 * la fascia, che è il campo che il planning usa per la stessa domanda.
 */
function attivitaDiCorso(c: Corso): string[] {
  if (ACTIVITY_IDS.includes(c.slug)) return [c.slug];
  const banda = c.banda ?? 'corsi-fitness';
  return ACTIVITY_IDS.includes(banda) ? [banda] : [];
}

/** Il testo di un corso per adulti: tutto ciò che la sua pagina racconta. */
function testoCorso(c: Corso): string {
  return blocchi(
    pulito(c.claim ?? ''),
    capoversi(c.intro),
    c.varianti
      .map((v) => blocchi(v.nome && pulito(`${v.nome}${v.nota ? ` (${v.nota})` : ''}`), pulito(v.testo)))
      .filter(Boolean)
      .join('\n\n'),
    c.elenco && blocchi(pulito(c.elenco.titolo), elenco(c.elenco.voci)),
    c.punti?.length && c.punti.map((x) => blocchi(x.titolo && pulito(x.titolo), pulito(x.testo))).join('\n\n'),
    c.attrezzatura && `Cosa serve portare: ${pulito(c.attrezzatura)}`,
    c.singola && `Lezione singola: ${pulito(c.singola.prezzo)} — ${pulito(c.singola.testo)}`,
    c.lezioni.length && `In palinsesto come: ${c.lezioni.join(', ')}.`
  );
}

/** Un turno della stagione junior: livelli, orari, certificato, prova. */
function testoStagione(s: CorsoStagione): string {
  return blocchi(
    pulito(`${s.nome}${s.sottotitolo ? ` — ${s.sottotitolo}` : ''}`),
    capoversi(s.testo),
    elenco(s.punti),
    coppie(s.dettagli),
    s.livello && blocchi(`Livello richiesto: ${pulito(s.livello.codice)}`, elenco(s.livello.voci)),
    coppie(s.allenamenti),
    elenco((s.orari ?? []).map((o) => `${o.g}: ${o.o}`)),
    s.prova && `Prova di inserimento: ${pulito(s.prova)}`,
    s.certificato && `Certificato medico richiesto: ${s.certificato}.`,
    (s.extra ?? []).map((e) => blocchi(pulito(e.titolo), pulito(e.testo ?? ''), elenco(e.punti))).join('\n\n')
  );
}

/** Il testo di un corso per bambini, prezzi di adesione compresi. */
function testoJunior(c: CorsoJunior): string {
  return blocchi(
    `${c.eta}.`,
    pulito(c.claim ?? ''),
    capoversi(c.intro),
    elenco(c.facts),
    (c.blocchi ?? [])
      .map((b) => blocchi(pulito(b.titolo), pulito(b.testo ?? ''), elenco(b.punti)))
      .join('\n\n'),
    c.metodo &&
      blocchi(
        pulito(c.metodo.titolo),
        pulito(c.metodo.sub),
        c.metodo.pilastri.map((x) => `${pulito(x.titolo)}: ${pulito(x.testo)}`).join('\n')
      ),
    c.adesione?.length &&
      blocchi(
        'Modalità di adesione',
        c.adesione
          .map(
            (a) =>
              `${pulito(a.titolo)}: ${a.prezzo} € a ${a.periodo}. ${pulito(a.testo)}${
                a.nota ? ` ${pulito(a.nota)}` : ''
              }`
          )
          .join('\n')
      ),
    (c.corsi ?? []).map(testoStagione).join('\n\n'),
    (c.spazi ?? []).map((s) => blocchi(pulito(s.nome), pulito(s.testo))).join('\n\n')
  );
}

export const GET: APIRoute = async () => {
  const [schede, eventi, news, servizi, promo] = await Promise.all([
    getCollection('articles', ({ data }) => !data.draft),
    getCollection('eventi', ({ data }) => !data.draft),
    getCollection('news', ({ data }) => !data.draft),
    getCollection('servizi', ({ data }) => !data.draft),
    getCollection('promo', ({ data }) => !data.draft),
  ]);

  const voci: Voce[] = [];

  /* ---- Help Desk: le schede, per intero ---------------------------------
     È il corpo della conoscenza operativa del club, ed è l'unica fonte scritta
     apposta per rispondere a una domanda. Va dentro intera, `<details>`
     compresi: l'anteprima dell'Help Desk li salta perché deve stare in tre
     righe, ma è lì che stanno le procedure passo per passo. */
  for (const a of schede) {
    voci.push({
      id: `scheda:${a.id}`,
      tipo: 'scheda',
      titolo: a.data.title,
      /* `snb/preiscrizioni-nuoto` porta l'ancora `#fasce-eta` — un
         `<a id>` scritto a mano subito sopra «## Turni disponibili» nel
         markdown, non un id sperato dal rendering — invece del solo
         indirizzo della pagina: quando il modello cita questa scheda al
         posto del link diretto per fascia (la sua `FONTE:` specifica,
         generata da `turniScuolaNuoto()` qui sotto), chi clicca deve
         arrivare davanti ai turni, non alla cima della pagina. Un'ancora
         inventata dal modello (es. `#nati-2023`, che non esiste) viene
         scartata da `ripara()` su n8n e sostituita da questo stesso url: è
         il fallback, e deve già essere quello giusto. */
      url:
        a.id === 'snb/preiscrizioni-nuoto'
          ? `${SITE}/wikiathlon/${a.id}/#fasce-eta`
          : `${SITE}/wikiathlon/${a.id}/`,
      area: AREA_LABELS[a.id.split('/')[0]]?.label ?? 'Help Desk',
      attivita: a.data.attivita,
      testo: blocchi(
        a.data.description,
        testoCompleto(a.body ?? ''),
        a.id === 'snb/preiscrizioni-nuoto' ? turniScuolaNuoto(a.body ?? '') : ''
      ),
    });
  }

  /* ---- Il regolamento, clausola per clausola ----------------------------
     Una clausola per voce, con la sua ancora: «entro quando disdico» ha una
     risposta contrattuale precisa, e mandare alla pagina intera del regolamento
     equivale a non rispondere. */
  const tutteLeClausole = clausole();
  for (const c of tutteLeClausole) {
    /* Due clausole — «2.2 Indicazione indirizzo e-mail» e «3.1 Definizioni» —
       nel contratto non hanno un testo proprio: sono l'intestazione delle loro
       sotto-clausole, che il testo ce l'hanno. Una voce vuota nella knowledge
       base è peggio che assente, perché occupa un posto in classifica senza
       rispondere; quindi qui l'intestazione dice cosa raggruppa. */
    const figlie = c.testo
      ? []
      : tutteLeClausole.filter((x) => x.id.startsWith(`${c.id}.`)).map((x) => x.titolo);

    voci.push({
      id: `clausola:${c.id}`,
      tipo: 'clausola',
      titolo: `${c.id} ${c.titolo}`,
      url: `${SITE}${urlClausola(c.id)}`,
      area: `Regolamento · Sezione ${c.sezione.numero} ${c.sezione.titolo}`,
      attivita: c.sezione.attivita,
      testo: c.testo
        ? pulito(c.testo)
        : `Raggruppa le clausole che seguono: ${figlie.join(', ')}.`,
    });
  }

  /* ---- Le attività per adulti ------------------------------------------ */
  for (const c of CORSI) {
    voci.push({
      id: `corso:${c.slug}`,
      tipo: 'corso',
      titolo: c.nome,
      url: `${SITE}/${c.slug}/`,
      area: c.eyebrow ?? 'Corso Fitness',
      attivita: attivitaDiCorso(c),
      testo: testoCorso(c),
    });

    for (const [i, f] of (c.faqExtra ?? []).entries()) {
      voci.push({
        id: `faq:corso:${c.slug}:${i}`,
        tipo: 'faq',
        titolo: f.q,
        url: `${SITE}/${c.slug}/`,
        area: `Domande frequenti · ${c.nome}`,
        attivita: attivitaDiCorso(c),
        testo: pulito(f.a),
      });
    }
  }

  /* ---- Le attività per bambini ------------------------------------------
     Le loro f.a.q. sono ventiquattro e sono le domande che fa un genitore:
     certificato, recuperi, cosa portare. Vanno una per voce, perché una domanda
     è già la forma in cui la conoscenza viene cercata. */
  for (const c of JUNIOR) {
    voci.push({
      id: `corso-junior:${c.slug}`,
      tipo: 'corso-junior',
      titolo: c.nome,
      url: `${SITE}/${c.slug}/`,
      area: 'Corsi per bambini',
      attivita: ACTIVITY_IDS.includes(c.slug) ? [c.slug] : [],
      testo: testoJunior(c),
    });

    /* Le f.a.q. junior possono essere id del registro condiviso: vanno risolte
       prima di leggerle, o qui arriva la stringa invece della risposta. */
    for (const [i, f] of vociFaq(c.faq).entries()) {
      voci.push({
        id: `faq:junior:${c.slug}:${i}`,
        tipo: 'faq',
        titolo: f.q,
        url: `${SITE}/${c.slug}/`,
        area: `Domande frequenti · ${c.nome}`,
        attivita: ACTIVITY_IDS.includes(c.slug) ? [c.slug] : [],
        testo: pulito(f.a),
      });
    }
  }

  /* ---- Le schede delle lezioni del palinsesto ---------------------------
     «Che cos'è HBX» è una domanda che si fa davanti agli orari, e la risposta
     sta nella scheda della lezione, non nella pagina del corso. */
  for (const [nome, card] of Object.entries(lessonCardsFor(bands.map((b) => b.id)))) {
    voci.push({
      id: `lezione:${nome}`,
      tipo: 'lezione',
      titolo: nome,
      url: `${SITE}/planning`,
      area: 'Scheda della lezione',
      attivita: [],
      testo: blocchi(
        pulito(card.desc),
        elenco((card.stats ?? []).map((s) => `${s.l}: ${s.v} su 100`))
      ),
    });
  }

  /* ---- Il palinsesto, una voce per fascia -------------------------------
     La settimana intera in una voce sola sarebbe illeggibile; per fascia
     risponde alla domanda come viene fatta: «quando c'è aqua fitness». */
  for (const b of bands) {
    voci.push({
      id: `club:planning:${b.id}`,
      tipo: 'club',
      titolo: `Orari · ${b.title}`,
      url: `${SITE}/planning`,
      area: `Planning ${PLANNING_MONTH}`,
      attivita: ACTIVITY_IDS.includes(b.id) ? [b.id] : [],
      testo: blocchi(
        pulito(b.lede),
        `${countLessons(b)} lezioni a settimana. Compreso negli abbonamenti: ${b.planTags.join(', ')}.`,
        b.days
          .filter((d) => d.classes.length)
          .map(
            (d) =>
              `${d.full}: ` +
              d.classes.map((l) => `${l.time} ${l.name}${l.sala ? ` (${l.sala})` : ''}`).join(' · ')
          )
          .join('\n')
      ),
    });
  }

  /* ---- Servizi, eventi, news, promo -------------------------------------
     Non hanno una pagina propria tranne gli eventi, quindi il link è quello che
     si portano dietro o la loro sezione su Club Life. */
  for (const s of servizi) {
    voci.push({
      id: `servizio:${s.id}`,
      tipo: 'servizio',
      titolo: s.data.title,
      url: s.data.href?.startsWith('http')
        ? s.data.href
        : `${SITE}${s.data.href ?? '/club-life#servizi'}`,
      area: 'Servizi del club',
      attivita: s.data.attivita,
      testo: blocchi(pulito(conNumeri(s.data.desc)), pulito(conNumeri(s.data.detail))),
    });
  }

  for (const e of eventi) {
    voci.push({
      id: `evento:${e.id}`,
      tipo: 'evento',
      titolo: e.data.title,
      url: `${SITE}/eventi/${e.id}/`,
      area: e.data.kicker,
      attivita: e.data.attivita,
      testo: blocchi(
        `${e.data.date.toISOString().slice(0, 10)}${e.data.time ? ` · ${e.data.time}` : ''}`,
        e.data.free ? 'Gratuito.' : e.data.price && `Quota: ${pulito(e.data.price)}.`,
        /* `ctaHref` è già il segnale che l'editor imposta: un evento annunciato
           prima delle sue modalità lo svuota apposta (vedi `eventi/[slug].astro`).
           Dirlo qui in chiaro evita che il bot, senza questa riga, risponda "non
           trovo l'informazione" invece di "le prenotazioni non sono ancora
           aperte" — la stessa domanda che si è già presentata una volta. */
        e.data.ctaHref
          ? `Prenotazioni aperte: ${e.data.ctaHref}`
          : 'Le prenotazioni per questo evento non sono ancora aperte: modalità e programma saranno comunicati più avanti.',
        pulito(e.data.excerpt),
        testoCompleto(e.body ?? ''),
        elenco(e.data.notes),
        e.data.program
          .map((prog) =>
            blocchi(
              pulito(prog.room),
              prog.slots
                .map((s) => `${s.time} ${s.lesson}${s.trainer ? ` — ${s.trainer}` : ''}`)
                .join('\n')
            )
          )
          .join('\n\n')
      ),
    });
  }

  for (const n of news) {
    voci.push({
      id: `news:${n.id}`,
      tipo: 'news',
      titolo: n.data.title,
      /* La news ha una pagina sua: prima l'url era quello del suo `ctaHref`,
         che mandava a un'altra pagina, o l'ancora del Club Life — cioè non la
         notizia ma il posto da cui si intravede. */
      url: `${SITE}/news/${n.id}/`,
      area: `Avvisi · ${n.data.category}`,
      attivita: n.data.attivita,
      testo: blocchi(
        n.data.date.toISOString().slice(0, 10),
        pulito(n.data.excerpt),
        testoCompleto(n.body ?? '')
      ),
    });
  }

  /* Lo stesso documento che governa /promo e /abbonamenti: la collezione è
     già filtrata su `!draft` qui sopra. */
  const promoAttiva = promo[0]?.data;

  for (const voce of promo) {
    const d = voce.data;
    voci.push({
      id: `promo:${voce.id}`,
      tipo: 'promo',
      titolo: d.titolo,
      url: `${SITE}/promo`,
      area: 'Promozione in corso',
      attivita: [],
      testo: blocchi(
        pulito(d.claim),
        pulito(d.sommario),
        /* `validoSu` è una frase e finisce già col punto: aggiungerne un altro
           dava «Smart e Premium.. Promo attivabile…», che è il genere di
           sciatteria che un modello legge come due frasi. */
        `Valida su: ${pulito(d.validoSu).replace(/\.$/, '')}. ${d.scadenzaLabel}: ${d.scadenza
          .toISOString()
          .slice(0, 10)}.`,
        /* Che cosa regala, e come si ottiene. Erano una riga sola — «quota di
           attivazione barrata: 50 €» — perché la promo era sempre quella:
           adesso il regalo lo dichiara il documento, e le tre righe qui sotto
           sono le tre cose che una persona deve sapere per averlo. Il codice
           in particolare non si deduce da nessun'altra voce: senza, la chat
           racconta un'offerta che nel portale non si applica. */
        `Che cosa dà: ${pulito(d.vantaggio)}.`,
        d.codice
          ? `**Si ottiene incollando il codice promozionale \`${d.codice}\` sul portale**, nella registrazione, al passo «Ho un codice promozionale»: da lì il portale mostra gli abbonamenti della promozione già selezionati, e si completa l'iscrizione scegliendo la formula annuale e il giorno di inizio. Senza il codice la promozione non si applica. Il codice si copia da ${SITE}/promo.`
          : '',
        d.quotaOmaggio
          ? `Con questa promozione **la quota di attivazione è in omaggio** sulle formule del perimetro qui sopra.`
          : `**Questa promozione non riguarda la quota di attivazione**, che si paga come sempre: non dire che è in omaggio.`,
        blocchi(pulito(d.regaloTitolo), ...d.regalo.map(pulito), pulito(d.regaloNota)),
        blocchi(pulito(d.servizioTitolo), pulito(d.servizioTesto)),
        blocchi(pulito(d.senzaAccountTitolo), pulito(d.senzaAccountTesto)),
        blocchi(pulito(d.conAccountTitolo), pulito(d.conAccountTesto)),
        blocchi(
          pulito(d.proceduraTitolo),
          pulito(d.proceduraIntro),
          elenco(d.procedura),
          pulito(d.proceduraNota)
        ),
        blocchi(pulito(d.strutturaTitolo), pulito(d.strutturaTesto), elenco(d.struttura))
      ),
    });

    for (const [i, f] of d.faq.entries()) {
      voci.push({
        id: `faq:promo:${i}`,
        tipo: 'faq',
        titolo: f.q,
        url: `${SITE}/promo`,
        area: 'Domande frequenti · Promozione',
        attivita: [],
        testo: pulito(f.a),
      });
    }
  }

  /* ---- Abbonamenti: i prezzi, alla lettera ------------------------------
     Le cifre escono da `data/abbonamenti.ts`, che è già l'unico posto in cui
     vivono e da cui le legge anche la pagina. Ogni opzione porta la sua nota
     sulla disdetta, perché è la parte che chi chiede il prezzo scopre dopo. */
  for (const piano of plans) {
    voci.push({
      id: `abbonamento:${piano.id}`,
      tipo: 'abbonamento',
      titolo: `Abbonamento ${piano.name}`,
      /* Con l'ancora del piano: l'assistente cita questo url tale e quale, e chi
         clicca deve trovarsi davanti allo Smart o al Premium — non in cima a una
         pagina da cui ricominciare a cercare. */
      url: `${SITE}/abbonamenti#${piano.id}`,
      area: 'Abbonamenti',
      attivita: [],
      testo: blocchi(
        pulito(piano.claim),
        pulito(piano.desc),
        `Attività comprese: ${piano.activities.join(', ')}.`,
        /* Ogni riga porta il nome del piano, e non e' ridondanza: le due voci
           hanno la stessa forma — tre righe, le stesse etichette — e l'unica
           cosa che le distingue e' il titolo in cima. Una riga letta senza il
           titolo e' un importo senza piano, ed e' cosi' che il 30/08 a chi
           chiedeva il Premium sono stati dati i 75 € dello Smart. */
        piano.options
          .map(
            (o) =>
              // Il Flex si chiama «Mensile Flex» ovunque — sul sito, al desk e
              // in bocca a chi lo compra — e comporlo da `title` + `sub` dava
              // «Mensile, flex, senza vincoli», che non e' il nome di niente.
              `**${piano.name} ${
                o.title === 'Mensile' ? 'Mensile Flex, senza vincoli' : `${o.title}, ${(o.sub ?? '').toLowerCase()}`
              }: ${o.amount} ${o.period}**. ` +
              // La nota non finisce con un punto nei dati, e senza si attacca
              // alla frase del risparmio: «…fine del mese Risparmio €138».
              `${pulito(o.note).replace(/[.\s]*$/, '')}.${o.savings ? ` ${pulito(o.savings)}.` : ''}`
          )
          .join('\n'),
        /* E la riga che disambigua le due formule che si pagano ogni mese.
           «Annuale — pagamento mensile» e «Mensile Flex» si leggono tutte e due
           come «mensile», e nella stessa conversazione la chat ha dato il
           prezzo dell'annuale come se fosse quello del Flex: un contesto da cui
           si puo' comporre una formula che non esiste — un senza vincoli a 95 €
           — e' lo stesso difetto delle due sospensioni. Il confronto e' un dato
           calcolato dai numeri, non una frase scritta a mano. */
        (() => {
          const flex = piano.options.find((o) => o.title === 'Mensile');
          const rate = piano.options.find((o) => o.title === 'Annuale' && o.period === '€/mese');
          if (!flex || !rate) return '';
          return (
            `**Le formule che si pagano ogni mese sono due e non vanno scambiate.** ` +
            `Quella **senza vincoli** e' una sola: **${piano.name} Mensile Flex, ${flex.amount} ${flex.period}**; ` +
            `i **${rate.amount} ${rate.period}** sono l'**Annuale pagato a rate**, cioe' un impegno di dodici mesi, ` +
            `e infatti costano **meno**. Se qualcuno chiede la formula flessibile di questo piano, l'importo e' ${flex.amount} €.`
          );
        })(),
        /* E l'altro verso dello stesso errore: gli importi di un piano non sono
           quelli dell'altro. */
        `**Questi importi sono ${piano.id === 'smart' ? 'dello Smart' : 'del Premium'} e di nessun altro piano**: ${piano.id === 'smart' ? 'il Premium' : 'lo Smart'} ha i suoi, scritti nella sua voce. Non usare una cifra letta qui per rispondere sull'altro piano.`,
        /* La quota di attivazione sta accanto ai prezzi e non in una voce a
           parte, perché chi chiede quanto costa un abbonamento sta chiedendo
           anche questo: un mensile citato da solo è un preventivo incompleto,
           ed è il motivo per cui la pagina la stampa sotto ogni formula. */
        `**Oltre alla quota mensile o annuale si paga la quota di attivazione contrattuale: ${ATTIVAZIONE.quota} € una tantum**, per ogni abbonamento attivato, e comprende ${ATTIVAZIONE.comprende}. Non si paga sugli accessi singoli degli adulti; sulla lezione singola del Baby Nuoto invece si paga.` +
          /* Con una promozione attiva la quota è in omaggio sulle annuali, ed è
             lo stesso `promoDoc` che governa la pagina: senza questa riga la
             voce direbbe «50 €» a chi sta attivando un'annuale proprio nella
             settimana in cui non li paga. Si spegne da sé mettendo `draft` sul
             documento della promo, come per la pagina. */
          (promoAttiva?.quotaOmaggio
            ? `\n**Ma con la promozione in corso la quota di attivazione è in omaggio sulle formule annuali di questo piano** (${promoAttiva.scadenzaLabel.toLowerCase()}): sull'annuale non si paga, sul Mensile Flex sì. Vale **solo** sugli abbonamenti annuali degli adulti, Smart e Premium: sui corsi dei bambini la quota si paga.`
            : '') +
          /* E quando il regalo è un altro, la quota **resta dovuta**: dirlo per
             esteso, perché la promozione in corso è comunque nel contesto e da
             «c'è una promozione» il modello ricompone volentieri l'omaggio che
             c'era il mese prima. */
          (promoAttiva && !promoAttiva.quotaOmaggio
            ? `\n**La promozione in corso non tocca la quota di attivazione**, che si paga per intero anche sulle formule annuali: quello che dà è un'altra cosa — ${pulito(promoAttiva.vantaggio).toLowerCase()} — e sta scritta nella sua voce.`
            : '')
      ),
    });
  }

  /* ---- La quota di attivazione, come voce a sé ---------------------------
     Sta accanto a ogni piano (sopra) e anche da sola, perché «quanto è la
     quota che si paga al momento dell'iscrizione?» è una domanda che arriva
     senza nominare nessun piano — è arrivata così, e la risposta è stata che
     il dato non c'era: il numero viveva scritto a mano nella pagina e nel
     markdown della scuola nuoto, cioè in due posti che il `kb.json` non
     legge. */
  voci.push({
    id: 'abbonamento:data-inizio',
    tipo: 'abbonamento',
    titolo: 'Quando comincia l\u2019abbonamento, e perché iscriversi oggi non costa di più',
    url: `${SITE}/abbonamenti`,
    area: 'Abbonamenti',
    attivita: [],
    /* La voce che mancava, e la sua assenza ha prodotto «conviene aspettare
       domani» a una persona già decisa. Vedi la nota su DATA_INIZIO in
       `data/abbonamenti.ts`. */
    testo: blocchi(DATA_INIZIO.testo),
  });

  voci.push({
    id: 'abbonamento:quota-attivazione',
    tipo: 'abbonamento',
    titolo: 'La quota di attivazione',
    url: `${SITE}/abbonamenti`,
    area: 'Abbonamenti',
    attivita: [],
    testo: blocchi(
      `La quota di attivazione contrattuale — quella che si paga **al momento dell'iscrizione** — è di **${ATTIVAZIONE.quota} € una tantum** e comprende ${ATTIVAZIONE.comprende}.`,
      `Si paga **una volta per ogni abbonamento attivato** — il secondo abbonamento di una famiglia la paga come il primo — e si somma alla prima quota mensile o annuale, che resta quella del listino. **La quota** vale per gli abbonamenti degli adulti e per i corsi dei bambini allo stesso modo; le eventuali promozioni no, e hanno il perimetro scritto nella loro voce.`,
      `**Non si paga sugli accessi singoli degli adulti**, che sono il modo di entrare senza abbonarsi: là c'è il solo badge di accesso, ${SINGOLI.badge} € la prima volta. **La lezione singola del Baby Nuoto è un'altra cosa e la quota la paga**: al Baby Nuoto ci sono sempre i ${ATTIVAZIONE.quota} €, sia sul mensile sia sulla singola lezione. Non usare l'esenzione degli adulti per rispondere su un corso dei bambini.`,
      `Se si disdice e più avanti si torna, la quota di attivazione va versata di nuovo.`,
      /* Come per le voci dei piani: con la promozione attiva la quota è in
         omaggio sulle annuali, e dirlo qui è il punto — questa è la voce che
         risponde alla domanda diretta. */
      promoAttiva?.quotaOmaggio
        ? `**Con la promozione in corso la quota è in omaggio, ma solo sugli abbonamenti annuali degli adulti** — Smart e Premium, ${promoAttiva.scadenzaLabel.toLowerCase()} (${pulito(promoAttiva.validoSu)}). Fuori da quelle due formule si paga: sul Mensile Flex degli adulti **e su tutti i corsi dei bambini**, Scuola Nuoto Bambini e Baby Nuoto compresi. A un genitore che iscrive un figlio la quota non è in omaggio, e dirglielo è un prezzo dichiarato più basso del vero.`
        : promoAttiva
          ? `**La promozione in corso non è sulla quota**: la quota si paga, per tutti e su tutte le formule. La promozione dà ${pulito(promoAttiva.vantaggio).toLowerCase()} (${pulito(promoAttiva.validoSu)}) e ha la sua voce. Non c'è nessuna quota in omaggio in questo momento — è stata in omaggio in una promozione passata, e ripeterlo adesso è un prezzo dichiarato più basso del vero.`
          : ''
    ),
  });

  /* ---- I corsi junior a stagione: una modalita' sola, e gli sconti hanno una
     finestra ------------------------------------------------------------------
     Il 30/08 a «ci sono sconti per la scuola nuoto bambini?» la chat ha detto
     bene che la promo e' degli adulti e che la quota di attivazione si paga, e
     non ha detto le due cose che quella domanda chiedeva davvero: che l'unica
     formula in vendita adesso e' la mensile — con i suoi prezzi, che nel
     `kb.json` non c'erano affatto, perche' vivevano solo nella tabella di Tina
     — e che le scontistiche esistono, ma dentro la preiscrizione.

     Una voce sola e non due: «quanto costa» e «ci sono sconti» sono la stessa
     domanda fatta in due modi, e separarle rifarebbe il difetto delle due
     sospensioni al contrario — chi pesca la voce del prezzo non troverebbe la
     finestra, e direbbe un prezzo pieno a chi e' dentro la preiscrizione. */
  voci.push({
    id: 'abbonamento:junior-mensile',
    tipo: 'abbonamento',
    titolo: 'Corsi per bambini: quanto costano e gli sconti della preiscrizione',
    url: `${SITE}${JUNIOR_MENSILE.scheda}`,
    area: 'Junior',
    attivita: [],
    testo: blocchi(
      `**Vale per ${JUNIOR_MENSILE.valePer.join(', ')}.** Per il Baby Nuoto le formule sono altre — c'e' anche la lezione singola — e stanno nella sua pagina; la **quota di attivazione di ${ATTIVAZIONE.quota} €** invece vale anche la', su tutte e due le formule.`,
      `**A stagione iniziata l'unica formula in vendita e' l'abbonamento mensile**: si paga un mese per volta, il rinnovo e' ${JUNIOR_MENSILE.rinnovo}, e non ci si lega alla stagione intera — per fermarsi basta la disdetta con dieci giorni di preavviso sul primo del mese.`,
      JUNIOR_MENSILE.voci.map((v) => `- ${v.nome}: **${v.prezzo} €/mese**`).join('\n'),
      `A questi si somma la **quota di attivazione di ${ATTIVAZIONE.quota} € una tantum**, per ogni abbonamento attivato: il secondo figlio la paga come il primo. E ${JUNIOR_MENSILE.proRata}.`,
      `**Gli sconti ci sono, e sono quelli della preiscrizione**, la finestra ${PREISCRIZIONE.finestra} in cui si sceglie il turno per la stagione successiva: li' si compra ${PREISCRIZIONE.su}, scontato del **${PREISCRIZIONE.sconto}%**. Fuori da quella finestra ${PREISCRIZIONE.su} non e' in vendita e **non c'e' nessuno sconto sui prezzi qui sopra**: non e' una promozione che va e viene, e' legata alla preiscrizione.`,
      `E **le promozioni degli adulti non valgono qui**: hanno il perimetro scritto nella loro voce, che sono gli abbonamenti annuali Smart e Premium.`
    ),
  });

  /* ---- Le due sospensioni, e sono due voci -------------------------------
     Erano una sola, e la voce unica le teneva insieme dicendo per bene il
     perimetro — «vale solo per», «per quei corsi c'e' un'altra strada» — ma
     mescolando in tre righe due regimi che non hanno niente in comune oltre ai
     sessanta giorni. Misurato il 28/08: a un Premium Mensile Flex l'assistente
     ha dato i quindici euro giusti e poi il credito di «almeno 2 mensilita'
     utilizzabile entro 6 mesi dalla fine del corso», che e' la regola della
     scuola nuoto. Non aveva inventato: aveva letto una voce che conteneva
     entrambe.

     Due voci separate, ognuna col perimetro nel titolo e nella prima riga, si
     citano una per volta — e quando il modello ne prende una, prende un regime
     intero e coerente. Ognuna nomina l'altra, perche' il caso «ho un abbonamento
     adulti e un figlio alla scuola nuoto» esiste ed e' comune. */
  voci.push({
    id: 'abbonamento:sospensione',
    tipo: 'abbonamento',
    titolo: 'Sospendere l’abbonamento: adulti e Baby Nuoto',
    url: `${SITE}${SOSPENSIONE.scheda}`,
    area: 'Abbonamenti',
    attivita: [],
    testo: blocchi(
      `**Vale per ${SOSPENSIONE.valePer}**, e solo per quelli. Per ${SOSPENSIONE.junior.valePer.join(', ')} le regole sono altre: vedi la voce «Fermarsi durante la stagione», e non usare i numeri di questa.`,
      `**A pagamento:** costa ${SOSPENSIONE.prezzo} € e vale un mese solare per volta, senza limite al numero di sospensioni. Si chiede dall'area riservata (Abbonamenti → Sospensioni) con ${SOSPENSIONE.preavviso} giorni di preavviso rispetto al mese da sospendere, e non e' retroattiva: non si sospende il mese in corso. Il tempo sospeso non si perde — la scadenza del contratto si sposta in avanti di pari durata.`,
      `**Per inabilita' fisica:** gratuita, per inidoneita' documentata di almeno ${SOSPENSIONE.inabilita.giorni} giorni continuativi. Serve un certificato di struttura sanitaria nazionale che dichiari l'inidoneita' all'attivita' sportiva e il termine del periodo, da mandare al desk; sotto i ${SOSPENSIONE.inabilita.recuperoMesiMinimo} mesi non si recupera niente, e non e' sovrapponibile ad altre sospensioni.`
    ),
  });

  voci.push({
    id: 'abbonamento:sospensione-junior',
    tipo: 'abbonamento',
    titolo: 'Fermarsi durante la stagione: Scuola Nuoto, Agonistico, Pallanuoto',
    url: `${SITE}${SOSPENSIONE.junior.scheda}`,
    area: 'Abbonamenti',
    attivita: [],
    testo: blocchi(
      `**Vale per ${SOSPENSIONE.junior.valePer.join(', ')}**, e solo per quelli. Per gli abbonamenti degli adulti e per il Baby Nuoto vedi la voce «Sospendere l'abbonamento: adulti e Baby Nuoto» — sono regole diverse, e i numeri non si scambiano.`,
      `**La sospensione a pagamento qui non esiste**: non proporla e non dire i ${SOSPENSIONE.prezzo} €, che sono degli adulti.`,
      `Quello che c'e' e' la sospensione **gratuita per inidoneita' documentata di almeno ${SOSPENSIONE.junior.giorni} giorni continuativi**: certificato medico (struttura pubblica o privata) con l'inidoneita' e il termine espliciti, mandato al desk, e la sospensione decorre da quando la documentazione arriva.`,
      `Due cose che qui sono diverse dagli adulti, e sono quelle che si sbagliano: durante la sospensione **la quota mensile resta dovuta**, e il ristoro e' un **credito pari ad almeno ${SOSPENSIONE.junior.creditoMensilita} mensilita' pagate, da usare entro ${SOSPENSIONE.junior.creditoEntroMesi} mesi dalla fine del corso**, non trasferibile.`,
      `La sospensione e' **alternativa al recupero delle lezioni** e non cumulabile con esso: per un'assenza di qualche lezione la strada e' quella dei recuperi, non questa.`
    ),
  });

  /* ---- Senza abbonamento: si paga una lezione alla volta ----------------
     Questa voce nasce da una risposta sbagliata. A «avete carnet di accessi?»
     l'assistente rispondeva che i corsi stanno «solo negli abbonamenti», e non
     era prudenza: gli accessi singoli erano scritti a mano nel markup di
     `abbonamenti.astro`, quindi nella KB non c'erano e per il bot non
     esistevano. Un listino che vive in una pagina esiste per chi apre quella
     pagina e per nessun altro.

     Le due cose vanno dette insieme, perché la domanda è sempre quella: il
     carnet no, la lezione singola sì. Un «no» secco manda via una persona che
     voleva pagare. */
  voci.push({
    id: 'abbonamento:accessi-singoli',
    tipo: 'abbonamento',
    titolo: 'Accessi singoli — senza abbonamento',
    url: `${SITE}/abbonamenti#accessi-singoli`,
    area: 'Abbonamenti',
    attivita: [],
    testo: blocchi(
      'Si puo\u2019 entrare senza abbonamento: si prenota e si paga una lezione o un accesso alla volta, dall\u2019app o dal portale.',
      `**Non c\u2019e\u2019 un carnet di ingressi** per la sala e per i corsi: si paga volta per volta, non si compra un blocco di accessi in anticipo. I pacchetti mensili esistono solo per il personal training. Una tantum, la prima volta, il badge di accesso costa ${SINGOLI.badge} \u20ac.`,
      SINGOLI.voci.map((v) => `${v.nome} \u2014 ${v.nota}: ${v.prezzo} \u20ac per accesso.`).join('\n')
    ),
  });

  voci.push({
    id: 'abbonamento:personal-training',
    tipo: 'abbonamento',
    titolo: 'Personal Training — pacchetti e seduta singola',
    url: `${SITE}/abbonamenti#personal-training`,
    area: 'Abbonamenti',
    attivita: [],
    testo: blocchi(
      'I pacchetti di personal training si aggiungono a un abbonamento attivo. La seduta singola invece e\u2019 aperta anche a chi non e\u2019 iscritto.',
      PERSONAL.pacchetti.map((x) => `${x.etichetta}: ${x.prezzo} \u20ac.`).join('\n'),
      `Seduta singola: ${PERSONAL.singolaIscritti} \u20ac per gli iscritti, ${PERSONAL.singolaEsterni} \u20ac per gli esterni.`
    ),
  });

  voci.push({
    id: 'abbonamento:guest-pass',
    tipo: 'abbonamento',
    titolo: 'Guest Pass — la prova del club',
    /* `/attiva` e non `/abbonamenti`: chi arriva qui dalla chat o dalla ricerca
       vuole la settimana di prova, e quella pagina è dove si attiva — codice,
       passaggi, requisiti. Il listino non gli serve, e l'assistente cita
       l'url della voce così com'è: se qui c'è la pagina sbagliata, la manda
       lui alla pagina sbagliata. */
    url: `${SITE}/attiva`,
    area: 'Abbonamenti',
    attivita: [],
    /* Il limite non è deducibile da «accesso completo al club»: un genitore
       che chiede di provare il Baby Nuoto ha ricevuto in risposta il Guest
       Pass come se lo comprendesse, perché la voce non diceva il contrario.
       Il Pass è un Premium di sette giorni e il Premium è il listino degli
       adulti (vedi `plans` in `data/abbonamenti.ts`): non c'è mai stato
       dentro un corso junior, né il personal training. Per un corso per
       bambini che vende anche la lezione singola — come il Baby Nuoto — la
       prova è quella lezione, non il Guest Pass; per chi non la vende — come
       la Scuola Nuoto Bambini — non esiste una prova separata dall'adesione
       mensile, che si disdice di mese in mese. */
    testo: `${GUEST_PASS.giorni} giorni di accesso completo al club a ${GUEST_PASS.prezzo} €, con il codice ${GUEST_PASS.codice}. È riservato a chi non ha e non ha mai avuto un abbonamento Athlon dal ${GUEST_PASS.dal} in poi. Vale solo per le attività degli adulti (il listino Premium): non comprende i corsi per bambini né il personal training. Per un corso per bambini che vende anche la lezione singola, come il Baby Nuoto, la prova è prenotare e pagare quella lezione — non il Guest Pass.
Le attività comprese sono queste, e sono tutte: ${ATTIVITA_GUEST_PASS.join(', ')}.
Quando proponi il Pass, dì che è la settimana Premium delle attività degli adulti ed **elenca tutte** le attività qui sopra, con questi nomi: chi legge deve sapere cosa sta comprando senza aprire un'altra pagina, e un elenco a metà si legge come un elenco completo.`,
  });

  for (const [nome, info] of Object.entries(activityInfo)) {
    voci.push({
      id: `abbonamento:attivita:${nome}`,
      tipo: 'abbonamento',
      titolo: `Cosa comprende ${info.title}`,
      url: info.href ? `${SITE}${info.href}` : `${SITE}/abbonamenti`,
      area: 'Attività comprese negli abbonamenti',
      attivita: [],
      /* La soglia d'età in coda a ogni attività per adulti, e non solo in una
         voce sua: la domanda arriva sempre attaccata a un'attività («posso
         portare mio figlio al nuoto libero?»), e una regola che sta altrove è
         una regola che il recupero non pesca. */
      testo: blocchi(
        pulito(info.body),
        `Riservata a chi ha almeno ${ETA_MINIMA_ADULTI.anni} anni: sotto quell'eta' non e' accessibile. Per i piu' piccoli c'e' ${ETA_MINIMA_ADULTI.alternativa}.`
      ),
    });
  }

  /* La stessa regola anche come voce a se', per le domande che non nominano
     nessuna attivita' in particolare. */
  voci.push({
    id: 'club:eta-minima-adulti',
    tipo: 'club',
    titolo: `Eta' minima per le attivita' degli adulti: ${ETA_MINIMA_ADULTI.anni} anni`,
    url: `${SITE}/abbonamenti`,
    area: 'Attività comprese negli abbonamenti',
    attivita: [],
    testo: blocchi(
      `**Tutte** le attivita' per adulti sono riservate a chi ha almeno ${ETA_MINIMA_ADULTI.anni} anni: Gym Floor, corsi fitness, Group Reformer, aqua fitness, scuola nuoto adulti, corso gestanti, personal training.`,
      `**Il nuoto libero non fa eccezione**: sotto i ${ETA_MINIMA_ADULTI.anni} anni non si accede alla vasca in autonomia, nemmeno accompagnati da un genitore iscritto. Non e' una questione di abbonamento, e' una regola d'accesso: non proporre abbonamenti, prove o accessi singoli per aggirarla.`,
      `Chi ha meno di ${ETA_MINIMA_ADULTI.anni} anni nuota con ${ETA_MINIMA_ADULTI.alternativa}, che e' un corso con l'istruttore in vasca, e i piu' piccoli — i nati nel 2024, 2025 e 2026 — con il Baby Nuoto. Fra scuola nuoto bambini e baby nuoto decide l'anno di nascita, non i mesi: i nati dal 2013 al 2023 fanno la scuola nuoto.`
    ),
  });

  /* ---- Il club, e come ci si muove -------------------------------------- */
  voci.push({
    id: 'club:anagrafica',
    tipo: 'club',
    titolo: 'Athlon Club — dove siamo e cosa siamo',
    url: `${SITE}/`,
    area: 'Il club',
    attivita: [],
    testo: blocchi(
      `Club sportivo dal ${CLUB.founded}, in ${CLUB.street}, ${CLUB.postalCode} ${CLUB.city}, zona ${CLUB.area}.`,
      `Oltre ${CLUB.sqm} m² fra sala pesi, tre sale corsi e due piscine.`,
      `${totalLessons()} lezioni a settimana per ${totalHours()} ore di palinsesto, e ${openHours()} ore a settimana di apertura della sala pesi.`,
      elenco(bands.map((b) => `${b.title}: ${countLessons(b)} lezioni a settimana`)),
      'Non c’è un numero di telefono pubblicato: le richieste passano dal modulo di assistenza dell’Help Desk o dai moduli delle pagine.'
    ),
  });

  voci.push({
    id: 'club:orari',
    tipo: 'club',
    titolo: 'Orari di apertura',
    url: `${SITE}/planning`,
    area: 'Il club',
    attivita: [],
    /* L'orario eccezionale non sta sopra a quello ordinario: lo **sostituisce**,
       e la voce lo deve dire. Senza quella riga il contesto conteneva due
       orari senza gerarchia, e il 29 agosto la risposta è stata quella
       ordinaria del sabato — «la Gym Floor chiude alle 20:00» a club chiuso
       dalle 13. Vedi la nota su `ORARIO_ECCEZIONALE` in `data/club.ts`. */
    testo: blocchi(
      /* La finestra sta **dentro** il blocco dell'orario estivo, fra il testo e
         la riga che dice che sostituisce l'ordinario: un regime che non dichiara
         quando finisce è un regime che il modello prolunga — è successo il 31
         agosto, a una domanda su «domani, 1 settembre». */
      orarioEccezionaleAttivo() &&
        capoversi([ORARIO_ECCEZIONALE.testo, finestraEstiva().frase, ORARIO_ECCEZIONALE.sostituisce]),
      orarioEccezionaleAttivo() && 'ORARIO ORDINARIO, che non vale adesso:',
      pulito(gymFloor.lede),
      elenco(gymFloor.hours.map((h) => `${h.label}: ${h.hours}`)),
      `${DOMENICA.nota} Il calendario è su ${SITE}${DOMENICA.url}`,
      'Sono gli orari di apertura della sala pesi (quando è aperta), non l\u2019orario delle due fasce (quando c\u2019è l\u2019assistente): sono due cose diverse. Anche la sessione in sala si prenota, come ogni altra attività del club: prenotandola si sceglie la fascia — Con Assistenza, con un assistente di sala presente che supervisiona l\u2019attività, oppure Allenamento Libero, dove l\u2019assistente non c\u2019è. In quali orari, dentro l\u2019apertura, c\u2019è l\u2019una o l\u2019altra non è scritto da nessuna parte: lo dice solo il calendario di prenotazione in app o sul portale. Non attribuire alle due fasce un orario fisso — "dalle 6:00", "da lunedì a venerdì", "entrambe partono a quest\u2019ora" sono tutte invenzioni, anche quando l\u2019orario citato è quello vero di apertura qui sopra. Gli orari delle singole attività seguono il planning e cambiano ogni mese.'
    ),
  });

  /* Il calendario eventi non aveva una voce sua: c'erano i singoli eventi
     (`evento:<slug>`), quindi l'assistente poteva citare una masterclass ma non
     il calendario. Alla domanda sulla domenica — che è il giorno degli eventi —
     serve proprio l'indice, perché quale sia l'evento dipende dalla settimana.
     È una voce e non un url scritto in prosa perché in chat i link cliccabili
     sono solo le `fonti`. */
  voci.push({
    id: 'club:eventi',
    tipo: 'club',
    titolo: 'Calendario eventi e masterclass',
    url: `${SITE}${DOMENICA.url}`,
    area: 'Il club',
    attivita: [],
    testo: blocchi(
      DOMENICA.nota,
      'Masterclass e seminari, gare, corsi speciali e formazione. Alcune giornate sono aperte anche a chi non è iscritto. Il calendario cambia di settimana in settimana: per sapere cosa c\u2019è in una domenica precisa si guarda qui.'
    ),
  });

  voci.push({
    id: 'club:prenotazioni',
    tipo: 'club',
    titolo: 'Come si prenota e come si paga',
    url: `${SITE}/planning`,
    area: 'Il club',
    attivita: [],
    testo: blocchi(
      'Le lezioni e le sessioni si prenotano dall’app Athlon Club o dal portale web: le prenotazioni si aprono a partire da tre giorni prima e restano aperte fino all’inizio della lezione, senza un termine anticipato entro cui prenotare.',
      elenco([`Portale: ${PG}`, `App: ${APP}`]),
      'L’iscrizione online parte dalla pagina abbonamenti, che apre la registrazione del piano scelto.'
    ),
  });

  /* ---- Una cosa riservata va detta riservata dove viene detta -----------
     L'appuntamento col Direttore Tecnico e' gratuito e **riservato agli
     iscritti** alla Scuola Nuoto: lo dichiara la sua scheda, in fondo. Ma il
     Direttore Tecnico e' nominato in sette voci — i brevetti, la didattica, gli
     intensivi, le iscrizioni, due clausole, la scheda del corso — e in nessuna
     di quelle sette c'era la riserva. Togliere dal contesto la scheda dedicata
     non e' bastato: il bot l'ha promesso a un genitore non iscritto leggendolo
     dalla scheda del corso, che nel ramo junior c'e' sempre.

     Quindi la riserva si attacca qui, a valle, a ogni voce che lo nomina: una
     riga sola, e vale anche per le voci che qualcuno scrivera' domani. Il
     posto giusto per una regola e' accanto al fatto, non in un altro
     documento che il recupero potrebbe non pescare. */
  const RISERVA_DT =
    'L\u2019appuntamento telefonico con il Direttore Tecnico e\u2019 un servizio gratuito **riservato a chi e\u2019 gia\u2019 iscritto** alla Scuola Nuoto Athlon: a chi sta ancora valutando non va proposto. Chi non e\u2019 iscritto e vuole parlare con una persona scrive al team dal pulsante dell\u2019assistente.';

  for (const v of voci) {
    if (/[Dd]irettore [Tt]ecnico|[Dd]irezione [Tt]ecnica/.test(v.testo) && !v.testo.includes(RISERVA_DT)) {
      v.testo = blocchi(v.testo, RISERVA_DT);
    }
  }

  const body = {
    /* A cosa serve questo file, scritto dentro il file: chi lo consuma è un
       modello, e il modo più affidabile per dargli una regola è metterla nel
       documento invece che sperare che sia nel prompt di chi lo interroga. */
    scopo:
      'Knowledge base del sito Athlon Club, generata dai dati a ogni pubblicazione. Rispondere citando la voce usata e il suo url; non calcolare importi o date, riportare quelli scritti; se nessuna voce risponde, dirlo e rimandare al modulo di assistenza.',
    sito: SITE,
    generato: new Date().toISOString(),
    planning: PLANNING_MONTH,
    terminiVersione: TERMINI_VERSIONE,
    /* Il vocabolario dei tag: le stesse dodici attività che taggano schede,
       eventi, news e sezioni del regolamento. Serve a chi filtra per attività
       invece che per parole. */
    attivita: ACTIVITY_TAGS,
    conteggi: voci.reduce<Record<string, number>>((acc, v) => {
      acc[v.tipo] = (acc[v.tipo] ?? 0) + 1;
      return acc;
    }, {}),
    voci,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      /* Un'ora, come `/llms.txt`: cambia solo a ogni pubblicazione, e chi lo
         rilegge a ogni messaggio non deve pagarne la latenza ogni volta. */
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
