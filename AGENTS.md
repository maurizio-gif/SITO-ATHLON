## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Typography: the display face needs headroom

Titles are set in Tusker Grotesk, which draws accented caps (À, È, Ù, É) up to
1.047em above the baseline — taller than the leading this design uses. Without
headroom the ink lands above its line box: it collides with the eyebrow above
and gets shaved off wherever an ancestor clips (rounded cards, the app splash,
any `overflow: hidden` row). Italian headings are full of accents, so this bites
constantly — `MODALITÀ`, `ATTIVITÀ`, `PIÙ`, `PERCHÉ`.

`global.css` solves it once, for every page. Two things make it work together:
`ascent-override: 105%` on the three `@font-face` rules, and the
`Display-face headroom` rule that derives the padding from the leading.

When writing a page:

- **`h1`–`h4` are already covered.** Nothing to do.
- **To tighten the leading, set `--lh`, never `line-height`.** The headroom is
  computed from `--lh`; setting `line-height` directly leaves the padding at
  the default and the caps get clipped again.
  ```css
  .my-title { font-size: var(--text-3xl); --lh: 0.9; }
  ```
- **Display text that is not `h1`–`h4` needs `class="u-display"`** to opt in —
  spans, `strong`, price paragraphs, anything set in `var(--font-heading)`.
- **Never add `padding-top` by hand to stop clipping.** That is what the rule
  is for, and a fixed value goes stale the moment the leading or the copy
  changes. Every such patch has been removed; don't reintroduce one.
- **Positioning a decoration against a display box** (an accent rule, a bar):
  offset it by `var(--display-headroom)` so it keeps its place if `--lh` is
  retuned later. `.head-word::before` in `ActivityGrid.astro` is the example.

To verify: for every element in the display face, the ink must start at or
below its own padding-box top. Measure with canvas `TextMetrics` —
`padding-top + (line-height - (fontBoundingBoxAscent + fontBoundingBoxDescent)) / 2
+ fontBoundingBoxAscent - actualBoundingBoxAscent` must be `>= 0`.

## Una colonna di testo si misura in `ch`, non in px e non in rem

La larghezza di un paragrafo non è una lunghezza: è un numero di caratteri per
riga, e l'obiettivo è 45–75, con la mediana sopra 38 sul totem. `ch` è l'unica
unità che lo tiene fermo, perché cresce col carattere. Le altre due lo fanno
ballare, e nei due versi opposti — misurato sull'intro di `Struttura`, la stessa
frase su due schermi:

| `max-width` | scrivania (radice 16) | televisione (radice 31,5) |
| --- | --- | --- |
| `640px` | **93** caratteri per riga | 47 |
| `48rem` | 111 | **111** |
| `52ch` | 72 | 61 |

Un valore in **px** si stringe dove lo schermo è più grande: il testo cresce con
la radice, la colonna no. Un valore in **rem** cresce insieme al testo, quindi i
caratteri per riga restano quelli — e se erano già troppi restano troppi su ogni
schermo. `ch` è l'unico che li governa.

Da qui due cose da sapere prima di toccare la larghezza di un paragrafo.

**«Si legge stretto» non vuol dire «è stretto».** L'intro di `Struttura` sembrava
rimpicciolita e faceva 93 caratteri per riga, cioè venti oltre il limite:
allargarla l'ha peggiorata a 111. Quello che la rimpiccioliva era il **corpo** —
testo base sotto un titolo grande, su fondo scuro. La cura è alzare il corpo e
tenere la misura, non il contrario: la colonna diventa più larga in pixel *e* la
riga torna leggibile, perché `ch` scala con lei.

**Si misura col canvas, non a occhio e non contando le righe.** Dividere i
caratteri per il numero di righe sbaglia ogni volta che il paragrafo contiene un
elemento a blocco con un'interlinea sua — un `<strong>` che fa da titolo dà 21
caratteri per riga su una colonna che ne tiene 54 — o quando l'elemento è
`hidden`, dove le righe risultano una. La misura vera:

```js
const st = getComputedStyle(el);
const c = document.createElement('canvas').getContext('2d');
c.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
const t = el.textContent.trim();
const cpr = el.getBoundingClientRect().width / (c.measureText(t).width / t.length);
```

E lo stesso vale per **l'altezza di un riquadro incorporato**: l'iframe del tour
virtuale aveva `height="500"`, che su un monitor largo era una fessura in una
colonna da 1300 e sul totem restava 500 mentre il testo intorno cresceva di due
terzi. L'altezza di una cosa che inquadra uno spazio è un **rapporto** —
`aspect-ratio: 16/9`, 4/3 sul telefono dove 16:9 fa duecento pixel — con un
freno in `svh` perché su un pannello verticale il rapporto la farebbe alta due
schermate. L'attributo `height` resta nel markup: è il ripiego per chi legge la
pagina senza CSS.

## Fonts are served from this repo, and stay that way

Both faces are ours: Tusker in `public/wp-content/uploads/2024/07/`, Inter — the
variable file, latin and latin-ext subsets — in `public/fonts/`. Inter used to
come from Google Fonts through an `@import` in `global.css`, and that one line
was the longest network chain on the site: download the stylesheet, parse it,
discover the import, open a connection to a third-party host, fetch a second
stylesheet, and only then discover the woff2 to fetch. 1930 ms of blocked
rendering, per PageSpeed.

- **Never add an `@import` for a font, or any other render-blocking cross-origin
  request.** Add the file to `public/`, declare it with `@font-face`, done. The
  refresh recipe for Inter is written above its declarations in `global.css`.
- **`Layout.astro` preloads exactly two files** — Tusker 3700 and Inter latin,
  the faces that draw the first screen. Adding a third takes bandwidth from
  those two; measured, dropping to one costs 0.3 s of FCP.
- **`unicode-range` is what keeps Inter at 48 kB.** An Italian page never fetches
  latin-ext. Before adding a subset, check whether any page needs it — the check
  is a character sweep over `dist`, and today nothing outside `latin` is used
  except emoji and arrows, which come from the system font either way.

## Il solo terzo dominio nel `<head>` è Google Tag Manager

Container `GTM-T4J5G7D`, e sta in `Layout.astro` — che è il solo layout del
sito, quindi tutte le route pubbliche ce l'hanno per costruzione. Lo snippet
viene dopo `charset`, `viewport`, **lo stato di default del Consent Mode** e il
banner del consenso: quell'ordine è la sostanza, e il perché sta nella sezione
sul Consent Mode qui sotto.

- **Non contraddice la regola qui sopra**, e la distinzione è quella che conta:
  lo snippet è inline, e il `gtm.js` che inserisce è `async`. Niente blocca il
  rendering. Quello che aggiunge è una connessione a un terzo dominio — DNS più
  TLS prima del primo tag — ed è il prezzo di GTM, non un difetto
  dell'installazione.
- **`is:inline` non è decorativo.** Senza, Astro tratta il blocco come un modulo
  suo e lo serve come `<script type="module">`, che è differito: il `dataLayer`
  nascerebbe dopo che altro codice ha già provato a scriverci. Quello snippet
  deve arrivare al browser esattamente com'è.
- **I tag non si aggiungono qui, si aggiungono da GTM.** È il motivo per cui il
  container esiste: un secondo script di tracciamento nel layout è un tag che
  GTM non sa di avere e che nessuno può spegnere senza un deploy.
- **L'iframe `<noscript>` non c'è più, ed è deliberato.** Era la controparte
  senza JavaScript dello snippet, prima riga del `<body>`. Con il Consent Mode
  diventa una porta aperta: il gating non lo fa più il blocco dello script, lo
  fa lo stato di consenso — che è JavaScript. Senza JavaScript quello stato non
  esiste, quindi quell'iframe caricherebbe GTM **scavalcando il consenso**. Il
  prezzo è nullo: senza JavaScript la misurazione è comunque quasi inesistente.
- Le **pagine di reindirizzamento** generate dai `redirects` di
  `astro.config.mjs` non ce l'hanno, e va bene: sono quattrocento byte di
  `meta refresh` verso una pagina che invece ce l'ha.

Per verificare: su ogni pagina del `dist`, lo snippet sta nel `<head>` preceduto
solo dai due `meta`, **dallo stato di default del Consent Mode e dal banner del
consenso**, e da nessun altro. In un browser, `window.dataLayer` è un array con
dentro l'evento `gtm.js`, lo script iniettato porta `async`, e non esiste alcun
`googletagmanager.com/ns.html` in pagina.

### Il Consent Mode v2, e il ponte che lo comanda

Portato dal sito del Tennis Club Ambrosiano, dove era già in produzione. Tre
pezzi, e l'ordine fra i primi due non è negoziabile:

1. **Lo stato di default**, primissimo script del `<head>`, prima di CookieYes e
   di GTM. Tutto negato tranne `functionality_storage` e `security_storage`.
   Se GTM partisse prima, Google considererebbe il consenso concesso: il
   default non è un valore iniziale qualsiasi, è la sola cosa che vale finché
   il banner non parla. `wait_for_update: 500` dà mezzo secondo a CookieYes per
   ripristinare la scelta di una visita precedente, o i primi eventi
   partirebbero da «negato» anche per chi aveva detto sì.
2. **GTM non è più bloccato, e non deve esserlo.** Legge «negato» e resta in
   modalità senza cookie, mandando ping anonimi con cui Google stima le
   conversioni di chi rifiuta — invece di perderle come col blocco totale
   dello script. È l'approccio che Google raccomanda e il solo che permette la
   modellazione delle conversioni.
3. **Il ponte** sta in `scripts/consenso.ts`, dentro `rivaluta()`, e traduce le
   categorie del banner nei cinque segnali che GA4 e Ads leggono:
   `advertisement` governa i quattro pubblicitari più `personalization_storage`,
   `analytics` il solo `analytics_storage`.

Tre cose da sapere prima di toccarlo:

- **Nel pannello CookieYes il Consent Mode nativo va lasciato disattivato.** Il
  fornitore lo offre, ma dipende dal piano e due sorgenti che mandano gli stessi
  segnali sono due sorgenti che prima o poi divergono.
- **Si passa dalla `gtag()` globale, non da un `dataLayer.push()` scritto a
  mano.** `gtag()` mette nella coda l'oggetto `arguments`, ed è quella forma che
  GTM riconosce come comando di consenso: un array o un oggetto semplice con le
  stesse chiavi finisce in coda come un evento qualsiasi e viene ignorato in
  silenzio, che è il modo peggiore di sbagliare.
- **Il comando si manda solo quando lo stato cambia.** `rivaluta()` è chiamata
  anche dalla rete di sicurezza — ogni mezzo secondo per venti secondi — e senza
  il confronto con l'ultimo stato spedito il `dataLayer` riceveva quaranta
  comandi identici.

`functionality_storage` non si aggiorna e resta concesso dal default: lo storage
funzionale di questo sito — l'email ricordata — non lo decide un tag di Google
ma `quandoConsentito('functional', …)`, che legge CookieYes direttamente.

Per verificare, in un browser: `window.dataLayer` contiene esattamente **due**
comandi `consent` al caricamento, `default` e `update`; dando il consenso dal
banner ne arriva **un terzo** con i segnali a `granted`. Con
`window.athlonStatoConsenso()` si legge cosa vede l'adattatore.

### Il consenso è un interruttore solo, e si chiama `COOKIEYES_KEY`

Sopra GTM sta CookieYes, perché Consent Mode vuole lo stato di default — tutto
negato — prima che `gtm.js` parta. **Nel layout e non come tag dentro GTM**,
benché GTM lo permetta: un blocco pubblicitario che ferma
`googletagmanager.com` fermerebbe anche il banner, e chi non vede il banner non
può acconsentire. Questo sito ha storage suo da governare, quindi il segnale
deve arrivare anche quando GTM non arriva.

La chiave del sito sta in `data/sito.ts`, in chiaro come il client id di Tina e
per la stessa ragione — si legge già nel sorgente di athlonroma.it. **Athlon ha
un solo account CookieYes**: il sito Astro è destinato a *essere*
`www.athlonroma.it`, quindi si copia la chiave del sito WordPress e non se ne
crea un'altra.

Il fornitore è **CookieYes e non Cookiebot**, e la differenza non è il nome:
cambiano l'URL dello script, l'API del consenso e il nome della categoria — è
`advertisement`, non `marketing`. La prima stesura di questo blocco era scritta
per Cookiebot; se trovi `window.Cookiebot` da qualche parte, è un residuo.

Vuoto è uno stato legittimo, e comanda tre cose insieme:

| | `COOKIEYES_KEY` vuoto | impostato |
| --- | --- | --- |
| banner | non scritto in pagina | in cima al `<head>` |
| `vid` e UTM | memorizzati, come sempre | memorizzati **solo con `advertisement`** |
| `/privacy` | dice che il banner è in arrivo | descrive il consenso e apre il centro preferenze |

Un interruttore e non tre, perché lo stato intermedio — nessun banner e già
niente attribuzione — perderebbe i dati senza rendere il sito più corretto di un
millimetro, e la pagina descriverebbe un consenso che nessuno ha potuto dare.

**La chiave va impostata solo su un host che l'account CookieYes conosce**, e
questa riga è costata due giorni di guasto silenzioso. CookieYes serve il banner
per i **domini registrati**, e l'account Athlon ne ha uno — `www.athlonroma.it`,
piano Free. Finché la produzione sta su `sito-athlon.vercel.app`, con la chiave
impostata succede questo: nessun banner, `getCkyConsent()` mai definito, cookie
`cookieyes-consent` mai scritto, e `consenso()` che risponde «negato» per
costruzione. Cioè *esattamente* lo stato intermedio dichiarato sbagliato qui
sopra — raggiunto senza volerlo, perché la chiave era giusta e l'host no.

Si è visto come «l'email non si precompila», che è il sintomo piccolo. Quello
grosso era l'attribuzione: le UTM del primo tocco non sopravvivevano alla
navigazione e il `vid` non sopravviveva alla pagina, quindi una conversione dopo
un clic risultava senza campagna. Chi converte sulla pagina d'arrivo la portava
ancora, perché tutto vive in memoria comunque — motivo per cui il guasto non era
totale e proprio per questo non si notava.

Quindi **la chiave è vuota fino allo spostamento del dominio**, e va rimessa
quel giorno: `3e76f0f799c6d1d94882361d`, scritta in `data/sito.ts` accanto alla
dichiarazione. Aggiungere il dominio Vercel a CookieYes sarebbe l'alternativa,
ma il piano Free ammette un dominio solo e quell'indirizzo è da buttare.

