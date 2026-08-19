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

### I video di sfondo

Erano il peso rimanente, ed erano esportati con impostazioni da montaggio: 28 MB
per una clip da 57 secondi mostrata in un quadrato da 563 px, 6,2 Mbps a 60 fps
per una che sta in un quadrato da 662. `scripts/comprimi-video.mjs` le ricodifica
tutte e quattro.

| Clip | Prima | Dopo | |
| --- | --- | --- | --- |
| `Baby-Nuoto-60` | 28,3 MB · 1080p · 4,1 Mbps | **9,3 MB** · 720p · 1,4 Mbps | −67% |
| `Video-Reformer` | 22,9 MB · 1080×1920 · 60 fps · 6,4 Mbps | **3,6 MB** · 720×1280 · 30 fps · 1,0 Mbps | −84% |
| `Athlon-Tour` (hero) | 9,2 MB · **HEVC** · 1,5 Mbps | **7,8 MB** · H.264 · 1,3 Mbps | −15% |
| `solo-sala-pesi` | 5,5 MB · 2,5 Mbps | **3,4 MB** · 1,6 Mbps | −37% |
| | 65,9 MB | **24,1 MB** | −63% |

Quattro cose che questa tabella non dice, e contano più della percentuale:

**La clip della home era in HEVC.** Efficiente come codec, ma Firefox non lo
decodifica affatto e Chrome solo con supporto hardware: su quei browser lo
sfondo della hero era un rettangolo nero. Ora è H.264, e pesa meno di prima.

**La risoluzione segue la casella, non il sorgente.** Misurato in browser a 390,
1280 e 2560 px: le due clip dentro una scheda si vedono al massimo a 563 e 662
px, quindi 720p le copre col doppio della densità. Le due a tutta pagina restano
a 1080p, che è già la risoluzione dei file originali.

**Il CRF da solo non bastava.** Il primo tentativo, solo `-crf 28`, sul Baby
Nuoto ha prodotto un file **più grande dell'originale**: acqua che schizza è
dettaglio alto su tutto il fotogramma, e quella qualità su quel contenuto costa
più di 4 Mbps. Per uno sfondo la scelta giusta è opposta — un tetto con
`-maxrate`, e la qualità che scende dove il contenuto è difficile.

**E nessuna ha la traccia audio.** Il Reformer se l'era tenuta perché era la
sola clip con i controlli, quindi la sola dove qualcuno poteva alzare il volume.
Togliendo i controlli quel gesto non esiste più su nessuna clip del sito, e una
traccia che nessuno può sentire è solo peso: 362 kB su 4,2 MB, via con una copia
di flusso (`-c:v copy -an`), quindi senza ricodificare — il fotogramma a metà
clip è byte per byte lo stesso di prima. La hero della home, l'unica che si può
portare a schermo intero, non ha audio nel sorgente.

Tutte e quattro hanno `+faststart` (l'indice all'inizio, altrimenti il browser
scarica fino in fondo prima del primo fotogramma) e `yuv420p`. Verifica con
`scripts/confronta-video.mjs`: metadati, durata, faststart, e lo stesso istante
estratto dai due file e affiancato. Che il fotogramma si estragga dimostra anche
che il file decodifica — Chromium headless qui non ha il decoder H.264, quindi la
riproduzione in pagina va provata su un browser vero.

Peso delle pagine con video, misurato a 1280px:

| | prima | dopo |
| --- | --- | --- |
| Home | 17,9 MB | **8,9 MB** |
| Baby Nuoto | ~29 MB | **10,3 MB** |
| Reformer | ~24 MB | **4,6 MB** |
| Gym Floor | 5,9 MB | **3,7 MB** |

## Prestazioni: la catena critica, misurata

PageSpeed dava alla home **88** su mobile, con 1930 ms di blocco del rendering e
un Speed Index di 5,1 s. Il numero che spiegava tutti gli altri era la catena di
rete più lunga: **13 secondi**.

Misurato in locale con Lighthouse 13.4.1 (la stessa versione di PageSpeed, stessa
emulazione mobile e stessa 4G lenta simulata), prima e dopo:

