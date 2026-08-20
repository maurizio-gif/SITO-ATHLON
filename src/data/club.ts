/**
 * I fatti del club, in un posto solo, per chi legge il sito senza occhi:
 * motori di ricerca, anteprime dei social, agenti che leggono il markup.
 *
 * Qui non c'è niente che non sia già scritto e verificabile nel repository:
 *
 *  - indirizzo e zona → `Footer.astro`;
 *  - email → `desk@athlonroma.it`, l'unico indirizzo di assistenza del sito;
 *  - anno di fondazione → `FOUNDED` in `Stats.astro`, da cui la home calcola
 *    gli anni di storia, e l'occhiello della hero;
 *  - metri quadri → la riga del footer;
 *  - orari di apertura → il planning (`gymFloor.hours`), gli stessi che la
 *    pagina mostra;
 *  - social → i tre pulsanti del footer.
 *
 * Quello che il repository **non** ha non sta qui: nessun numero di telefono
 * del club (i due numeri nella scheda brevetti sono di due tecnici, non del
 * centralino) e nessuna coordinata geografica, perché la mappa lavora
 * sull'indirizzo. Un dato inventato in un JSON-LD è peggio di un dato assente:
 * i motori lo pubblicano come se fosse dichiarato dal club.
 */
import { gymFloor } from './planning';

export const CLUB = {
  name: 'Athlon Club',
  /** Come si presenta nella barra e nei titoli. */
  brand: 'Athlon Club 4.0',
  founded: 1973,
  email: 'desk@athlonroma.it',
  street: 'Via Ugo Ojetti 134',
  postalCode: '00137',
  city: 'Roma',
  country: 'IT',
  /** La zona come la nomina il club, che è anche come la cercano le persone. */
  area: 'Roma Nord — Talenti',
  sqm: 3000,
  social: [
    'https://www.instagram.com/athlon_club/',
    'https://www.facebook.com/AthlonClubRoma',
    'https://www.youtube.com/channel/UC9XX5E0u-qqlqavtawlmOnQ',
  ],
  logo: '/wp-content/uploads/2025/08/Logo-oriz-full-2.png',
  /** L'immagine di anteprima quando si condivide un link senza foto propria. */
  socialImage: '/og/athlon-club.jpg',
  /**
   * I dati dell'ente, che vanno sui documenti e sui fogli affissi in sede.
   *
   * Stavano scritti a mano nel footer, e servivano anche al generatore dei JPEG
   * del planning: due copie di un numero di affiliazione sono due copie che
   * divergono al primo rinnovo, e quella sbagliata resta appesa a una parete.
   */
  legale: {
    ragione: 'Società Sportiva Dilettantistica Point 2000 SSD',
    piva: '05154811003',
    asi: 'LAZ-RM4453',
    fin: '996434',
    csen: '71519',
  },
} as const;

/** Giorni della settimana in schema.org, per gli orari del planning. */
const GIORNI: Record<string, string[]> = {
  'Lunedì – Venerdì': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  Sabato: ['Saturday'],
  Domenica: ['Sunday'],
};

/**
 * Gli orari di apertura in formato schema.org, letti dal planning: se cambiano
 * lì cambiano anche nei dati strutturati, senza una seconda copia da ricordare.
 */
export function openingHoursSpec() {
  return gymFloor.hours
    .map((row) => {
      const giorni = GIORNI[row.label];
      if (!giorni) return null;
      const [apre, chiude] = row.hours.replace(/\s/g, '').split('–');
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: giorni,
        opens: apre,
        closes: chiude,
      };
    })
    .filter(Boolean);
}

/** Indirizzo postale, unico e riutilizzato da tutti gli schemi. */
export function postalAddress() {
  return {
    '@type': 'PostalAddress',
    streetAddress: CLUB.street,
    postalCode: CLUB.postalCode,
    addressLocality: CLUB.city,
    addressCountry: CLUB.country,
  };
}

/**
 * Il club come luogo dove si fa sport. `SportsActivityLocation` e non
 * `LocalBusiness` generico: dice a chi legge di che tipo di posto si tratta, e
 * `HealthClub` come secondo tipo copre palestra e piscina.
 *
 * L'`@id` è stabile e finisce con `#club`, così gli altri schemi della pagina
 * possono puntare a questo invece di ripeterlo.
 */
export function clubSchema(site: string) {
  const base = site.replace(/\/$/, '');
  return {
    '@type': ['SportsActivityLocation', 'HealthClub'],
    '@id': `${base}/#club`,
    name: CLUB.name,
    alternateName: CLUB.brand,
    url: `${base}/`,
    logo: `${base}${CLUB.logo}`,
    image: `${base}${CLUB.socialImage}`,
    email: CLUB.email,
    foundingDate: String(CLUB.founded),
    address: postalAddress(),
    areaServed: CLUB.area,
    sameAs: [...CLUB.social],
    openingHoursSpecification: openingHoursSpec(),
  };
}

/**
 * Un'attività del club come servizio offerto.
 *
 * `Service` e non `Course` o `Event`: un corso fitness non è un percorso di
 * studi, e non è nemmeno un evento con una data — è qualcosa che il club offre
 * ogni settimana. Gli orari veri stanno nel planning e in `/llms.txt`, dove
 * possono essere letti senza rischiare che un motore li mostri come date.
 *
 * `provider` punta al club per `@id`, quindi chi legge collega il servizio a
 * indirizzo, orari e recapiti senza che siano ripetuti qui.
 */
export function serviceSchema(
  site: string,
  s: { name: string; description: string; path: string; image?: string; type?: string }
) {
  const base = site.replace(/\/$/, '');
  return {
    '@type': 'Service',
    '@id': `${base}${s.path}#service`,
    name: s.name,
    description: s.description,
    serviceType: s.type ?? 'Attività sportiva',
    url: `${base}${s.path}`,
    ...(s.image ? { image: `${base}${s.image}` } : {}),
    provider: { '@id': `${base}/#club` },
    areaServed: CLUB.area,
  };
}

/**
 * Un piano di abbonamento con il suo prezzo. I prezzi arrivano dalla pagina, non
 * da qui: questa funzione li mette in forma, non li decide.
 */
export function offerSchema(
  site: string,
  o: { name: string; description: string; price: string; unit: string; url: string }
) {
  const base = site.replace(/\/$/, '');
  return {
    '@type': 'Offer',
    name: o.name,
    description: o.description,
    price: o.price,
    priceCurrency: 'EUR',
    /** L'unità di riferimento: un mese di abbonamento, non un acquisto unico. */
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: o.price,
      priceCurrency: 'EUR',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: o.unit },
    },
    url: o.url,
    seller: { '@id': `${base}/#club` },
  };
}

/**
 * Il percorso di navigazione. Serve a due cose diverse con lo stesso dato: nei
 * risultati di ricerca mostra dove sta la pagina, e a un agente dice come è
 * organizzato il sito senza fargli indovinare dagli URL.
 */
export function breadcrumbSchema(
  site: string,
  crumbs: { name: string; path: string }[]
) {
  const base = site.replace(/\/$/, '');
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${base}${c.path}`,
    })),
  };
}