E il promemoria non è questo paragrafo: `scripts/consenso.ts` **avvisa in
console quando la configurazione e l'host non combaciano**, nei due versi —
chiave impostata e fornitore che tace dopo venti secondi, oppure chiave vuota su
un host `athlonroma.it`. Sono le due sole configurazioni sbagliate possibili, e
nessuna delle due si vede guardando il sito.

Come è fatta la subordinazione, in `scripts/attribuzione.ts`, e sono tre scelte
non ovvie:

- **tutto vive in memoria comunque**, e solo la scrittura nello storage aspetta.
  Così chi accetta alla terza pagina non perde l'attribuzione del primo tocco:
  senza questo, la conversione risulterebbe «nessuna campagna», che è il dato
  sbagliato e non il dato mancante.
- **senza consenso il `vid` vale una pagina sola.** Il form che parte da questa
  pagina ha comunque un identificativo, così l'automazione può unire due invii
  della stessa persona; alla pagina dopo è un altro, e va bene — un
  identificativo che non sopravvive alla navigazione non ricostruisce un
  percorso.
- **i form non si bloccano mai.** Il consenso cookie governa cosa si scrive nel
  browser, non se una persona può chiedere una prova: senza consenso il payload
  parte senza `vid` e senza UTM, e `provaForm.client.js` lo prevedeva già.

La categoria conta, e sono tre. `athlon_vid` e `athlon_utm` stanno sotto
**advertisement**; la sessione della chat e il passo dell'Help Desk sono
**necessari** — lo stato del servizio che la persona ha chiesto, durano la
sessione e non profilano, e bloccarli romperebbe la chat; `athlon_email` è
**funzionale**. Come si legge il consenso sta in `scripts/consenso.ts`, una
volta per tutte: `quandoConsentito(categoria, azione)` esegue subito o quando il
consenso arriva, con **una coda per categoria** — chi accetta i funzionali e
rifiuta la pubblicità deve avere la sua email ricordata e nessuna attribuzione,
e una coda sola le farebbe partire insieme.

### L'email si ricorda nel browser, non si rilegge dal server

Il form della prova si compila una volta, gli altri no: l'assistente,
«contattaci» e il ticket dell'Help Desk ripartono tutti chiedendo l'email,
perché è la porta del controllo su PerfectGym — da lì il sito sa se esiste già
un'anagrafica e **salta** nome, cognome e telefono. Il passo resta; quello che
`scripts/emailNota.ts` toglie è la digitazione.

Tre scelte, e nessuna è arbitraria:

- **nel browser e non sul server.** Chiedere a n8n «di chi è il `vid` X?»
  sarebbe una consultazione di dati personali senza autenticazione, con chiave
  scelta dal client: chi legge o indovina un `vid` tira fuori la scheda. Così
  il dato non esce e non rientra, resta sul dispositivo che l'aveva digitato.
- **`functional` e non `advertisement`.** Ricordare un campo per non
  richiederlo è comodità, non profilazione — e i funzionali li accetta molta
  più gente.
- **niente sul totem.** Il club ha un dispositivo condiviso vero, e lì
  ricordare l'email vorrebbe dire mostrare quella dell'ultimo visitatore al
  prossimo. Si riconosce dalle stesse tre condizioni di `global.css`, che vanno
  tenute in pari anche qui.

Il campo che vuole la precompilazione porta `data-email-nota`; chi conferma
un'email chiama `window.athlonRicordaEmail(...)`. Due meccanismi la riempiono:
uno al caricamento e uno al fuoco sul campo — il secondo serve perché i
pannelli si svuotano quando si chiudono, e senza di lui la riapertura sarebbe
vuota. Un'email **nell'URL vince sul ricordo** (`SupportForm.astro`): chi arriva
da un link col proprio indirizzo è un'informazione più specifica.

Il blocco automatico degli script di terzi **non è un attributo del tag**: in
CookieYes si configura dal pannello, sito per sito. Su questo sito riguarda la
mappa di Google nel footer — che sta in **ogni** pagina — il tour di my.mpskin,
i player Vimeo e il widget di Calendly.

**Lo script di CookieYes non è verificabile da qui**: il suo CDN è fuori dalla
policy di rete dell'ambiente in cui questo codice si scrive e si prova. Da qui
due scelte in `attribuzione.ts` che sarebbero strane altrimenti: la lettura del
consenso poggia su **tre segnali** — `getCkyConsent()`, il cookie
`cookieyes-consent`, e un controllo periodico limitato a venti secondi — e il
default è **negato**, perché un fornitore che non risponde non è un consenso.
`window.athlonStatoConsenso()` stampa cosa l'adattatore vede: chiamala su una
pagina vera, e quando l'API è confermata il controllo periodico si può togliere.

E `/privacy` esiste: era linkata dal footer di ogni pagina, da `/attiva` e da
`/promo`, e **non c'era**. La parte tecnica — cosa si scrive nel browser, quali
form ci sono, dove finiscono i dati — sta in `data/privacy.ts` e va tenuta in
pari col codice; l'informativa la scrive il club. Vale la regola di `club.ts`:
un dato inventato è peggio di un dato assente, e in un'informativa questo è
doppiamente vero.

## La verifica dell’email sta davanti a «Iscriviti», e chi non ha un account passa

Su `/abbonamenti` e `/promo` i pulsanti d'iscrizione portavano diritti dentro
PerfectGym. Il guaio era in fondo al percorso: chi ha già un account — di solito
come **Guest**, perché ha fatto una prova o è in un nucleo — compilava tutta la
registrazione e solo all'invio leggeva che quell'email esiste già e che deve fare
il reset. Il lavoro buttato in un punto dove le persone si fermano. Quindi la
domanda si fa prima, con la stessa forma degli altri form del sito: un campo
email, la verifica, e da lì due strade.

- **Ha un account** (`Member` o `Guest`) → non si registra: rientra, e con **la
  procedura scritta** — accedi, apri *Abbonamenti*, tocca *Aggiungi
  abbonamento*. Le tre righe non sono ridondanza: fin qui la persona comprava
  con due click, e la si manda in un'altra applicazione a cercarsi la voce nel
  menu. Senza, «fai il login e scegli l'abbonamento» è un compito, non
  un'istruzione.

  **L'accesso è l'azione, il reset è la deviazione**, e l'ordine conta: il
  comando pieno porta al login, il reset sta sotto in corpo piccolo. Dare il
  pulsante pieno al reset diceva «la tua password non funziona» a chi ce l'ha
  nel gestore. Il link del reset è `inline-block` e non in linea, perché il
  `padding` verticale su un elemento in linea non riserva spazio: sborderebbe
  sul pulsante sopra e, venendo dopo nel documento, ne rubberebbe i click sul
  bordo inferiore. Misurato: 45 px di bersaglio sul telefono, 12 px di distanza
  dal pulsante.
- **Lead, sconosciuto, verifica in errore o in timeout** → si va su PerfectGym,
  all'indirizzo che il pulsante portava già, col suo `PaymentPlanId`.

**La terza voce di quell'elenco vale come le altre due.** Un'iscrizione in più
da riconciliare costa meno di una perduta per un timeout, quindi il timeout è
nostro e non del browser — sei secondi, misurati — e qualunque errore lascia
passare. È la stessa scelta del form di prova e di «contattaci».

Tre cose da sapere prima di toccarlo:

- **`memberType` decide, `stato` no**, e la regola sta una volta sola in
  `haGiaAccount()` (`data/contatto.ts`), perché la usano in due — qui e
  «contattaci» — e sarà la stessa ovunque si aggiunga un passo «verifica
  l'email». `stato` unisce Lead e Guest sotto `esiste`: da lì non si distingue
  chi può fare login. Il ripiego su `stato === 'iscritto'`, per un webhook che
  non mandi `memberType`, riconosce solo il Member e tratta il Guest come uno
  senza account — è il verso giusto in cui sbagliare.
- **L'aggancio è `data-iscrizione` e non `data-cta="buy"`**, che sarebbe stato
  comodo perché quei pulsanti già lo portano. Ma su `/personal-training`
  `data-cta="buy"` sta anche su «Prenota una seduta» e «Aggiungi al tuo
  abbonamento»: intercettarli avrebbe chiesto l'email per prenotare un
  allenamento. Dieci pulsanti, zero agganci — controllato.
- **I pulsanti conservano il loro `href`.** L'intercettazione è un miglioramento,
  non un requisito: senza JavaScript, e con un click modificato (`ctrl`, `cmd`,
  rotellina), si va su PerfectGym come prima. La destinazione la porta il
  pulsante, quindi aggiungere un piano resta una riga in `data/abbonamenti.ts`.

E **c'è la via di ritorno**, che non è una gentilezza in più: il campo arriva
precompilato con l'email che il browser ricorda, che su un dispositivo condiviso
in casa può essere di un altro. Chi si vede dire «hai già un account» per un
indirizzo che non è suo deve avere qualcosa da cliccare. Quel comando **toglie
`data-email-nota` dal campo** oltre a svuotarlo: `emailNota.ts` riempie sul fuoco
ogni campo vuoto che lo porta, quindi svuotare e mettere il fuoco rimetterebbe
dentro la stessa email. L'attributo è l'adesione, e lì si ritira.

## `/link` è la bio di Instagram, e non è l'indice del sito

Una pagina sola, sei comandi, `noindex` e fuori dalla sitemap come `/attiva` e
`/referral`. I contenuti stanno in `src/data/link.ts`, la pagina in
`src/pages/link.astro`.

**Non elenca le pagine del sito con un pulsante a testa**, e questa è la scelta
da cui dipende tutto il resto: una linktree che elenca ogni pagina come un
pulsante è il menu scritto due volte, e la seconda copia divergerà. I sei
comandi pieni rispondono ai motivi per cui si tocca il link di una bio, che
sono gli intenti già dichiarati in `cta.ts` — provare, sapere quando, parlare
con qualcuno, venire in sede. **Sei comandi pieni è un tetto**: al settimo la
pagina torna a essere il menu che voleva sostituire. «Lavora con noi» sta
sotto come testo, per la stessa ragione — chi cerca lavoro lo cerca sapendo già
di volerlo, e un pulsante pieno lo metterebbe in concorrenza con la prova, che
è la cosa che questa pagina deve ottenere.

**Le attività sono l'eccezione**, e sono un paragrafo che scorre, non
pulsanti: chi arriva già sapendo cosa cerca — «fate acqua fitness?», «a che ora
è il pilates?» — vuole la pagina di quel corso, non un modulo. `attivitaLink()`
in `data/link.ts` le legge da `PAGINE_ADULTI` e `JUNIOR`, la stessa fonte che
alimenta i rimandi fra pagine e il menu dell'header: un corso nuovo in
`corsi.ts` o `junior.ts` compare qui da solo, senza toccare questo file.

**I quindici corsi fitness sono una voce sola**, «Corsi Fitness» verso
`/corsi-fitness`, e non quindici: da una bio non si scelgono Antigravity o
Booty Workout uno per uno. Quali siano i quindici lo dice `eyebrow` — chi non
ne dichiara uno in `corsi.ts` prende il ripiego `'Corso Fitness'` che
`[corso].astro` già usa per l'occhiello — non un elenco di slug scritto in
`link.ts`: un corso fitness nuovo senza `eyebrow` ci finisce da solo. Con
quella voce le attività adulti sono sette, i corsi junior quattro, e per
questo vivono dentro un `<p>` e non in righe di link: il totem esenta i link
dentro testo che scorre dalla misura minima di 48px proprio perché si leggono
e non si premono al buio.

**Sta nel sito e non su linktr.ee** per una ragione misurabile: i modal della
prova, dei contatti e dell'assistente vivono nel Layout, quindi vivono anche
qui, e la conversione avviene **sulla pagina** invece di costare un secondo
caricamento su una rete telefonica. In più il consenso e l'attribuzione sono
già governati, e i domini terzi nel `<head>` restano uno.

Quattro cose da sapere prima di toccarla.

**L'UTM sta nell'indirizzo incollato nella bio, non nei pulsanti.** Il browser
interno di Instagram non passa il referrer: senza
`?utm_source=instagram&utm_medium=bio` ogni richiesta nata da qui risulta senza
campagna nelle tabelle `richieste_*`. `scripts/attribuzione.ts` memorizza il
**primo tocco**, quindi taggare quel solo indirizzo copre tutta la visita — e i
comandi in pagina non portano UTM di proposito, o riscriverebbero il primo
tocco a ogni passaggio. Quale comando è stato premuto lo dice `data-link`, che
un tag di GTM legge da solo. Un secondo profilo o il QR di un volantino cambiano
solo la query string: la pagina è la stessa e le sorgenti si distinguono.

**`ProvaModal` è montato dalla pagina, non dal Layout.** Nel Layout quel modal
sta *dentro* il gate `chrome`, a differenza del modulo contatti e
dell'assistente, perché finora nessuna pagina senza intestazione aveva un
comando di prova — e montarlo lì sarebbe peso su ottanta schede dell'Help Desk
che non lo usano. Questa è la prima, e ce l'ha come comando principale: senza il
pannello «Prova Athlon» cadrebbe sul suo ripiego (`/abbonamenti#guest-pass`),
cioè esattamente il salto in più che è la ragione per cui la pagina sta nel
sito. **Quindi `chrome` resta `false`**: rimettendo l'intestazione ci sarebbero
due pannelli con gli stessi `id` e due gestori sullo stesso click.

**Il pulsante fisso della chat si nasconde, e serve `!important`.** Qui
l'assistente è già uno dei sei comandi, e su una pagina che sta in una schermata
il `ChatFab` compare subito — è il caso «pagina che non scorre» del suo script —
appoggiandosi sopra la lista. `ChatFab` dichiara `.cfab { display: inline-flex }`
nel proprio `<style>`, che Astro compila in `.cfab[data-astro-cid-…]`: due
classi contro una, quindi senza `!important` vince lui e il pulsante resta in
pagina (misurato: `display` risultava `flex`). Stessa ragione del
`[hidden] { display: none !important }` di `global.css`. E `display: none` e non
`visibility`, così esce anche dal giro del tab.

**Due voci sono condizionate, e la condizione vive accanto al dato.** La promo
compare solo se il documento Tina non è una bozza **e** la scadenza non è
passata; «Lavora con noi» solo se `POSIZIONI` non è vuoto. Vale la regola di
`lavora.ts`: dalla bio non si manda nessuno su un'offerta finita o su un elenco
vuoto. Si valuta al build — il sito è statico — e va bene perché cambiare la
promo da Tina *è* un commit, quindi un deploy: la condizione si rivaluta quando
il dato cambia. Resta scoperta solo la promo che scade senza che nessuno tocchi
niente, e la chiude il deploy successivo.

