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
import { CLUB } from '../data/club';
import { plans, GUEST_PASS, SOSPENSIONE, activityInfo, SINGOLI, PERSONAL } from '../data/abbonamenti';
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

/** Unisce blocchi già composti saltando quelli vuoti. Non tocca gli a capo. */
const blocchi = (...parti: (string | false | null | undefined)[]) =>
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
      url: `${SITE}/wikiathlon/${a.id}/`,
      area: AREA_LABELS[a.id.split('/')[0]]?.label ?? 'Help Desk',
      attivita: a.data.attivita,
      testo: blocchi(a.data.description, testoCompleto(a.body ?? '')),
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
      testo: blocchi(pulito(s.data.desc), pulito(s.data.detail)),
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
      url: n.data.ctaHref?.startsWith('http')
        ? n.data.ctaHref
        : `${SITE}${n.data.ctaHref ?? '/club-life#news'}`,
      area: `Avvisi · ${n.data.category}`,
      attivita: n.data.attivita,
      testo: blocchi(
        n.data.date.toISOString().slice(0, 10),
        pulito(n.data.excerpt),
        testoCompleto(n.body ?? '')
      ),
    });
  }

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
        `Valida su: ${pulito(d.validoSu)}. ${d.scadenzaLabel}: ${d.scadenza
          .toISOString()
          .slice(0, 10)}.`,
        `Quota di attivazione barrata: ${d.quotaBarrata} €.`,
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
        piano.options
          .map(
            (o) =>
              `${o.title}${o.sub ? ` — ${o.sub}` : ''}: ${o.amount} ${o.period}. ` +
              // La nota non finisce con un punto nei dati, e senza si attacca
              // alla frase del risparmio: «…fine del mese Risparmio €138».
              `${pulito(o.note).replace(/[.\s]*$/, '')}.${o.savings ? ` ${pulito(o.savings)}.` : ''}`
          )
          .join('\n')
      ),
    });
  }

  voci.push({
    id: 'abbonamento:sospensione',
    tipo: 'abbonamento',
    titolo: 'Sospendere l’abbonamento',
    url: `${SITE}${SOSPENSIONE.scheda}`,
    area: 'Abbonamenti',
    attivita: [],
    testo: `La sospensione costa ${SOSPENSIONE.prezzo} € e vale un mese solare per volta, senza limite al numero di sospensioni. Va chiesta con ${SOSPENSIONE.preavviso} giorni di preavviso rispetto al primo del mese da sospendere.`,
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
    testo: `${GUEST_PASS.giorni} giorni di accesso completo al club a ${GUEST_PASS.prezzo} €, con il codice ${GUEST_PASS.codice}. È riservato a chi non ha e non ha mai avuto un abbonamento Athlon dal ${GUEST_PASS.dal} in poi.`,
  });

  for (const [nome, info] of Object.entries(activityInfo)) {
    voci.push({
      id: `abbonamento:attivita:${nome}`,
      tipo: 'abbonamento',
      titolo: `Cosa comprende ${info.title}`,
      url: info.href ? `${SITE}${info.href}` : `${SITE}/abbonamenti`,
      area: 'Attività comprese negli abbonamenti',
      attivita: [],
      testo: pulito(info.body),
    });
  }

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
      `${totalLessons()} lezioni a settimana per ${totalHours()} ore di palinsesto, e ${openHours()} ore a settimana di sala pesi ad accesso libero.`,
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
    testo: blocchi(
      pulito(gymFloor.lede),
      elenco(gymFloor.hours.map((h) => `${h.label}: ${h.hours}`)),
      'Sono gli orari della sala pesi ad accesso libero. Gli orari delle singole attività seguono il planning e cambiano ogni mese.'
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
      'Le lezioni e le sessioni si prenotano dall’app Athlon Club o dal portale web, fino a tre giorni prima.',
      elenco([`Portale: ${PG}`, `App: ${APP}`]),
      'L’iscrizione online parte dalla pagina abbonamenti, che apre la registrazione del piano scelto.'
    ),
  });

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