| | prima | dopo |
| --- | --- | --- |
| Performance | 88 | **98** |
| Accessibilità | 92 | **96** |
| Best practices | 96 | **100** |
| First Contentful Paint | 1,7 s | **1,1 s** |
| Speed Index | 20,9 s | **1,1 s** |
| Cumulative Layout Shift | 0,045 | **0** |
| Catena di rete più lunga | 13 003 ms | **198 ms** |
| CSS che blocca il rendering | 1850 ms | **0** |

### Il font del corpo arrivava da Google Fonts con un `@import`

Ed era la catena. Un `@import` dentro un foglio di stile che blocca il rendering
blocca a sua volta: scarica `Layout.css` → leggi → scopri l'import → apri una
connessione verso `fonts.googleapis.com` → prendi il CSS → scopri i woff2 su
`fonts.gstatic.com` → scaricali. Quattro tappe in fila, due handshake TLS verso
domini terzi, prima che una lettera possa comparire.

Inter sta ora in `public/fonts/`, nel file variabile (un file per tutti i pesi
da 400 a 800) e nei due subset latini con `unicode-range`: chi legge italiano
scarica 48 kB, e `latin-ext` non parte nemmeno. Verificato che serva solo
`latin`: dei 153 caratteri distinti nelle 75 pagine, nessuno cade fuori — quelli
che escono da entrambi i subset sono emoji e frecce, che vengono dal font di
sistema come prima. Le istruzioni per aggiornarlo stanno in `global.css`.