Un dettaglio di forma che è un vincolo e non un gusto: **la nota di una voce sta
in una riga su un telefono da 390px**, circa trentacinque caratteri. Quella che
va a capo alza la sua scheda e sola fra sei, e sei schede di altezze diverse si
leggono come un elenco disordinato invece che come un menu. Per la stessa
ragione il footer legale non ha i «·» che il resto del sito mette fra quei link:
a 390px vanno a capo e il separatore resta appeso a fine riga.

Per verificare: la pagina passa le due spazzate del totem e della televisione
(nessun overflow, niente sotto i 19px, nessun comando sotto i 48px in tutti e
quattro i formati), i tre comandi con `data-cta` aprono il loro pannello **senza
navigare** e con `body.amodal-locked`, il `dataLayer` ha i suoi due comandi
`consent`, e `.cfab` calcola `display: none`. L'ultima passata: 196 kB di HTML,
29 gzippati — la seconda pagina più leggera del sito dopo `/attiva`.

## A hidden overlay must be hidden from the keyboard too

`opacity: 0` and `pointer-events: none` hide an overlay from the eyes and the
mouse, not from the tab key: a closed panel with `aria-hidden="true"` and
reachable links is what makes Lighthouse report a malformed accessibility tree,
and what makes a phone visitor tab through 33 invisible menu links before
reaching the page. Every closed overlay on the site is `visibility: hidden`.

Two details the form requires, and both have bitten:

- **`visibility` does not fade, it switches.** Zero duration, and a delay equal
  to the fade only when closing:
  ```css
  .panel      { visibility: hidden;  transition: opacity .2s ease, visibility 0s .2s; }
  .panel.open { visibility: visible; transition: opacity .2s ease, visibility 0s; }
  ```
  Give it a duration instead and the computed value stays `hidden` for the
  instant the script moves focus into the panel — `focus()` refuses an invisible
  element, and focus silently stays on the button that opened it.
- **Flush the style before asking for focus.** The class has just been added, so
  the style is dirty; read `offsetWidth` first (`Header.astro` and
  `abbonamenti.astro` both do).

Overlays that use `display: none` when closed — the lightbox, the lesson modal —
already behave; nothing to change there.

And the same trap one level down, for the parts a script switches with the
`hidden` attribute: `hidden` hides through a rule in the *browser's* stylesheet,
so any `display` of ours beats it — author origin wins over user-agent origin at
any specificity. A class carrying `display: flex` or `inline-flex` stays on the
page with `hidden` on it, and the script that thinks it turned the thing off has
turned nothing off. Three places had fallen into it: the assistant's chat step
(its email box and an empty conversation area with its own text field, both on
screen at once), the activity card's link, the Help Desk's suggestion row.
`global.css` now declares `[hidden] { display: none !important }` once, for the
whole site — `!important` because it has to beat classes written after it. An
element that must stay visible does not carry `hidden`; it carries a class. To
check a page: every element with the `hidden` attribute must compute to
`display: none`.

## Photos: the box decides the file

Photos live in `public/` and are referenced as strings, so Astro's image
optimiser never sees them. `scripts/varianti-foto.mjs` writes the variants and
`src/data/foto.ts` offers them:

- **A photo in a small box** gets `{...fotoPiccola(src)}`, or `urlPiccola(src)`
  for a CSS background, where `srcset` cannot reach.
- **A full-bleed hero photo** gets `{...fotoHero(src)}` — it is the LCP element
  of the page, and the original is half a megabyte.
- **Add new photos to the script's source list and re-run it.** It is not in the
  build pipeline on purpose: on Vercel it would pull sharp on every deploy to
  regenerate files that never change.

### L'anteprima di un link condiviso è un'immagine a parte

`Layout.astro` dichiara per **ogni** pagina `og:image:width=1200` e
`og:image:height=630`, e per un pezzo passava al `<meta og:image>` la foto
originale della pagina: un file da 2560×1707 e fino a 1,2 MB. Le misure
dichiarate erano quindi false su quasi tutto il sito, e WhatsApp — che scarta
l'immagine oltre i ~300 kB — mostrava l'anteprima che parte, scrive titolo e
descrizione, e resta vuota. Il sintomo sembrava un problema di rete o di cache;
era questo.

`scripts/og-immagini.mjs` genera un ritaglio `1200×630` in `public/og/` per ogni
foto usata come anteprima, e scrive `src/data/og-immagini.json`, la mappa che
`ogDa()` (in `data/foto.ts`) usa per tradurre una sorgente nella sua variante.
Il Layout chiama `ogDa()` e non tocca altro.

- **Le sorgenti non si elencano a mano.** Lo script le legge dagli stessi posti
  da cui le legge il sito: `corsi.ts` **e** `junior.ts` per le hero dei corsi, il
  frontmatter di news, eventi e promo, più l'elenco `PAGINE` per le pagine che
  passano una foto letterale. Leggere un solo file dei corsi aveva lasciato
  fuori le quattro pagine junior, che tornavano a servire l'originale da 1,2 MB.
- **La mappa esiste perché al build non si può guardare il filesystem** per
  sapere se la variante c'è: quel JSON è il contratto fra lo script e `ogDa()`.
  Chi non è nella mappa passa invariato, che è il verso giusto in cui sbagliare
  — un'immagine grossa è un'anteprima che qualche client non disegna, un'immagine
  assente è un'anteprima che nessuno disegna.
- **Il nome della variante porta dentro anno e mese dell'originale.** Senza,
  `2025/03/Athlon88-scaled.jpg` e `2025/11/ATHLON88-scaled.jpg` — due foto
  diverse — finiscono sullo stesso file: su questo Mac il filesystem non
  distingue le maiuscole.
- **Cambiare il file lasciando lo stesso URL non aggiorna niente.** WhatsApp e
  Facebook tengono in cache l'immagine **per indirizzo**, per settimane. Per
  rinfrescare un'anteprima serve un nome nuovo — è la ragione per cui
  `CLUB.socialImage` è passato da `/og/athlon-club.jpg` al percorso della foto
  sorgente, che `ogDa()` traduce in un `/og/` diverso.
- **Non ci si mettono scritte sopra.** L'immagine di default era un montaggio
  con logo, titolo e indirizzo incollati sulla foto: condiviso su WhatsApp
  sembrava una locandina invece dell'anteprima di un sito.

Per verificare, sul `dist`: ogni pagina che non sia una di `meta refresh` deve
avere un `og:image` che esiste, sta sotto `/og/`, misura esattamente 1200×630 e
pesa meno di 300 kB. L'ultima passata: 84 pagine, 33 immagini distinte, la più
grande 149 kB.

## Whitespace around inline tags

Astro trims the line break on **both** sides of an inline tag, so a wrapped
`<strong>` or `<a>` loses the space next to it and renders as
`incluso ancheAthlon TV` or `Sospensioni:illimitate`. Keep the tag on the same
line as the word it touches. To audit a build:

```
grep -oE '[a-zà-ù,;:·)]<(strong|a |em)[^>]*>|</(strong|a|em)>[a-zà-ùA-Z]' dist/**/index.html
```

## Video: silent, looping, self-starting — everywhere

Every `<video>` on the site is a background clip: it starts on load, loops, and
never makes a sound. Write the attributes in the markup so it works before any
script runs and without JavaScript at all:

```html
<video autoplay muted loop playsinline poster="…">
  <source src="…" type="video/mp4" />
</video>
```

`src/scripts/video-autoplay.ts` (loaded once by `Layout.astro`, so every page
has it) is the safety net for what those attributes cannot do:

- a first `play()` the browser **refuses** — Low Power Mode on iOS, a data
  saver, a tab restored in the background — retried when the tab comes back and
  on the visitor's first interaction, the gesture those policies wait for;
- a clip whose **src arrives from script**, or a `<video>` added to the page
  later: both are picked up and primed;
- a clip a mobile browser **paused on its own** (scrolled away, stalled
  network), which otherwise stays frozen for the rest of the visit.

It deliberately leaves three cases alone: a clip the visitor stopped or took
fullscreen, a clip that is not rendered (a closed modal must not play to
nobody), and anything marked `data-no-autoplay`.

A pause within a second of touching the video counts as the visitor's and
sticks. Presence of `controls` is **not** the signal; code that takes a video
over for a while says so with `v.dataset.videoHandsOff = '1'` and clears it when
done, because iOS fullscreen is the system player and `document.fullscreenElement`
stays null there.

Embedded players are the same rule with the provider's own switches. Vimeo:

```html
<iframe src="…?autoplay=1&muted=1&loop=1" loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
```

`allow="autoplay"` is required as well as the parameter — the parameter alone is
refused. Keep `loading="lazy"` on a page with several: each starts as its card
comes into view instead of all of them pulling a stream at once.

- **Never write `preload="none"` on a clip that autoplays.** It says "fetch
  nothing", and on a phone that wins: the visitor gets the poster with a play
  button on it. Leave `preload` off entirely — the clip starts as it reaches the
  screen, so a heavy file costs nothing until then. `poster` covers the wait.
- **Never turn a video's sound on at load.** Autoplay with audio is refused by
  every browser, and the whole clip stays black.
- **Turning sound on for a deliberate act is fine** — put it back on the way
  out, and resume playback there too, or a pause from the fullscreen controls
  leaves the background frozen (`restoreHeroVideo` in `Hero.astro`).
- **A clip that must not start on its own opts out with `data-no-autoplay`.**
  Nothing on the site does today.
- **No `controls` on a background clip, and no clicking one either.** They are
  scenery: `global.css` gives every `video:not([controls])` `pointer-events:
  none`, so a click passes through to the page instead of pausing the clip or
  opening the player's menu. The selector is the whole mechanism — the home hero
  sets `controls` on the element before going fullscreen, which takes it out of
  the rule and hands the native controls back, and clears it on the way out. To
  make a clip controllable, give it `controls`; nothing else to change.

Two things make a clip below the fold behave. Mobile Safari grants an autoplay
only once the element is on screen, so the script retries at several
intersection thresholds — one early trigger fires while the clip is still out of
view, is refused for that reason, and never comes back on its own. And
`global.css` hides `::-webkit-media-controls-start-playback-button`, the big play
glyph iOS paints over any video that has not started, controls or not: when
autoplay is refused anyway (Low Power Mode, a data saver) the clip reads as a
still frame of the site rather than a stalled player, and the first tap anywhere
starts it.

To verify: for every `<video>` on the page, `paused` is `false` and `muted`,
`loop`, `playsInline` are all `true` — and `currentTime` keeps rising. Check it
with a clip below the fold too, and with `play()` patched to reject while the
element is off screen, which is how mobile Safari behaves. Note
that headless Chromium here has **no H.264 decoder**
(`canPlayType('video/mp4; codecs="avc1.42E01E"')` is `''`), so the site's own
MP4s never advance in it; measure frames with a VP8/WebM clip instead.

### Una clip entra in `public/` solo dopo essere passata dai due script

`scripts/comprimi-video.mjs` ricodifica e `scripts/confronta-video.mjs` verifica,
e il metodo sta scritto per intero in testa al primo. Le quattro regole che non
si contrattano:

- **H.264 per tutte, anche quando costa.** Firefox non decodifica l'HEVC e Chrome
  solo con supporto hardware: lì una clip HEVC è un rettangolo nero. Sei clip lo
  erano, e convertite pesano il doppio o il triplo — Body Sculpt 3,7 → 9,1 MB. Si
  fa comunque: il criterio non è il peso, è che il video si veda.
- **`+faststart`, `yuv420p`, nessuna traccia audio.** L'indice in fondo al file
  fa scaricare tutta la clip prima del primo fotogramma, ed era così su quindici
  file su ventisei. L'audio su una clip muta senza controlli è peso che nessuno
  può sentire: 7,2 MB in sedici file. L'unica eccezione possibile è la hero della
  home, dove `Hero.astro` toglie il muto a schermo intero.
- **La risoluzione non si tocca, e la ragione è una misura.** Il riquadro di una
  scheda corso misura 362 px CSS su un telefono — a densità 3× sono 1086 pixel
  fisici, quindi 1080 di larghezza è esattamente la misura giusta — e arriva a
  1026 px sul totem e 1448 nel pannello del planning sulla televisione. Scendere
  a 720p, come fu fatto per Baby Nuoto e Reformer misurando solo a densità 1×,
  vuol dire ingrandire su quei due schermi.
- **Il CRF si scegle col VMAF, non a occhio**, e dove la ricodifica trasparente
  pesa più del sorgente **si rimuxa** (`-c copy -an -movflags +faststart`):
  stessi pixel, senza audio, indice davanti. Succede più spesso di quanto sembri
  — quindici clip su venti — perché queste sorgenti erano già dentro la frontiera
  di efficienza di H.264. L'acqua è il caso peggiore: Aqua Soft ricodificato a
  qualità indistinguibile pesa il 24% in più.

Due trappole della misura, ognuna costata mezz'ora. La finestra di riferimento va
estratta **senza perdita** e le prove devono partire da lei; e il confronto
seleziona i fotogrammi **per numero**, non per secondo — su acqua che schizza un
fotogramma di scarto vale cinquanta punti di VMAF (41 invece di 91) e sembra un
disastro di qualità invece che un errore di allineamento.

## The club's kiosk is a form factor of its own, and it is not a phone

A 27" portrait panel (9:16, Windows, Edge or Chrome) stands in the club's
entrance and is read from about a metre and a half away. It broke both of the
site's assumptions at once: it is 1080 px wide, so it got the hover-only desktop
menu no finger can open, and its text was sized for a phone held at arm's
length, so from the doorway it was unreadable.

**Detect it by the shape of the screen, never by the pointer.** Windows presents
the touch panel to browsers as a machine with a mouse — `pointer: fine`,
`hover: hover` — so `pointer: coarse` never fires there. Three conditions
together, and all three are needed:

```css
@media (min-width: 900px) and (min-height: 1200px) and (max-aspect-ratio: 7/10)
```

`min-width` rules out a phone, `min-height` rules out a short desktop window,
and `max-aspect-ratio` lets a 9:16 panel (0.5625) through while a 3:4 tablet
(0.75) stays out. The ratio is **7/10 and not 5/8**, which is the panel's own
shape, because the browser on it is not fullscreen: measured on the real kiosk,
tabs plus address bar plus the Windows taskbar leave a 1064×1725 viewport, ratio
0.617 — inside a 0.625 limit by eight thousandths. An open bookmarks bar would
have switched the whole mode off. The three measures appear in `global.css`, in
`Header.astro`, in the components with sizes of their own, and in ~32 media
queries marked `/* + totem */`. **Keep them identical**, and check
`/diagnostica-schermo` if they ever change — that page reads them back from
`data-test` and says on the panel itself which condition is failing.

