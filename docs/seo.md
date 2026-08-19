# SEO e navigazione agentica

Dove stanno le cose, e perché stanno lì. Tutto quello che segue è generato dai
dati del sito: nessun titolo, prezzo o orario è ricopiato a mano in un secondo
posto, perché una copia diverge sempre.

## Il `<head>`, una volta per tutte — `src/layouts/Layout.astro`

Ogni pagina passa da lì e riceve:

| | |
| --- | --- |
| `<title>` e `description` | dalla pagina; c'erano già su tutte e 75 |
| `<link rel="canonical">` | assoluto su `Astro.site` (www.athlonroma.it), non sul dominio da cui la pagina è servita — le anteprime Vercel non devono competere con la produzione |
| `robots` | `index, follow, max-image-preview:large, max-snippet:-1`. Senza `max-image-preview` Google mostra la miniatura piccola anche quando la foto è buona |
| Open Graph | type, site_name, locale, url, title, description, image con `width`/`height`/`alt` |
| Twitter | `summary_large_image`, title, description, image, alt |
| `theme-color` | l'arancio del brand |
| `preconnect` | fonts.googleapis.com e fonts.gstatic.com: Inter arriva da lì via `@import`, e senza preconnect la connessione parte solo a CSS letto |
| JSON-LD | un solo `@graph` per pagina |

Prop disponibili: `image`, `imageAlt`, `breadcrumb`, `schema`, `ogType`, `noindex`.

## L'anteprima quando si condivide un link

- **Default**: `public/og/athlon-club.jpg`, 1200×630, generata con Playwright dai
  materiali del club — foto della sala, logo, indirizzo. Chi condivide la home,
  gli abbonamenti o il planning vede quella.
- **Per pagina**: dove esiste una foto propria, è quella. Le 19 pagine attività
  usano `corso.hero`, le quattro junior il loro, gli eventi la foto della scheda.

Per rigenerare la card di default: si serve `dist/` in locale, si carica una
pagina HTML 1200×630 e si fa uno screenshot. Il font display va misurato, non
solo dichiarato: `document.fonts.check()` risponde `true` anche quando è caduto
sul fallback.

## Dati strutturati — `src/data/club.ts`

Un `@graph` per pagina, non blocchi slegati:

| Schema | Dove | Da cosa nasce |
| --- | --- | --- |
| `SportsActivityLocation` + `HealthClub` | tutte le 75 pagine | indirizzo, email, anno, social e **orari dal planning** |
| `BreadcrumbList` | 74 | il percorso dichiarato da ogni pagina |
| `Service` | 28 | le attività: nome, descrizione, foto, `provider` → club |
| `TechArticle` | 38 | le schede dell'Help Desk |
| `FAQPage` | 29 | già esistente, da `Faq.astro` |
| `Event` | 3 | gli eventi: data, luogo, prezzo se dichiarato |
| `ItemList` di `Offer` | 1 | i piani, **con i prezzi letti da `src/data/abbonamenti.ts`** |

**Quello che non c'è, di proposito**: nessun `telephone` (il sito non pubblica un
numero del club: i due nella scheda brevetti sono di due tecnici), nessun `geo`
(la mappa lavora sull'indirizzo), nessun `priceRange` generico, nessun
`dateModified` inventato. Un dato falso in un JSON-LD è peggio di un dato
assente: i motori lo pubblicano come se fosse dichiarato dal club.

## Sitemap e robots

- `@astrojs/sitemap` genera `sitemap-index.xml` con 75 URL. Il reindirizzo
  `/scuola-nuoto-bambini-3` è escluso: la sua pagina porta già `noindex` e il
  canonical del bersaglio.
- Nessun `lastmod`: una data di modifica falsa insegna a chi legge a non credere
  a quelle vere.
- `public/robots.txt` non blocca nessuno, compresi i crawler degli assistenti, e
  rimanda alla sitemap.

## `/llms.txt` — `src/pages/llms.txt.ts`

Il sito in una pagina di markdown, per chi lo legge per rispondere a una domanda.
Indirizzo, orari, numeri della settimana, i due piani con i prezzi, le attività,
i corsi per bambini, gli eventi in calendario, le 38 schede dell'Help Desk, come
si prenota — e una sezione finale su **cosa il sito non dice**, perché un agente
che non trova il telefono deve sapere che non c'è, non continuare a cercarlo.

È generato a ogni build dagli stessi dati delle pagine. Un llms.txt scritto a
mano invecchia in un mese e a quel punto è peggio che assente, perché continua a
rispondere con numeri vecchi.

## Peso delle pagine

Le foto stanno in `public/` e sono referenziate come stringhe dai file di dati,
quindi non passano dall'ottimizzatore di Astro, che lavora su import statici. La
strada praticabile è `scripts/varianti-foto.mjs`: genera un `-640.jpg` accanto a
ogni originale usato in una casella piccola, e `src/data/foto.ts` lo offre in
`srcset` (o direttamente, per gli sfondi CSS, dove `srcset` non arriva).

Misurato a 1280px, foto scaricate per pagina:

| | prima | dopo |
| --- | --- | --- |
| Home | 8.453 kB | **945 kB** |
| Corsi fitness | 1.150 kB | **260 kB** |

L'originale resta il `src`, quindi la lightbox continua ad aprire la foto grande:
il file pesante si paga solo quando qualcuno vuole vederlo grande.

Lo script si lancia a mano quando si aggiungono foto:

```
node scripts/varianti-foto.mjs
```

Non è nella pipeline di build di proposito: su Vercel farebbe scaricare `sharp` a
ogni deploy per rigenerare file che non cambiano.

### Quello che resta da fare, e non è codice

I video di sfondo sono il peso rimanente, e sono una scelta di prodotto, non un
bug:

| Video | Pagina | Peso |
| --- | --- | --- |
| `Baby-Nuoto-60.mp4` | `/baby-nuoto` | 28,3 MB |
| `Video-Reformer-Compresso-per-Sito.mp4` | `/reformer` | 22,9 MB |
| `Athlon-Tour-2025-COMPRESSED.mp4` | home | 9,2 MB |
| `solo-sala-pesi.mp4` | `/gym-floor` | 5,5 MB |

Sono clip di sfondo, mute e in loop, larghe al massimo quanto lo schermo: a
1080p e con un bitrate da sfondo starebbero in un quarto dello spazio senza
differenza visibile. Serve una ricodifica dei file, che è materiale del club —
non una modifica al sito.