`Layout.astro` chiede in `preload` i due caratteri della prima schermata:
Tusker 3700 (l'elemento LCP di quasi ogni pagina è un titolo) e Inter latin.
Solo quei due — un preload è una promessa di uso immediato, e chiedere anche gli
altri tre sposterebbe banda via da questi. Misurato: con entrambi FCP 1,1 s, col
solo Tusker 1,4 s.

### Quattro fogli di stile, quattro giri di rete

Astro emetteva un CSS per componente: 1,5–6 kB ciascuno, tutti bloccanti. Il
costo era il giro di rete, non il peso. `build.inlineStylesheets: 'always'` li
mette dentro l'HTML: la pagina cresce di 66 kB non compressi — poco più di 4
sulla rete — e il rendering bloccato passa da 1074 ms a zero. Si perde la cache
condivisa tra pagine, ed è un prezzo che su misura conviene pagare.

### La hero della home non aveva poster

Finché il video non aveva byte a sufficienza, la prima schermata del sito era
una fascia vuota: è questo che teneva lo Speed Index a 20,9 s in locale. Il
poster è il primo fotogramma della clip stessa, 37 kB di webp, quindi quando il
video parte non si vede nessuno scatto. È anche l'elemento su cui si misura
l'LCP della home, e per quello `Layout.astro` accetta `lcpImage`: un `preload`
con `fetchpriority="high"`, perché il poster di un `<video>` il browser lo
scopre tardi e non gli dà priorità.

### Le foto delle hero pesavano mezzo megabyte

Sono l'elemento LCP di ogni pagina interna, e venivano servite alla dimensione
originale: 465 kB per lo sfondo del Reformer. `fotoHero()` offre le due varianti
— 640 e **1280**, che copre un telefono a doppia densità — e tiene l'originale
per gli schermi larghi, con `fetchpriority="high"`. Ventitré foto, 358 kB
risparmiati in media.

| | prima | dopo |
| --- | --- | --- |
| `/reformer` | perf 77 · LCP 4,4 s | **perf 94 · LCP 2,9 s** |
| `/baby-nuoto` | — | perf 92 · LCP 3,3 s |
| `/corsi-fitness` | — | **perf 100 · LCP 1,8 s** |

Su `/baby-nuoto` la foto arriva in 22 ms osservati: i 3,3 s sono il modello di
banda di Lighthouse, dove la clip da 3 MB della pagina occupa il canale. È il
contenuto della pagina, e su un telefono vero parte quando arriva a schermo.

### Adattamento dinamico forzato

Lighthouse ne segnalava 102 ms nell'header: il callback del `ResizeObserver`
leggeva `getBoundingClientRect()` e subito dopo scriveva `--header-h`, quindi
ogni giro invalidava il layout appena calcolato. Ora la misura arriva da
`borderBoxSize`, che l'entry porta già con sé, e la lettura iniziale non c'è più
— `observe()` fa scattare il callback da sé, senza costringere il primo layout
della pagina in anticipo. Lo stesso trattamento alla striscia della home, che
leggeva la posizione di ogni card al caricamento e ora lo fa a pagina caricata.

Resta un item nell'audit, ~109 ms, nel copione che avvia i video: chi legge il
layout per primo paga il primo layout della pagina, e qualcuno deve farlo.
Rimandarlo vorrebbe dire far partire la hero più tardi. Il Total Blocking Time
misurato è 20 ms.

### Cosa resta rosso, e perché

- **`image-delivery`, 78 KiB.** Due foto del carosello della home sarebbero più
  leggere in WebP. Sono sfondi CSS, e `background-image` non ha un meccanismo di
  fallback come `<picture>`: servirebbe `image-set()` con `type()`, che i Safari
  più vecchi non leggono. Le due varianti `-640` recuperano già 26 kB.
- **`total-byte-weight`, 4 MB.** È il video della hero. È la pagina.
- **`max-potential-fid`, 230 ms.** Metrica deprecata e non pesata nel punteggio;
  quella che conta, il Total Blocking Time, è 20 ms.
- **`color-contrast`: resta rosso per scelta, su tre elementi.** L'arancione del
  marchio, `#ff5701`, dà 3,17:1 sul bianco e 2,65:1 sulla crema, sotto il 4,5:1
  che serve al testo piccolo. Gli elementi segnalati erano nove; sei sono stati
  portati a norma con l'arancione scuro — `--accent-text` e `--accent-fill` in
  `global.css`, che sono la soglia calcolata e non un secondo colore del marchio:

  | dove | prima | dopo |
  | --- | --- | --- |
  | i due pulsanti del pannello account | 2,65 e 3,17:1 | 4,55:1 |
  | pastiglia Contattaci nell'header mobile | 3,17:1 | 5,46:1 |
  | le quattro etichette di «Dove siamo» e la sopralinea | 2,65:1 | 4,55:1 |
  | pieno di Contattaci nel footer | 3,17:1 | 4,55:1 |

  I tre che restano tengono `#ff5701` per decisione esplicita: la **sopralinea
  della hero**, il suo pulsante **«Prova Athlon»** e il link **«Apri il planning
  della settimana»**. Sul pulsante si era provata l'altra strada — 19px in
  grassetto, che porta la soglia a 3:1 e lo fa passare senza toccarne il colore —
  ed è stato riportato a 14px/500 su richiesta. Non estendere i due token a
  questi tre punti senza chiedere.

  Il punteggio resta **96 comunque**: `color-contrast` è un controllo binario,
  quindi tre elementi o nove danno lo stesso esito. Serve arrivare a zero.

  I tre grigi che mancavano il 4,5:1 per un soffio, invece, sono stati alzati —
  le intestazioni del footer, il suggerimento delle gallerie, la riga sotto i
  loghi: stesso colore, un filo più di opacità, nessun colore del marchio in
  mezzo.

### Accessibilità: gli overlay chiusi erano tabulabili

Il controllo che PageSpeed segnalava come «l'albero di accessibilità non è ben
formato» era questo: `#acct-modal` porta `aria-hidden="true"` ma conteneva
pulsante e link raggiungibili col tab. `opacity: 0` nasconde agli occhi, non
alla tastiera. Ora gli overlay chiusi sono `visibility: hidden` — il pannello
account, il menu mobile (33 link), le nove tendine del desktop (32), il modale
delle attività, il pulsante flottante dell'Help Desk.

Due dettagli che questa forma richiede:

- **`visibility` non si dissolve, si commuta.** Durata zero, e un ritardo pari
  alla dissolvenza solo in chiusura. Dandogli una durata, il valore calcolato
  resta `hidden` nell'istante in cui lo script sposta il focus dentro il
  pannello, e `focus()` rifiuta un elemento invisibile.
- **Lo stile va ricalcolato prima di chiedere il focus.** La classe è appena
  stata aggiunta: una lettura di `offsetWidth` lo forza.

Verificato in browser: 32 e 33 elementi focalizzabili dentro overlay chiusi, e
**zero** raggiungibili; da aperti, tutti; il focus entra sul pulsante di
chiusura e torna al pulsante che ha aperto.