**The root is in `vw`, not px, and that is the whole trick.** The panel is
physical and fixed; what changes is how many CSS pixels Windows declares — 1080
at 100 % scaling, 1440 at 150 %. `font-size: 2.5vw` gives 27 px on 1080 and
36 px on 1440, and in both cases body text measures about 8 mm on the glass.
Spacing does **not** scale with it — the three `--space-section-*` variables are
retuned inside the block, or the home page becomes a kilometre of scrolling.

**8 mm, not the 10 mm the signage rule asks for at 1.5 m.** The first tuning did
follow that rule — `3.15vw`, body at 32 px — and on the real panel it failed, for
a reason that is about width, not height: 1080 px less the margins is 1048, so a
three-column grid gives 322 px columns, and 32 px text in 322 px is twenty
characters a line. Two words. The column stretches like an accordion and the
title breaks out of its card. Measured over six pages, the median was 23
characters per line against the 45–75 that read comfortably. 8 mm is the same
10 mm moved to 1.2 m — where a person actually stops in front of the totem,
while 1.5 m is where they *notice* it, and at that distance the headings speak.

**Type has two tiers on the panel, not one.** Body copy ~26 px (8 mm, comfortable
at 1.2 m); the smallest supporting label `--text-2xs` at 19 px (6 mm, readable at
arm's length, which is where captions get read). A single 24 px floor for
everything is what produced the accordion.

**Half the fix is not typographic: the kiosk inherits the layout the site already
uses below 1000 px** — three columns becoming two. Every media query from 820 px
up carries the three conditions as a second, OR'd term, with a one-line
`/* + totem */` comment above it. The phone breakpoints (700 px and under) do
**not**: one 1048 px column would give 65-character lines, which read fine, but
the page would become a ribbon. Grids that size themselves — `repeat(auto-fit,
minmax(…, 1fr))` — need no media query at all once the floor is in rem: it rises
with the root and the grid drops a column by itself.

What follows from all this, when writing a page:

- **Sizes in rem, not px, for anything a finger touches or an eye reads.** At a
  16 px root a rem *is* a px, so phones and desktops are unchanged to the pixel;
  on the kiosk the same declaration scales. This is how the header bar, the
  gallery arrows and the club-life anchor strip were fixed — none of them needed
  a kiosk rule, only the right unit. A control still measured in px is a control
  that stays phone-sized on the panel.
- **A magic number that stands for another element's height is a bug waiting for
  the kiosk.** `calc(100svh - 72px)` in the hero and `--cl-menu-h: 58px` in
  club-life were both correct at a 16 px root and both wrong on the panel, by
  81 px and 63 px — enough to push the CTA and the only navigation the page has
  below the bottom edge. Express it in the same unit as the thing it tracks.
  Neither survives: the hero's was moved to `var(--header-h)`, and club-life's
  sticky strip was replaced by the card menu inside its hero, so `--cl-menu-h`
  is gone. The lesson is the one to keep — grep for the pattern, not for the
  names.
- **A table that does not fit scrolls inside itself**, like the planning week:
  `display: block; overflow-x: auto`. The page must never scroll sideways.
- **A grid column is `minmax(0, 1fr)`, not `auto`.** At double scale one long
  cited URL in the terms and conditions widened its column past its own
  container and the whole page scrolled. Pair it with `overflow-wrap: anywhere`
  on the prose so the string breaks instead of the layout.
- **Secondary link-CTAs get their tap height from the shared list** in
  `global.css` — `.co-link`, `.wa__back`, `.sched__link` and the rest. It is an
  explicit list on purpose: `a:not(p a)` would also catch the cards that are one
  big link, and `display: inline-flex` on those breaks the grids. A new
  link-shaped command goes in that list.

To verify, sweep every built page at 1080×1920 with `hasTouch: false` — that is
what the panel reports — and check four things per page: no text under 19 px, no
control whose smaller side is under 48 px, no horizontal overflow, and at least
one finger-sized command inside the first screen. Links inside running text
(`p`, `li`, `td`, `th`) are text, not targets, and don't count. Then measure
**characters per line**, which is the check that caught what the pixel sweep
could not: text length divided by line count, per paragraph. Under 30 means a
column too narrow to read; the target median is 38 or better.

Measure a control with `offsetWidth`/`offsetHeight`, never
`getBoundingClientRect()` — the rect is the *transformed* box, and a card
carrying a `scale(0.978)` entrance animation reported 47.5 px for a control that
measures 49. Three "findings" were that artifact and nothing else.

The sweep is what turned "the characters are a bit small" into a bounded list;
the last run was 77 pages, nothing to fix.

## The 16:9 television is the kiosk's landscape twin

The site is also shown on an ordinary Full HD television — a consumer set, not a
professional panel — and desktop mode is wrong there for one reason: distance.
At a 16 px root, body copy on a 55" set measures 10 mm of glass, which reads at
1.5 m. That is a desk, not a sofa.

**The trap is that 1920×1080 is both a television and the most common desktop
monitor there is.** Width distinguishes nothing. What distinguishes is the
**usable height**, because on a television the browser fills the screen and on a
desk it does not: a maximised window on a 1080p monitor leaves ~937 px (tabs,
address bar and taskbar take 143), and the most that was measured with the
taskbar hidden is 993. A television gives the full 1080.

```css
@media (min-width: 1700px) and (min-height: 1020px) and (max-aspect-ratio: 37/20)
```

`min-width` rules out a laptop, `min-height` is the condition that does the work,
and `max-aspect-ratio` rules out a maximised window on a large monitor — those
sit between 1.90 and 2.05, while 16:9 is 1.778. **37/20 (1.85) and not `16/9`,**
which is the true ratio: `max-aspect-ratio: 16/9` is a pixel-exact comparison,
and a 1920×1079 viewport — one pixel of chrome, a thin bar the set draws — makes
1.7794 and falls out. 1.85 leaves room for forty pixels of frame and still
excludes a maximised 1440p window.

**The price, measured: a fullscreen 16:9 screen is indistinguishable from a
television, because it genuinely is.** 2560×1440 in F11 on a desk and a 1440p
signal on a television declare the same numbers, and no media query can know how
far away the person is sitting. Someone browsing fullscreen on a large monitor
gets television-sized text — that is this rule, not a bug. The common case, a
maximised window, is untouched.

**A television is watched from two to four metres.** That is the input the whole
block is derived from. `1.64vw` gives 31.5 px on 1920, which on a 55" set is
20 mm of glass — the 3 m at the centre of that range, by the same signage rule
the totem uses (height ≈ distance / 150). The root is in `vw`, so the other sizes
follow on their own, because viewing distance grows with the diagonal: 15.6 mm on
a 43" (2.3 m) and 23.6 mm on a 65" (3.5 m). A 4K set declares 3840 CSS px and
raises the root instead of halving the characters.

**The centre of the range and not the far end, deliberately.** At 4 m that rule
wants 27 mm, which is a 42 px root, and at that point the screen holds 42 rem of
content: columns fall to twenty characters a line and the page becomes unreadable
in order to be large. On 1920 px you cannot have both poster-grade text for 4 m
and human line lengths — it is arithmetic. The same argument the totem settles
with (8 mm beating 10) applies here: at 4 m the headings speak, since they are
three to four times body size; the copy is read from 3 m or closer, which is
where people stand when they actually read. Below that, at 2 m, 20 mm is generous
— and that is the right direction to be wrong in.

**Characters per line depend only on how wide the container is measured in
`rem`** — not on the scale. This is the one thing that is easy to get wrong:
raising the root alone narrows nothing, but leaving `--container-width` at
1320 px while the root grows does, because 1320 px falls from 82 rem to 41. It is
set to `58 rem` — 1827 px on 1920, the most the screen allows while keeping the
overscan margin. This is also where the tuning bites its own tail: raising the
root for distance leaves the screen holding fewer rem, so every millimetre gained
in character height is paid for in line length. At 3 m the trade still works; past
it, it does not — which is why the root stops where it stops.

What follows when writing a page:

- **Layout changes far less than on the totem, but it does change.** There every
  grid had to lose a column; here only what **measured** under 30 characters per
  line does — the readable floor. That is the four- and five-column grids (22–26)
  and the course pages' three cards (26–28), which alone were 23 of the 42
  paragraphs out of bounds. Five places (the footer's two grids, the five Classes
  columns, the four junior method columns, the three course cards), each carrying
  this condition next to the totem's with a `/* + tv */` comment. The other
  three-column grids stay, and that is not laziness: every column dropped is a
  row added to scroll, and on a television scrolling is the worst fault there is.
  Drop a grid where the line is unreadable, not where it is narrow.
- **A size outside the type scale is what breaks first.** Both offenders the
  sweep found were exactly that: the footer credit at `0.6875rem` and the
  header's trial CTA at `0.75rem`. Anything written outside `--text-*` stays
  behind wherever the root grows, on the totem and here alike.
- **The bottom of the scale rises, and this is where the television parts from
  the totem.** On the totem the smallest labels could stay at 6 mm because a
  caption is read by stepping closer. Nobody steps closer to a television:
  labels, eyebrows and fine print are read from the same armchair as everything
  else, so `--text-2xs` and `--text-xs` are raised to 0.82 and 0.88 rem (26 and
  28 px, 16 and 18 mm on a 55") — compressing the scale at the bottom instead of
  widening it, while staying under body copy so the hierarchy survives.
- **Give the page a margin: consumer sets still overscan**, historically up to
  5%. Between the 46 px the container leaves outside and its `1.25rem` (39 px)
  gutter, copy starts 85 px from the edge — 4.4% a side — so it stays inside on a
  set that crops, while full-bleed sections stay full-bleed.

To verify, sweep every built page at 1920×1080 — the full height is what turns
the mode on, so a widened desktop window will not reproduce it — and check: no
horizontal overflow, no text under 19 px, and characters per line per paragraph.
The last run was 80 pages: no overflow anywhere, nothing under 19 px, and 19
paragraphs below 30 characters a line, several of which are artefacts of the
counter (a paragraph broken by hand with `<br>`, a flex row read as one string).
Expect the line-length figures to be **worse** than the smaller tuning that came
before, and that is the trade being made on purpose: text readable at 3 m costs
line length, and a beautifully set line nobody can read from the sofa is worth
nothing. Two elements report as bleeding — `.nav-item`, which holds the
absolutely-positioned mega-menu, and `.splash__mark` by 3 px — and both do the
same at 1400×900, so they are pre-existing and not this mode's doing.

`/diagnostica-schermo` reads back both modes' conditions from `data-test` and
says on the screen itself which one is failing and how many millimetres the body
copy measures. Keep the three numbers identical between `global.css`, that page,
and every `/* + tv */` query.

## I due sottodomini vecchi reindirizzano da `vercel.json`

Prima di questo sito l'ecosistema era su tre host: `athlonroma.it` su WordPress,
`wiki.athlonroma.it` con l'Help Desk (Astro su Netlify) e
`planning.athlonroma.it` col palinsesto (HTML statico su Netlify). Le prime due
sono diventate sezioni di questo sito — `/wikiathlon/<area>/<slug>` e
`/planning` — e i vecchi indirizzi sono indicizzati e linkati.

I redirect stanno **qui e non su Netlify**, in `vercel.json`, e la ragione è di
manutenzione: le regole vivono nel repository che contiene le destinazioni,
quindi chi rinomina un articolo vede il redirect nello stesso diff. Il prezzo è
che i due sottodomini vanno aggiunti come domini del progetto Vercel e i loro
record DNS spostati da Netlify — una volta sola, e in cambio due siti Netlify
si archiviano invece di restare vivi per sempre come gusci di redirect.

- **Per il wiki è quasi un cambio di host e basta**, e non per fortuna: dei 24
  articoli del wiki vecchio **22 hanno il percorso identico** qui, perché la
  forma `/wikiathlon/<area>/<slug>` è stata tenuta di proposito (vedi la sezione
  su Tina). Quindi una regola con lo splat li copre tutti.
- **Per il planning lo splat non si usa.** Là era un file HTML per mese —
  `settembre.html`, `agosto.html` — qui è una pagina sola che legge il
  palinsesto corrente: `planning.athlonroma.it/settembre.html` deve diventare
  `/planning`, non `/settembre.html`, che non esiste.
- **L'ordine dell'array è la regola**, perché Vercel applica la prima che
  corrisponde: le specifiche prima del catch-all. `orari-estate-2026` sta prima
  perché era una scheda dell'Help Desk e qui è una news, e senza quella regola
  lo splat la manderebbe su `/wikiathlon/news/orari-estate-2026`, che il
  `redirects` di `astro.config.mjs` reindirizza di nuovo: due salti invece di
  uno.
- **`statusCode: 301` e non `permanent: true`.** Sono la stessa intenzione ma
  `permanent` emette un 308, e per una migrazione di dominio il 301 è la
  convenzione che ogni crawler e ogni strumento vecchio tratta senza sorprese.

Due trappole da conoscere.

**Un `vercel.json` sovrascrive solo le chiavi che contiene.** Qui c'è solo
`redirects`, quindi il comando di build e la cartella di output restano quelli
della dashboard — cioè `scripts/build.mjs`. Aggiungere un `buildCommand` qui
significherebbe avere la configurazione di build in due posti, e scoprire quale
vince il giorno che divergono.

**Un progetto Vercel solo, e i due sottodomini come suoi domini.** Non due
progetti nuovi: le regole `has: host` stanno nel `vercel.json` di *questo*
progetto, e perché siano valutate la richiesta deve arrivare qui. Due progetti
separati avrebbero configurazione vuota e servirebbero il nulla.

**E vanno aggiunti senza «Redirect to primary»**, che è quello che Vercel
propone per primo quando aggiungi un dominio. Quel redirect avviene al bordo
*prima* del routing del progetto, quindi scavalcherebbe tutto questo file — e il
risultato sarebbe sbagliato in due modi diversi: sul wiki funzionerebbe quasi,
perdendo le due eccezioni, mentre sul planning conserverebbe il percorso e
`planning.athlonroma.it/settembre.html` diventerebbe `/settembre.html`, che non
esiste. Sul planning il percorso va **buttato**, ed è il motivo per cui quella
regola non usa lo splat.

**Le regole scattano solo per gli host attaccati al progetto.** `has` con
`type: host` confronta l'intestazione della richiesta: finché
`wiki.athlonroma.it` non è un dominio di questo progetto Vercel, quelle quattro
regole non vengono mai valutate — non danno errore, semplicemente non esistono.
È il motivo per cui il file da solo non basta, e per cui va messo in produzione
**dopo** che `www` punta a Vercel: prima, i redirect manderebbero su un
WordPress che quelle pagine non ha.

### E le 102 regole di WordPress, che stanno nello stesso file

Sotto le sei per host ci sono i redirect che il plugin Redirection teneva sul
WordPress: 257 regole esportate, ridotte a 102 dopo aver buttato i duplicati, le
disattivate e quelle che qui farebbero danno. Sono ordinate per traffico, il che
non serve al funzionamento — Vercel confronta tutte le `source` — ma rende
leggibile quali contano.

**Tre categorie di regole vanno buttate, non portate**, e ognuna ha morso:

- **Quelle la cui sorgente qui è una pagina vera.** `/scuola-nuoto-bambini` →
  `/scuola-nuoto-bambini-3` aveva 26 813 hit su WordPress, dove la pagina si
  chiamava `-3`; qui la pagina *è* `/scuola-nuoto-bambini`, e il verso è
  invertito. Portarla avrebbe fatto un **ciclo infinito** con il redirect
  `-3 → senza suffisso`. Stessa cosa per `/planning` → `planning.athlonroma.it`
  (11 787 hit) e `/regolamento` → il PDF (10 275): qui sono due pagine, e il
  redirect le avrebbe oscurate.
- **Le catene.** Il plugin ne aveva tredici, tipo `/corsi-fitness/aeroshock` →
  `/gpasse` → `/gpcoreo`. Vanno appiattite sulla destinazione finale, con una
  regola: **l'appiattimento si ferma appena la destinazione è una pagina che
  esiste qui.** Senza quel freno, `/termini-e-condizioni-…pdf` → `/regolamento`
  proseguiva fino al PDF vecchio, cioè scavalcava la pagina che l'ha sostituito.
- **Le sorgenti malformate dell'export**, tipo
  `/abbonamenti/www.athlonroma.it/planning`: sono errori di battitura del
  pannello, non indirizzi che qualcuno visita.

**Le tre regole di `astro.config.mjs` stanno anche qui**, e non è una
duplicazione da togliere: quelle generano pagine di `meta refresh` nel `dist`,
questa dà un **301 vero**, e Vercel valuta i redirect prima di servire i file —
quindi vince il 301 e la pagina di refresh non viene mai raggiunta. Le tre in
`astro.config.mjs` restano perché il filtro della sitemap le legge da lì.

Attenzione al falso positivo che ne consegue: se controlli «la sorgente esiste
nel `dist`?» per scovare i redirect che oscurano una pagina, quelle tre
risultano positive **perché sono pagine di refresh**, non contenuti. Vanno
escluse dal controllo.

Restano **126 indirizzi senza destinazione decisa**, quasi tutti scarti di
WordPress — allegati, tag, categorie-prodotto — che su WordPress finivano in
home. Mandare in home un indirizzo che non esiste più è un *soft 404*, e Google
lo tratta peggio di un 404 onesto: non sono stati portati di proposito. Le
eccezioni con traffico vero — `/lead` con 267 041 hit, `/corsi-adulti` con
2 677, `/tv` e i suoi sottopercorsi — meritano una destinazione scelta, non la
home.

Per verificare, dopo il deploy e lo spostamento dei domini:

```
curl -sI https://wiki.athlonroma.it/wikiathlon/generali/certificato-medico/ | head -3
```

Deve dire `301` e `location: https://www.athlonroma.it/wikiathlon/generali/certificato-medico`.
Un `200` vuol dire che il dominio non è ancora sul progetto.

## Un campo telefono, e uno solo: `CampoTelefono.astro`

I campi «cellulare» del sito sono cinque, in quattro pannelli — la prova, i
contatti (l'adulto e il genitore), il referral (tre, uno per amico) e la chat —
e sono tutti lo stesso componente. Chi ne aggiunge uno usa quello: la lista dei
prefissi è duecento righe, e cinque copie sarebbero cinque occasioni di
divergere.

```astro
<CampoTelefono id="rfr-cell-1" classe="rfr__input" />
```

`classe` è la classe del campo di testo del pannello ospite, e **va passata**:
il componente porta la disposizione, la classe porta il colore — bianco nella
prova, scuro nell'Help Desk.

**Ma passare la classe non basta: la regola del pannello dev'essere
`:global`.** Gli stili con ambito di Astro non attraversano i confini dei
componenti, e a non attraversarli è la *regola*, non la classe. Il `select` e
l'`input` li rende `CampoTelefono`, quindi portano l'ambito di quel file,
mentre `.pf__input { … }` scritto nel modal diventa
`.pf__input[data-astro-cid-oynkqsed]` e non li tocca mai. Il campo telefono era
nudo — con l'aspetto grezzo del browser — in **tutti e quattro** i pannelli, e
non se n'era accorto nessuno finché non è stato guardato sul referral.

Si scrive `:global(.pf__input) { … }`, e la classe è già propria del pannello,
quindi globale non collide con niente. Per verificarlo non basta guardare uno
screenshot: si misurano gli stili calcolati del `select` e si confrontano con
quelli di un `input` del pannello — sfondo, bordo, raggio, famiglia e corpo
devono coincidere. Vale per qualunque componente condiviso che si aspetti di
essere vestito da chi lo ospita.

**Non si legge mai `input.value` da solo.** Quello è il numero come l'ha scritto
la persona, non il numero: la tendina sta in `#<id>-prefisso`, e la composizione
la fa `validaTelefono()` in `data/prefissi.ts`. Chi legge il campo a mano
reintroduce esattamente il bug che questo componente ha chiuso.

### Il numero esce in E.164, e nessuno gli incolla più niente davanti

Prima ogni form chiedeva il numero senza prefisso e chi lo consumava incollava
`'+39' +`. Erano quattro righe in quattro file, e ognuna assumeva l'Italia:

- chi scriveva `+39 320…` finiva con `+39+39320…`;
- chi ha un numero straniero non era raggiungibile — il suo `+44 7…` diventava
  `+39447…`, che è un numero italiano che non esiste, e il WhatsApp partiva
  verso il nulla **senza dare errore**.

Adesso il numero arriva già completo a n8n, ad Airtable, a Spoki e a PerfectGym.
Il nodo `Form` di `athlon-referral` ha una rete di sicurezza per chi chiamasse
l'endpoint da fuori senza il `+`, e assume l'Italia — l'unica assunzione sensata
per questo club — ma il percorso normale non la usa.

### `validaTelefono` chiede «è plausibile», non «è ben formato»

`+393333333333` passa qualunque controllo di formato — dieci cifre, comincia per
3, è un cellulare italiano perfetto — e non è il numero di nessuno. Chi non vuole
lasciare il suo numero digita quello. Quindi tre controlli in fila:

1. **La forma.** Lunghezza E.164, e per l'Italia il cellulare deve cominciare per
   3 ed essere di nove o dieci cifre. Un fisso in un campo «cellulare» non è un
   errore di battitura: è un numero su cui WhatsApp non esiste.
2. **La varietà.** Meno di quattro cifre diverse vuol dire inventato.
3. **Le sequenze.** Sette cifre consecutive in salita o in discesa.

**Sette e non sei, ed è misurato**: a sei, `+44 7911 123456` — un numero dalla
forma perfettamente britannica — veniva rifiutato, perché una sequenza di sei
capita per caso circa una volta su diecimila. Il verso giusto in cui sbagliare è
questo: un numero finto che passa lo si scopre al primo messaggio non
consegnato, una persona vera che non riesce a lasciare il suo numero non torna.

Fuori dall'Italia si controllano solo lunghezza, varietà e sequenze: le regole
nazionali sono duecento e cambiano, e un falso negativo costa più di un numero
sbagliato.

Per **verificare un prefisso**: la lista ufficiale è ITU-T E.164. Un prefisso
sbagliato non dà errore, manda un messaggio a un numero che non esiste, e non lo
si scopre mai.

## `/prova` è la pagina del Guest Pass, e la barra dice la scala

La prova è la conversione più importante del sito — ogni pagina ha un pulsante
che la chiede — e per un pezzo non aveva una pagina. Il ripiego senza JavaScript
di tutte quelle CTA era `/abbonamenti#guest-pass`: **un blocco dentro un
listino**, tre righe e un prezzo in mezzo a due abbonamenti da novanta euro al
mese, che è il contesto peggiore per una cosa che costa diciannove. Ora
`TRIAL_FALLBACK` in `data/cta.ts` porta a `/prova`; l'ancora esiste ancora ed è
giusta per chi sta leggendo i piani, ma non è il ripiego di un pulsante «prova».

**Nessun numero della pagina è scritto a mano**, e questa è la riga da non
rompere:

- giorni, prezzo, codice e requisito vengono da `GUEST_PASS`
  (`data/abbonamenti.ts`). Il prezzo era ricopiato in tre punti — due volte in
  `ProvaModal`, una in `guestPass.ts` — e ora no;
- le lezioni e le ore le conta il palinsesto (`totalLessons()`, `openHours()`,
  `bandHours(getBand('nuoto-libero'))`), quindi cambia il planning e cambia la
  pagina. **Tre unità diverse e non una**: una lezione ha un istruttore e un
  orario, la sala e le corsie sono aperte. Contare il nuoto libero in lezioni
  darebbe diciotto invece di quarantaquattro ore d'acqua — la regola è
  `FASCE_A_ORE` e vale per tutto il sito;
- **il perimetro è la lista di attività del Premium**, letta da `plans`. Il Pass
  è un Premium di sette giorni, quindi non comprende il personal training né i
  corsi junior. Scrivere «provi tutto» e intenderlo alla lettera è la promessa
  che manda una persona al desk a sentirsi dire no.

L'elenco delle attività cliccabili è `AttivitaComprese.astro`, e va usato con
**`AttivitaModal` una volta nella pagina** — è lui che intercetta
`data-activity`. Uno senza l'altro dà un elenco di pulsanti che non fanno
niente. Il componente esiste perché quella lista era già scritta due volte
(`/abbonamenti` con le icone, `/promo` senza) e `/prova` sarebbe stata la terza;
le icone stanno in `ICONE_ATTIVITA` (`data/activities.ts`), non nel markup di
una pagina, e sono chiavate sull'**etichetta** che `plans` usa — non sullo slug
di `ACTIVITY_TAGS`, che è un'altra lista e non coincide.

### I tre posti della barra, e il solo comando di contatto sul telefono

Nella riga desktop ci sono tre posti e dicono la scala delle intenzioni:
**provare** (contornato), **comprare** (pieno), **parlare adesso** (la chat). Il
contornato era Contattaci: la prova gli ha preso il posto perché è la cosa che
il club vende a chi non lo conosce ancora, e provare viene prima di farsi
contattare.

Sul telefono ce n'è uno solo, e la ragione è una misura: a 375 px, fra la chat e
i comandi dell'account restano dodici pixel, e «Chatta con noi» ne chiede
novanta di solo testo. Due comandi per «farsi rispondere» obbligano uno dei due
a essere un'icona muta — e un'icona muta la trova chi la cerca. Resta la chat,
che è quella che risponde adesso e che quando non basta ha «Contatta il team»
dentro la conversazione.

**Quindi Contattaci vive in tre posti e nella barra del telefono no**: il menu
del telefono (terzo pulsante, dove prima non c'era affatto), il footer di ogni
pagina, e i comandi `data-cta="talk"` dentro le pagine. Prima di questa riga,
dal telefono si arrivava a scrivere a una persona solo scorrendo fino al footer.

Tre dettagli che sono misure e non gusto:

- **la pastiglia è centrata sulla barra, non nello spazio che le resta.** Il
  logo occupa 52 px a sinistra e i comandi 77 a destra, quindi il vuoto in mezzo
  non è centrato nello schermo: con i margini automatici restavano sedici pixel
  di errore, e prima trentasei. Si centra con `left: 0; right: 0` e
  `margin-inline: auto`, **non** con `translateX(-50%)`: il `transform` lì è già
  occupato dallo schiacciamento alla pressione, e due trasformazioni sullo stesso
  elemento si mangiano — premendola tornerebbe a sinistra;
- **lo stampatello costa larghezza.** «CHATTA CON NOI» con la crenatura piena
  degli altri comandi (0,104em) porta la pastiglia a toccare i comandi
  dell'account a 360 px. Sta a 0,02em, col pieno limato e l'icona a 18 px invece
  di 20 — che accanto a un testo da 12 era il pezzo più grande. Restano cinque
  pixel di respiro a 360 e tredici a 375;
- **sotto i 360 px la pastiglia si nasconde**, e si nasconde questa e non altro:
  la chat ha un ripiego suo, il pulsante fisso in basso a destra, che non
  dipende dalla barra.

E «Lavora con noi» sta in fondo al menu in corpo piccolo, come su `/link` e per
la stessa ragione — chi cerca lavoro lo cerca sapendo già di volerlo, e un
pulsante pieno lo metterebbe in concorrenza con la prova. **Senza la condizione
su `POSIZIONI`** che `/link` ha invece: là la voce compare solo con un annuncio
aperto, perché da una bio non si manda nessuno su un elenco vuoto; qui è una
voce di menu, e la pagina regge l'elenco vuoto per intero. Il link è
`inline-flex` e non in linea, o il `padding` verticale non riserva spazio e
ruberebbe i tocchi al pulsante sopra — la trappola già vista sul reset della
password.

## «Contattaci»: chi ha un abbonamento non chiede informazioni

Il form nasce dai 55 nodi di `CONTATTACI - ATHLON`, e la prima stesura del
porting aveva perso tre cose che quel flusso faceva. Vanno tenute, perché
ognuna era un pezzo di percorso e non un abbellimento.

**La domanda che smista non è «ha un account», è «ha un abbonamento vivo».**
`statoNucleo === 'iscritto'` — che `athlon-verifica-iscritto` calcola
interrogando i contratti del titolare **e dei primi tre figli** (`Current`,
`NotStarted`, `Freezed`, con quota diversa da zero) — separa due percorsi che
non hanno niente in comune:

| | abbonamento vivo nel nucleo | nessun abbonamento |
| --- | --- | --- |
| passi | email → area → testo libero | email → area → dati → invio |
| dati personali | **non si chiedono**: li abbiamo da PerfectGym | si chiedono, e creano l'anagrafica |
| appuntamento telefonico | **mai** | il calendario del ramo |
| classificazione | `assistenza` | `informazioni` |
| email a chi scrive | presa in carico | modalità di iscrizione (junior/baby) |

Ed è la stessa condizione dello switch `SE ISCRITTO` del flusso originale, che
infatti mandava questi utenti sul wiki **prima** di chiedere l'attività.

Quattro cose da sapere prima di toccarlo.

**La regola dell'abbonamento vince su quella dell'account, e si controlla per
prima** (`scegliMacro` in `contattaciForm.client.js`). Un abbonato è per
costruzione anche uno che ha un account, quindi l'ordine è tutto: al contrario
vedrebbe la schermata «ecco come iscriverti», che a chi è già dentro non serve,
e riceverebbe l'email con le modalità di iscrizione — una lettera al cliente
sbagliato.

**Il calendario si toglie con `hidden`, non si nasconde.** L'appuntamento
telefonico è lo strumento di chi deve ancora decidere se iscriversi: offrirlo a
un socio che segnala un badge sospeso vuol dire rispondergli «ti richiamiamo fra
tre giorni» a una domanda che ha una risposta di due righe. E il pannello
direbbe due cose insieme — «richiesta presa in carico» e «scegli quando ti
chiamiamo».

**La classificazione la ricalcola n8n, non la prende dal browser.**
`tipoRichiesta` arriva nel payload perché è quello che la persona *ha visto*, ma
`Normalizza e Componi Email` la rifà da `statoNucleo`: la verifica dell'email
può essere di dieci minuti prima con il pannello rimasto aperto, e ciò che
finisce nell'oggetto di un'email al desk e in una colonna di Airtable deve
nascere dal dato. Si conservano entrambe (`tipoRichiestaVista`), perché una
divergenza fra le due è un sintomo e nessuno la vedrebbe tenendone una sola.

**La parola «preiscrizione» non si usa più.** La scheda è `Iscrizione Corsi
2026/27` e le iscrizioni sono aperte ad abbonamento mensile: dire a un genitore
che si preiscrive lo manda a cercare un passaggio che non esiste. Lo **slug**
invece resta `preiscrizioni-nuoto` — è indicizzato, è la destinazione di
`/snb-landing` in `vercel.json`, ed è uno dei 22 percorsi identici al wiki
vecchio. La costante si chiama `ISCRIZIONI`.

### Le due chiusure del ramo junior, e le tre email

Chi ha un account ma non un abbonamento vede una chiusura diversa per ramo, e
non una schermata sola con una parola scambiata: la scuola nuoto **sceglie un
turno** e lo trova nella scheda, il baby nuoto **non sceglie niente prima** e
compra dentro il portale. Una schermata sola può dire solo una delle due cose,
ed è il motivo per cui nel primo porting il ramo baby era rimasto senza
istruzioni.

- **`ISTRUZIONI` ha due voci e non tre.** `adulti` non c'è: l'adulto scrive in
  testo libero e gli risponde una persona, e inventargli una pagina di
  procedura vorrebbe dire far leggere una procedura a chi ha chiesto di parlare
  con qualcuno.
- **L'accesso è l'azione, il reset è la deviazione**, come davanti a
  «Iscriviti». Il pulsante pieno era «Reimposta la password», che a chi ce l'ha
  nel gestore dice che la sua password non funziona. E il reset passa da
  `WEBHOOK_RESET` — che esisteva già e questo form non usava — invece di
  mandare la persona a ridigitare su `ForgotPassword` l'indirizzo appena
  scritto.
- **Il nucleo familiare si spiega in tre passi**, con le parole del portale. Il
  passo che manca quando si riassume in una riga è sempre lo stesso: «Crea
  Account» sta in fondo alla scheda, sotto i campi, e chi non scorre conclude
  che l'account non si può creare.

Le email a chi compila stanno in `Componi Email Utente`, e sono tre varianti e
non quattro: `assistenza`, `junior`, `baby`. **Il ramo adulti informativo non
riceve niente**, come nell'originale — un'email automatica che non dice niente
più della schermata appena letta è una notifica, non una risposta. Il gate è
`return []`, così la condizione sta accanto ai testi che governa invece che in
un ramo del canvas, e un filtro dopo il compositore impedisce che un template
che solleva faccia partire un'email bianca a una persona vera.

Due dettagli che sono trappole vere:

- **`istruzioniUrl` lo manda il sito, non lo scrive n8n.** Il giorno che quella
  scheda si sposta, il redirect e il link nell'email cambiano nello stesso
  commit; un percorso scritto in un template resta indietro senza dare errore,
  e un'email con un link morto non fallisce — arriva.
- **Il logo dell'email è `Logo-oriz-full.png` e sta in `public/`.** È una copia
  di `Logo-oriz-full-2.png` fatta di proposito: l'originale WordPress serve il
  primo nome, questo repository aveva solo il secondo, e senza la copia
  l'immagine muore il giorno dello spostamento del dominio. I due template
  Spoki portati dall'originale avevano invece **i Calendly scambiati** — la
  scuola nuoto mandava a `/richiamami`, che è l'evento degli adulti; qui si
  segue `data/calendly.ts`.

### La stessa regola vale nella chat, e lì aveva la condizione sbagliata

L'assistente classifica sull'email come il form — `dati.ramo = 'iscritto'`
quando `statoNucleo === 'iscritto'`, e da lì cambiano tono, conoscenza e bolla
d'apertura — ma l'**offerta della telefonata** guardava un'altra cosa:
`dati.conosciuto`, che è vera per chiunque abbia un'anagrafica. Compreso un
Lead: chi ha fatto una prova due anni fa e non ha mai avuto un abbonamento,
cioè esattamente la persona a cui la telefonata serve. Il gate è
`statoNucleo !== 'iscritto'` (`dati.puoRichiamo`).

Era invisibile, e vale la pena sapere perché: un calendario che non compare in
una chat non sembra un guasto, sembra un assistente che non lo propone.

**La telefonata si chiede in tre modi, e sono tre momenti diversi.**

- l'**icona ☎ in intestazione**, dal primo istante della conversazione. Prima
  l'unica strada era l'offerta automatica dopo tre risposte, una volta sola:
  chi la chiudeva, o chi la voleva alla prima riga, non aveva più niente da
  toccare. L'intenzione di sentire una voce non nasce alla terza risposta.
- il **pulsante sotto ogni risposta**, in parallelo a «Contatta il team». Sono
  due cose diverse e non la stessa con due nomi: il team è scritto e porta il
  trascritto al desk, la telefonata è una voce a un'ora scelta. Resta il
  secondo dei due, in contorno — chi sta leggendo una risposta scritta ha già
  scelto quel canale.
- l'**offerta automatica**, ora dopo due risposte: non è più l'unica strada,
  quindi le resta il ruolo di promemoria per chi non ha guardato in alto.

Tre cose da non rompere:

- **Un calendario solo, sempre.** `mostraRichiamo()` scorre a quello esistente
  invece di montarne un secondo: due iframe di Calendly nella stessa
  conversazione sono due moduli che chiedono la stessa cosa, e il primo che si
  compila lascia l'altro a dire che non è stato fissato niente. Per la stessa
  ragione l'icona non si disabilita dopo il primo clic — riportare al
  calendario è una risposta giusta quanto aprirlo.
- **L'icona compare all'inizio della conversazione, non prima.** Nei passi
  dell'email e dell'attività non c'è ancora niente di cui parlare al telefono,
  e il contesto che finisce in `a1` sarebbe vuoto — su quell'evento Calendly
  quella domanda è obbligatoria.
- **La riga che la rende scopribile sta nella bolla del saluto.** Un'icona muta
  la trova chi la cerca, e qui serve il contrario: che si sappia di poterla
  usare *prima* di averne bisogno. Un cartello sopra la conversazione si legge
  come pubblicità e si salta.

E il `reset` azzera `risposteDate`, `richiamoOfferto` e nasconde l'icona: sul
totem all'ingresso la persona dopo esiste davvero, e senza questo erediterebbe
«il calendario l'ho già proposto» da una conversazione che non è la sua.

### Il calendario in chat: il nome in due campi, la larghezza e l'uscita

Tre difetti dello stesso blocco, e il primo era invisibile.

**Un evento Calendly con «Nome» e «Cognome» in due campi ignora il prefill
`name`.** Il modulo di `recall` è così: arrivava con i due campi vuoti — e
obbligatori — mentre l'email era compilata, quindi chi voleva essere richiamato
doveva ridigitare quello che il club sapeva già. `nomiCompleti()` in
`calendario.client.js` manda **tutte e tre** le chiavi (`name`, `firstName`,
`lastName`; nel link diretto `name`, `first_name`, `last_name`): un evento a
campo unico legge la prima e scarta le altre, uno a campi separati fa il
contrario. Quale sia lo decide chi configura l'evento su Calendly, e da qui non
si vede — mandarle tutte è il solo modo di non dipendere da quella scelta.

I chiamanti passano **nome e cognome separati** dove li hanno, e li hanno tutti
e tre (prova, contattaci, chat). La divisione della stringa intera resta come
ripiego e sbaglia sui nomi doppi: «Maria Teresa Rossi» diventa «Maria» +
«Teresa Rossi».

**Il blocco è una fascia, non una scheda dentro due padding.** Il widget perdeva
61 px — 16 per lato della conversazione più 14 per lato della scheda — che su un
telefono sono un quinto dello spazio. Con i margini negativi il calendario passa
da 314 a 359 px su uno schermo da 375.

**E si chiude.** Prima, una volta aperto, non c'era modo di rimandarlo indietro:
chi ci ripensava e voleva continuare a chiedere si trovava un modulo da
trentaquattro rem in mezzo alla conversazione e nessuna uscita. Il × sta nella
testa del blocco, e `chiudiRichiamo()` chiama `distruggi()` del montaggio prima
di togliere il nodo — senza, il widget resta vivo e il singolo `attivo` di
`calendario.client.js` punta a un nodo staccato dal documento.

Due dettagli del comportamento dopo la chiusura: `richiamoOfferto` **resta
vero**, perché chi ha chiuso ha detto no e riproporglielo da sé dopo due
risposte sarebbe insistere; l'icona ☎ in intestazione invece continua a
funzionare, e `mostraRichiamo()` ne monta uno nuovo. E a prenotazione fatta il ×
si nasconde: accanto a una conferma è rumore.

### Chi si registra dalla chat arriva anche su Airtable

`CHAT ATHLON — DATI` scriveva su Supabase (`chat_lead`, `eventi_email`) e creava
le anagrafiche su PerfectGym, e non scriveva la riga su `ATHLON CLUB /
RICHIESTE`: un contatto raccolto dall'assistente non arrivava nel posto dove il
desk lavora. Ora le tre strade — figlio creato, adulto che aveva già
un'anagrafica, lead adulto creato — confluiscono in `Raccogli PGM Chat`, e da lì
parte Airtable.

È lo stesso schema di `athlon-contatto-compilato`, e per la stessa ragione:
l'id PerfectGym esiste solo **dopo** la creazione, quindi la riga va scritta a
valle o `UserID` e `PGM` restano vuoti. Il ramo sta **in parallelo a
`Conferma`**, non prima: al browser si risponde subito.

Il trascritto della conversazione non finisce in Airtable — vive in
`chat_conversazioni` e `chat_messaggi`, e incollarlo in una cella lo rende
illeggibile in entrambi i posti. Nel `Messaggio` ci sono i fatti che servono ad
aprire la pratica, il ramo compreso: dice come l'assistente ha parlato a quella
persona, che è il contesto che al desk manca leggendo la sola anagrafica.

**Questo webhook non si prova con `curl`**: ha `ignoreBots: true`, quindi
risponde `403 Authorization data is wrong!`, che sembra un problema di
credenziali e non lo è. Si passa dal browser. E attenzione all'errore che ho
fatto io: se nella pagina hai sostituito `window.fetch` per finire le risposte,
il `200 {ok:true}` che leggi è il tuo stesso stub e a n8n non arriva niente.

### Sul totem la chat dimentica dopo tre minuti, altrove no

La chat riprende dove stava di proposito: chiudere il pannello per sbaglio non
deve costare l'email e il ramo. Su un dispositivo personale è la scelta giusta —
quella conversazione è di chi ha quel dispositivo. Sul pannello all'ingresso del
club è l'opposto: chi arriva dopo trova l'indirizzo email e le domande di chi è
passato prima. È la stessa ragione per cui `emailNota.ts` non precompila l'email
là, e per cui il form dei contatti si apre vuoto sempre.

Il riconoscimento è `suTotem()` di `scripts/totem.ts`, condiviso con
`emailNota.ts` e `attribuzione.ts`: le tre condizioni non si ricopiano.

- **Tre minuti, e la misura viene dal costo dei due errori.** Troppo presto si
  cancella il lavoro di qualcuno che è ancora lì, e lo vede: deve ridigitare
  l'email. Troppo tardi si mostra l'indirizzo di uno sconosciuto. Il primo è un
  fastidio visibile e recuperabile, il secondo è il dato di un'altra persona —
  quindi si sta dalla parte breve, ma non tanto da colpire chi legge una
  risposta lunga.
- **Il conto segue il dato, non il dito.** Le prime versioni lo armavano solo
  sugli eventi di interazione, e una prova l'ha smontato: basta un percorso che
  arriva a destinazione senza un `pointerdown` — un invio da tastiera, un
  comando premuto da fuori il pannello — e l'email resta lì per sempre.
  `armaOblio()` è chiamata anche dopo la verifica dell'email, all'apertura della
  conversazione e alla fine di ogni risposta.
- **L'attesa di una risposta non è inattività**, ed è il solo caso in cui stare
  davanti allo schermo non produce eventi. Se il conto scade mentre `inCorso` è
  vero, riparte invece di azzerare.
- **A pannello chiuso si svuota lo stato ma non si chiama `onChiudi()`**, ed è
  il motivo per cui `pulisciStato()` esiste separato da `reset()`: quella
  funzione toglie `amodal-locked` dal `body`, e farlo tre minuti dopo — quando
  nel frattempo può essere aperto **un altro** modal — farebbe scorrere il fondo
  dietro il pannello di qualcun altro. Nessuno collegherebbe la cosa a una chat
  chiusa tre minuti prima.

Per verificare: a 1080×1920 il conto si arma (`suTotem()` vero) e alla scadenza
il pannello torna al passo dell'email con i campi vuoti, la conversazione
svuotata, l'icona nascosta e `amodal-locked` rimosso; a 1400×900 non si arma
mai e la conversazione sopravvive. Attenzione a provarlo con la scheda in primo
piano: a scheda nascosta i browser rallentano i timer e la prova non dice
niente.

### L'id PerfectGym arriva dopo, quindi l'email al desk parte dopo

`Email al Desk` e `Airtable RICHIESTE` partivano in parallelo alla creazione
dell'anagrafica, quindi per un contatto nuovo l'id non esisteva ancora: le
colonne `UserID` e `PGM` del flusso originale erano rimaste fuori, e il desk
riceveva un'email senza il link alla scheda della persona di cui parla.

Ora le tre strade dello Switch confluiscono in `Raccogli PGM` — e la terza,
`nessuna`, prima non era collegata a niente. Da lì partono l'email al desk,
Airtable, l'email a chi compila e il WhatsApp. Costa due chiamate HTTP di
ritardo, che non si vedono: al browser ha già risposto `Rispondi con Id` su un
ramo parallelo.

- **`Raccogli PGM` legge da `$('Normalizza e Componi Email')`, non da
  `$input`.** Su due strade su tre l'item arriva da un nodo Supabase, che
  restituisce **la riga inserita**: da lì `$json` ha i nomi delle colonne
  (`member_id`) e non quelli del form (`memberId`), e ogni espressione a valle
  leggerebbe `undefined` in silenzio.
- **`isExecuted` prima di `first()`.** Su un nodo che non ha girato `first()`
  solleva, e un errore lì fermerebbe la sola email che avvisa una persona che
  c'è una richiesta da lavorare.
- **L'id è quello del genitore**, come in tutti e sei i nodi Airtable
  dell'originale: la richiesta è sua, ed è la sua scheda che il desk apre.
  Quella del figlio si porta a parte e compare solo quando c'è.

## Il form dell'assistenza chiede poco, e il resto lo va a prendere

Il form dell'Help Desk — `components/clublife/SupportForm.astro`, dentro
`/club-life` — manda a `help-desk-athlon` su n8n, che scrive al desk, conferma a
chi ha scritto e archivia su Supabase (`app-athlon`, `richieste_help_desk`). I
nomi dei campi sono il contratto con quel workflow: rinominarne uno qui lo fa
sparire dall'email e dal database.

**Non chiede nome e cognome, e non è una semplificazione: è che li sapeva già.**
C'erano due campi obbligatori, «nome dell'utente per il quale si richiede
assistenza», e chiedevano un dato che l'email identifica meglio di chi lo digita
— chi scrive per un figlio si fermava a decidere di chi fosse il nome richiesto.
Ora il workflow interroga PerfectGym con l'email (`PGM Cerca Anagrafica`, la
stessa OData di `athlon-verifica-iscritto`) e ricava nome, cognome, telefono,
`member_id` e `memberType`. Il body resta letto come ripiego, per le richieste
che arrivassero da form più vecchi.

Quella chiamata ha `onError: continueRegularOutput` e `alwaysOutputData`, e
`pgm_stato` distingue tre casi che non sono lo stesso: `trovato`, `sconosciuto`
(email non nostra) e `non-verificato` (PerfectGym non ha risposto). **Una
richiesta di assistenza non si perde perché il gestionale è giù** — senza il
nome la mail al desk è più povera, senza la richiesta non c'è niente.

**Quello che resta da chiedere è il contesto, e il contesto non entra in una
casella.** Sta nel testo, e il segnaposto lo chiede per nome: chi è l'iscritto,
di quale corso o orario si tratta, le date. Un campo in meno da compilare e una
richiesta più completa di prima.

### L'allegato viaggia in base64 dentro il JSON

Un file solo, immagine o PDF, cinque megabyte. Tre cose non ovvie:

- **Base64 e non `multipart/form-data`.** Il webhook riceve un oggetto JSON e da
  quello escono due email e una riga di database: passare a multipart vorrebbe
  dire riscrivere il contratto per un campo facoltativo. Il costo è un terzo di
  byte in più, che su 5 MB sono 6,7 MB di richiesta — dentro il limite.
- **Il tetto si controlla nel browser**, prima di leggere il file. Un rifiuto
  immediato è più gentile di trenta secondi di caricamento che finiscono in un
  errore, e il limite del server non spiega mai cosa fare.
- **Il base64 non entra in `out`** dentro `Prepara richiesta`, e questa è la
  riga da non toccare: `out.payload` è una copia di `out` e finisce in una
  colonna `jsonb`. Nel record restano nome, tipo e peso — misurato, 1,2 kB
  invece di megabyte. Il file torna binario solo alla fine, e il nodo SendGrid
  lo attacca con `{{ Object.keys($binary).join(',') }}`, che quando non c'è
  niente non attacca niente.

Il campo file non ha `name`: `FormData` non lo raccoglierebbe comunque in modo
utile — un `File` dentro `JSON.stringify` diventa `{}`, cioè un campo che sembra
inviato e non contiene niente — e i tre pezzi si aggiungono a mano.

**Il webhook rifiuta i client che sembrano bot** (`ignoreBots: true`): un `curl`
o uno script Python prendono `403 Authorization data is wrong!`, che sembra un
problema di credenziali e non lo è. Per provarlo si passa dal browser, dal form
vero, che è comunque la prova che conta.

## Ogni dato raccolto finisce su Supabase, e Airtable è il passeggero

Il database del sito è il progetto Supabase **`app-athlon`**
(`kdbcwwpdazvtmjolybdm`), e ci scrivono le automazioni n8n, mai il browser: la
chiave che scrive è la service key, che sta solo in n8n. Tutte le tabelle hanno
RLS attiva e **zero policy**, che è il modo di dire «solo la service key passa».
Una policy `anon` su una di queste tabelle è un elenco di lead pubblicato.

Lo schema sta in `supabase/migrations/`, e va tenuto in pari: una colonna
aggiunta dalla dashboard e non qui è una colonna che il prossimo ambiente non
avrà. Non c'è un `db push` in CI — le migrazioni si eseguono a mano nella SQL
Editor — quindi il file è documentazione eseguibile, non un meccanismo.

**Airtable resta, e resta secondario.** `athlon-contatto-compilato` e
`athlon-referral` scrivono ancora la loro riga su `ATHLON CLUB / RICHIESTE`, e
va bene finché il desk lavora di lì. Ma la fonte di verità è Supabase, e si
vede dall'ordine dei nodi: la riga sul database si scrive **prima** di Airtable,
prima di SendGrid, prima di Spoki e prima di PerfectGym. Non è estetica — quei
nodi hanno `onError: continueRegularOutput`, quindi falliscono in silenzio, e
nell'ordine inverso un timeout del CRM sarebbe un contatto perduto senza che
nessuno se ne accorga.

Dove finisce cosa:

| webhook | tabella |
| --- | --- |
| `athlon-prova-compilata` | `richieste_prova` |
| `athlon-contatto-compilato` | `richieste_contatto` |
| `help-desk-athlon` | `richieste_help_desk` |
| `chat-athlon` | `chat_conversazioni`, `chat_messaggi` |
| `chat-athlon-dati` | `chat_lead` |
| `chat-athlon-ticket` | `chat_ticket` |
| `athlon-referral` | `richieste_referral` |
| `athlon-verifica-iscritto`, `athlon-reset-password` | `eventi_email` |

E una sola automazione non parte da un webhook: `INBOX EMAIL DESK - SUPABASE`,
che ha un trigger Gmail e scrive su `email_messaggi`. Sta qui sotto.

E sopra tutte c'è `utenti`, l'anagrafica: ogni riga di queste tabelle porta una
`utente_id` che un trigger riempie da sola, deduplicando per id PerfectGym e
per email. Sta più sotto, e non va toccata da n8n.

**Gli scarti si registrano come i successi**, ed è la riga che manca più spesso.
Il referral rifiutava due casi — chi invita non è socio, l'amico lo è già —
mandandoli su un nodo `No-Op`: gli inviti persi non esistevano, quindi nessuno
poteva sapere quanti fossero né perché. Ora hanno una riga con `esito` e
`motivo_scarto`. Stessa idea per l'email malformata in `eventi_email`: se sono
tante, il problema è il campo, non chi scrive.

### La casella del desk entra nell'anagrafica, e solo per i mittenti noti

`INBOX EMAIL DESK - SUPABASE` guarda la casella ogni minuto, chiede a `utenti`
chi è il mittente e scrive su `email_messaggi` **solo se lo trova**. Da lì la
scheda di una persona nel pannello mostra le sue email accanto ai form e alle
conversazioni: prima quel canale — quello su cui il desk passa la giornata —
non compariva da nessuna parte, e la stessa persona risultava «un form e
nient'altro» mentre in casella c'erano cinque scambi.

Il filtro sul mittente non è un'ottimizzazione, ed è la riga da non togliere:
una casella è fatta in gran parte di cose che non sono persone — newsletter,
notifiche, ricevute, posta indesiderata — e archiviarla tutta farebbe
dell'anagrafica un archivio di posta, conservando dati di terzi raccolti per
niente. `email_messaggi.utente_id` è `not null` con `on delete cascade`
proprio per questo: a differenza delle `richieste_*`, che valgono anche senza
aggancio, un'email senza la sua persona non è niente, e cancellare un contatto
deve portarsi via la sua corrispondenza.

Quattro cose da sapere prima di toccarla.

- **La ricerca della persona *è* il filtro, e non serve nessun `IF`.** Il nodo
  Supabase che interroga `utenti` non produce righe per un mittente
  sconosciuto, quindi quell'item smette semplicemente di esistere. Ed è il
  motivo per cui quel nodo **non** ha `alwaysOutputData`: con quello arriverebbe
  a valle un item vuoto, cioè un'email da scrivere senza persona.
- **L'email intera si legge dopo la ricerca, non prima.** Il trigger sta sulla
  forma semplificata (`simple: true`): il corpo lo va a prendere `Prendi l'email
  intera` con `simple: false`, e solo per i mittenti che sono già passati dal
  filtro. Al contrario si parserebbe l'email grezza di ogni newsletter per
  buttarla un nodo dopo — che è la causa nota di esaurimento memoria di quel
  nodo.
- **`corpo` esce sempre pieno.** Chi scrive da un telefono manda spesso solo
  HTML, e la parte testuale non c'è: il testo lo ricava l'automazione, così chi
  legge la tabella ha una colonna da guardare e non due da provare in ordine.
  `corpo_html` resta accanto per fedeltà, e il pannello non lo chiede.
- **L'indice unico su `gmail_id` è la difesa dai doppioni**, e il nodo che
  scrive ha `onError: continueRegularOutput` per non fare di una consegna
  ripetuta un'esecuzione rossa. Le tre chiamate (ricerca, Gmail, scrittura)
  hanno `retryOnFail`: il trigger Gmail non riconsegna, quindi un'esecuzione
  fallita è un'email perduta per sempre.

Gli allegati non hanno colonne, deliberatamente: il nodo Gmail butta i loro
metadati a meno che non li scarichi, e una colonna che nessuno riempie è peggio
di una colonna che manca. Il giorno che servono si accende
`downloadAttachments` e il file va su Storage, come per l'allegato dell'Help
Desk — nella riga nome, tipo e peso, non il base64.

Un'email conta come **richiesta** e non come tocco in `utente_attivita`: chi
scrive alla casella ha chiesto qualcosa davvero, a differenza di chi digita un
indirizzo in un form e chiude la pagina. La vista `email_thread` raggruppa per
scambio, che è la forma in cui una casella si legge.

### `eventi_email` è il funnel, le `richieste_*` sono le conversioni

Le tabelle `richieste_*` contengono chi è arrivato in fondo. `eventi_email`
contiene chi ha cominciato: **una riga ogni volta che qualcuno digita un
indirizzo**, quale che sia il form e quale che sia l'esito. La distanza fra le
due è quanti si fermano a metà.

Il buco era grosso e invisibile: `athlon-verifica-iscritto` è l'endpoint più
trafficato del sito — ci passano la prova, «contattaci», la chat, l'Help Desk e
i pulsanti *Iscriviti* di `/abbonamenti` e `/promo` — e non scriveva niente da
nessuna parte. Chi digitava l'email, leggeva «hai già un account» e chiudeva la
pagina non era mai esistito.

Due viste rispondono alla domanda che nessuna tabella può:
`email_tutte` (ogni tocco, da tutte le sorgenti) e `email_contatti` (una riga
per indirizzo). Sono `security_invoker`, senza il quale scavalcherebbero la RLS
di tutto quello che c'è sotto. **Aggiungendo un form, aggiungi il suo ramo a
`email_tutte`**: una vista che non copre tutte le sorgenti risponde con
sicurezza a una domanda sbagliata, ed è peggio di una vista che non c'è.

### `utenti` è l'anagrafica, e la deduplica sta nel database

Una riga per persona, non per richiesta. Ogni tabella dei form porta una
`utente_id` che un trigger riempie da sola: `richieste_referral` ne porta due,
`utente_invitante_id` e `utente_amico_id`, perché quella riga contiene due
persone.

**La deduplica sta in Postgres e non in n8n**, ed è la scelta che regge tutto il
resto: i workflow continuano a scrivere quello che scrivevano, e aggiungere un
form vuol dire aggiungere una colonna e un trigger invece di rimettere le mani
in nove automazioni. Le righe già scritte si agganciano rieseguendo la `update`
di ripopolamento in fondo alla migrazione.

Due chiavi, in quest'ordine, e l'ordine è la regola:

1. **`pgm_member_id`**, e vince sempre. Lo dice il gestionale, non chi compila:
   due indirizzi diversi con lo stesso id sono la stessa persona, ed è il caso
   normale di chi scrive dal lavoro e poi da casa. Vince *anche* quando l'email
   punterebbe a un'altra scheda.
2. **`email_norm`**, minuscola e senza spazi, calcolata dalla colonna. È l'unica
   chiave che abbiamo per chi non è ancora su PerfectGym — cioè per ogni
   contatto nuovo, che è la ragione per cui esiste il sito.

**Il telefono non è una chiave**, ed è deliberato: al club i figli si iscrivono
col cellulare del genitore, quindi accorparli automaticamente fonderebbe tre
persone in una. Sta nella vista `utenti_da_unire`, che propone le coppie e
lascia decidere.

`trova_o_crea_utente()` **riempie i buchi e non sovrascrive**. Il primo dato che
abbiamo di una persona è quello che ha scritto lei; una riga di referral porta
il nome dell'amico come lo ha digitato un terzo, e non deve poter correggere
l'originale. L'email non si sostituisce mai: lì è l'identità, e cambiarla
staccherebbe tutto quello che è già agganciato.

`primo_contatto` e `ultimo_contatto` si scrivono con `least` e `greatest` e non
con «l'ultimo che passa», così ripopolare le righe vecchie dà lo stesso
risultato in qualunque ordine giri — che è quello che rende la migrazione
rieseguibile senza pensarci.

**Il trigger non può far fallire un form, e questa è la riga da non togliere.**
Sta in `BEFORE INSERT`, quindi se solleva, la richiesta della persona non viene
salvata: sarebbe il modo più stupido di perdere un lead. Quindi tre reti, e
ognuna copre un caso vero:

- l'`INSERT` su `utenti` è dentro un `exception when unique_violation`, perché
  due richieste della stessa persona nello stesso istante passano entrambe la
  `select` e poi una delle due sbatte sull'indice unico. Si rilegge la riga che
  ha creato l'altra;
- l'`UPDATE` lo stesso, per l'id PerfectGym che nel frattempo è finito altrove:
  si aggiorna tutto il resto e lo si lascia dov'è;
- e sopra tutto, `assegna_utente()` cattura *qualunque* errore, scrive un
  `warning` e mette `utente_id` a null. Un aggancio mancato si ricalcola, una
  richiesta perduta no.

Le viste: `utente_attivita` è la scheda di una persona in ordine di tempo,
`utenti_completi` l'elenco per la segreteria. In tutte e due, le righe con
fonte `eventi_email` sono **tocchi e non richieste** — una verifica di email non
è una conversione: `utenti_completi.richieste` le esclude, `attivita_totali` le
conta.

### Le candidature sono l'eccezione: niente tracciamento, niente anagrafica

`/lavora` raccoglie i curriculum e sostituisce il Typeform `AthlonCV`, che
faceva le stesse domande in sei schermate. Il workflow è `athlon-candidatura`:
scrive su `candidature` e manda a `valentina@athlonroma.it` l'email con i dati
e il curriculum in allegato.

**È l'unica tabella del sito che sta fuori da tutto il resto**, e non è una
dimenticanza: nessun `vid`, nessuna UTM, nessuna `utente_id`, nessun trigger
`assegna_utente`. Chi manda un curriculum non è un lead. Le altre tabelle
servono a capire da quale campagna arriva un contatto commerciale; su una
candidatura quella domanda non ha senso e la risposta sarebbe un dato personale
raccolto per niente. Sono anche dati di categoria diversa — una storia
lavorativa e un giudizio su di sé — e non devono finire nella scheda che la
segreteria apre per vendere un abbonamento. Se qualcuno aggiunge il
tracciamento al form, va tolto: la tabella non ha le colonne apposta, e il Code
node li ferma comunque.

**Il curriculum viaggia in allegato e non in una colonna.** Nella riga restano
nome, tipo e peso, come per l'allegato dell'Help Desk: il base64 in `payload`
sarebbero megabyte per riga. `cv_url` esiste già vuota, ed è il posto dove
finirà il link il giorno che il file andrà su Supabase Storage — così quel
passaggio non chiederà una migrazione.

**Le posizioni aperte stanno in `src/data/lavora.ts`**, una volta sola: le legge
l'elenco della pagina e le legge la tendina del form, e da due posti diversi
divergerebbero. L'elenco vuoto è uno stato legittimo e la pagina lo dice per
intero — la candidatura spontanea resta, ed è quella che al club serve tutto
l'anno. **Un annuncio inventato è peggio di un annuncio assente**: manda una
persona a scrivere una lettera per un posto che non esiste.

### Un nodo Supabase in bozza non scrive niente

Questa istanza n8n ha bozze e versioni pubblicate, e **`update_workflow` non
pubblica**: crea una versione e la lascia lì. Le esecuzioni manuali girano la
bozza, il webhook di produzione gira la versione attiva — quindi si può provare
un nodo, vederlo scrivere la riga, ed essere convinti che sia vivo mentre non lo
è. Dopo ogni modifica va chiamato `publish_workflow`, e il controllo è
`versionId == activeVersionId` in `get_workflow_details`.

Non è teoria: `richieste_prova` era vuota da giorni perché il nodo
«Supabase RICHIESTE PROVA» esisteva **solo in bozza**. Il workflow sembrava a
posto guardandolo, e la tabella restava a zero.

Attenzione a cosa ci si porta dietro quando si pubblica: le versioni sono
istantanee, non diff, quindi pubblicare la propria modifica pubblica anche le
bozze di chi è passato prima. Prima di farlo, confronta `activeVersion.nodes`
con `nodes`. Un diff che tocca *tutti* i nodi di solito non è una modifica vera
ma l'editor che ha tolto i valori uguali al default (`action: hash`,
`encoding: hex`, `type: SHA256` sul nodo Crypto sono tutti default): verificalo
con `get_node_types` invece di indovinare, perché il caso in cui non lo fossero
— un hash che cambia — romperebbe l'abbinamento delle conversioni Meta senza
dare errore.

### Il nodo che scrive non deve poter fermare il form

Ogni nodo Supabase aggiunto porta `onError: continueRegularOutput`, e sta fuori
dal percorso della risposta al browser. Vale la regola dei form: perdere una
riga è brutto, impedire a una persona di chiedere una prova è peggio.

Una trappola sola, e morde in silenzio: **il nodo Supabase restituisce la riga
inserita, non l'item che ha ricevuto.** Da lì in poi `$json` ha i nomi delle
colonne (`member_id`, `stato_pgm`) e non quelli del form (`memberId`,
`statoPgm`), quindi ogni espressione a valle legge `undefined` — e con
`typeValidation: loose` un `IF` non dà errore, prende semplicemente il ramo
sbagliato. Se l'inserimento sta *in mezzo* alla catena serve un Code node che
rimetta i dati buoni (`Ripristina Dati` in `CHAT ATHLON — DATI` è l'esempio);
altrimenti si mette il nodo su un ramo parallelo e si legge `$('Nodo').item`.

## Le pagine senza intestazione azzerano `--header-h`

`global.css` tiene le ancore sotto l'header appiccicoso con
`scroll-padding-top: calc(var(--header-h, 73px) + 1rem)`, e `--header-h` la
pubblica il `ResizeObserver` dentro `Header.astro`. Sulle pagine con
`chrome={false}` — `/club-life`, le schede dell'Help Desk, `/attiva`, `/promo` —
quel componente non c'è, quindi nessuno la scrive e il ripiego di 73px diventa
89px di vuoto sopra ogni ancora di una pagina che in cima non ha niente.
`Layout.astro` mette `data-senza-intestazione` sull'`<html>` e `global.css` ci
azzera la variabile.

**Un attributo e non uno `<style is:inline>`**, e la ragione è una trappola che
vale in generale: `is:inline` passa il contenuto **alla lettera**, espressioni
comprese. `<style is:inline>{`:root{--header-h:0px}`}</style>` finisce in pagina
con i backtick e le graffe come testo, e `{'{'}` pure. Dentro un `is:inline` non
si scrivono espressioni Astro.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## I contenuti si scrivono da Tina, e il build lo sa

News, eventi, schede dell'Help Desk, servizi e la landing della promo sono
markdown in `src/content/`; il planning è il JSON in `src/data/`. Chi li scrive
non apre GitHub: apre `/admin`, che è il pannello di
[TinaCMS](https://tina.io). Tina è git-backed — salva scrivendo sul repository
— quindi il contenuto resta versionato e il sito resta statico: nessun database
da interrogare a ogni visita.

Lo schema del pannello sta in `tina/config.ts` e **deve seguire** quello delle
collezioni in `src/content.config.ts`. Sono due file perché fanno due cose
diverse — uno valida al build, l'altro disegna i campi da riempire — ma una
divergenza si paga due volte: un campo che Tina scrive e Zod rifiuta rompe il
build, e un campo che Zod pretende e Tina non mostra è un campo che nessuno
compilerà mai. Quando aggiungi un campo a una collezione, aggiungilo in tutti e
due.

- **Le attività** non si elencano a mano da nessuna delle due parti: escono da
  `ACTIVITY_TAGS` in `src/data/activities.ts`, che popola la tendina di Tina, la
  validazione e il primo passo del box dell'Help Desk. Aggiungerne una lì la fa
  comparire nei tre posti.
- **I prezzi non entrano nel CMS.** Vivono in `src/data/abbonamenti.ts` e le
  pagine li leggono da lì: metterli anche in un documento di Tina vorrebbe dire
  poterli cambiare in un posto solo dei due, e scoprirlo dal listino sbagliato
  in vetrina. Vale per gli abbonamenti, per gli accessi singoli e per il
  personal training.
- **La cartella decide l'indirizzo.** `src/content/articles/<area>/<file>.md`
  diventa `/wikiathlon/<area>/<file>`, `src/content/news/<file>.md` diventa
  `/news/<file>`. Spostare un articolo di cartella o rinominarlo ne cambia il
  link: se era pubblicato, serve un reindirizzo in `astro.config.mjs`.
- **Il planning è l'unica collezione che non è un contenuto**, ed è quella da
  cui si muove più sito: è `src/data/planning-corrente.json`, un documento solo
  — non si crea e non si cancella — che tutte le pagine con orari leggono
  attraverso `data/planning.ts`. Spostare una lezione cambia insieme
  `/planning`, `/corsi-fitness`, le quindici pagine dei corsi e quelle delle
  attività in acqua; e i numeri che il sito stampa («N lezioni a settimana»,
  «più di N ore», i `{n}` e `{ore}` dentro i testi delle fasce) sono contati dal
  palinsesto, non scritti. Misurato: sposta l'Antigravity e cambiano `/planning`,
  `/antigravity` e `/corsi-fitness`, mentre `/nuoto-libero` resta identico.

  Tre chiavi tengono in piedi quelle connessioni, e vanno trattate come tali.
  L'**`id` della fascia** è il nome con cui una pagina la chiede (`getBand`):
  cambiarlo fa fallire il build, ed è voluto. Il **nome della lezione** è come
  la pagina del corso trova i suoi orari — `corso.lezioni` in `data/corsi.ts` e
  l'elenco in `corsi-fitness.astro` — e rinominarlo non rompe niente ma svuota
  quella tabella: `LessonSchedule` scrive «questo mese non è in palinsesto»,
  che è il modo giusto di sbagliare ma resta uno sbaglio. La **sala** è la
  chiave del colore in legenda, e per quella non c'è da fidarsi di chi scrive:
  in Tina è una tendina, e le sue voci escono da `SALE` in `src/data/sale.ts`,
  la stessa lista che ordina le legende e che `planning.ts` controlla al build
  abbia un colore per ogni voce, in chiaro e in scuro.

**Il pannello non può mai fermare il sito.** `tinacms build` compila
`public/admin` e va prima di Astro, che copia `public/` nel `dist`. Ma quel
comando parla con TinaCloud, e TinaCloud conosce un ramo solo: quello che
indicizza. Su un deploy di anteprima si ferma in partenza — *Branch
'claude/...' is not on TinaCloud* — e prima che `scripts/build.mjs` prendesse
questa forma si fermava con lui tutto il deploy, sito compreso. Quindi:

- **il pannello si costruisce solo per la produzione** (`VERCEL_ENV`), e non è
  una rinuncia: quello di un'anteprima punterebbe a un ramo che TinaCloud non
  ha, e si aprirebbe su un errore;
- **se non compila, il sito si pubblica senza.** Token scaduto, lock fuori
  sincrono, TinaCloud giù: si scrive perché a schermo, si butta l'eventuale
  build a metà — mai spedire un `public/admin` incompleto — e si va avanti con
  Astro. Un CMS che non compila è un pannello da sistemare; un deploy bloccato
  è un sito che non si aggiorna più.

Il che vuol dire che `/admin` mancante non rompe niente e non si nota: **quando
si toccano lo schema o le credenziali, il log del deploy di produzione è la
verifica**, non il fatto che il sito sia salito.

Il **client id** invece sta in chiaro in `tina/config.ts`: è pubblico per
costruzione — finisce dentro il bundle di `/admin`, che gira nel browser di chi
scrive — quindi metterlo in una variabile darebbe l'illusione di un segreto
senza nasconderlo a nessuno, e costerebbe un deploy rotto ogni volta che
qualcuno dimentica di impostarla. Il **token** è un segreto vero, legge il
repository, e sta solo fra le variabili d'ambiente.

Per provare il pannello in locale non servono credenziali: `npm run dev:cms`
alza il server GraphQL di Tina attorno ad `astro dev` e le modifiche finiscono
nei file, non su un servizio. Per validare lo schema contro i contenuti senza
pubblicare niente:

```
npx tinacms build --local --skip-cloud-checks --skip-search-index
```

`public/admin/` e `tina/__generated__/` sono generati e stanno in `.gitignore`.

**`tina/tina-lock.json` invece si committa**, ed è l'unica eccezione: è il file
con cui TinaCloud indicizza il contenuto del repository, e senza di lui il
pannello si apre su un archivio vuoto. Un lock che descrive uno schema diverso
da quello vero è un pannello che mostra campi che non esistono — e, dal
momento in cui il build di produzione compila il pannello, è **`/admin` che non
c'è**: `tinacms build` confronta lo schema locale col remoto e si ferma con
*«The local Tina schema doesn't match the remote Tina schema»*.

**Non basta guardare `tina/`, e questo è il punto che è costato.** Lo schema del
pannello non sta tutto in `tina/config.ts`: le tendine le popolano i dati —
`SALE` per la sala di una lezione, `ACTIVITY_TAGS` per l'attività. Quindi
rinominare una sala in `src/data/sale.ts` **cambia lo schema di Tina** da un
commit che non tocca `tina/` nemmeno di striscio. È esattamente come si è rotto:
`Vasca Media` → `Vasca Piccola` nel commit della vasca piccola, lock non
rigenerato, pannello giù per due giorni senza che nessuna pagina pubblica se ne
accorgesse. Il `git log -- tina/` non lo trova: **cerca chi tocca i dati che
alimentano lo schema**.

E un reindex da TinaCloud non lo sistema: quello reindicizza i *contenuti*, e lo
schema remoto lo aggiorna un `tinacms build` autenticato — cioè proprio quello
che si è fermato. Va rotto dal lato del repository.

Rigenerarlo **non richiede credenziali né rete**, benché la strada ovvia sia
`tinacms dev`. Il lock è la composizione di tre file che il build locale scrive
già in `tina/__generated__/`:

```
npx tinacms build --local --skip-cloud-checks --skip-search-index
python3 -c "import json;print(json.dumps({k:json.load(open(f'tina/__generated__/_{k}.json',encoding='utf-8')) for k in ('schema','lookup','graphql')},separators=(',',':'),ensure_ascii=False),end='')" > tina/tina-lock.json
```

Le tre chiavi in quell'ordine, minificato, senza newline finale e senza
`\uXXXX`: è la forma esatta del file, e il diff che ne esce va letto — se
contiene più della modifica che stavi facendo, la ricostruzione non è fedele e
il lock non si committa.

La verifica è **il log del deploy di produzione**, non il fatto che il sito sia
salito: il sito sale comunque, per costruzione.
