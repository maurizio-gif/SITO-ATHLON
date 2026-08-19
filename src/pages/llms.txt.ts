/**
 * `/llms.txt` — il sito in una pagina, per chi lo legge per rispondere.
 *
 * Un assistente a cui chiedono «quanto costa la palestra a Talenti» o «a che ora
 * apre» non deve dover interpretare l'HTML di trentacinque pagine per trovare
 * due numeri. Qui ci sono i fatti, in markdown, nell'ordine in cui vengono
 * chiesti, con il link alla pagina che li spiega per esteso.
 *
 * **Tutto è generato dai dati del sito**, niente è ricopiato: prezzi da
 * `abbonamenti`, lezioni e orari dal planning, attività da `corsi.ts` e
 * `junior.ts`, schede dall'Help Desk. Se il palinsesto cambia, questo file
 * cambia con il prossimo build — che è l'unico modo perché un documento del
 * genere resti vero. Un llms.txt scritto a mano invecchia in un mese e diventa
 * peggio che assente, perché continua a rispondere con dati vecchi.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CORSI } from '../data/corsi';
import { JUNIOR } from '../data/junior';
import { bands, gymFloor, countLessons, totalLessons, totalHours, openHours } from '../data/planning';
import { CLUB } from '../data/club';
import { plans, GUEST_PASS } from '../data/abbonamenti';

const SITE = 'https://www.athlonroma.it';

/** Il nome della fascia come lo mostra il planning, con le sue lezioni. */
function fasce() {
  return bands.map((b) => `- **${b.title}** — ${countLessons(b)} lezioni a settimana`);
}

export const GET: APIRoute = async () => {
  const articoli = (await getCollection('articles', ({ data }) => !data.draft)).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const eventi = (await getCollection('eventi', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.date.getTime() - b.data.date.getTime()
  );

  const fitness = CORSI.filter((c) => (c.banda ?? 'corsi-fitness') === 'corsi-fitness');
  const acqua = CORSI.filter((c) => (c.banda ?? 'corsi-fitness') !== 'corsi-fitness');

  const txt = `# Athlon Club — palestra e piscina a Roma Nord Talenti

> Club sportivo dal ${CLUB.founded} in ${CLUB.street}, ${CLUB.postalCode} ${CLUB.city}, zona ${CLUB.area}.
> Oltre ${CLUB.sqm} m² fra sala pesi, tre sale corsi e due piscine, con ${totalLessons()} lezioni a
> settimana e la sala aperta ${openHours()} ore. Email: ${CLUB.email}.

Questo file è generato dai dati del sito a ogni pubblicazione: i numeri qui sono
gli stessi che vedono le persone sulle pagine.

## Orari di apertura

${gymFloor.hours.map((h) => `- ${h.label}: ${h.hours}`).join('\n')}

Gli orari delle singole attività cambiano ogni mese e stanno nel planning:
${SITE}/planning

## Cosa si fa, in numeri

- ${totalLessons()} lezioni a settimana, per ${totalHours()} ore di palinsesto
- ${openHours()} ore a settimana di sala pesi ad accesso libero
- ${fitness.length} corsi fitness, ${acqua.length} attività in acqua, 4 corsi per bambini

${fasce().join('\n')}

## Abbonamenti

Due piani. **Smart**: Gym Floor, Nuoto Libero Assistito e Athlon TV. **Premium**:
tutto il club — corsi fitness, Group Reformer, Aqua Fitness, Scuola Nuoto Adulti,
Corso Gestanti, oltre a Gym Floor, nuoto libero e Athlon TV.

${plans
    .map(
      (p) =>
        `- ${p.name}: ` +
        p.options.map((o) => `${o.amount} ${o.period} (${o.title}${o.sub ? `, ${o.sub}` : ''})`).join(' · ')
    )
    .join('\n')}
- Guest Pass: ${GUEST_PASS.prezzo} €, ${GUEST_PASS.giorni} giorni con accesso completo, per chi non ha avuto un abbonamento Athlon dal ${GUEST_PASS.dal}

Prezzi, opzioni e condizioni: ${SITE}/abbonamenti
Termini e condizioni per esteso: ${SITE}/regolamento

## Pagine principali

- [Home](${SITE}/): il club, le attività, gli spazi
- [Abbonamenti](${SITE}/abbonamenti): piani, prezzi, accessi singoli, Guest Pass
- [Orari e planning](${SITE}/planning): la settimana completa, per fascia
- [Gym Floor](${SITE}/gym-floor): sala pesi di 400 m², quattro aree
- [Corsi Fitness](${SITE}/corsi-fitness): ${fitness.length} corsi in cinque famiglie
- [Group Reformer](${SITE}/reformer): pilates sul Reformer, gruppi da dieci
- [Personal Training](${SITE}/personal-training): sei trainer, allenamento individuale
- [Athlon TV](${SITE}/athlon-tv): lezioni dall'app, comprese in ogni abbonamento
- [Club Life](${SITE}/club-life): eventi, news, servizi e Help Desk
- [Eventi](${SITE}/eventi): masterclass e appuntamenti in calendario

## Attività in acqua

${acqua.map((c) => `- [${c.nome}](${SITE}/${c.slug}/): ${c.claim ?? c.descrizione}`).join('\n')}

## Corsi fitness

${fitness.map((c) => `- [${c.nome}](${SITE}/${c.slug}/): ${c.claim ?? ''}`.trimEnd()).join('\n')}

## Corsi per bambini

${JUNIOR.map((c) => `- [${c.nome}](${SITE}/${c.slug}/) — ${c.eta}: ${c.claim ?? ''}`.trimEnd()).join('\n')}

## Eventi in calendario

${
    eventi.length
      ? eventi
          .map(
            (e) =>
              `- [${e.data.title}](${SITE}/eventi/${e.id}/) — ${e.data.date
                .toISOString()
                .slice(0, 10)}${e.data.price ? ` · ${e.data.price}` : ''}`
          )
          .join('\n')
      : '- nessun evento in calendario'
  }

## Help Desk — le risposte operative

Iscrizioni, disdette, prenotazioni, certificato medico, recuperi: ${articoli.length} schede.

${articoli
    .map((a) => `- [${a.data.title}](${SITE}/wikiathlon/${a.id}/): ${a.data.description}`)
    .join('\n')}

## Come si prenota e come si paga

- Prenotazioni di lezioni e sessioni: app Athlon Club o portale web, fino a tre giorni prima
- Portale: https://athlon.perfectgym.com/ClientPortal2
- App: https://onelink.to/athlon
- Iscrizione online: dalla pagina abbonamenti, che apre la registrazione del piano scelto
- Assistenza e contatti: ${CLUB.email}

## Cosa questo sito non dice

Non c'è un numero di telefono pubblicato, e non ci sono coordinate geografiche:
per le indicazioni il sito rimanda a Google Maps sull'indirizzo. Le richieste si
fanno per email o dai moduli linkati nelle pagine.
`;

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      /* Un'ora di cache: il file cambia solo a ogni pubblicazione, ma chi lo
         legge spesso non deve pagare la latenza ogni volta. */
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
