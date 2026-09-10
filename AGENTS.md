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

Su `/abbonamenti` i pulsanti d'iscrizione portavano diritti dentro
PerfectGym — e su `/promo` pure, finché quella pagina non è passata al codice
promozionale: là il gate è stato tolto, e il perché sta nella sezione «Dove c'è
un codice, la destinazione è generica». Il guaio era in fondo al percorso: chi ha già un account — di solito
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

## Prima del listino si lascia l'email, e la pagina resta pubblica lo stesso

I comandi che portano agli abbonamenti erano venticinque `href` sparsi in dodici
file, e chi li premeva arrivava sul listino senza lasciare traccia: l'interesse
esisteva e non lo sapeva nessuno. Ora `InfoAbbonamentiModal` chiede
l'indirizzo, lo verifica su PerfectGym e poi apre `/abbonamenti`.

**Sono due decisioni diverse, e vanno tenute distinte.** Da un **comando** del
sito l'email è obbligatoria: è il momento in cui l'interesse è vivo, ed è
l'unico modo di sapere che è esistito. La **pagina** non è protetta da niente —
`/abbonamenti` è pubblica e indicizzata — perché un listino dietro un modulo è
un listino che Google e gli LLM non leggono. Chi conosce l'indirizzo, arriva da
un motore o apre in una scheda nuova lo scavalca, e va bene: il gate misura il
percorso interno, non chiude una porta. Il ripiego senza JavaScript è l'`href`,
che è il listino.

**L'aggancio è `data-cta="buy"` più `data-cta-intent="membership"`, e i due
insieme non sono ridondanza.** Su `/personal-training` `data-cta="buy"` sta
anche su «Prenota una seduta» e «Aggiungi al tuo abbonamento»: agganciare il
solo `buy` avrebbe chiesto l'email per prenotare un allenamento. È la stessa
trappola già scritta per `IscrizioneModal`, che infatti usa `data-iscrizione`.

**La forma del link non decide niente, la destinazione sì.** Per un pezzo i
link dentro il testo che scorre erano esentati — «sono testo, non comandi», la
regola della spazzata del totem — e l'esenzione era un errore per una ragione
che la spazzata non riguarda: là si misura *cosa si preme col dito*, qui si
misura *chi sta andando al listino*, e una persona che clicca «guarda quali
comprende il tuo abbonamento» in fondo alla pagina di un corso ci sta andando
esattamente come chi preme «Vedi gli abbonamenti» due sezioni sopra. Le due
frasi erano sette comandi che non lasciavano traccia — le tre «fanno parte dello
stesso club» delle pagine attività (`[corso]`, `gym-floor`, `reformer`), la nota
di `/personal-training`, la f.a.q. dell'accesso singolo in sala, l'invito di
`/prova` e la striscia legale di `/attiva` — cioè un pezzo di percorso interno
che nel `richieste_info_abbonamenti` non compariva.

**Ognuno porta un `data-cta-source` suo**, e questa è la parte che rende la
modifica utile invece che soltanto coerente: su `/gym-floor` il comando della
hero era già `gym-floor`, quindi dare lo stesso valore alla frase in fondo e
alla f.a.q. le renderebbe indistinguibili nella colonna che dice da dove è
partito l'interesse — `gym-floor-correlati` e `gym-floor-faq` sono due posti
diversi della stessa pagina, e quale dei due converta è la domanda per cui
quella colonna esiste. Il `data-cta-activity` invece è quello della pagina, che
è la stessa attività.

**Cosa non passa dal gate**, e sono due categorie:

- **i comandi dentro i pannelli che l'email l'hanno appena chiesta** — il modal
  della prova, il referral, la chat. Sono `#accessi-singoli`, `#guest-pass` **e
  `#piani`**, che quei pannelli offrono a chi si è appena sentito dire di no:
  metterci davanti un gate vorrebbe dire chiedere l'email a chi l'ha data due
  secondi prima. Ed è tutti e tre e non i due con l'ancora più stretta — un
  cancello che chiude `#accessi-singoli` e lascia `#piani` nella stessa
  schermata non è un cancello, è la falla già scritta per il Guest Pass;
- **la pagina degli abbonamenti stessa.** La pastiglia dell'header e la voce
  del footer stanno anche lì, e aprire un pannello per portare qualcuno dov'è
  già è un passo per niente: il client confronta il percorso e si astiene.

E una terza, che è di un'altra natura e per questo va scritta invece che
dedotta: **la riga `fonte` in fondo a una survey**. `/surveys/generale/` rimanda
a `/abbonamenti` con «Cosa comprende ogni abbonamento», e quel link esiste per
una ragione precisa — chi ha dato due stelle a «il tuo abbonamento comprende
quello che pensavi comprendesse» deve poter vedere cosa avevamo dichiarato. È
una **citazione dentro un modulo di feedback**, accanto al link della privacy, e
chi la preme ha già un abbonamento: mettergli davanti una raccolta di contatto
mentre sta rispondendo a un questionario è il modo di far leggere «ci interessa
il tuo giudizio» e sentire il contrario. Il gate raccoglie chi sta comprando,
non chi sta dando un parere.

**E `/promo` è il caso da leggere con attenzione, perché è mezzo dentro e mezzo
fuori.** I comandi dell'offerta non passano da nessun gate — sono la seconda
metà di un gesto che comincia col codice negli appunti, e il perché sta nella
sezione «Dove c'è un codice, la destinazione è generica» — ma il link del conto
alla rovescia **scaduto** sì: compare quando quel codice non vale più, e a quel
punto il listino non è un passaggio del gesto, è l'unica strada che resta.

### I dati non si chiedono a chi li abbiamo, e il timeout salta il passo

Nome, cognome e cellulare compaiono solo quando `servonoISuoiDati()` è vera —
la stessa funzione del totem e della chat, in `data/contatto.ts`. Non sono una
domanda: sono la **composizione** del `personalData` della chiamata che crea
l'anagrafica. Se l'anagrafica c'è, quella chiamata non parte, e chiedere quei
campi vorrebbe dire far ricopiare a una persona quello che il club ha già
scritto.

E se la verifica non risponde — sei secondi, poi si passa — **il secondo passo
si salta**: non sappiamo se quell'anagrafica esista, quindi non si crea nessun
lead e non si chiede niente. Un attrito in più a chi ha appena subito un
timeout è il modo più rapido di perdere insieme il contatto e la visita.

### L'esito viaggia nella sessione, e per questo non aspetta il consenso

`data/infoAbbonamenti.ts` mette in `sessionStorage` quello che la verifica ha
detto, e `iscrizione.client.js` lo legge: chi ha appena scritto la sua email
non se la vede richiedere due schermate dopo, e la verifica non si rifà.

**Nella sessione e non nello storage**, ed è la ragione per cui non passa da
`quandoConsentito`: è lo stato del servizio che la persona ha chiesto — ha
digitato quell'indirizzo *per fare questo percorso* — dura la visita e non
profila. È la stessa categoria della sessione della chat e del passo dell'Help
Desk. Il ricordo fra una visita e l'altra è un'altra cosa e ha un'altra regola:
lo fa `emailNota.ts`, sotto consenso **funzionale**. I due convivono, e chi
rifiuta i funzionali non perde niente dentro la sua visita.

**Sul totem non si ricorda niente**, e `ricorda()` esce subito su `suTotem()`:
là il dispositivo è condiviso davvero, e l'indirizzo di chi è passato prima non
deve vederlo chi arriva dopo. Il prezzo è che al desk la stessa persona si vede
richiedere l'email sul listino, ed è il verso giusto in cui sbagliare.

### `INFO ABBONAMENTI - SUPABASE`, e la qualifica che non è «ha un account»

Il webhook `athlon-info-abbonamenti` scrive su `richieste_info_abbonamenti`
**prima di ogni altra cosa**: i nodi a valle hanno `continueRegularOutput`,
quindi falliscono in silenzio, e nell'ordine inverso un timeout di PerfectGym
sarebbe un'opportunità perduta che non vede nessuno.

**La qualifica la decide `statoNucleo`, non `memberType`.** Un Lead o un Guest
hanno un'anagrafica e nessun abbonamento vivo: sono esattamente le opportunità
da chiamare. Il flusso vecchio decideva su «PerfectGym lo conosce» e li
metteva fra i clienti. Le quattro voci sono un `check` in tabella perché sono
una decisione chiusa:

| qualifica | cosa succede |
| --- | --- |
| `nuovo` | lead + privacy + nota su PerfectGym, **e l'email di riepilogo** |
| `noto_senza_abbonamento` | la nota sulla scheda, e basta |
| `iscritto` | niente: la riga resta, ed è un segnale di upsell |
| `sconosciuta` | niente — la verifica non ha risposto, e quando non sappiamo non si crea e non si scrive |

**L'email parte solo a chi su PerfectGym non c'è**, cioè la prima volta che il
club gli scrive.

**Un lead non creato lascia scritto perché.** Visto sul traffico vero: il sito
diceva `nuovo` e PerfectGym ha risposto `499 EmailDuplication`, perché la
verifica era di qualche minuto prima. Il flusso prosegue — la riga si scrive,
l'email parte — ma senza `motivo_scarto` da fuori non si distingue un lead mai
tentato da uno rifiutato. Vale la regola del referral: gli scarti si registrano
come i successi.

### L'email di riepilogo: nessun prezzo, e due dati scritti a mano

Niente cifre, mai: una cifra dentro un template è una cifra che il giorno del
ritocco al listino resta indietro in un posto che nessuno rilegge, e un prezzo
sbagliato in un'email è un prezzo che la persona ha in mano alla cassa. I costi
li stampa `/abbonamenti`, che l'email linka.

Il perimetro dei piani si copia **voce per voce** e non si riassume in una
categoria: lo Smart in acqua ha il solo Nuoto Libero Assistito, e «tutta
l'acqua» è la sintesi che manda una persona a comprare il piano sbagliato.

**Due dati sono ricopiati e vanno tenuti in pari con `CLUB`:** l'indirizzo —
Via Ugo Ojetti 134, 00137 Roma — e il logo, che è
`/wp-content/uploads/2025/08/Logo-oriz-full-2.png`. n8n non può importare
`data/club.ts`, quindi è una duplicazione dichiarata. Sono costati due errori
veri in una stessa email: un indirizzo **inventato** — e un dato inventato è
peggio di un dato assente, in un'email doppiamente — e un logo che dava 404
perché il percorso era stato preso dalla nota su un altro workflow.

**Il link della chiamata è `/prenota-chiamata/`**, che è una pagina vera e
ferma (`chrome={false}`, `noindex`): un link dentro un'email vuole un
indirizzo, non un parametro che apre un pannello sopra un'altra pagina.

E `AppuntamentoModal` impara `?athlon-appuntamento=1`, lo stesso patto della
chat con `?athlon-chat=1`: apre il calendario **sopra** la pagina che si stava
guardando, e serve per il caso opposto — quando quella pagina conta ancora, il
listino per primo.

### Dove vivono le due viste, e perché la migrazione è in due repository

`richieste_info_abbonamenti` e il ramo in `email_tutte` stanno qui. Il ramo in
**`utente_attivita` sta in APP-ATHLON**, perché quella vista è definita là e
porta tre rami dello storico Airtable che questo repository non conosce:
ridichiararla qui la farebbe tornare indietro. La migrazione del pannello va
eseguita **dopo** quella del sito, o il `create or replace` non trova la
tabella.

Attenzione a una cosa scoperta scrivendola: **la vista in produzione era più
avanti di tutti e due i file**. Aveva `utm_source` e `pagina` in più, aggiunte
dalla dashboard e mai riportate in una migrazione — il caso che la sezione su
Supabase descrive. Quando si tocca una vista, la definizione si prende da
`pg_get_viewdef` sul database vivo, non dal file: il file può essere vecchio.

Per verificare: sul `dist`, ogni pagina ha il pannello, e la spazzata è **su
tutti gli `href` verso `/abbonamenti`** e non sui soli pulsanti — è l'unica
forma che trova un link nuovo dentro un paragrafo. Ognuno deve portare tutti e
due gli attributi tranne le eccezioni dichiarate qui sopra, che sono le sole
tollerate: i comandi dei tre pannelli (`#accessi-singoli`, `#guest-pass`,
`#piani`), la f.a.q. di `/prova` che rimanda agli accessi singoli, la riga
`fonte` della survey, e i comandi dell'offerta di `/promo`. L'ultima passata:
282 `href` verso il listino, 183 col gate e 99 senza, e i 99 sono esattamente
quelle eccezioni — 90 dei pannelli della prova ripetuti su ogni pagina col
`chrome`, 6 del referral, il ripiego del Guest Pass di `/link`, la f.a.q. di
`/prova`, la `fonte` della survey. E i tre pulsanti di `/personal-training` con
`data-cta="buy"` continuano a non portare il secondo, mentre la nota «non hai
ancora un abbonamento?» della stessa pagina sì: è il solo comando di lì che
porta al listino. In un
browser: il pannello si apre dal comando senza navigare, il campo del prefisso
è vestito come gli altri (si misurano gli stili calcolati, non si guarda), il
numero esce in E.164, il payload porta `keepalive`, e sul listino il pulsante
«Iscriviti» non rifà la verifica — l'unica chiamata di rete deve essere quella
di Google Analytics.

**E i comandi dentro il testo si provano uno per uno, perché due di loro non
sono a schermo.** Con la verifica intercettata: dalle sette frasi il pannello
si apre al passo dell'email, con `body.amodal-locked` e `visibility: visible`,
e `location.pathname` **non** cambia; un `ctrl+click` sulla stessa frase non
apre niente e segue l'`href`. La f.a.q. dell'accesso singolo in sala vuole
prima l'apertura del suo accordion — che non è un `<details>` ma un pannello
governato da `[data-faq-trigger]`, quindi mettere `open` a mano non fa niente e
il click finisce sul bottone che lo copre — e il link del conto alla rovescia
di `/promo` vuole che gli si tolga `hidden`, perché la scadenza vera non è
passata. Poi il percorso intero da una di quelle frasi: email, verifica che non
risponde, e si arriva su `/abbonamenti/` lo stesso, con
`athlon_gate_abbonamenti` nella sessione — è la regola «chi passa, passa
sempre», e valeva la pena riprovarla da qui. Sul totem `sessionStorage` resta vuoto. Su Supabase,
`info_abbonamenti_esiti` dice per mese quante opportunità calde sono arrivate.

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

## L'indirizzo canonico finisce con lo slash, e vale per tutti e tre i posti

Astro genera `planning/index.html`, quindi la pagina *è* `/planning/`: da lì il
`<link rel="canonical">` di `Layout.astro` e la sitemap dichiarano la forma con
lo slash, ed è la forma che Google ha indicizzato. La convenzione è quella, e i
tre posti che la devono dire sono il canonical, la sitemap e i **link interni**.

Prima ne parlavano due su tre: i 5768 href del sito erano scritti senza slash e
`/planning` rispondeva **200** come `/planning/`, cioè lo stesso contenuto a due
indirizzi. Non era un disastro — il canonical li univa — ma era una duplicazione
gratuita e la si chiude in due mosse:

- **`"trailingSlash": true` in `vercel.json`.** Vercel manda al 308 chi arriva
  senza slash, esentando gli indirizzi con un'estensione, e conserva la query —
  quindi le UTM sopravvivono. È un 308 e non un 301 perché la normalizzazione di
  Vercel è quella: per Google i due sono la stessa cosa, e in cambio non c'è una
  regola scritta a mano che possa entrare in ciclo con se stessa.
- **`scripts/link-canonici.mjs`**, che allo `astro:build:done` porta gli href
  dell'HTML già generato alla forma canonica. Sta lì e non nei 41 file che li
  scrivono perché una parte degli indirizzi non è scritta ma costruita — da uno
  slug, dal markdown, dai dati — e perché una regola sola si verifica in blocco:
  dopo il build, **ogni href interno finisce con `/` e il suo bersaglio esiste**.
  Non tocca i percorsi con un punto nell'ultimo pezzo (sono file), gli esterni,
  le ancore pure, e lascia query e frammento dove stavano.

**La direzione non si inverte a cuor leggero.** Passare alla forma senza slash
vorrebbe dire cambiare 43 canonical e 43 righe di sitemap, cioè cambiare gli
indirizzi che Google ha già in indice: si fa solo con una ragione, non per
gusto, e non durante il consolidamento di una migrazione.

### E le sorgenti dei redirect legacy devono accettare tutte e due le forme

Questa riga è costata una migrazione a metà. Le 105 regole importate da
WordPress avevano la sorgente **senza** slash — `/lead`, `/portale`,
`/contatti` — e Vercel confronta la sorgente in modo stretto: `/lead` scattava,
`/lead/` **no**, e finiva in 404. Ma WordPress serviva gli indirizzi *con* lo
slash, quindi la forma che sta nei link vecchi e nell'indice di Google era
proprio quella che non scattava. Misurato: `/lead/` (267 041 visite storiche) e
`/portale/` rispondevano 404 mentre `/lead` e `/portale` reindirizzavano.

Quindi ogni sorgente si scrive `/lead{/}?`, che è la sintassi di path-to-regexp
per «con o senza lo slash finale» e non cattura niente in più — verificato con
lo stesso matcher che usa Vercel, e verificato che non prenda i sottopercorsi
(`/lead/x` resta 404, come deve).

E **le destinazioni interne portano lo slash**, se no il 301 atterra su un
indirizzo che il 308 sposta ancora: due salti dove ne basta uno.

Per verificare, senza aspettare il deploy: `scripts/` non ha un simulatore
committato, ma la prova è quella — si prendono le 105 sorgenti nelle due forme
più le 43 pagine della sitemap nelle due forme, si applicano le regole in ordine
con path-to-regexp in `strict`, e ognuna delle 295 deve chiudersi in **al massimo
un salto** su un 200 o su un indirizzo esterno. Nessun ciclo, nessuna catena.

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
2. **La cifra sola ripetuta.** `3333333333` non è il numero di nessuno.
3. **Le sequenze.** Otto cifre consecutive in salita o in discesa.

**Le soglie si sono mosse tre volte, sempre allargandosi, e sempre perché
avevano preso un numero vero.** Le sequenze chiedevano sei cifre e rifiutavano
`+44 7911 123456`, che è britannico di forma perfetta; a sette rifiutavano
`339 123 4567`, dove 339 è un prefisso Vodafone e il resto è sfortuna. La
varietà chiedeva quattro cifre diverse, che è ragionevole su un numero medio e
sbagliato su quelli belli: `340 111 1111` ne ha tre e `331 111 1111` ne ha due,
e sono numeri che gli operatori assegnano davvero — anzi, li fanno pagare.

Il verso giusto in cui sbagliare è sempre lo stesso, e vale per tutte e tre: un
numero finto che passa lo si scopre al primo messaggio non consegnato, una
persona vera che non riesce a lasciare il suo numero non torna. **Quindi la
domanda da farsi toccando una di queste soglie non è «quanti numeri finti
prende» ma «quanti numeri veri rifiuta»**, e si risponde con una spazzata:
trecentomila `3` più nove cifre a caso, cioè tutto lo spazio dei cellulari
italiani a dieci cifre, e ne devono passare trecentomila.

E i due messaggi dicono due cose diverse perché sono due errori diversi. Quello
sul fisso prima non lo leggeva nessuno: cercava lo zero iniziale su un numero da
cui `componiTelefono` lo aveva appena tolto, quindi a chi scriveva `06 8100…`
rispondeva «comincia per 3», che è vero e non spiega niente.

Fuori dall'Italia si controllano solo lunghezza, cifra unica e sequenze: le
regole nazionali sono duecento e cambiano, e un falso negativo costa più di un
numero sbagliato.

#### Il prefisso ripetuto si scarta solo se scartarlo è l'unica lettura possibile

`3931623468` è un cellulare Wind Tre di dieci cifre, e il form lo rifiutava
dicendo alla persona che il **suo** numero comincia per 3 e ha dieci cifre —
cosa che era vera e che il numero faceva. A mangiarselo era la gentilezza di
`componiTelefono`: chi digita `+39` dentro un campo che ha già `+39` nella
tendina non deve ritrovarsi `+39+39…`, quindi se le cifre cominciano col
prefisso scelto quello si scarta. Solo che qui quelle due cifre **erano il
numero**: restava `31623468`, otto cifre, rifiutato.

Misurato sulla spazzata: **il 10% dello spazio dei cellulari italiani veniva
rifiutato**, cioè un numero su dieci di tutti quelli che cominciano per 3 —
tutta la serie `39x`, che è Wind Tre. Ed è un guasto che dal traffico non si
vede, perché chi non riesce a lasciare il numero non lascia niente: si è visto
solo perché una persona ha mandato lo screenshot.

Adesso il prefisso ripetuto si scarta solo quando **tenerlo non sta in piedi**:
`393931623468` non è un cellulare italiano e allora quelle prime due cifre sono
davvero il prefisso, `3931623468` lo è e allora sono il numero. La decisione va
sull'ipotesi più forte, non sulla prima che capita.

Due cose da sapere prima di toccarla. **Fuori dall'Italia si scarta come si è
sempre fatto**, perché senza la forma del numero nazionale non c'è niente da
confrontare — e il caso morde qui perché i cellulari `39x` esistono, mentre dove
il numero nazionale non può cominciare col codice del paese (il Regno Unito
comincia per 7, la Germania per 15/16/17) l'ambiguità non c'è. E **la disfatta
serve ancora**, quindi non si toglie: `precompila()` di quattro form mette nel
campo il numero come lo restituisce PerfectGym, che è già `+39340…`.

La lezione generale: **una normalizzazione che indovina va condizionata a ciò
che rende plausibile, non applicata perché la forma combacia.** Una regola che
ripulisce l'input è una regola che può cancellare un dato vero, e lo fa in
silenzio.

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

**I dati del bambino si chiedono sempre, anche a un genitore che il portale
conosce già.** Prima no: chi aveva un account (Member o Guest) saltava il passo
del bambino e finiva dritto sulla schermata «accedi e prenota». Il payload
partiva senza `bambino`, quindi su n8n `haBambino` era falso e `stradaPgm`
cadeva su `nessuna` — cioè la strada `figlio`, che esiste apposta per questo
caso, non si attivava **mai** da questo form. Il genitore leggeva di andare a
prenotare e nel portale non trovava nessun bambino: il nucleo era rimasto a
metà, e non lo segnalava niente.

La ragione è quella già scritta per il totem: di un genitore PerfectGym ci ha
detto tutto, **del bambino non ci ha mai detto niente**, nemmeno per il socio
più vecchio del club. Un corso per bambini vuole due anagrafiche legate e la
seconda non ce l'ha nessuno. Quello che resta saltato è il passo del
*genitore* — nome, cognome e cellulare li abbiamo — e il legame lo fa
`Vaglio Figlio` leggendo `memberId`, con il suo controllo sul doppione.

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

### Tutto si prenota, e in sala l'assistenza c'è

A «quali attività si devono prenotare?» l'assistente ha risposto con due
elenchi — *si prenota* / *non si prenota* — mettendo la **Gym Floor** nel
secondo: *«entri quando vuoi, senza prenotazione»*, e poi *«se scegli lo Smart,
la sala pesi è libera quando vuoi»*. Sono due cose false in una frase: la
sessione in sala si prenota come una lezione, e prenotandola si sceglie la
fascia — **Con Assistenza**, con un assistente di sala presente, o
**Allenamento Libero**.

**La pagina `/gym-floor` lo diceva già giusto; a sbagliare erano i dati che
finiscono nel `kb.json`**, ed è lì che è stato corretto:

- `activityInfo['Gym Floor']` diceva solo com'è fatta la sala. Ora dice anche
  che la sessione si prenota e cosa si sceglie prenotandola.
- Il piano **Smart** portava `badge: 'Autonomia'` e `claim: 'Allenati in
  autonomia'` — la riga da cui la chat ha dedotto che in sala si sta da soli.
  Quello che lo Smart lascia fuori è il **palinsesto dei corsi**, non
  l'assistenza: badge e claim ora dicono quello.
- «Sala pesi **ad accesso libero**» spariva in tre punti (`club:anagrafica`,
  `club:orari`, `llms.txt`): quel nome descriveva le ore di apertura e si
  leggeva come «si entra senza prenotare».

**La prenotazione si racconta per quello che dà**, non come un adempimento: ti
garantisce il posto, e in sala ti dice **quando il trainer c'è**. È il motivo
per cui esiste, ed è la risposta alla domanda che le persone fanno davvero.

**E l'obiezione si risvolta, non si difende.** «Da voi si deve prenotare tutto»
non si chiude con «è obbligatoria»: la prenotazione fa tre cose, e sono tutte di
chi prenota — il posto è suo e vede **quante persone ci sono** in quell'orario;
**se qualcosa cambia lo sa prima** (un trainer o un istruttore sostituito, una
lezione che cambia orario o tipo: prenotando sappiamo chi avvisare); e in sala
sceglie se allenarsi col trainer o per conto suo. È lo scopo vero della
prenotazione — tenere aggiornati il club e chi si allena, da tutte e due le
parti — e sta scritto in tre posti: la f.a.q. di `/gym-floor`, la scheda
`adulti/gym-floor` e la sezione «Perché si prenota» di `generali/prenotazioni`.

**E a «c'è assistenza in sala?» la risposta è sempre sì.** Non «puoi allenarti
in autonomia»: l'assistente c'è, e quello che si sceglie prenotando è l'orario
in cui c'è. La regola fissa nel `systemMessage` lo dice, insieme al divieto di
costruire l'elenco «cosa non si prenota», che non ha nessuna voce.

#### L'assistente di sala supervisiona, il personal trainer segue una persona

Questa distinzione è costata una riscrittura, perché la prima stesura prometteva
la seconda cosa col nome della prima: «un trainer che ti segue negli esercizi e
ti controlla mentre lavori» è il personal training, che si prenota e **si paga a
parte**. Chi legge quella frase in chat o sul sito arriva in sala aspettandosi
qualcuno accanto a sé, e quel qualcuno sta seguendo l'intera sala.

- **Con Assistenza** vuol dire che in sala c'è un **assistente di sala**, il cui
  ruolo è **supervisionare tutte le attività di sala**: gli si chiede un
  suggerimento, un dubbio su un esercizio, e aiuta a scegliere fra i **trenta
  piani di allenamento già presenti in app**. È incluso nell'abbonamento.
- **Allenamento Libero** è la stessa sala senza l'assistente.
- **L'assistenza individuale e personalizzata è il personal training**, una o
  più sedute che si prenotano e si acquistano.

**E la seconda fascia si dice per quello che non ha, non per quello che fai.**
La prima stesura della regola fissa chiudeva con «l'assistente c'è, e quello che
si sceglie prenotando è l'orario in cui c'è» — vera come sintesi, e letale come
istruzione: il modello ne ha dedotto *«l'assistente c'è in entrambi i casi —
cambia solo l'orario in cui lo scegli prenotando»*, che è l'opposto. Fra le due
fasce cambia **la presenza dell'assistente**, non l'orario, e la regola adesso
vieta per nome «in entrambi i casi», «c'è comunque» e «cambia solo l'orario».
Vale in generale: *una regola che riassume due casi in una frase sola è una
frase da cui si ricompone il caso che non esiste* — è lo stesso difetto delle
due sospensioni e dei due orari.

**E le due fasce si spiegano solo se le chiedono.** A «quanto costa un ingresso
singolo in pesi?» la chat ha risposto col prezzo giusto e poi con due capoversi
su Con Assistenza e Allenamento Libero, che nessuno aveva chiesto. Una domanda
di prezzo vuole l'importo, la durata e il badge: è la regola 7ter — se non
l'ha chiesto, per lui non esiste — e il fatto che il dato sia appena stato
corretto non è una ragione per metterlo in vetrina.

Quindi le tre formule vietate, in chat e sul sito: «ti segue», «ti controlla
mentre lavori», «per tutta la sessione». Descrivono un servizio a pagamento con
le parole di uno incluso, che è il verso sbagliato in cui sbagliare — l'altro
verso costa una domanda, questo costa una promessa non mantenuta al primo
allenamento. Sta in quattro posti che vanno tenuti in pari: la scheda
«L'assistenza» e le due f.a.q. di `/gym-floor`, `activityInfo['Gym Floor']` in
`data/abbonamenti.ts` (che è quello che finisce nel `kb.json`), la scheda
`adulti/gym-floor` e `generali/prenotazioni`.

#### L'orario di apertura della sala non è l'orario delle due fasce

A «allenarmi in autonomia» la chat ha spiegato bene Con Assistenza e Allenamento
Libero, e ha chiuso con *«entrambe le fasce partono dalle 6:00 da lunedì a
venerdì»*. Non esiste nessun dato del genere: né sul sito né nel gestionale c'è
scritto quando, dentro l'orario di apertura, ricorre l'una o l'altra fascia —
quello lo dice solo il calendario di prenotazione in app o sul portale.

**Non aveva inventato da sola: aveva fuso due fatti veri che stavano nella
stessa voce.** `club:orari` elenca l'orario di apertura della sala pesi —
«Lunedì – Venerdì: 06:00 – 22:00», da `gymFloor.hours` — e subito dopo, nella
stessa voce, spiega che prenotando si sceglie fra le due fasce. Due dati veri,
scritti uno accanto all'altro senza dire che sono due cose diverse, sono un
contesto da cui si compone un terzo dato che non esiste: «apre alle 6:00» più
«si sceglie una fascia» diventa «le fasce partono alle 6:00» — la stessa
meccanica dei due orari compresenti e delle due sospensioni, applicata a un
orario invece che a un regime.

Ora la voce lo dice esplicitamente: gli orari elencati sono **quando la sala è
aperta**, non **quando c'è l'assistente**, e in quali orari ricorra l'una o
l'altra fascia «non è scritto da nessuna parte» — con l'invito a mandare quella
domanda al calendario di prenotazione. Nel `systemMessage` la regola fissa su
Gym Floor aggiunge il divieto che nessun dato può dare da solo: **non
inventare un orario per le due fasce**, nemmeno quando l'orario citato è quello
vero di apertura — «entrambe le fasce partono dalle 6:00», «con assistenza fino
a mezzogiorno, poi libero», «dal lunedì al venerdì» sono tutte invenzioni allo
stesso modo, comprese quelle che citano un numero vero preso dalla riga
sbagliata.

La lezione è la stessa di ogni altra coppia di dati vicini in questo file:
*due fatti veri scritti uno accanto all'altro, senza dire che sono due dati
diversi, sono un contesto da cui si può comporre un terzo fatto che non
esiste* — qui non fra due regimi o due prezzi, ma fra un orario di apertura e
l'orario (inesistente sul sito) di una fascia dentro quell'apertura.

### Una lezione che non si può prenotare è una lezione che non c'è

Sabato 29 agosto, dentro la finestra dell'orario estivo, a «sto provando a
prenotare per oggi alle 17 gym floor» l'assistente ha risposto *«la Gym Floor
chiude alle 20:00 — quindi alle 17 riesci tranquillamente»*, e al messaggio del
portale — «non sono presenti lezioni nel giorno che hai selezionato» — che la
finestra di prenotazione non era ancora aperta, invitando a riprovare e a
mandare uno screenshot. Il club chiudeva alle **13:00**: non c'era niente da
prenotare, e la persona è stata mandata a caccia di un guasto che non esisteva.

**Il modello non ha inventato: ha letto la riga sbagliata di due che c'erano
entrambe.** `club:orari` metteva `ORARIO_ECCEZIONALE.testo` sopra le fasce
ordinarie della sala pesi e le lasciava lì sotto, senza dire quale delle due
vincesse — ed è lo stesso difetto delle due sospensioni: *un contesto che
contiene due regimi è un contesto da cui si può comporre un terzo regime che
non esiste*.

Ora la gerarchia è **un dato**, non una deduzione: `ORARIO_ECCEZIONALE` porta
`sostituisce`, che dice per esteso che vale per tutto — sala pesi ad accesso
libero compresa — e che fuori da quelle fasce non c'è né lezione né accesso
libero; e la voce del `kb.json` marca l'elenco ordinario come *«ORARIO
ORDINARIO, che non vale adesso»*. Nel `systemMessage` la regola fissa aggiunge
la conseguenza che nessun dato può contenere: **una chiusura non è un guasto
del portale e non è la finestra dei tre giorni** — se in quella fascia il club è
chiuso, la risposta è la chiusura, non «riprova» e non «controlla il
certificato».

**E un regime senza la sua data di fine è un regime che si prolunga.** Il 31
agosto, a «da domani, 1 settembre, apre la piscina?», la risposta è stata che
«da domani il club segue ancora l'orario estivo ridotto». Il dato era giusto —
`finoAl` scadeva quella notte — ma la voce diceva solo *che* c'è un orario
estivo e che sostituisce l'ordinario, non **fino a quando**: «Ad agosto 2026»
scritto in prosa non è una scadenza che un modello applica a una domanda su
domani. È la sorella della lezione qui sopra: due regimi senza gerarchia
lasciano comporre un terzo orario, un regime senza scadenza lascia prolungare
quello che c'è.

Ora `finestraEstiva()` (`data/club.ts`) stampa la finestra per esteso — ultimo
giorno compreso, e da quando torna l'ordinario — dentro il blocco dell'orario
estivo del `kb.json` e nella nota di `/planning`. Le due date **si derivano da
`finoAl`**, che è il primo giorno in cui l'orario *non* vale più: scritte a mano
sarebbero due date che al cambio di stagione divergono di uno. E `finoAl` porta
il fuso di Roma (`T00:00:00+02:00`) perché `new Date('2026-09-01')` è mezzanotte
UTC, cioè le due del mattino qui: senza, fra l'una e le due del 1 settembre
l'orario estivo risultava ancora attivo.

Serve anche per una ragione che il dato da solo non copre: **il `kb.json` si
costruisce al build**, quindi il giorno della scadenza, se nessuno tocca il
sito, quella voce resta scritta com'era. Con la finestra dentro il testo, un
modello che legge la data se ne accorge da sé invece di fidarsi del fatto che la
voce esista.

**E la regola generale è più larga della chiusura**, perché è la chiusura a
esserne un caso: *una lezione che non si può prenotare è quasi sempre una
lezione che non c'è*. Il portale mostra il palinsesto vero, quindi un giorno
vuoto o «non sono presenti lezioni nel giorno che hai selezionato» vogliono dire
che quel giorno quella lezione non è in programma — o perché il club è chiuso in
quella fascia, o perché quell'attività quel giorno non c'è, e il palinsesto
cambia ogni mese. Le **otto cause** di `prenotazioni-problemi.md` sono blocchi
su una lezione **che esiste**: elencarle a chi ha davanti un giorno vuoto è
rispondere a un'altra domanda. La scheda ora se lo dice da sola, in un blocco
che viene prima delle otto e non è numerato — non è un blocco, è l'assenza
della lezione — e il prompt manda al planning invece che a «riprova» e allo
screenshot.

Due cose da sapere prima di toccarlo:

- **Sabato e domenica sono i giorni in cui i due orari divergono di più**, ed è
  lì che l'errore si vede: l'ordinario dà il sabato 8:00–20:00, l'estivo
  9:30–13:00. Un controllo che guarda solo i feriali non trova niente.
- **Scade da sé**, e va bene così: passato `finoAl`, la riga eccezionale sparisce
  e l'elenco ordinario torna a essere l'unico — quindi anche l'etichetta «che
  non vale adesso» se ne va con lei, perché è condizionata alla stessa
  funzione.

### Il certificato medico si manda dalla chat, e l'azione `team` apre il modulo

«A che indirizzo posso mandarlo?» non aveva una risposta che l'assistente
potesse dare: `data/testo.ts` toglie **le caselle email da tutta la knowledge
base**, quindi il modello sapeva che il certificato si manda per email e non
sapeva dove — e ha risposto rimandando alla scheda. Alla domanda dopo, «o posso
caricarlo tramite app», ha detto no e ha rimandato di nuovo alla scheda: due
turni per non dare un dato che non ha.

Il dato però non serviva, perché **la via più corta era già in pagina e nessuno
gliel'aveva detta**: il box «Contatta il team» della chat ha un campo allegato —
immagine o PDF, fino a 5 MB — che nomina il certificato medico nella sua stessa
etichetta. Mancava il modo di arrivarci a parole.

Quindi l'azione del modello diventa la quarta: `{"tipo": "team"}`, che apre quel
modulo sotto la risposta, come le altre tre aprono l'iscrizione, la prova e il
calendario. Tre pezzi, e nessuno dei tre si può saltare — `eseguiAzione` in
`chatAssistente.client.js`, l'enum di `Leggi la risposta` su n8n (un'azione
fuori forma si scarta in silenzio, quindi il modello direbbe «te lo apro qui
sotto» senza che si apra niente), e la regola fissa nel `systemMessage`.

- **È l'eccezione dichiarata al «solo dopo una conferma»** che governa le altre
  tre azioni: aprire un modulo non impegna a niente e non manda niente — il
  messaggio lo scrive e lo invia la persona — quindi si apre già nel turno in
  cui dice che ha un documento da farci avere. Le altre tre partono solo dopo un
  sì, perché quelle *fanno* qualcosa.
- **Le guardie restano al sito**: `apriTicket()` è lo stesso dell'icona in alto,
  quindi uno per volta, e a ticket già inviato si torna alla conferma invece di
  aprirne un secondo.
- **E la scheda del certificato ora dichiara le due strade**, la chat prima
  della posta. Il markdown tiene l'indirizzo per chi legge il sito; nel `kb.json`
  quella riga arriva senza casella, ed è giusto — l'assistente la casella non la
  deve dire, deve aprire il modulo.

### Gli orari in chat hanno tre posti, e la domanda decide quali

Non è un bivio, è una scala, e ogni gradino esiste perché il precedente non
arriva:

| la domanda | dove va | perché |
| --- | --- | --- |
| una lezione o un corso **per nome** | la **pagina di quel corso** | lo racconta per intero, e la pagina porta i suoi orari |
| gli orari in generale, un giorno, una fascia, **un periodo** | il **planning** | tiene tutto il palinsesto del mese e si apre senza account |
| **chi la tiene questa settimana, quanti posti restano** | il **calendario del portale** | è il solo posto dove quel dato esiste |

Il link del planning **ci va sempre quando si parla di orari**, anche accanto a
quello della pagina del corso: è il riferimento del club. E quando ne servono
due, l'ordine è prima dove la cosa sta scritta e poi il portale per il dato vivo
— mandare al portale chi ha chiesto «che orari fate» vuol dire chiedergli un
login per una cosa che sta su una pagina aperta.

**Il terzo gradino non è una comodità, è l'unico posto che ha quel dato**, ed è
una cosa che va sapendo guardata nei dati e non immaginata: `planning-corrente.json`
porta per ogni lezione l'orario, il nome e la sala, **e nient'altro** — il nome
dell'istruttore sul sito non c'è da nessuna parte, né sul planning né sulla pagina
del corso, e la capienza rimasta nemmeno. Se la regola dicesse «per gli istruttori
manda al planning», manderebbe su una pagina che quel dato non ha.

Tre cose da sapere prima di toccarlo.

**Quell'indirizzo non è un'eccezione alla regola delle fonti, è già dentro la
knowledge base.** Lo scrive la scheda `generali/prenotazioni`, che lo indica come
il posto dove si vede il dato in tempo reale: il modello non se lo inventa, lo
legge. La regola 3 lo nomina esplicitamente perché altrimenti la clausola «solo
gli url delle righe FONTE» glielo farebbe scartare — un url scritto *dentro* il
testo di una voce è reale quanto quello della sua FONTE.

**Va fra le `fonti`, non nel testo della bolla.** `chatAssistente.client.js`
passa la risposta dall'escape e converte solo il `**grassetto**`: un indirizzo
scritto in prosa resta testo da ricopiare a mano, mentre `rimandi()` disegna le
fonti come link che si aprono in una scheda nuova. È il solo posto della chat in
cui un link è cliccabile, e quindi è il solo posto dove ha senso metterlo.

**Capienze e nomi degli istruttori si nominano solo se li ha chiesti.** Il
calendario li mostra tutti e due, ma metterli in vetrina a chi ha chiesto un
orario è rispondere a una domanda che non ha fatto — la stessa regola per cui la
lezione singola non si nomina «per completezza».

E l'orario **di apertura** del club — anche quello stagionale, come l'estivo di
agosto — resta scritto nel testo e si cita come sta: quello non è una lezione e
non cambia ogni settimana.

#### E gli orari del Baby Nuoto sono pubblici: non si manda al portale per saperli

Il 10 settembre una mamma incinta ha chiesto in chat gli orari dei turni del
Baby Nuoto — le servivano per non sovrapporre il sabato del figlio al corso
gestanti che voleva fare lei — e si è sentita rispondere tre volte che «gli
orari esatti li vedi prenotando». Alla terza ha insistito («non c'è modo di
saperlo prima?») ed è stata mandata a scrivere al team. **Quindici minuti dopo
il desk gliel'ha detti per email**, in due righe.

**Il modello non ha sbagliato: ha ricopiato il dato.** La riga «Orari» della
scheda del corso diceva testualmente «l'orario di ciascun turno si vede
prenotando, da app o dal portale», e lo stesso dicevano la f.a.q. dei turni e
`generali/prenotazioni` — tre voci del `kb.json` che affermavano che un dato
pubblico non fosse pubblicabile. Il commento nel codice spiegava anche perché:
un elenco di orari accanto alla riga dei due gruppi è un elenco da cui si
ricompone «tutti e due i gruppi hanno questi orari», che è la meccanica dei due
fatti veri vicini già scritta dieci volte in questo file.

**Il timore era giusto e la cura era sbagliata**, ed è la lezione che vale oltre
questo caso: *quando il rischio è che due dati vicini si ricompongano male, la
risposta è dire il secondo dato, non nascondere il primo.* Nascondendo l'orario
non si è evitata l'associazione sbagliata — si è tolta alla persona l'unica
informazione che le serviva per decidere, e la si è mandata a chiederla a una
casella. Un dato che il club dà a voce al desk e per email è un dato pubblico:
tenerlo fuori dal sito non protegge da niente e costa un contatto per volta.

Adesso i quattro turni — **9:30, 10:10, 10:50 e 11:30**, gli stessi il sabato e
la domenica — stanno in `orari` sulla stagione del Baby Nuoto in `junior.ts`,
cioè nello stesso campo che pallanuoto e nuoto agonistico usavano già. Da lì
arrivano insieme sulla pagina (il riquadro «Orari» di `PaginaJunior`) e nel
`kb.json` (`testoStagione` li stampa), senza nessun elenco ricopiato.

Quattro cose da sapere prima di toccarli.

**Quello che resta non pubblicato è l'abbinamento fascia → turno**, e la riga
che lo dice ha preso il posto di quella vecchia: «quale dei quattro turni della
mattina è quello della sua fascia d'età si vede prenotando». È la stessa forma
di sempre — il perimetro dentro il dato — e chiude la composizione che il
commento vecchio temeva, senza costare l'orario.

**Sono orari d'inizio e non intervalli.** Il club li dice così («si tengono alle
9:30 e alle 10:50»), e i quattro sono distanti quaranta minuti l'uno dall'altro,
cioè esattamente la durata della lezione dichiarata due righe sopra. Scriverli
come intervalli vorrebbe dire *dedurre* la fine da una durata: se un turno
finisse cinque minuti prima per il cambio, avremmo pubblicato un dato che
nessuno ha mai dichiarato.

**Il Baby Nuoto non è nel palinsesto, e non è una dimenticanza da sanare qui.**
`planning-corrente.json` ha cinque fasce, tutte adulti, e **nessuna colonna
della domenica** — l'unica cosa domenicale è il Nuoto Libero, infilato nella
cella del sabato come «Dom 09:30–12:30». Mettercelo vorrebbe dire prima
aggiungere il giorno alla tabella; finché non c'è, `junior.ts` è la casa giusta,
ed è la stessa degli altri tre corsi junior.

**E il dato si è ritrovato nella casella del desk, non nel repository.** Vale la
pena scriverlo perché sarà di nuovo così: quando il club dice «quel dato è
pubblico, sta sul sito» e sul sito non c'è, la fonte da guardare è quello che il
desk ha già risposto per email a qualcuno. La verifica incrociata era lì
accanto — il corso gestanti che quella mamma nominava è nel palinsesto al sabato
alle 11:00–11:50, esattamente come glielo aveva scritto il desk.

### Un pulsante promesso e un `fonti` vuoto sono due cose diverse, e solo il modello le confonde

Il 1° settembre, a una madre che aveva già confermato l'anno (2013) del figlio,
l'assistente ha detto due volte *«clicca sul pulsante qui sotto»* per i turni
della Scuola Nuoto Bambini — e due volte non è comparso nessun pulsante. Alla
terza, dopo che lei ha scritto «Non c'è nessun pulsante», si è corretto
incollando l'indirizzo a mano nel testo: *«Ecco il link diretto:
https://athlon.perfectgym.com/…?ageLimitId=14&vacancies=1»* — che è la stessa
regola violata al contrario, perché **i rimandi sono pulsanti, non link nel
testo**, ed è quello che rende una risposta scritta cliccabile.

**Il dato c'era, ed era quello giusto.** `turniScuolaNuoto()` (`kb.json.ts`)
scrive una riga `FONTE:` per ciascuna fascia d'età dentro la voce
`scheda:snb/preiscrizioni-nuoto`, e quella per i nati 2013-14-15 porta esattamente
`ageLimitId=14` — lo stesso numero che il modello ha incollato a mano al terzo
turno. Non aveva letto la voce sbagliata e non aveva inventato niente: sapeva
qual era il link giusto. Ha solo scritto la frase «clicca sul pulsante qui
sotto» nel campo `risposta` e lasciato `fonti: []` nello stesso oggetto JSON —
due campi dello stesso output che si sono contraddetti, e nessun controllo se
n'è accorto prima che arrivasse alla persona.

**`Leggi la risposta` verificava già le fonti dichiarate, non la loro assenza.**
Il nodo confronta ogni url in `fonti` con le righe `FONTE:` vere del contesto
(`ripara()`) — un url inventato si butta, uno con l'ancora sbagliata si
riscrive — ma quel controllo presuppone che il modello abbia *provato* a
citare qualcosa. Un `fonti: []` accanto a una frase che promette un pulsante
passava senza che niente lo notasse: è lo stesso principio delle due
sospensioni e dei due orari applicato a due *campi* invece che a due
*paragrafi* — un oggetto che contiene due affermazioni compresenti («c'è un
pulsante» / «non c'è nessuna fonte») è un oggetto da cui si compone
un'incoerenza che nessuno dei due campi da solo mostrerebbe.

Ora il nodo fa due cose in più, sfruttando la stessa `ripara()` che già
esisteva:

- **Se `fonti` resta vuoto ma la risposta contiene un url**, quell'url si
  verifica contro il contesto vero — la stessa identica funzione usata per le
  fonti dichiarate, non una scorciatoia più permissiva — e se combacia si
  promuove a fonte vera, togliendolo dal testo. È esattamente il caso della
  terza risposta: il link incollato a mano diventa il pulsante che avrebbe
  dovuto essere fin dalla prima.
- **Se non c'è niente da recuperare** — nessun url nel testo, come nelle prime
  due risposte — resta la spia `pulsantePromessoSenzaFonte`, accanto a
  `fontiCorrette` e `fontiScartate`: se sale, è la frase «pulsante qui sotto»
  (o «clicca sul pulsante» — la stessa formula che la regola sui rimandi dà
  come esempio a ogni rimando, non solo a questa scheda) che il modello sta
  scrivendo senza aver messo niente da cliccare.

**Provato sulla conversazione vera**, prima di pubblicare: la terza risposta
(con il link incollato) recupera il pulsante e il testo torna pulito; la prima
e la seconda (nessun url nel testo) restano senza fonte ma accendono la spia;
una risposta normale con una fonte dichiarata giusta — Premium con l'ancora
`#premium` — passa invariata.

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

### Il voto alla chat si chiede una volta, e non a chi è appena stato passato al team

Dopo la **terza risposta** l'assistente chiede «Come è andata?» con cinque
stelle. Il numero non è arbitrario: alla prima domanda non si è ancora capito
se è servito, quindi un voto chiesto lì misura la cortesia dell'apertura e non
l'aiuto.

**Non si chiede in due casi**, e sono i due in cui il voto direbbe un'altra
cosa: quando la risposta di quel turno è `senzaRisposta` — cioè la persona è
appena stata mandata al team — e quando il ticket è già partito. Lì sta
aspettando una risposta vera, e chiederle un voto in quel momento è il modo
più rapido per prenderne uno da una stella per un motivo che non è nostro.

**La domanda è una sola per conversazione, e la conversazione sopravvive al
cambio di pagina**: `votoChiesto` e `votoDato` viaggiano nella scena in
`sessionStorage` accanto a `ticketInviato` e `richiamoProposto`, o al secondo
caricamento le stelle ricomparirebbero. Sul totem `pulisciStato()` le azzera
come tutto il resto: la persona dopo non ha valutato niente.

**La nota si chiede solo sotto le quattro stelle.** Chi dà cinque stelle ha già
detto quello che pensa, e un campo di testo dopo un voto alto è un compito in
più che abbassa la percentuale di chi vota. Sotto, la domanda è quella utile:
«cosa potevamo fare meglio».

Il voto viaggia da solo verso `chat-athlon-valutazione` (n8n, `CHAT ATHLON —
VALUTAZIONE`) e finisce su `chat_conversazioni` — `valutazione`,
`valutazione_il`, `valutazione_nota` — trovata dalla **sessione**, l'unica
chiave di quella riga che il browser conosce. Tre dettagli che non sono
decorazione:

- **`keepalive` sulla `fetch`**: il voto è spesso l'ultima cosa che si tocca
  prima di chiudere la scheda, e senza quello la richiesta muore con la pagina.
- **Il voto si valida anche su n8n**, non solo nel browser: il vincolo `check
  (valutazione between 1 and 5)` farebbe fallire l'update in silenzio, perché
  quel nodo ha `continueRegularOutput` — e un voto perso non si vede da nessuna
  parte.
- **Le stelle sono cinque pulsanti da 2,75 rem**, non un `input range`: si
  toccano col dito, si leggono con la tastiera, e ognuna dichiara quante stelle
  sta dando. Una stella disegnata alla dimensione del carattere è un bersaglio
  da 16 px, cioè un voto dato per sbaglio a quella accanto.

**Dove si legge**: nel pannello, in cima alla riga chiusa della conversazione,
con il colore che dice il verso — verde da 4, ambra a 3, rosso a 1 e 2. Sta
sulla conversazione e non su `utenti` perché una persona ha più chat, e un voto
senza la conversazione che l'ha generato non si può spiegare; l'anagrafica ce
l'ha comunque, perché la riga porta già `utente_id` e la scheda della persona
mostra le sue conversazioni.

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

### Il Guest Pass in chat: due fatti, e la voce che sparisce se mancano

Il Pass si propone **solo** a chi può averlo, e le condizioni sono quattro —
tutte verificabili, nessuna affidata a come il modello legge la conversazione.
Stanno in `Vaglio Guest Pass` su n8n e, per la parte che decide l'attivazione,
in `puoProvare()` dentro `chatAssistente.client.js`.

| condizione | il fatto | dove |
| --- | --- | --- |
| attività **adulti** | ha premuto «Attività adulti», uno dei cinque pulsanti del passo prima della chat | `attivita === 'adulti'` |
| **lead, guest o nuovo** | `stato` di `athlon-verifica-iscritto`: `nuovo` (non lo conosce) o `esiste` (Lead o Guest) | lista bianca |
| dopo **qualche messaggio** | ha scritto almeno tre volte | `scambi`, contato dal sito |
| ha chiesto di **abbonamenti** | la stessa regex che accende l'ancora del listino | `CHIEDE_LISTINO` |

Cinque cose da sapere prima di toccarlo.

**Si guarda `attivita`, non `ambito` e non `ramo`.** Entrambi valgono `adulti`
anche quando non è stato scelto niente, quindi con loro «non lo sappiamo»
passerebbe per «ha detto adulti» — che è il modo in cui una regola stringente
diventa larga senza che nessuno se ne accorga. Serve il pulsante premuto.

**Lo stato è una lista bianca, non un'esclusione.** `nuovo` ed `esiste` valgono;
`iscritto` è il Member; e il quarto caso — la verifica che non ha risposto, che
il sito marca `errore` — cade fuori da sé invece di essere un valore da
ricordarsi di escludere. Quando non sappiamo, non si offre.

**La voce esce dal contesto, non ci resta con scritto «non proporla».** Una
regola che il modello può ignorare non è una regola: è la stessa scelta della
lezione singola (`SOLO_SE_CHIESTO`) e del Direttore Tecnico (`SOLO_ISCRITTI`).
Ma togliere la voce non basta da sola, perché **la regola 8 del prompt nomina il
Pass e il suo url anche senza di lei**: la chiude una regola fissa nel
`systemMessage` dell'agente, accanto a quelle del nuoto per bambini, che dice
che senza la voce il Pass per quella persona non esiste.

**Quando lo propone deve elencare tutte le attività, e dire «adulti».**
L'elenco non sta nel prompt: sta nella voce, e la voce lo legge da
`ATTIVITA_GUEST_PASS` (`data/abbonamenti.ts`), che è **derivata** dal Premium —
il Pass è un Premium di sette giorni, quindi il suo perimetro non è una lista
sua. Un'attività aggiunta al Premium entra da sola in `/prova`, nella voce e
nella chat. Un elenco a metà si legge come un elenco completo: è così che una
prova finisce comprata per una cosa che non comprende.

**Il gate del client copre le due condizioni sull'identità, non le altre due**,
e la divisione è voluta: «adulti» e lo stato dicono *chi può averlo*, i messaggi
e la domanda sugli abbonamenti dicono *quando proporlo*. Il client decide se la
card compare e se la richiesta parte davvero (`fetch(PROVA)`), quindi è l'ultima
parola sull'attivazione — come le guardie del calendario lo sono sul richiamo.
Il buco che c'era: `if (!dati.memberType || ...) return` teneva fuori **le
persone nuove**, che per PerfectGym non hanno nessun `memberType` e sono la
ragione per cui il Pass esiste. Il modello diceva «ecco il tuo Guest Pass», la
card non compariva e su `richieste_prova` non arrivava niente — nessun errore,
nessuna traccia.

**Aprire il gate non è proporre, e questo si è visto sul traffico vero.**
Esecuzione `1443490` del 28/08, `passOfferto: true` e la voce nel contesto:
`attivita: ["adulti"]`, `stato_pgm: "esiste"`, `scambi: 4`, e la domanda era
«abbonamento annuale solo per pilates reformer» dopo «vorrei sapere la
differenza dei costi». Il vaglio aveva fatto tutto giusto — e il modello ha
risposto che il Group Reformer da solo non si vende, che sta nel Premium, e
«ti va di partire con l'Annuale a rate, 95 €/mese?». **Del Pass, niente.**

Il motivo sta nella regola 8, che diceva «proponilo quando c'entra»: cioè
lasciava al modello di decidere il momento, e la regola 7 — porta
all'attivazione — vinceva sempre. Un no seguito da un prezzo più alto è il
punto esatto in cui una persona chiude la chat.

Adesso la presenza della voce **è** il momento: se c'è, il sito ha già
verificato le quattro condizioni, quindi proporlo non è facoltativo e va fatto
in quel turno, una volta. Con i due casi in cui è la risposta giusta e non
un'aggiunta — *quando la risposta è un no* (quella cosa non si vende da sola,
sta solo in un piano più grande) e *quando sta pesando il prezzo o l'ampiezza
del piano* — e con l'unico caso in cui non si propone: **quando ha appena
detto sì a un piano e a una formula**. Lì siamo al passo (5) della regola 7, e
mettere sette giorni a 19 € davanti a chi sta entrando a 95 €/mese è l'unico
modo di sbagliare in eccesso.

### E la lezione singola, quando chiede un abbonamento per una cosa sola

«Abbonamento solo per il Reformer» è la richiesta di **pagare solo quella
cosa**, quindi la lezione singola è la risposta letterale e non un'aggiunta:
si nomina. È l'unica eccezione dichiarata alla regola 7ter, che in tutti gli
altri casi resta come sta — *se non l'ha chiesta, per te non esiste*, perché
chi chiede quanto costa un corso e si sente rispondere «oppure 22 € a lezione»
ha appena scoperto che può entrare senza abbonarsi, e non lo aveva chiesto.

Il dato per rispondere c'è: `SINGOLI.voci` ha il prezzo di tutte e sei le
attività adulti — il Group Reformer sta a 25 € — più il badge di 5 € una
tantum.

**Il cancello si apre rinominando la voce, e la ragione è dove vive il
cancello.** `SOLO_SE_CHIESTO[SINGOLO]` sta in `Componi contesto` e guarda
l'`id`; il vaglio sta un nodo prima, quindi non può togliere quella
condizione ma può dare alla voce un id che quella condizione non incontra —
`abbonamento:accessi-singoli-una-attivita`, con il contenuto copiato
dall'originale così le due cose non possono divergere. **È un aggiramento, ed
è dichiarato**: il giorno che si tocca `Componi contesto` per altro, questa
condizione va spostata dentro `SOLO_SE_CHIESTO`, accanto a sua sorella.

Due freni, e il secondo è meno ovvio del primo. **Solo il ramo adulti**: a un
genitore che chiede «solo il baby nuoto» un listino di prezzi adulti è una
risposta sbagliata. E **solo se il cancello l'avrebbe chiusa**: se la domanda
nomina già la lezione singola la voce passa da sé, e rinominarla vorrebbe dire
averla due volte nel contesto.

**«Solo» da solo non basta**, e sarebbe il falso positivo che apre tutto:
«vengo solo la sera» non parla di quante attività fa. Serve la restrizione
**e** una cosa da restringere, vicine — è una regex, non capirà ogni frase, e
sbaglia nel verso giusto: una richiesta non riconosciuta lascia la 7ter come
stava.

**L'ordine è piano, Pass, lezione singola**, e se le due offerte non stanno
nelle cento parole della regola 6 la singola va nel turno dopo. La prima è la
nostra offerta, la seconda è la sua richiesta presa alla lettera, e nessuna
delle due si perde. Mai la singola prima del Pass, mai al posto del piano.

#### Chi esita non va mandato a cercare altrove: l'esitazione apre il cancello della prova

Il 31 agosto, a una persona interessata all'Hydrobike che si allenerebbe la
mattina presto e abita sulla Cassia, la chat ha chiesto *«Ti va di provare, o
preferisci qualcosa più vicino a casa?»* — e quando lei ha risposto «faccio una
ricerca più vicino a me», l'ha salutata con **«Buona ricerca!»**. L'alternativa
fuori dal club l'ha offerta l'assistente, e poi le ha tenuto la porta.

**Ma il modello non aveva molte scelte**, e questa è la parte che conta: in
quella conversazione la persona non aveva mai nominato un prezzo, quindi la
quarta condizione di `Vaglio Guest Pass` — `CHIEDE_LISTINO` — era falsa, la voce
del Pass era **uscita dal contesto**, e proporre una prova gli era vietato dalla
regola fissa che governa quel cancello. Una regola nel prompt che dicesse
«quando esita proponi la prova» sarebbe entrata in contraddizione con quella:
gli avrebbe chiesto di offrire una cosa che non ha davanti.

Quindi la correzione sta nei due posti insieme, e l'ordine è quello:

- **Il cancello.** La quarta condizione diventa «ha chiesto di prezzi
  **oppure** sta esitando», con `ESITA` — una regex in quattro famiglie: rimanda
  la decisione, saluta o cerca altrove, la logistica non torna, dubita di
  riuscirci. E la soglia degli scambi scende da tre a **due** quando esita:
  chi dice «faccio una ricerca» al secondo messaggio se ne va adesso, e
  aspettare il terzo vuol dire che il terzo non arriva.
- **La regola fissa**, che dice cosa farne: mai suggerire di cercare altrove
  («buona ricerca», «preferisci qualcosa più vicino a casa» e le altre forme
  sono vietate per nome), l'obiezione si riconosce in mezza riga **senza
  allargarla**, e poi si propone la prova. Con la via di ripiego per quando la
  voce non c'è — la lezione singola, la visita, il team — perché il divieto di
  inventare il Pass resta intero.

Tre cose da sapere prima di toccarla.

**L'idoneità la decide la presenza della voce, non il modello**, ed è la
richiesta del club presa alla lettera: «proponi sempre la prova, verificando che
sia idoneo». Il verificare non è un giudizio in chat — sono le condizioni (1) e
(2) del vaglio, l'attività adulti e lo stato PerfectGym. Un socio che esita e un
genitore che esita **non** vedono comparire la voce, e per loro la prova non
esiste: provato sui nove casi, il ramo junior perde anche le altre voci che
raccontano la prova.

**Il verso in cui sbaglia `ESITA` è dichiarato.** Un falso positivo lascia la
voce nel contesto e a proporla o no ci pensa il prompt; un falso negativo è una
persona che se ne va senza che le sia stato offerto niente. Da qui anche cosa
**non** va aggiunto alla regex: le sole indicazioni di luogo. «Sono a Roma nord»
dice dove sta, non che stia titubando — ed è uno dei casi di prova.

**Le condizioni del vaglio sono divise in due, e allargare la seconda metà non
tocca il sito.** (1) e (2) dicono *chi può avere il Pass* e vivono anche in
`puoProvare()`; (3) e (4) dicono *quando proporlo* e stanno solo su n8n. Se un
giorno si toccano le prime due, vanno cambiate in tutti e due i posti — o il
modello offre una prova che nel browser non si attiva.

Per verificare: `passPerEsitazione` nelle spie del vaglio dice quale metà della
quarta condizione ha aperto il cancello. Se su traffico vero non si accende mai,
la regex non riconosce l'italiano che scrivono le persone.

#### Un cancello che ne chiude una e ne lascia un'altra non è un cancello

Il 30 agosto, a un genitore che scriveva dalla pagina della Scuola Nuoto
Bambini e diceva «mia figlia non ha mai fatto nuoto, mi servirebbe solo il
lunedì pomeriggio», la risposta è stata: *«con la settimana di prova a 19 €
accedi a tutto il club per sette giorni»*. Il Pass è un Premium **adulti** di
sette giorni: quella bambina non può usarlo, e non comprende la scuola nuoto.

**E il vaglio aveva funzionato.** L'esecuzione dice `passOfferto: false`,
`passVoceTolta: true`, `passPerche: attivita-non-adulti` — la voce del Pass
era uscita dal contesto, esattamente come deve. A restare dentro erano **altre tre voci**
che raccontano la stessa offerta, e le ha trovate tutte una spazzata sulle 252
voci di quel contesto:

- `servizio:invita-i-tuoi-amici` — «ognuno prova tutto il club per 7 giorni
  pagando solo il badge di accesso, €5 invece di €19». Da qui i sette giorni e
  i 19 €. **Non nomina mai «Guest Pass»**, ed è il motivo per cui una regola
  sul solo contenuto non basta e serve anche un elenco di id.
- `scheda:generali/referral-guest-pass` — «Invita un amico: Guest Pass e
  voucher», che spiega per esteso come si genera la settimana di prova.
- `scheda:adulti/cessione-abbonamento` — «esiste il Guest Pass: una settimana
  di prova gratuita», una frase sola in mezzo a tutt'altro argomento.

**E la prima correzione ne tolse una sola**, cioè ricadde nell'errore che
questa sezione descrive: la spazzata è venuta dopo, e ha trovato le altre due.

La lezione è più larga del Pass, ed è la sorella di quella sui due regimi
compresenti: *chiudere una voce e lasciarne un'altra che descrive la stessa
offerta non protegge da niente*. Quando si mette un prodotto dietro un
cancello, la domanda da farsi non è «ho tolto la sua voce?» ma **«quante voci
del contesto raccontano questa offerta?»** — e la verifica è un grep sul
contesto vero di un'esecuzione, non sulla lista degli id.

Ora nel ramo junior esce **qualunque voce che offra la prova**, per id o per
contenuto, e la spia `vociProvaTolte` le elenca: una voce nuova che la racconta
e non compare lì è la prossima falla.

**L'eccezione va tenuta, ed è la risposta giusta.** `faq:junior:baby-nuoto`
dice «il Guest Pass Premium non vale qui: è la prova delle attività per adulti,
e non ha mai compreso i corsi per bambini» — nomina il Pass proprio per negarlo,
e toglierla lascerebbe il genitore senza la frase che chiude la questione. Da
qui il `LA_NEGA` accanto al `NOMINA_PROVA`.
**La condizione è `adulti` e non `passOfferto`**, e la differenza conta:
`passOfferto` porta dentro anche il *quando* proporlo (tre messaggi, ha chiesto
di prezzi), mentre qui la domanda è *di chi è questo prodotto*. Il referral lo
fa un socio adulto — e a un Member, per cui `statoOk` è falso e quindi
`passOfferto` sarebbe falso, va benissimo restare: è proprio lui che invita.

E la risposta giusta c'era già nel contesto, ignorata: per la Scuola Nuoto la
prova **è l'abbonamento stesso**, mensile e disdicibile con dieci giorni di
preavviso, come dice la f.a.q. «È possibile effettuare una prova?».

Per verificare: `Vaglio Guest Pass` mette in chiaro `passOfferto`,
`passVoceTolta`, `passPerche` (quale condizione ha fermato l'offerta) e
`singoloAperto`.
`passVoceTolta` falso mentre `passOfferto` è falso vuol dire che l'id della voce
è cambiato e il vaglio non aggancia più niente — da fuori si vedrebbe come «il
Pass si propone sempre», che è il guasto che quel nodo esiste per evitare.

### Le sospensioni sono due regimi, non uno con le varianti

A «devo procedere con la sospensione dell'abbonamento Premium Mensile Flex» —
un adulto — l'assistente ha dato i 15 € giusti, i 10 giorni di preavviso giusti,
e poi, quando la persona ha detto di aver avuto un intervento, il ristoro
sbagliato: *«il recupero avverrà tramite un credito di almeno 2 mensilità,
utilizzabile entro 6 mesi dalla fine del corso»*. Quello è il punto 4.10 della
**Scuola Nuoto Bambini**. Per un adulto il contratto si allunga di pari durata e
di credito non ce n'è.

**Non aveva inventato: aveva letto una voce che conteneva entrambi i regimi.**
`abbonamento:sospensione` diceva il perimetro per bene — «vale solo per», «per
quei corsi c'è un'altra strada» — ma teneva in tre righe due cose che non hanno
in comune nulla oltre ai sessanta giorni. Un contesto che contiene due regimi è
un contesto da cui si può comporre un terzo regime che non esiste.

Adesso il perimetro è **un dato** e le voci sono **due**:

| | adulti (dal 1/9/2021) e Baby Nuoto | Scuola Nuoto, Agonistico, Pallanuoto |
| --- | --- | --- |
| a pagamento | 15 €, un mese solare, preavviso 10 giorni | **non esiste** |
| per inidoneità | gratuita, ≥ 60 giorni documentati | gratuita, ≥ 60 giorni documentati |
| la quota del mese | il contratto si allunga | **resta dovuta** |
| cosa si recupera | il recupero parte da 2 mesi | un **credito** ≥ 2 mensilità, entro 6 mesi dalla fine del corso |

Tre cose da sapere prima di toccarle.

**Ogni voce dichiara il perimetro nel titolo e nella prima riga, e nomina
l'altra.** Serve tutto e due: il titolo perché è quello che il modello legge
scegliendo, e il rimando perché il caso «io ho un abbonamento e mio figlio fa la
scuola nuoto» è comune — e quando il recupero pesca entrambe le voci, ognuna dice
di non usare i numeri dell'altra.

**`SOSPENSIONE.junior` è la novità nei dati**, accanto a `inabilita`: prima il
regime dei bambini viveva solo dentro un accordion delle condizioni contrattuali
di `preiscrizioni-nuoto.md`, cioè in un posto dove nessuno lo cercava e da cui il
modello lo prendeva per caso. Adesso ha anche una scheda sua,
`/wikiathlon/snb/sospensione/`, con la tabella del confronto — che è il modo in
cui due cose che si somigliano smettono di essere confuse.

**Il sito non aveva il difetto, e questo dice dove guardare.** `BannerSospensione`
sta solo su `/abbonamenti` e `/promo`, e nessuna pagina junior nomina la
sospensione: il guasto viveva interamente nel `kb.json` e nel wiki. Quando una
risposta della chat sbaglia su una regola, la prima cosa da controllare non è la
pagina — è quante voci della knowledge base parlano di quella regola e se
ciascuna dichiara per chi vale.

### Dove la scheda tace, il modello applica la regola generale — e il turno della scuola nuoto è fisso

«Posso scegliere un bisettimanale e fare orari diversi nei 2 giorni?» → *«Sì,
non c'è un giorno fisso da rispettare per tutta la stagione. Ogni volta che
prenoti scegli il turno che ti conviene, a partire da tre giorni prima.»* È
falso: alla Scuola Nuoto Bambini il turno si scegle all'iscrizione e resta
quello, e col bisettimanale i turni fissi sono due. Chi perde una lezione la
**recupera**, con la procedura della scheda dei recuperi.

**Il modello non ha inventato, ha generalizzato.** La finestra dei 3 giorni
esiste ed è scritta: è quella delle attività degli adulti e del Baby Nuoto — e
dei *recuperi* della scuola nuoto, che infatti compaiono nell'elenco delle
attività a prenotazione. Nessuna scheda diceva che il turno settimanale è fisso:
lo diceva solo, di sfuggita, il «turno preferito» della procedura d'iscrizione.
Un dato assente non è un buco silenzioso — è una regola generale che si allarga
al posto suo.

Ora sta scritto in quattro posti, ognuno per un percorso diverso di chi legge:
la scheda dell'iscrizione (dove si scelgono i turni), la scheda dei recuperi
(come premessa: il recupero è la sola lezione che si prenota), l'elenco delle
attività a prenotazione in `prenotazioni.md` (dove «Recuperi Scuola Nuoto
Bambini» ora spiega perché è scritto *recuperi*), e una f.a.q. della pagina del
corso — che è la domanda esatta arrivata in chat.

**Il Baby Nuoto è l'opposto e va detto insieme**, o si sposta l'errore invece di
chiuderlo: là si prenota turno per turno, come per gli adulti. Le due cose stanno
nella stessa riga di `prenotazioni.md` per questo.

### Il cambio corso dei bambini non è il cambio abbonamento degli adulti

Stessa giornata, stesso difetto, terzo caso: a un genitore che chiedeva di
passare da una a due volte a settimana **per il nuoto dei bambini**, la chat ha
risposto con la procedura degli adulti — «compila il modulo, ti arriva via
email il conteggio del credito residuo con le istruzioni» — e poi l'ha
confermata («sì, vale anche per il nuoto»). Per la Scuola Nuoto il cambio di
frequenza non passa da nessun modulo: richiede **disdetta e nuova iscrizione**,
con una nuova quota di attivazione. Cioè la risposta ha nascosto un costo e
promesso un'email che non sarebbe mai arrivata.

La persona stava scrivendo **dalla scheda giusta** — `da /wikiathlon/snb/cambio-corso`
è scritto nell'intestazione della conversazione — e il modello ha preferito la
voce degli adulti: `adulti/cambio-abbonamento` non dichiarava di essere degli
adulti, e «cambio abbonamento» somiglia a «cambio frequenza» più di quanto due
procedure diverse possano permettersi. Ora le due schede si nominano a
vicenda e dichiarano il proprio perimetro nella **prima riga**, che è quella
che il `kb.json` porta per prima.

**Le tre voci di questa giornata dicono la stessa cosa**, e vale la pena
scriverla una volta sola: quando due procedure hanno nomi simili e persone
diverse — la lista d'attesa delle prenotazioni e l'iscrizione, il Direttore
Tecnico e chi deve ancora iscriversi, il cambio abbonamento e il cambio corso —
**il perimetro va nel dato, non nel prompt**. Una regola che il modello può
ignorare non è una regola, e una voce che non dice per chi vale è una voce che
verrà applicata a chi le somiglia.

### La lista d'attesa è delle prenotazioni, e il Direttore Tecnico è degli iscritti

Il 31 agosto, a una mamma che voleva iscrivere la figlia del 2023 a un turno
dove non c'erano più posti, la chat ha risposto due cose false in un colpo:
che poteva **iscriversi in lista d'attesa**, che «scorre in ordine cronologico
e se si libera un posto ricevi una notifica via email», e che poteva
**parlare col Direttore Tecnico** per capire l'organizzazione dei gruppi.

**Non aveva inventato niente: aveva applicato all'iscrizione due cose che
valgono per gli iscritti.** La lista d'attesa esiste — sta in
`generali/prenotazioni` e in `snb/recuperi-lezioni` — ma è quella della
**singola lezione che si prenota**, recuperi compresi; per l'iscrizione a un
turno della Scuola Nuoto non esiste, e chi la promette manda una famiglia ad
aspettare una email che non arriverà mai. Il Direttore Tecnico riceve su
appuntamento, ma per **le famiglie degli allievi** — la sua scheda lo diceva
solo nel badge della hero, cioè in un posto che il `kb.json` porta come una
riga qualsiasi: chi deve ancora iscriversi non ha un percorso di cui parlare.

È lo stesso difetto della finestra dei tre giorni allargata alla Scuola Nuoto
e del Guest Pass finito nel ramo junior: **una regola che non dichiara il
proprio perimetro è una regola che si allarga al caso vicino**. Quindi il
perimetro sta adesso dentro le tre schede che il modello legge — la f.a.q.
della lista d'attesa, la scheda dei recuperi, la scheda della Direzione
Tecnica — e `preiscrizioni-nuoto` dice cosa fare davvero quando il turno è al
completo: si sceglie fra quelli che hanno posto, e se nessuno va bene si
scrive al team.

**E la cosa da non fare è inventare il rimedio.** La tentazione, davanti a un
turno pieno, è descrivere un meccanismo che consoli: una coda, una notifica,
un «ti avvisiamo noi». Un dato inventato è peggio di un dato assente, e qui
peggio ancora: è una promessa che il club non può mantenere e che nessuno
scoprirà finché la stagione non è cominciata senza quel bambino.

#### E il 08/09 è tornata, perché la stessa scheda la nega e la offre

Stessa promessa, otto giorni dopo (esecuzione `1519819`, `ramo junior`,
`attivitaJunior: scuola-nuoto-bambini`). Una mamma con due bambini, 2021 e 2023:
*«per i nati del 2023 c'è un posto il giovedì alle 16.40, mentre per i nati nel
2021 in quello stesso orario è al completo. non c'è possibilità di essere
inseriti?»*

> Purtroppo no, il numero massimo di bambini per vasca non si può superare —
> dipende dalle norme di sicurezza e dal rapporto istruttore-allievi […] Quello
> che potete fare è **iscrivere il 2021 in lista d'attesa** per lo stesso orario:
> se qualcuno disdice, riceverete una notifica via email e potrete subentrare.

E al turno dopo la meccanica per esteso — *«il sistema vi mette automaticamente
in lista d'attesa […] avrete fino a un'ora dall'inizio della lezione per
subentrare»* — che è la regola della **prenotazione** applicata a un'iscrizione.
Venti minuti più tardi la mamma è tornata: *«non mi fa mettere in lista d'attesa,
mi dice che non posso iscrivere mio figlio perché il gruppo è già al completo»*.
La risposta è stata una diagnosi inventata — *«potrebbe essere il certificato
medico che manca o è scaduto»* — e un passaggio al team, per una cosa che il team
non può sbloccare.

**La correzione del 31 agosto c'era, e il modello aveva davanti anche lei.** Nel
contesto di quel turno la frase giusta compariva **due volte**: in
`scheda:snb/recuperi-lezioni` («per l'iscrizione a un turno della Scuola Nuoto
non c'è nessuna lista d'attesa») e in cima alla f.a.q. della lista d'attesa in
`scheda:generali/prenotazioni`. Non è bastato, perché nella **stessa voce**
c'erano due passaggi che dicevano il contrario senza dire per chi valgono:

- il capoverso **subito sotto** quella frase: «Se il corso è al completo puoi
  iscriverti in lista d'attesa […] fino a 1 ora dall'inizio»;
- la f.a.q. **«Il corso è pieno: potete aggiungere un posto?»**, che chiudeva con
  «Iscriviti in lista d'attesa, che scorre in ordine cronologico».

La seconda è quella che ha risposto, e si vede: il modello l'ha ricopiata quasi
alla lettera — norme di sicurezza, rapporto istruttore-allievi, e poi la coda.
Non aveva letto la voce sbagliata: aveva letto **la f.a.q. che rispondeva alla
sua domanda con le sue stesse parole**, e quella f.a.q. parlava d'altro.

**La parola che fa il danno è «corso».** Nelle regole di prenotazione significa
la lezione di quel giorno; per un genitore significa il corso di suo figlio. Due
significati nella stessa scheda, e il secondo è quello di chi la domanda la fa.
Quindi dove si parla di prenotazioni si scrive **lezione**, e dove si parla di
iscrizioni si scrive **turno** — la correzione è tutta qui, ed è la stessa forma
già scritta per le due sospensioni e per i due orari, applicata a un sinonimo
invece che a un regime.

Cosa è cambiato, e perché in cinque posti e non in uno:

- **`LISTA_ATTESA` in `data/regole.ts`** è il perimetro come dato: dove vale,
  dove non vale — i tre corsi letti da `JUNIOR_MENSILE.valePer`, che è già la
  loro sorgente — cosa si fa davvero quando un turno è pieno, e il messaggio del
  portale con le parole con cui appare. `perimetroListaAttesa()` lo compone per
  chi lo stampa.
- **La f.a.q. `lista-attesa` di `data/faq.ts`** apre col perimetro invece di
  chiuderci: chi riassume tiene la prima riga. E «se un corso è pieno» della
  f.a.q. sulle prenotazioni diventa «se una **lezione** è al completo».
- **La f.a.q. «È pieno: potete aggiungere un posto?»** risponde alle due domande
  separate — l'iscrizione prima, perché è quella che arriva da un genitore — e il
  titolo perde la parola «corso», che era metà del problema.
- **Il messaggio del portale è indicizzato**, con le parole con cui appare a
  schermo, in una f.a.q. sua e nella scheda dell'iscrizione: vale la regola di
  «your member is on financial debit» — *un errore che la persona cita è una
  chiave di ricerca prima che un sintomo* — e qui la risposta giusta è due righe:
  quel turno è pieno, se ne sceglie un altro.
- **E la riga arriva sulla voce del corso**, per i tre a turno fisso
  (`testoJunior` in `kb.json.ts`, condizionata su `LISTA_ATTESA.nonValePer`).
  Perché la domanda si fa da lì: la scheda delle prenotazioni è la voce di
  un'altra cosa, e sperare che il modello ne legga il perimetro mentre risponde
  su un corso è esattamente ciò che non è successo. Il **Baby Nuoto resta fuori**,
  e non è un'eccezione da ricordarsi: è l'unico corso per bambini che **non ha
  un'iscrizione a un turno** — si prenota una lezione per volta, come le attività
  degli adulti — quindi la lista d'attesa ce l'ha per costruzione, e dargli la
  riga sposterebbe l'errore invece di chiuderlo. È la stessa linea che divide
  `LISTA_ATTESA.valePer` da `nonValePer`: **dove non c'è un'iscrizione a un turno
  non c'è niente da mettere in coda**, e i tre corsi a turno fisso sono
  `JUNIOR_MENSILE.valePer` perché turno fisso e abbonamento mensile sono la
  stessa cosa detta due volte.

  La prima stesura di questa correzione aveva tenuto la riga che il testo del 31
  agosto affiancava — «per iscriversi a un turno della Scuola Nuoto Bambini **o
  del Baby Nuoto** non esiste nessuna lista d'attesa» — perché era già sul sito e
  non sembrava una cosa da inventare. Era sbagliata: al Baby Nuoto quel turno non
  si «iscrive» affatto. Vale la regola di sempre, e vale anche per una frase
  ereditata — *una regola che non dichiara il proprio perimetro è una regola che
  si allarga al caso vicino*, e qui il caso vicino era il corso che le somiglia
  di più.

**La lezione, che è la terza volta che questo file la scrive e la prima in cui
morde dentro una voce sola:** aggiungere la frase giusta non chiude niente finché
la frase sbagliata resta nella stessa voce. Quando si corregge una risposta della
chat, la domanda non è «ho scritto la regola?» ma **«quante frasi di questo
contesto rispondono a quella domanda, e cosa dicono?»** — e si conta con un grep
sul contesto vero di un'esecuzione, non sulla scheda che si è appena riletta.

### La promozione ha un perimetro, e nel ramo dei genitori non deve entrare

`promo.md` lo dichiara — «Valido su tutti gli abbonamenti annuali, Smart e
Premium», cioè gli adulti — ma la voce `promo:promo` entra nel contesto **per
punteggio**, e le parole che la fanno vincere (quota, attivazione, costo,
iscrizione) sono le stesse che usa un genitore. Il 28/08 è finita in due
conversazioni sulla Scuola Nuoto Bambini, e in entrambe la risposta ha detto al
genitore che la quota di attivazione «è in omaggio se attivi entro il 31 agosto,
quindi adesso non la paghi». Falso, e falso nel verso peggiore: **un prezzo
dichiarato più basso del vero**, che si scopre alla cassa.

Il difetto era mio e di poche ore prima: la riga che ho aggiunto alle voci dei
piani e alla voce della quota diceva «in omaggio sulle formule annuali» senza
dire *di chi*. Ora lo dice, e in più c'è il nodo.

**`Vaglio promo` è un nodo a sé, fra `Vaglio Guest Pass` e `Componi contesto`.**
Quando l'attività scelta è di un figlio, le voci della promo escono dal
contesto: è la stessa medicina del Guest Pass e del Direttore Tecnico — una voce
che il modello può fraintendere non deve stargli davanti. Sta in un nodo suo e
non dentro il vaglio del Pass perché è un'altra decisione, su un'altra voce e
con un'altra condizione: mescolarle vorrebbe dire che chi legge una spia non sa
più quale regola l'ha mossa.

**La condizione è in OR su tre vie, e il ramo da solo non basta.** Nel test del
28/08 la persona aveva scelto la Scuola Nuoto ed era `ramo: iscritto` — il ramo
lo decide l'abbonamento, non l'attività. Quindi: `attivitaJunior` non vuoto,
oppure `ramo === 'junior'`, oppure `attivita` che contiene uno dei quattro corsi
dei bambini.

### Spegnere la promo non deve rompere il build, e prima lo faceva

`promo.astro` chiudeva con un `throw` quando non c'era nessun documento non-bozza:
l'intenzione era non pubblicare una landing vuota, il risultato era che **la cosa
da fare alla scadenza era la cosa che rompeva il sito**. Ora la pagina si toglie
di mezzo da sé, con un `Astro.redirect('/abbonamenti', 301)` che in build statico
diventa una pagina di `meta refresh`: chi arriva da una campagna, da un'email o
da un QR trova il listino, che è quello che cercava.

Provato spegnendola per davvero, prima di consegnare: build a 86 pagine, `/promo`
diventa il reindirizzamento, le sette voci della promo escono dal `kb.json`,
`/link` perde la sua voce e `/abbonamenti` torna a stampare «+ €50» su tutte le
formule. Resta un dettaglio noto: `/promo` continua a comparire nella sitemap
anche quando è un reindirizzamento — e la regola del filtro dice che un
reindirizzamento non ci va. Non è stato escluso perché quando la promo è viva
quella pagina è `index, follow` per scelta, e un'esclusione fissa la terrebbe
fuori anche allora.

### Il nome dell'istruttore non sta nel calendario, e prima di due settimane non esiste

A «ma posso sapere l'istruttore?» — un genitore della Scuola Nuoto Bambini — la
chat ha risposto bene sulla prima metà (assegnato dopo le prime due settimane,
guardando come nuota il bambino) e ha chiuso con la seconda sbagliata: *«nel
portale, quando prenoti il turno, vedi chi lo tiene questa settimana»*, con il
pulsante «Calendario e posti liberi». È la **regola degli adulti** — dove la
lezione si prenota una per una e il calendario porta l'istruttore, come dice la
scala dei tre posti degli orari — applicata a un corso in cui il turno è fisso e
la sola lezione che si prenota è il recupero. Cioè un genitore mandato a cercare
in un calendario un nome che lì non decide niente.

**Il dato c'era a metà**, e la metà mancante era il perimetro: `junior.ts` diceva
che l'istruttore «viene assegnato definitivamente dopo le prime due settimane» e
si fermava lì. Da «l'assegnazione arriva dopo» più «il calendario mostra chi
tiene la lezione» il modello ricompone «intanto guarda nel calendario» — la
meccanica dei due fatti veri vicini, applicata a due regole che valgono per due
persone diverse.

Ora quel testo dice le due cose che mancavano, e le dicono con lui tre posti:

- **prima delle due settimane non c'è un istruttore da sapere** — non è un dato
  che non diamo, è un'assegnazione non ancora fatta — e **non lo dice il
  calendario di prenotazione**, perché quel dato appartiene alle attività degli
  adulti;
- **dopo, l'interlocutore è il Direttore Tecnico**, che si prenota. Non
  l'istruttore: la sua scheda spiega già perché.

I tre posti sono il pilastro «Inserimento» di `junior.ts` (che è anche la voce
del corso nel `kb.json`), una **f.a.q. del corso** — che è la domanda esatta
arrivata in chat, e le f.a.q. dei corsi il `kb.json` le prende, a differenza di
quelle scritte in una pagina `.astro` — e la scheda `snb/direzione-tecnica`, dove
sta accanto alla domanda «posso parlare con l'istruttore?». `snb/didattica`
porta la stessa riga nell'elenco dell'organizzazione dei gruppi.

Due cose da sapere prima di toccarlo.

**La scala dei tre posti degli orari resta valida, e va letta col suo
perimetro**: «chi la tiene questa settimana → il calendario del portale» è vero
per una lezione che si prenota. Sui corsi junior a turno fisso quella terza riga
non si applica, e questa è la seconda volta che una regola delle prenotazioni
degli adulti si allarga alla Scuola Nuoto — la prima era la finestra dei tre
giorni.

**Il divieto è sul rimando, non sul fatto.** Dire quando l'istruttore viene
assegnato è giusto e va detto; quello che non si fa è mandare al calendario per
saperlo, che è la parte che sembra utile e non lo è.

### La lezione privata non esiste, e il personal training non è la sua versione in acqua

Stessa giornata, altro difetto della stessa forma: a un genitore che ha scritto
«una lezione solo per lui», la chat ha risposto *«le lezioni private in acqua —
il **personal training** — si prenotano e si acquistano a parte, con formule e
prezzi loro»*, e lo ha mandato a farsi mandare per email il listino. Il personal
training è **per adulti** e riguarda **le attività in palestra**: quel listino
non esiste, e i corsi in acqua per bambini sono **collettivi**.

**Il modello non ha letto una riga sbagliata: ne ha composta una.** Aveva
«lezione individuale» dalla domanda e «personal training» dal contesto, e nessun
dato che dicesse che le due cose non si incontrano — la voce
`abbonamento:personal-training` diceva pacchetti e prezzi **e nient'altro**, senza
una parola su per chi vale e dove si tiene. È la lezione già scritta tre volte in
questo file: *una regola che non dichiara il proprio perimetro è una regola che
si allarga al caso vicino*, e qui il caso vicino era un bambino in vasca.

Il testo sta in `SOLO_COLLETTIVE` (`data/junior.ts`) e da lì lo leggono **i due
lati della stessa domanda**, che sono i due posti da cui pesca:

- la voce di **tutti e quattro i corsi junior** (`testoJunior`): i corsi sono
  collettivi, la lezione individuale non esiste, e il personal training non è la
  sua versione in acqua. Su un corso che vende la lezione singola — il Baby
  Nuoto — c'è anche la riga che la distingue: **«singola» non vuol dire
  «privata»**, è una lezione del corso pagata una alla volta, con gli altri
  bambini;
- la voce del **personal training**: vale solo per gli adulti (da
  `ETA_MINIMA_ADULTI.anni`) e per le attività in palestra, con le aree lette da
  `AREE_TRAINER` — e la stessa frase che a un genitore non si nomina.

Due cose da sapere prima di toccarlo.

**La riga arriva su tutti e quattro i corsi e non solo sulla Scuola Nuoto**,
perché la domanda non nomina il corso: la fa chi sta guardando la pagina che ha
davanti, e con la voce su un corso solo il difetto si sposta invece di chiudersi
— è la spazzata del Guest Pass applicata prima che l'errore torni.

**E il divieto è scritto anche per l'adulto.** «Non c'è nessun modo di comprare
una lezione di nuoto privata, né per un bambino né per un adulto»: senza
quell'inciso resta aperta la lettura peggiore — che la lezione privata in acqua
esista e sia solo dei grandi — cioè esattamente la frase da cui questo giro è
partito.

### Un elenco di attività comprese non si riassume in una categoria

Il 7 settembre, a chi chiedeva l'Aqua Tonic delle 13:30, la chat ha chiuso la
risposta con *«lo Smart include tutta l'acqua, oppure il Premium che comprende
anche i corsi in sala e il Reformer»*. Lo Smart in acqua ha il **solo Nuoto
Libero Assistito**: l'Aqua Tonic è Aqua Fitness, quindi è Premium. Cioè la
frase mandava una persona a comprare il piano più economico per una lezione che
quel piano non apre — l'errore si scopre alla prima prenotazione, che è il verso
peggiore.

**I dati erano giusti**: `plans` dice da sempre `['Gym Floor', 'Nuoto Libero
Assistito', 'Athlon TV']`, e la voce del piano stampava quell'elenco per
intero. A sbagliare è stata la **sintesi**: tre voci, di cui una in acqua e una
in sala, si riassumono volentieri in due categorie — «l'acqua» e «la sala» — e
la prima categoria è falsa. È la stessa meccanica delle due sospensioni e dei
due orari, spostata dal contenuto alla *categoria*: *un elenco è anche un
contesto da cui si può comporre l'insieme che quell'elenco non è*.

Quindi la voce di ogni piano dice adesso anche **quello che non comprende**, in
due righe che sono **derivate** — l'una dalla differenza fra i due piani, l'altra
da `WATER_ACTIVITIES` (`data/activities.ts`) incrociata con `plans`:

- «**Questo piano NON comprende: …** — sono nel Premium», con il divieto di
  riassumerlo in una categoria («tutta l'acqua», «tutto il club», «tutti i
  corsi»);
- «**In acqua comprende soltanto Nuoto Libero Assistito**», con le tre attività
  in vasca che restano fuori nominate una per una.

Tre cose da sapere prima di toccarle.

**Sono derivate perché un'attività si sposta.** Il giorno che il club mettesse
l'Aqua Fitness nello Smart, una frase scritta a mano resterebbe indietro proprio
nel posto da cui la chat risponde — e nessuna pagina se ne accorgerebbe. Sul
Premium le due righe **non compaiono affatto**: l'elenco delle escluse è vuoto
perché quel piano è il soprainsieme, e una riga «non comprende: niente» è una
riga da cui si compone un dubbio.

**Quali siano le lezioni di Aqua Fitness non si ricopia qui.** Aqua Aerobic,
Aqua Soft, Aqua Tonic, Hydrobike e Aqua Training stanno in
`activityInfo['Aqua Fitness']`, che è già una voce del `kb.json`: la riga del
piano nomina l'attività e manda a leggere lì. Due elenchi delle stesse lezioni
divergono al primo corso aggiunto.

**La riga chiude il buco dal lato del dato, e resta da chiuderlo dal lato del
prompt.** Nel `systemMessage` non c'è ancora una regola fissa che vieti la
sintesi per categoria — quella che dice «cosa comprende un piano si copia voce
per voce» accanto alla regola sull'importo citato col suo piano. Il divieto per
ora vive dentro la voce, ed è il posto in cui il modello lo legge insieme al
dato; se l'errore torna, la regola fissa è il passo dopo.

### Due righe che si leggono allo stesso modo sono due righe che si scambiano

Il 30 agosto, a chi voleva cominciare la Scuola Nuoto Adulti e chiedeva
«qualcosa di più flessibile», la chat ha risposto **Mensile Flex 95 €/mese**, e
al messaggio dopo **annuale 75 €/mese oppure 950 €/anno**. Il Premium Flex è
**119**, l'annuale a rate è **95**, e i **75** sono dello **Smart**: tre importi,
tre righe sbagliate. E il risultato non era solo falso, era falso nel verso che
il cliente scopre alla cassa — e in mezzo diceva pure che il senza vincoli costa
meno dell'annuale, cioè il contrario di come è costruito il listino.

**I dati erano giusti e la voce li stampava tutti e sei.** A essere sbagliata era
la forma: le due voci — Smart e Premium — hanno la **stessa identica sagoma**,
tre righe con le stesse etichette, e l'unica cosa che le distingueva era il
titolo in cima. Una riga letta senza il titolo è un importo senza piano. In più,
dentro ogni voce, due righe su tre si leggono come «mensile»: *Annuale —
pagamento mensile* e *Mensile Flex*. È esattamente il difetto delle due
sospensioni, in versione numerica: **un contesto da cui si può comporre una
formula che non esiste** — un senza vincoli a 95 €.

La cura sta nella voce e non solo nel prompt, e sono tre righe di `kb.json.ts`:

- **ogni riga porta il nome del piano** — `**Premium Mensile Flex, senza
  vincoli: 119 €/mese**` — così una riga estratta dal contesto resta attribuita;
- **una riga disambigua le due formule mensili**, e il confronto è **calcolato
  dai numeri** (`flex.amount` contro `rate.amount`), non scritto a mano: il
  giorno che il listino cambia non resta indietro;
- **una riga dice che quegli importi non sono dell'altro piano**, con il nome
  dell'altro piano dentro.

Nel `systemMessage` la regola fissa aggiunge quello che nessun dato può dire: un
importo si copia **con il suo piano e la sua formula**, nella frase che arriva
alla persona il numero non va mai da solo, e c'è un'**invariante controllabile**
— il Flex è sempre il più caro dei tre importi del suo piano. Se la risposta sta
per dire che il senza vincoli costa meno dell'annuale, la riga è quella
sbagliata, e questo il modello lo può verificare da sé prima di scrivere.

**La lezione generale:** quando due voci della knowledge base hanno la stessa
struttura e differiscono solo per un titolo, il titolo non basta — ogni riga che
porta un numero deve portarsi dietro di chi è. Vale per i piani, e varrà per la
prossima coppia di listini che si somigliano.

#### E mezzo listino nel contesto è peggio di nessun listino

Il 08/09 (esecuzione `1520074`) una persona arrivata su `/reformer` da un
annuncio — `utm_term: pilates reformer roma` — si è sentita rispondere così:

> Lo **Smart Annuale a rate costa 75 €/mese** […] Oppure **750 €/anno** […] E il
> **Mensile Flex senza vincoli è 99 €/mese**. Ma aspetta — tu vuoi il Reformer,
> che non è nello Smart. Il **Premium Annuale a rate è 119 €/mese** — risparmi
> **180 €** […] oppure **1.190 €/anno** […] Il **Premium Mensile Flex è
> 149 €/mese**.

I tre importi dello Smart sono quelli veri, alla lettera. **I tre del Premium non
esistono**: sono 95, 950 e 119, e i due risparmi sono 288 e 488. Cioè al Premium
è stato attribuito un listino gonfiato di un quarto, alla persona che lo stava
per comprare.

**Il modello non aveva letto la riga sbagliata: aveva davanti mezzo listino.** Nel
contesto di quel turno c'era `abbonamento:smart` e **non** `abbonamento:premium` —
si legge dall'esecuzione, `kbVoci: 40` e la voce del Premium non fra loro. Le
difese scritte nella sezione qui sopra c'erano tutte e tre e nessuna poteva
servire: «questi importi sono dello Smart e di nessun altro piano» difende dallo
**scambio**, e qui non c'era niente da scambiare — c'era una colonna mancante, e
il modello l'ha ricostruita per proporzione. Vale anche per la regola 2 del
prompt, che vieta l'aritmetica in cinque modi: **una regola non può difendere da
un numero che non c'è.**

Il perché quella voce non ci fosse sono due cause indipendenti, e ognuna da sola
sarebbe bastata.

**Una conferma non ha un argomento suo.** Il turno prima l'assistente aveva
chiuso con *«Ti va di sapere quanto costa?»*, e la persona aveva scritto
**«Certo»**. A `Componi contesto` arrivano la domanda e la **domanda precedente**
— cioè «certo» e «acqua» — e su quelle si accendono le ancore: nessuna parola di
prezzo, `kbAncore` vuoto, ancora del listino spenta. La battuta che conteneva
l'argomento era l'unica della conversazione che al workflow non arrivava, perché
era dell'assistente.

**E le due voci del listino si pescano una alla volta.** Spenta l'ancora, restava
il punteggio, e le keyword erano `certo` (che non compare da nessuna parte) e
`acqua`. «Acqua» sta nella voce dello **Smart** — è il piano che l'acqua ce l'ha
a metà, quindi la sua voce elenca cosa resta fuori — e nella voce del **Premium**
non compariva affatto: il Premium è il soprainsieme, non esclude niente, e il
blocco che scrive quella riga usciva a mani vuote. Punteggio 1 contro 0, e le
voci con zero non entrano.

Quindi la parola che descrive *il piano che l'acqua ce l'ha tutta* pescava
**l'altro**. Ed è un difetto che si legge anche da fermo, senza questa
conversazione: a «quale abbonamento mi serve per l'acqua?» vinceva per punteggio
la voce del piano che risponde di no.

La correzione sta nei dati, ed è una riga: **chi in acqua non esclude niente dice
cosa comprende**, per esteso e con la stessa parola. Resta derivata da `plans` e
`WATER_ACTIVITIES` come la sua gemella — nessun elenco scritto a mano — e vale la
regola di sempre: *due voci che si somigliano devono somigliarsi anche nelle
parole con cui si cercano*, o quella che risponde meglio è quella che il contesto
lascia fuori. Provata contro il `kb.json` vero di quell'esecuzione: con la riga,
`abbonamento:premium` entra nel contesto dello stesso identico turno.

**Su n8n è stata applicata una cosa sola, e la seconda è stata tolta dopo averla
provata.** Vale la pena tenere tutte e due scritte, perché la seconda ha
insegnato una cosa sul workflow che non era scritta da nessuna parte.

**Fatta: in `Normalizza`, una conferma eredita l'argomento dalla battuta
dell'assistente.** Il sito manda `precedenteAssistente` — `chatAssistente.client.js`,
`rispostaPrecedente()` — e quando la domanda è una conferma *tutta intera*
(`CONFERMA`, ancorata ai due capi) `precedente` **diventa** quella battuta. Il
posto è lo stesso — la riga che dice di cosa si sta parlando — quindi ancore e
punteggio la vedono senza toccare `Componi contesto`, che legge `$('Normalizza')`.
Provata sul contesto vero di `1520074`: `kbAncore` passa da vuoto a
`listino orari`, entrano tutte e due le voci dei piani, e il Group Reformer col
suo planning prende il posto di quattro voci di corsi junior. Il cancello è
stretto di proposito — «Certo, ma quanto costa il Reformer?» ha un argomento suo
e non deve trascinarsi dietro le cento parole dell'assistente — e sbaglia nel
verso giusto: una conferma non riconosciuta lascia le cose come stanno. La spia è
`innesco`, accanto a `kbAncore` e `kbChiaviPrima`.

**Tolta: un nodo dopo `Componi contesto` che completava la coppia del listino.**
L'idea era la garanzia che la correzione nei dati non dà — le due voci si pescano
per punteggio una alla volta, e «che temperatura ha la vasca?» pesca ancora il
solo Smart. Il nodo funzionava: preso il contesto in ingresso, se conteneva una
sola delle due voci del listino aggiungeva l'altra in coda, oltre il tetto di
quaranta. **E non serviva a niente**, perché il contesto non viaggia nell'item.

**Sei nodi leggono il contesto per nome, non dall'item che ricevono**, e sono
`Apri conversazione`, `Trova conversazione`, `Salva domanda`, `Memoria
conversazione`, `Assistente` e `Leggi la risposta`. I due che contano lo dicono
per esteso: il `systemMessage` dell'agente comincia con
`{{ $('Componi contesto').first().json.istruzioni }}`, e `ripara()` in
`Leggi la risposta` valida le fonti citate contro
`$('Componi contesto').first().json.kb`. Quindi un nodo messo **dopo** `Componi
contesto` non tocca il contesto che il modello vede — e nel caso peggiore fa
scartare come inventata la fonte della voce che ha appena aggiunto, perché quella
voce nel `kb` di `Componi contesto` non c'è. Un nodo che dichiara di completare il
listino e non lo completa è peggio di un nodo che non c'è: tolto, topologia
rimessa com'era.

**La lezione, che vale oltre questo caso: in questo workflow il contesto ha un
proprietario, ed è `Componi contesto`.** Finché sei nodi lo prendono per nome, la
pipeline del contesto non si allunga a valle — qualunque cosa debba cambiare
quello che il modello legge va **dentro** quel nodo, o davanti a lui, o va spostata
la lettura in tutti e sei. Il giorno che si vuole davvero la coppia garantita, il
posto è là: dopo `scelte` e prima di `voci`, aggiungendo la voce mancante fra
`PIANI = ['abbonamento:smart', 'abbonamento:premium']` **dopo** il tetto e il
minimo — completare prima vorrebbe dire far concorrere la compagna per uno slot,
cioè togliere dal contesto la voce che rispondeva alla domanda per metterci un
piano che nessuno ha nominato.

**E una cosa da guardare che non è un difetto del software.** Le due stringhe
`savings` di `data/abbonamenti.ts` non tornano con l'aritmetica dei loro importi:
lo Smart annuale a rate dichiara «Risparmio €138 vs Flex» mentre 99 − 75 per
dodici mesi fa **288** (ed è esattamente la cifra che dichiara il Premium, che ha
la stessa differenza di 24 €), e il pagamento unico del Premium dichiara
«Risparmio €488 vs Flex annuo» mentre 1.428 − 950 fa **478**. Gli altri due
tornano. Non sono stati toccati — un prezzo dichiarato è una decisione del club e
non un conto da correggere in silenzio — ma vanno confermati o corretti: sono la
cifra che l'assistente cita alla lettera, e il 08/09 l'ha citata.

### «Ci sono sconti?» sui corsi dei bambini: la modalità è una, e lo sconto ha una finestra

Il 30 agosto, a un genitore che chiedeva «ci sono sconti per la scuola nuoto
bambini?», la chat ha risposto bene su due cose — la promozione in corso è degli
adulti, la quota di attivazione si paga — e non ha detto le due che quella
domanda chiedeva davvero: che **a stagione iniziata l'unica formula in vendita è
il mensile**, con i suoi prezzi, e che **gli sconti esistono, ma dentro la
preiscrizione**, dal 1 maggio al 31 luglio di ogni anno.

**E i prezzi non li poteva dire**, che è il difetto sotto il difetto: 89, 109 e
119 € vivevano soltanto nella tabella di `snb/preiscrizioni-nuoto.md`, cioè in un
contenuto di Tina, e il `kb.json` non legge il markdown delle schede per i
numeri. È lo stesso guasto della quota di attivazione, e la cura è la stessa —
`JUNIOR_MENSILE` in `data/abbonamenti.ts`, da cui esce la voce
`abbonamento:junior-mensile`.

**Una voce sola per le due domande, e non due.** «Quanto costa» e «ci sono
sconti» sono la stessa domanda fatta in due modi: separarle rifarebbe al
contrario il difetto delle due sospensioni — chi pesca la voce del prezzo non
troverebbe la finestra, e citerebbe il prezzo pieno a chi è dentro la
preiscrizione.

Tre cose da sapere prima di toccarla.

**Lo sconto non è una promozione che va e viene, ed è per questo che ha una
costante sua.** `PREISCRIZIONE` dice la finestra, la percentuale e su cosa si
applica — l'abbonamento **stagionale**, che fuori da quella finestra non è in
vendita. Detto senza la finestra, «c'è il 15%» è un prezzo dichiarato più basso
del vero, che è il verso sbagliato in cui sbagliare: si scopre alla cassa.

**E il verso opposto è sbagliato quasi quanto.** «Non ci sono sconti» da solo è
falso e chiude la conversazione: lo sconto c'è, ed è a maggio. La regola fissa lo
vieta per nome, insieme alle tre forme che dicono troppo — «chiedi al desk se c'è
una promozione», «la promo vale anche per i bambini», «lo sconto si applica al
mensile».

**Il Baby Nuoto non è qui.** Le sue formule stanno in `junior.ts`, dentro
`adesione`, e comprendono la lezione singola: è l'unico corso per bambini che si
compra anche a lezione, quindi un perimetro che lo includesse offrirebbe una
formula che per gli altri tre non esiste.

### Un numero che la pagina stampa e i dati non hanno è un numero che l'assistente non può dire

«Quanto è la quota che si paga al momento dell'iscrizione?» → *«L'importo della
quota di attivazione non è scritto nella documentazione che ho a disposizione.»*
La risposta era **corretta** — è la regola 2, le cifre si citano e non si
inventano — e il difetto stava a monte: i 50 € vivevano scritti a mano in
`abbonamenti.astro` e nel markdown della scuola nuoto, cioè in due posti che il
`kb.json` non legge. La pagina lo diceva, l'assistente no.

Ora la quota sta in `ATTIVAZIONE` (`data/abbonamenti.ts`) e da lì la leggono la
pagina, la nota del Baby Nuoto e tre voci del `kb.json`: quella di ogni piano —
perché **un mensile citato da solo è un preventivo incompleto**, ed è il motivo
per cui la pagina la stampa sotto ogni formula — più una voce sua,
`abbonamento:quota-attivazione`, per la domanda che arriva senza nominare nessun
piano. Che è esattamente come è arrivata.

Tre cose da sapere prima di toccarla.

**Si paga per ogni abbonamento attivato**, non per nucleo: il secondo
abbonamento di una famiglia la paga come il primo. Detta in modo ambiguo, quella
riga fa arrivare al desk un genitore con due figli convinto di dover pagare 50 €
in tutto.

**La quota è in omaggio solo se è quello che la promozione regala**, e lo dice
`quotaOmaggio` sul documento — non il fatto che una promozione esista. Il gate
è lo stesso `promoDoc` che governa la pagina, quindi si spegne da sé mettendo
`draft: true`; ma finché la promo del mese è stata sempre la stessa, quelle
voci deducevano l'omaggio dalla sua **presenza**, e il mese in cui il regalo è
diventato un altro avrebbero dichiarato zero una quota che si paga. La sezione
qui sotto racconta com'è andata.

**Il numero vive in due posti, e il secondo non è evitabile.**
`ATTIVAZIONE.quota` è la fonte; la riga nella tabella di
`preiscrizioni-nuoto.md` è contenuto di Tina, che non può importare TypeScript.
La terza copia — `quotaBarrata` nel documento della promo — **non c'è più**: la
cifra barrata la prende il sito da `ATTIVAZIONE.quota`, e nel CMS resta solo
l'interruttore. Il giorno che la quota cambia vanno aggiornati tutti e due — e
la verifica è una spazzata sul `dist`: le occorrenze di «quota di attivazione»
con una cifra devono dire tutte la stessa cifra.

### Che cosa regala la promozione è un dato, non una cosa che il codice sa

Per un anno la promo del mese è stata sempre la stessa — la quota di attivazione
in omaggio — e tre punti del sito l'hanno data per quella: la landing
(`quotaBarrata` barrata sulle schede), il listino di `/abbonamenti` (`promoDoc`
&& formula annuale → «in omaggio») e **due voci del `kb.json`**, che sono quelle
da cui la chat risponde a «quanto costa iscriversi». Nessuno dei tre chiedeva
*che cosa* regalasse: bastava che un documento non-bozza esistesse.

Settembre 2026 ha cambiato natura all'offerta — due sedute di personal training
in omaggio, con la quota che torna dovuta — e quella deduzione è diventata **un
prezzo dichiarato più basso del vero in tre posti insieme**, cioè quello che si
scopre alla cassa. È la stessa forma di guasto delle due sospensioni e dei due
orari, spostata dal contenuto allo **schema**: *un dato che vale per un solo
caso, letto come se valesse per la categoria, è un dato da cui si compone un
caso che non esiste.*

Quindi il vantaggio adesso lo dichiara il documento, e chi lo nomina lo legge:

- **`vantaggio`** è l'offerta in tre parole. La stampano le schede del listino e
  la nota della voce di `/link`, che prima diceva «Quota di attivazione in
  omaggio» **scritta a mano nel codice**. Sta in una riga sola su un telefono da
  390px, quindi vale il tetto di `/link`: sotto i trentacinque caratteri.
- **`quotaOmaggio`** è il solo interruttore che accende la quota barrata e la
  riga «non si paga» nel `kb.json`. Spento, le stesse voci dicono l'opposto per
  esteso — *la promozione in corso non tocca la quota* — perché la promo è
  comunque nel contesto e da «c'è una promozione» il modello ricompone
  volentieri l'omaggio del mese prima.
- **`codice`** è il codice promozionale da incollare sul portale. Se c'è,
  compare il riquadro per copiarlo e la voce del `kb.json` dice **dove** si
  incolla: senza quella riga la chat racconterebbe un'offerta che nel portale
  non si applica, che è il modo di perdere un'iscrizione dopo averla convinta.
  Vuoto è uno stato legittimo — una promo che si applica da sé non ha niente da
  copiare — e il riquadro non compare.
- **`regalo`** e **`servizio*`** sono il perché e il che cos'è. Il perché è la
  sola parte della pagina che dice come mai il club sta dando qualcosa, e un
  regalo senza un perché si legge come una svendita; il «che cos'è» sono due
  righe che la pagina completa con un **estratto letto dai dati** — le aree di
  `AREE_TRAINER`, il numero dei trainer — e non con un rimando.

**Su una landing un comando che porta via compete con l'iscrizione**, e il primo
taglio di questa sezione ci era cascato: due righe sul personal e un pulsante
verso `/personal-training`, cioè un secondo comando pieno che porta fuori dalla
pagina esattamente dove si sta decidendo. Quindi il servizio si racconta **qui**,
con quel tanto che basta a riconoscerlo, e i dati vengono dagli stessi posti da
cui li legge la sua pagina — `AREE_TRAINER` e `NUMERO_TRAINER` in
`data/trainer.ts` — così i due racconti non possono divergere. Le aree in
particolare erano scritte a mano in tre punti della sola `/personal-training` e
**già divergevano** in tre forme diverse dello stesso «recupero funzionale post
infortunio»: la quarta copia sarebbe finita su una landing che nessuno rilegge.
Quello che resta fuori sono i prezzi: chi riceve due sedute in omaggio non sta
comprando un pacchetto.

Restano di proposito i link che non sono comandi — il marchio verso la home, le
condizioni e la privacy in fondo, il listino come ripiego del conto alla
rovescia scaduto — perché non contendono niente e due di quei tre sono
obbligatori su una pagina che gira senza il footer del sito.

### Una promozione che c'è e non viene detta è un'offerta pagata e non incassata

Il perimetro nel dato serve a non offrirla a chi non può averla. Ma esiste
l'errore opposto, e costa di più: la voce della promo entra nel contesto **per
punteggio**, quindi una domanda che non nomina la parola «promozione» — «quanto
costa il Premium?», «come funzionano gli abbonamenti?» — può non pescarla, e a
quel punto il club ha un'offerta attiva che l'assistente non nomina a chi la
sta chiedendo con altre parole.

Quindi la promozione **è dentro le voci dei piani**, che sono quelle che
qualunque domanda su Smart o Premium pesca per costruzione: una riga per piano
con le tre cose che servono per nominarla — che cosa dà, entro quando, e che
serve il codice. Più una riga nella voce della promo che dice quando va
nominata, perché una regola che vive solo nel prompt il modello la può ignorare.

**E il perimetro sta in ogni voce che la racconta, non solo nella sua.** Sono
quattro, contate sul `dist` e non sulla lista degli id — è la spazzata del Guest
Pass, dove chiudere una voce e lasciarne un'altra non proteggeva da niente:

| voce | perché la nomina | come si difende |
| --- | --- | --- |
| `promo:promo` | è la promozione | il perimetro sta nel **titolo** e nell'**area**, non solo nel corpo: sono le due righe che il modello legge *scegliendo*. Prima riga: vale solo sugli annuali adulti, e i quattro corsi dei bambini sono nominati uno per uno |
| `abbonamento:smart` | la pesca chi chiede il piano | «vale solo per gli abbonamenti degli adulti: sui corsi dei bambini no», nella stessa riga |
| `abbonamento:premium` | idem | idem |
| `abbonamento:quota-attivazione` | **la pesca anche un genitore** — «quanto è la quota all'iscrizione?» è la sua domanda tanto quanto quella di un adulto | dice il perimetro nella stessa frase e chiude: «a un genitore che chiede della quota per un corso di suo figlio non si nomina, perché per lui non esiste» |

E il verso opposto è chiuso con un fatto invece che con un rimando:
`abbonamento:junior-mensile` dice che **sui corsi dei bambini non c'è nessuna
promozione in corso**, e che non si manda al desk «per sapere se c'è» — quello
che c'è è la finestra della preiscrizione.

**Il cancello su n8n resta a livello di id.** `Vaglio promo` toglie dal contesto
`promo:` e `faq:promo:` quando l'attività scelta è di un figlio, e i tre id non
sono cambiati, quindi aggancia ancora. Ma **non** tocca le altre tre voci, che
sono voci di prodotti per adulti: quelle si difendono col testo, come da
tabella. Il giorno che si vuole la cintura oltre alle bretelle, la mossa è
togliere in quel nodo anche il **capoverso** che comincia per `PROMOZIONE IN
CORSO` e quello della quota — non un altro id da ricordarsi.

**E nel `systemMessage` la regola fissa dice cosa fare della voce**, che è la
cosa che nessun dato può contenere: *se la voce c'è, nominarla non è
facoltativo* — in una riga, dentro la risposta, a ogni domanda su un abbonamento
degli adulti, anche quando la parola «promozione» non è stata scritta; *se non
c'è, per quella persona la promozione non esiste* — non si nomina, non si
inventa, e non si dice «chiedi al desk se c'è una promozione». È la stessa forma
del cancello del Guest Pass, ed è la sola che tiene: la presenza della voce **è**
il permesso e insieme il momento.

Due cose che quella regola aggiunge, e sono le due che hanno morso:

- **che cosa regala lo dice la voce, e non si deduce.** La regola prima si
  chiamava «la promozione della quota di attivazione», cioè dava per categoria
  quello che era vero di un solo caso: adesso dice che se la voce non scrive che
  la quota è in omaggio, **la quota si paga**.
- **il codice fa parte della risposta**, con **dove si incolla** — sul portale,
  durante l'iscrizione. Una promozione raccontata senza il suo codice è
  un'offerta che nel portale non si applica.

### Dove c'è un codice, la destinazione è generica

I comandi delle formule portavano al `PaymentPlanId` del piano, ed è la strada
giusta quando si compra un piano: è quella che `/abbonamenti` tiene. Ma una
promozione che passa da un codice funziona al contrario — **è il codice ad
aprire il perimetro**, e il portale mostra da sé gli abbonamenti della promo già
selezionati. Un pulsante col `PaymentPlanId` porterebbe dentro un'iscrizione
dove il codice non è stato copiato, e il campo per incollarlo sta un passo
prima.

Quindi su `/promo`, quando il documento dichiara un `codice`, ogni comando è la
coppia di `/attiva`: **il codice tratteggiato da copiare e, sotto, «Vai
all'iscrizione»** verso `REGISTRAZIONE_PORTALE` — la registrazione del portale,
non un piano. Tre cose che ne conseguono:

- **L'indirizzo è passato in `data/cta.ts`.** Era in `guestPass.ts`, dove è nato,
  ma non è del Guest Pass: è la destinazione di ogni offerta che passa da un
  codice, e adesso sono due. `guestPass.ts` lo riesporta col nome che il modal
  della prova e `/attiva` gli danno.
- **`o.href` non si usa più su questa pagina, e non è una perdita.** Il codice
  vale su tutte e due le formule annuali di tutti e due i piani, che è
  esattamente il perimetro di `validoSu`. Su `/abbonamenti` i link col piano
  restano: là si compra un piano, non una promozione.
- **E il controllo dell'email esce, su questa pagina sola.** Aveva resistito al
  cambio di destinazione — `iscrizione.client.js` legge l'`href` dal pulsante,
  quindi funzionava ancora — e proprio per questo bisogna dire perché non ci
  va: su `/abbonamenti` il pulsante *è* l'iscrizione a un piano, e la domanda
  prima risparmia a chi ha già un account tutta la registrazione; qui il
  pulsante è **la seconda metà di un gesto** che comincia col codice negli
  appunti. Chi ha appena copiato `RESTARTPT` si aspetta il portale, e un
  pannello che chiede l'email in mezzo è il punto in cui il codice si perde e la
  pagina si chiude. Quello che si rinuncia a fare lo fa comunque il portale, che
  a un'email già registrata risponde da sé.
  **Nessun `data-iscrizione` e nessun `IscrizioneModal` montato**, e i due
  vanno insieme: l'attributo senza il componente sono sei pulsanti che aprono
  un pannello che non c'è, il componente senza l'attributo è un pannello che
  nessuno apre. Il gate resta intero su `/abbonamenti`, che è l'unica pagina
  che ora lo monta.

**L'etichetta è «Vai all'iscrizione» e non «Incollalo qui».** La seconda andava a
capo su due righe nelle schede strette, e soprattutto direbbe una cosa falsa: il
codice si incolla **dopo**, sul portale. Dove si incolla lo dicono la nota del
riquadro e i passaggi, che è il posto delle istruzioni.

Due cose da sapere prima di toccarlo.

**Il codice si copia con `data-copy-code`, e la meccanica sta in un posto solo.**
`scripts/copiaCodice.ts`, condiviso fra `/promo` e `/attiva` — che sono le due
**pagine** in cui un codice si copia. Erano la stessa funzione scritta due volte,
e la seconda era nata copiando la prima: è il punto in cui una si sistema e
l'altra no. Le altre due copie vivono dentro i bundle del modal della prova e
della chat, dove il markup lo costruisce lo script, e restano là.

**Il popup della promo non ha più un tetto suo, e questo è il seguito di una
data scritta a mano.** `FINE_POPUP` in `PromoPopup.astro` era la mezzanotte fra
il 31 agosto e il 1 settembre, scelta del club per la promozione di agosto: il
popup poteva finire prima della landing, e il conto alla rovescia puntava alla
prima delle due date. Passato il 1 settembre quella costante è rimasta lì, e con
la promozione di settembre **viva** il popup non compariva su nessuna pagina —
senza che niente lo segnalasse, perché un popup che non c'è non si distingue da
un popup che nessuno ha ancora visto.

Adesso la condizione è una: documento non in bozza e `scadenza` non passata, la
stessa di `/promo` e della voce di `/link`. Il giorno che il club volesse
spegnere il solo popup tenendo viva la landing, quella data va **nel documento
di Tina** accanto a `scadenza`, dove chi cambia la promo la vede — non in una
costante che nessuno rilegge.

Il resto del comportamento era già quello giusto e non è stato toccato: compare
**una volta per sessione**, sulla prima pagina adulti che si apre (`sessionStorage`,
segnato quando la scheda *compare* e non quando si chiude), ed è montato in tre
posti — `[corso].astro`, `gym-floor.astro`, `reformer.astro` — che sono
esattamente `PAGINE_ADULTI`: `[corso].astro` genera solo `CORSI`, quindi su una
pagina junior il componente non esiste nemmeno nel markup. **Sul totem compare a
ogni pagina**, e non è un difetto: là `suTotem()` non ricorda niente, o la
chiusura di chi è passato prima nasconderebbe la promo a chi arriva dopo.

### La fascia la decide l'anno, e l'anno che il form ci ha dato non si fa confermare

Il 28/08, bambina nata il **2021**-04-23 — l'anno nel contesto, messo lì dal
form compilato due minuti prima — la mamma scrive «la bimba ha 5 anni compiuti
ad aprile», e la risposta la mette nel **Baby Nuoto**, «i corsi per i più
piccoli, dai 3 anni in su». Il Baby Nuoto è per i nati nel 2024, 2025 e 2026,
dai 3 mesi; «dai 3 anni in su» non sta scritto da nessuna parte. Una bambina del
2021 fa la Scuola Nuoto Bambini, e il prompt lo diceva già in una regola fissa
tutta dedicata a questo — con un errore vero citato dentro.

**È la seconda volta che questa regola non tiene, e la lezione è la stessa della
domanda sull'anno già noto: qui il prompt non basta.** Il modello vede un'età e
ragiona sull'età; nessuna quantità di maiuscole nel `systemMessage` lo ha fermato.
Quindi la decisione torna al codice, in `Correggi anno gia' noto`, che di
controlli fissi ora ne fa tre:

1. **La domanda sull'anno già noto** — quello di prima, invariato: si toglie la
   frase che la contiene.
2. **Il corso sbagliato per quell'anno.** Se la risposta nomina il corso che
   l'anno esclude e non nomina quello giusto, non si rimedia a pezzi: quel testo
   parla per intero di un altro corso. Si butta, e al suo posto va la conferma
   dell'anno più il corso che l'anno dice — scritto dal nodo, non dal modello.
   Nominare quello sbagliato *mentre* si nomina il giusto («non è Baby Nuoto ma
   Scuola Nuoto») resta legittimo, quindi il controllo scatta solo se il giusto
   manca.
3. **Se il genitore ha parlato in età e l'anno non ce l'abbiamo, il turno è solo
   la domanda.** La risposta si butta e resta la richiesta dell'anno: un'età
   lascia un margine di un anno intero, e senza l'anno qualunque cosa si dica è
   detta su un corso non ancora deciso.

Tre cose da sapere prima di toccarlo.

**La trattenuta vale solo dove l'anno manca, e questa riga è una correzione.**
Per un po' il terzo controllo ha chiesto conferma *anche* con l'anno nel form,
come deroga dichiarata al «non chiedere conferma» — e il 7 settembre quella
deroga ha fatto il danno che doveva evitare: una mamma che aveva scelto la
Scuola Nuoto nel passo dell'attività e scritto la data di nascita nel modulo
chiede prezzi, orari e se si può provare, e si vede rispondere con una richiesta
di conferma dell'anno. Due domande a cui aveva già risposto al posto delle tre
risposte che aveva chiesto. **Un dato che il club ha nel modulo non si fa
confermare da chi lo ha scritto**: dove l'anno c'è la rete è il controllo (2),
che il corso sbagliato lo **corregge** invece di chiederlo — e infatti il caso
del 03/09 (bambina del 2023 mandata nel Baby Nuoto) oggi lo chiude quello. Da lì
anche il testo del (2): l'anno si **afferma** — «con il 2022 che ho dal modulo il
corso è la Scuola Nuoto Bambini» — e la sola porta che resta aperta è «se l'anno
non fosse quello scrivimelo».

**Le due fasce stanno in chiaro nel nodo**, non lette da `junior.ts`: n8n non
importa il codice del sito. Il giorno che il club sposta la stagione vanno
aggiornate in tutti e due i posti — è il prezzo di avere la decisione dove il
modello non può contraddirla.

**E `Salva risposta` archiviava il testo grezzo, non quello corretto.** Leggeva
`$('Leggi la risposta')`, cioè il nodo *prima* della correzione: la persona
vedeva il testo corretto e `chat_messaggi` conservava quello sbagliato. Finora
non si era visto perché la correzione toglieva una frase; con la riscrittura
intera la divergenza sarebbe stata quella fra il CRM e la realtà — cioè
esattamente il posto da cui si guarda per capire se una correzione ha funzionato.
Ora legge il nodo della correzione.

#### Una domanda a cui il pulsante ha già risposto

Nella stessa conversazione del 7 settembre, il turno prima: la mamma apre la
chat dalla pagina della Scuola Nuoto Bambini, sceglie quel corso al passo
dell'attività — la conversazione è `ramo junior` — e scrive «vorrei sapere se è
possibile fare una prova. Poi volevo sapere prezzi e orari». La risposta:
*«Prima di tutto: **quale attività ti interessa?** Palestra, corsi in sala,
acqua, o ancora non hai deciso?»* — la domanda a cui il pulsante aveva già
risposto, per giunta con le voci **degli adulti** dentro una conversazione
junior, e nessuna delle tre risposte chieste.

Il `systemMessage` ha una regola fissa tutta dedicata a questo («l'attività l'ha
già scelta: non chiedergli quale»), e il modello l'ha ignorata. Vale allora
quello che vale per l'anno di nascita, ed è la terza volta che questo file lo
scrive: **una regola che il modello può ignorare non è una regola**, quindi la
domanda si toglie dal testo. È il controllo (7) di `Correggi anno gia' noto`, e
funziona come il (1): si taglia la frase che contiene la domanda, e con lei
l'elenco di opzioni che la segue — «Palestra, corsi in sala, acqua…» senza la
domanda è un elenco orfano, la stessa cosa della giustificazione tagliata dal
controllo (1).

Tre cose da sapere prima di toccarlo.

**La regex è stretta di proposito.** Deve prendere la domanda su *quale*
attività, non ogni frase che contiene «ti interessa»: «se ti interessa, la prova
costa 19 €» è una risposta, e tagliarla sarebbe peggio del difetto che il
controllo chiude. Il verso in cui sbaglia è dichiarato — una domanda non
riconosciuta resta a schermo, una risposta tagliata sparisce.

**Se tolta la domanda resta un saluto, la riga si aggiunge invece di
sostituire.** Qui la bolla era «Ciao! Perfetto, allora partiamo da quello che ti
serve davvero.» più la domanda: tagliata quella resta una frase che non dice
niente. Sotto ci va il corso di cui si sta parlando — la sola cosa certa che il
nodo ha — e l'invito a chiedere. La soglia è larga (120 caratteri) perché un
saluto che passa per risposta è esattamente il difetto da chiudere.

**L'attività è nota quasi sempre, quindi il controllo è quasi sempre acceso.**
`attivitaJunior` o `attivita` non vuoto: il passo dei cinque pulsanti viene
prima della conversazione, quindi chi scrive ha già scelto per costruzione. Non
è un caso raro da coprire, è la regola.

### Chi si lamenta non riceve un'informazione, riceve una persona

Vale in **ogni** ramo e su **qualunque** argomento, ed è la prima delle regole
fisse del `systemMessage` perché viene prima di tutte le regole di contenuto: se
il tono è di rabbia o di lamentela — ha pagato e non ha avuto, nessuno gli
risponde, è la seconda volta che lo segnala, pensa di andarsene — in quel turno
**non si risponde nel merito**. Niente numeri, niente orari, niente procedure, e
soprattutto niente motivi: non perché è successo, non cosa comprende il suo
abbonamento, non com'è fatto il palinsesto, nessuna ipotesi di sospensione o
rimborso.

**Anche quando la risposta si sa**, ed è questa la parte che non è ovvia. La
tentazione è rispondere bene: la persona ha detto una cosa sbagliata, il testo ha
quella giusta, e darla sembra il servizio. È il contrario — rispondere a una
lamentela con un'informazione la peggiora, perché la persona non ha chiesto un
dato, ha chiesto che qualcuno se ne occupi. Misurato sulla conversazione del
28/08: a «ma nel frattempo ho pagato il mese di agosto» l'assistente ha risposto
che «l'abbonamento di agosto copre quello che c'è disponibile in questo periodo»,
cioè ha difeso il club, e la chat è andata avanti fino a sedici messaggi senza
risolvere niente.

Quello che resta sono due righe, in quest'ordine: **il dispiacere** sulla cosa
precisa che ha detto lei, con le sue parole e senza spiegazioni attaccate; e **la
strada verso una persona, con le istruzioni** — l'icona del messaggio in alto,
cosa scriverci (cosa, quando, quale lezione), e che la conversazione arriva al
team insieme al messaggio. Poi si ferma: nessuna domanda finale, nessuna offerta,
nessun Guest Pass, nessuna telefonata.

Tre dettagli che sono vincoli e non forma:

- **`"senzaRisposta": true` su quel turno.** È il campo da cui `Salva risposta`
  ricava `chat_conversazioni.escalata`, quindi è il modo in cui in archivio si
  vede che quella conversazione è passata a una persona. Non cambia niente per
  chi legge la chat: è un dato per il club.
- **Non si promette cosa il team vedrà o farà** (regola 11bis). La prima stesura
  di questa regola diceva «scrivi al team, che vede la tua situazione»: è
  esattamente la promessa che la 11bis vieta, ed era già stata scritta una volta.
  Quello che si sa è che la conversazione gli arriva e che rispondono via email.
- **Vale sul turno, non sulla conversazione.** Se al messaggio dopo torna a fare
  una domanda normale, si risponde normalmente — una regola che zittisce
  l'assistente per il resto della chat trasformerebbe una lamentela in un muro.

Nelle bozze email la stessa cosa c'era già, e con un nome diverso: l'astensione
allargata di `ATHLON BOZZE EMAIL` passa la mano su un reclamo senza scrivere
niente. Là la scelta è più radicale perché una bozza sbagliata la si rilegge, ma
il criterio è lo stesso — un reclamo non lo chiude un testo automatico.

### «Online limit exceeded»: si aspetta che la lezione passi, non si disdice

Il limite di prenotazioni conta **solo le lezioni ancora da svolgere**, quindi si
libera da sé: quando quella in programma è finita, si prenota la successiva senza
disdire niente. Col Group Reformer, che ne ammette una per volta, è il caso
normale — la lezione di domani si prenota quando quella di oggi è passata, e la
finestra resta aperta fino all'inizio, quindi non si arriva tardi.

L'assistente diceva l'opposto, e per tre volte nella stessa conversazione: «per
prenotare quella di domani devi prima disdire quella di oggi». A una persona che
aveva **una sola** prenotazione di Reformer, cioè il caso in cui la risposta
giusta è «aspetta due ore». Il consiglio le faceva perdere il posto di oggi per
prendere quello di domani, che è un cambio, non una soluzione.

**Il difetto era nella scheda, non nel modello.** `prenotazioni-problemi.md`
chiudeva la causa 5 con «Disdici o completa una delle prenotazioni attive»: le
due strade in fila, con la peggiore per prima e senza dire che «completa»
significa *non fare niente e aspettare*. Un modello che riassume in cento parole
tiene la prima. Adesso la scheda apre con l'attesa, dice che «attiva» vuol dire
**in programma**, e nomina la disdetta solo per chi a quella lezione non ci va.
La stessa riga sta in `prenotazioni.md` e nella f.a.q. `prenotazioni-attive`,
perché il limite si legge in tre posti.

E nel `systemMessage` c'è la regola fissa che chiude il caso anche se la scheda
dovesse tornare ambigua: **mai dire di disdire una lezione a cui vuole andare per
liberare il limite.**

### Un messaggio d'errore che la scheda non nomina è una diagnosi che il modello inventa

«Mi sono iscritta ieri e mi esce una scritta in rosso, *your member is on
financial debit*: che significa?» → *«quel messaggio non dovrebbe comparire se ti
sei iscritta ieri. Potrebbe essere un errore di sincronizzazione fra l'app e il
portale, oppure il metodo di pagamento non è stato elaborato correttamente.
Scrivi al team.»*

Tre cose sbagliate in una risposta. L'«errore di sincronizzazione fra l'app e il
portale» **non esiste**: è stato inventato lì. «Non dovrebbe comparire se ti sei
iscritta ieri» è **falso**, ed è anzi il caso più frequente — il primo pagamento
non è andato a buon fine, cosa che con la carta capita quando manca
l'autenticazione della banca. E soprattutto: quel messaggio ha una **soluzione
che la persona può fare da sola in trenta secondi**, e invece è stata mandata a
scrivere al desk e ad aspettare una risposta via email.

**Il pezzo che mancava era una riga, e la scheda aveva già tutto il resto.**
`generali/prenotazioni-problemi` elenca le cause di blocco, e quella del
pagamento insoluto portava già `Area riservata → Scadenze → Paga`. Ma era
**l'unica senza la sezione «Messaggio che vedi»** — e la scheda apre
dicendo *«trova il messaggio che vedi a schermo: sotto c'è il motivo e cosa
fare»*. Cioè prometteva un indice per messaggio e su quella causa aveva un buco,
per giunta sull'unico messaggio che il portale scrive **in inglese**.

Da qui la regola, che è la sorella di quella sul turno fisso della scuola nuoto:
là un dato assente diventava una regola generale che si allargava al posto suo,
qui un messaggio non indicizzato diventa una diagnosi inventata. **Un errore che
la persona cita è una chiave di ricerca prima che un sintomo**: se la knowledge
base non lo contiene con le parole esatte con cui appare a schermo — maiuscole e
lingua originale comprese — il modello non lo trova, e quello che non trova lo
interpreta.

Tre cose da sapere prima di toccarla.

**I `tags` del frontmatter non entrano nel `kb.json`.** La voce di una scheda
porta `title`, `description` e il corpo, e basta: un messaggio d'errore messo
solo fra i tag serve alla ricerca dell'Help Desk sul sito e all'assistente non
arriva. Va nel **corpo**, e conviene anche nella `description`, che è la prima
riga della voce e quella che il modello legge scegliendo.

**La procedura si scrive coi passi, non con le frecce.** `Area riservata →
Scadenze → Paga` è una scorciatoia che presuppone di sapere già dove si guarda;
quello che mancava a chi ha scritto era **quale** importo pagare, e la risposta è
che sono in ordine di data e il primo in alto è il più vicino nel tempo. Tre
righe numerate al posto di una freccia.

**E si dice che si fa da soli.** «Non serve passare in segreteria» non è una
cortesia: senza quella riga, una procedura che una persona può eseguire in
autonomia si legge come l'ennesima cosa da chiedere a qualcuno.

### Una nota bloccante non scade, e la scheda diceva il contrario

Il 5 settembre, a una moglie che scriveva per il marito — «non riesce a
prenotare gym floor alle 12:30» — l'assistente ha fatto tutto giusto fino
all'ultimo turno: ha chiesto il messaggio a schermo invece di indovinare, e
lei ha risposto `Booking blocked due to bloking note`. Da lì la risposta è
stata: *«Guido ha un blocco automatico delle prenotazioni per 3 giorni…
scade da solo dopo 3 giorni — non serve fare niente, non serve scriverci»*, e
la coppia è stata mandata ad aspettare un blocco che non si sarebbe tolto.

**Il modello non ha inventato: ha letto la scheda, che accoppiava quel
messaggio alla causa sbagliata.** `prenotazioni-problemi.md` apriva con «1.
Blocco per mancate disdette» e metteva `booking blocked due to blocking node`
sotto quel titolo come *suo* messaggio. Sono due cose diverse che il testo
teneva in una: il blocco delle mancate disdette è automatico e dura 3 giorni,
una **nota bloccante** è un promemoria che il club mette sulla scheda della
persona — nella grandissima parte dei casi il certificato medico scaduto o mai
consegnato — e **la toglie il club**, quindi aspettare non toglie niente.

Ora sono due cause, la 1 e la 2, ognuna con il proprio «Messaggio che vedi», e
ognuna nomina l'altra per negarla: è la stessa medicina delle due sospensioni e
dei due orari — *un contesto che contiene due regimi è un contesto da cui si
può comporre un terzo regime che non esiste*, e qui il terzo era «la nota scade
da sé».

Tre cose da sapere prima di toccarla.

**La risposta è il team, e non è un ripiego.** Il messaggio non dice *quale*
nota sia: quello si legge sulla scheda, che da fuori non si vede. Quindi la
risposta giusta non è una diagnosi ma un passaggio di mano — l'icona del
messaggio in alto nella chat, o il modulo dell'Help Desk — e in chat vale
l'azione `{"tipo": "team"}`, che quel modulo lo apre invece di nominarlo.
Nominare il certificato medico come **causa più probabile** è utile e va detto;
darlo per certo no, ed è la stessa differenza fra «di solito è questo» e «è
questo».

**Il messaggio si indicizza nelle due grafie.** Il portale scrive `blocking
note`, e chi lo ricopia a mano scrive spessissimo `blocking node` — il tag
c'era solo nella seconda forma, cioè nella forma sbagliata. Vale la regola già
scritta per «your member is on financial debit»: *un errore che la persona cita
è una chiave di ricerca prima che un sintomo*, e una chiave che esiste in una
grafia sola è una chiave che manca metà delle volte.

**Le cause sono numerate, e la numerazione è citata altrove.** Passando da
sette a otto sono cambiati il cappello della scheda, i rimandi interni («causa
5» per la lista d'attesa) e la regola fissa del prompt che mandava «alle sette
cause della scheda». Numerare aiuta chi legge e costa questo: chi aggiunge una
causa le rinumera tutte, e cerca «sette» anche fuori dal file.

### Le date non si calcolano, e una lezione di domani è dentro la finestra

Nella stessa conversazione, primo messaggio: «non riesco a prenotare una lezione
per domani» → «le prenotazioni si aprono 3 giorni prima, quindi da mercoledì 3
settembre in poi». Domani era sabato 29 agosto: la finestra era **aperta da tre
giorni**, e la risposta ha mandato la persona a settembre per una lezione
dell'indomani.

La regola 2ter lo vietava già, in mezzo a un paragrafo che dice anche altre
quattro cose. Ora è una regola fissa a sé, e in una forma che non richiede
nessun conto: **oggi, domani e dopodomani sono sempre dentro la finestra**, e
l'unico caso in cui non è aperta è una lezione a più di 3 giorni. Un conto sulle
date è un errore che il modello non si accorge di fare — vale la stessa scelta
della fascia d'età del nuoto bambini, dove il calcolo è vietato invece che
corretto.

### Una chat di assistenza si chiude, e chi la allunga è l'assistente

Sedici messaggi per una domanda che aveva una risposta di due righe. Dopo il
consiglio sbagliato, l'assistente ha raccontato l'orario estivo, quante lezioni
ci saranno a settembre, e — a «ma nel frattempo ho pagato il mese di agosto» —
che «l'abbonamento di agosto copre quello che c'è disponibile in questo periodo».
Cioè ha difeso il club su una lamentela, che è esattamente ciò che la regola 11
vieta.

La regola fissa aggiunta dice quando smettere: **detta la causa e cosa fare, non
si aggiunge altro** — non il palinsesto del mese, non cosa comprende
l'abbonamento, non ipotesi di sospensioni o rimborsi. Se insiste, se il problema
resta, o se la situazione è personale, si chiude con una riga: *se ti serve altro
aiuto scrivi al team dall'icona in alto, che vede la tua situazione*. È la regola
11 applicata **prima** che la cosa diventi un reclamo, e la ragione è che una
spiegazione in più non risolve il caso di quella persona: lo allunga.

### Quando si scende nel dettaglio, la chat dice di essere un assistente virtuale

Gli errori sono pochi, ma arrivano quasi tutti nello stesso punto: nel botta e
risposta lungo, quando la conversazione stringe su un caso specifico e il
modello comincia a comporre invece che a citare. Quasi tutte le sezioni qui
sopra nascono da lì. Quindi, oltre a chiudere i casi uno per uno, la chat mette
le mani avanti: quando la conversazione scende nello specifico, apre quella
risposta dicendo che è l'**assistente virtuale** del club, che su domande molto
specifiche può scapparle un errore, e che lo staff è **l'icona del messaggio in
alto a destra** — quella accanto alla chiusura, verificata nel markup di
`ChatModal.astro`, dove l'intestazione porta avatar, nome, telefono, messaggio,
chiusura. L'intestazione dice già «Assistente Virtuale» sotto «Athlon Club»:
quella riga conferma ciò che si vede, non annuncia una cosa nuova.

**Continua a rispondere, e questo è il vincolo.** La risposta si dà comunque e
per intero: la premessa non è un rifiuto, e «meglio che chiedi allo staff» al
posto della risposta è esattamente l'uso sbagliato. Lo staff è un'alternativa
offerta, non il posto dove si manda la gente.

**Su una domanda semplice non ci va**, ed è il freno che rende la regola utile.
Orari, prezzi di listino, dove si parcheggia: lì la risposta è scritta e la sa,
e premettere che potrebbe sbagliare la fa sembrare inaffidabile proprio dove è
affidabile. Vale dove il rischio c'è: dal terzo scambio sullo stesso dettaglio,
sul caso personale (il suo contratto, il suo addebito, la sua prenotazione), o
su un caso di confine.

**Una volta per conversazione.** Un assistente che a ogni risposta ricorda di
essere un assistente è un assistente che nessuno legge più. E se chi scrive si
sta lamentando comanda la regola del reclamo, che passa la mano al team davvero.

### Non si dice mai a nessuno di aspettare a iscriversi

A «se mi iscrivo oggi risparmio?» l'assistente ha risposto *«no, non risparmi
niente… attivando oggi spendi 8 € in più per 2 giorni di agosto che magari non
usi nemmeno… conviene aspettare domani, se puoi»*. È il peggior consiglio che
questa chat abbia dato: ha allontanato un'iscrizione già decisa, per otto euro.
**A essere sbagliato era il consiglio, non il conto** — il pro-rata si può
calcolare, e come si fa sta qui sotto.

**Non l'aveva inventato.** La scheda `adulti/pro-rata-durata-minima` chiudeva
con «se puoi scegliere, far partire l'abbonamento il **1° del mese** rende tutto
più semplice», e la stessa frase stava nella f.a.q. della promo. Detta senza
dire **come** si sceglie la data, quella riga si legge in un modo solo: aspetta.

**Il come era il dato che mancava**, ed è in `DATA_INIZIO`
(`data/abbonamenti.ts`): iscrivendosi si imposta quando parte l'abbonamento — lo
stesso giorno oppure una data futura, **fino a 14 giorni dopo**. Quindi non c'è
niente da rimandare: ci si iscrive oggi e si sceglie la data. Da lì la voce
`abbonamento:data-inizio` del `kb.json`, e le due frasi riscritte.

Tre cose da sapere prima di toccarlo.

**La regola fissa vieta le forme, non la parola.** «Conviene aspettare», «meglio
domani», «aspetta il primo del mese», «risparmi se aspetti», «se puoi scegliere
fai partire il mese prossimo»: sono tutte la stessa frase, e un divieto scritto
su una sola di esse lascia passare le altre quattro. È la lezione dell'assistente
di sala applicata al commerciale.

**La risposta giusta è che è indifferente**, e finisce lì. Ma «indifferente» non
si spiega dicendo *quando* si paga: **la quota si paga al momento
dell'iscrizione**, anche scegliendo una data di inizio futura, e quello che la
data governa è **cosa copre** la prima quota. Il 7 settembre, a chi chiedeva se
iscrivendosi il 10 avrebbe pagato i primi dieci giorni di settembre, la chat ha
risposto *«lo paghi da quando l'abbonamento comincia, non da quando firmi il
contratto»*: la seconda metà è falsa, e fa aspettare l'addebito a chi ha scelto
di partire fra due settimane — un fatto che si scopre alla cassa. Le due
affermazioni vanno tenute separate: *quando si paga* è l'iscrizione, *cosa si
paga* lo dice la data di inizio. La scelta della data è di chi si
iscrive e non va consigliata — nemmeno nel verso opposto, perché «iscriviti oggi
che conviene» è la stessa invadenza al contrario.

**E il numero vive in tre posti**, come la quota di attivazione e per la stessa
ragione: `DATA_INIZIO.giorniMax` è la fonte, le due copie stanno in
`pro-rata-durata-minima.md` e in `promo.md`, che sono contenuti di Tina e non
possono importare TypeScript.

#### Il mese dell'abbonamento è il mese solare, e il rinnovo cade il 1°

Subito dopo la riga sul pagamento, la stessa conversazione: «quindi se inizio
oggi pago il mese che finisce il 7 ottobre?» → *«Esatto. Se fai partire
l'abbonamento oggi 7 settembre, il primo mese copre da oggi fino al 7 ottobre»*.
No: partendo il 7 settembre il primo periodo va dal **7 al 30 settembre**, si
paga quello, e dal **1° ottobre** si rinnova a mensilità piene. L'impegno minimo
resta un mese — qui il pro-rata di settembre più tutto ottobre.

**Il modello ha accettato la premessa di chi scriveva**, e il dato non lo
smentiva: `DATA_INIZIO` e la scheda dicevano «la prima quota copre solo i giorni
che restano», che è vero e non dice *fino a quando* — e nessuno dei due diceva
**quando cade il rinnovo**. Da «paghi solo i giorni che restano» più una domanda
che propone il mese a scorrimento si compone il mese a scorrimento: è la
meccanica di sempre, con la variante che qui il terzo fatto lo ha suggerito la
persona e il modello ci ha messo l'«esatto».

Ora il fatto sta scritto in due posti: `DATA_INIZIO.testo` — con l'esempio del 7
settembre, che è il caso vero — e un blocco della scheda
`adulti/pro-rata-durata-minima` messo **prima** della regola del pro-rata,
perché è il presupposto di quella regola e non un suo dettaglio: *il mese di
abbonamento comincia il 1° e finisce l'ultimo giorno del mese, e il rinnovo cade
sempre il 1°, non all'anniversario del giorno in cui hai cominciato.*

Due cose da sapere prima di toccarlo.

**Non è una correzione del pro-rata, è il suo presupposto.** La tabella «trova
il tuo caso» era già giusta — `2 marzo → pro-rata 2→31 marzo` — e lo diceva
soltanto in forma di esempio: chi legge la riga in prosa, e un modello che
riassume, prende quella. Un dato che vive solo in una tabella è un dato che
sopravvive alla lettura di chi ha già capito.

**«Sempre il 1°» va detto per esteso**, non per differenza. «Non dal 7 al 7» da
solo nega la lettura sbagliata senza dare quella giusta, e resta la domanda vera
di chi paga — quando mi rinnova.

#### Il pro-rata si calcola, ed è l'eccezione dichiarata alla regola 2

La prima stesura della regola vietava il conto, e vietava troppo: il pro-rata si
ricava dal canone di listino e dai giorni, quindi è un calcolo che si può
mostrare — a chi sta decidendo quanto spenderà, sapere l'ordine di grandezza
serve. Le due condizioni non sono formalità.

**Si calcola sulla data di inizio del contratto, non su quella di iscrizione**,
e sono due cose diverse proprio per la riga qui sopra: ci si iscrive oggi e si
sceglie di partire fra dieci giorni. Contano i giorni dall'inizio
dell'abbonamento alla fine di quel mese, quindi se non sa da quando vuole
partire lo deve chiedere prima di fare il conto — è l'unico dato che serve, ed è
la persona a sceglierlo.

**Sempre al condizionale, e sempre dicendo dove si vede il valore vero.**
«Sarebbe circa», «verrebbe intorno a», mai «paghi X» come se fosse definitivo; e
nella stessa frase che **l'importo esatto compare in fase di iscrizione, prima
di confermare**. L'arrotondamento e il conteggio dei giorni li fa il gestionale:
una cifra data come certa è un'aspettativa che alla cassa può non tornare, ed è
lo stesso difetto dell'upgrade preventivato in chat.

**Ma il conto non si usa per il confronto che spinge ad aspettare**, ed è il
punto in cui la regola qui sopra resta intera: mettere in fila due scenari —
oggi contro il primo del mese — per far vedere che uno costa meno è la cosa
vietata, qualunque cifra ne esca. Si calcola sulla data che ha in mente la
persona, non per proporgliene un'altra.

### L'upgrade non si preventiva in chat, si chiede dal modulo

«Quanto costa se aggiungo i corsi al mio abbonamento?» → tre domande
(quale piano hai, mensile o annuale, da quando) e poi *«la nuova quota è
119 €/mese»*. Quella cifra l'assistente non la può sapere: un cambio
abbonamento si conteggia sul contratto vero, col credito residuo di quello in
corso, e lo fa il desk. Il numero detto in chat diventa un'aspettativa che alla
cassa non torna — è lo stesso difetto della quota di attivazione «in omaggio»,
nel verso opposto: **un prezzo dichiarato per una cosa che nessuno ha ancora
calcolato**.

La scheda `adulti/cambio-abbonamento` diceva già tutto quello che serve, e in una
riga: si richiede **sempre** dal modulo che sta dentro la scheda, e le istruzioni
per proseguire arrivano via email dopo la compilazione. Quindi la risposta giusta
è corta e non è un preventivo: *come si chiede*, con la scheda fra le fonti.

Tre cose, e la seconda è quella che è costata il turno:

- **Niente numeri e niente procedura.** Non la nuova quota, non la differenza,
  non il credito residuo nominato come se lo sapessimo, non i passaggi e non i
  tempi. Il prezzo di **listino** di un piano invece si dice — è un dato del
  sito, con la sua fonte (regola 7bis) — aggiungendo che l'importo del *suo*
  cambio dipende dal credito residuo e gli arriva via email.
- **E non si fa l'interrogatorio per fare il conto.** Chiedere quale abbonamento
  ha, se paga mensilmente, da quando: quei dati al desk arrivano dal modulo, e
  tre domande prima di una risposta che comunque non si può dare sono tre turni
  buttati. Una richiesta di dati è una promessa implicita di rispondere con un
  numero.
- **Il modulo si nomina come si nominano i rimandi**: «compila il modulo che
  trovi nel pulsante qui sotto». La chat non disegna link dentro il testo, li
  disegna `rimandi()` in fondo alla bolla — quindi una frase che dice «al link
  qui sotto» senza dire *pulsante* fa cercare un link che non c'è.

Vale per ogni forma di upgrade, compreso «voglio il Reformer sul mio
abbonamento»: aggiungere un'attività *è* un cambio abbonamento, e passa dallo
stesso modulo.

## `/tour` è il totem all'ingresso, e registra una visita già avvenuta

Il pannello all'ingresso del club sta aperto su questa pagina. Chi ha appena
girato la struttura con un operatore lascia lì i suoi dati, e da quel modulo
nasce una voce **tour** in `agenda_voci` — data, ora, e uno stato da chiudere.
Chi lo ha accompagnato la ritrova in agenda, ci scrive com'è andata, e da lì
fissa il richiamo. `noindex` e fuori dalla sitemap come `/attiva` e `/referral`:
non è una pagina del club, è uno strumento del desk.

**L'indirizzo è `/tour`, ed è una scelta del club.** Per un po' è stato
`/totem/tour`, e la ragione era una collisione vera: su questo sito «tour»
significa anche il virtual tour di my.mpskin nella home, quello col cartello
«Clicca play per il virtual tour completo». Chi digita `athlonroma.it/tour`
potrebbe aspettarsi quello e trovare un modulo che presuppone di avere appena
girato il club con qualcuno.

Il club ha deciso `/tour` lo stesso. **La collisione resta, e va saputa**: se un
giorno il virtual tour volesse un indirizzo suo, non può essere questo — e chi
la scoprisse partendo dalla home non deve «correggere» questa pagina credendo a
uno sbaglio. Non c'è nessun rimando da `/totem/tour`: quell'indirizzo è stato
vivo meno di un'ora e non esiste più.

Il filtro della sitemap la esclude con `endsWith('/tour/')` e non con
`includes('/tour')`: la seconda forma prenderebbe anche una pagina futura il cui
slug finisce per quella parola, e una pagina che sparisce dalla sitemap senza
che nessuno l'abbia chiesto è il tipo di guasto che non si nota.

**L'attività si chiede prima dei dati, ed è lei a decidere quali dati servono.**
Un'attività junior vuole il bambino *e* il genitore, perché da lì n8n crea il
**nucleo familiare** su PerfectGym: `flow: 'junior'` porta `stradaPgm` a
`nucleo`, cioè `PGM Crea Genitore` seguito da `PGM Crea Figlio`. Un'attività
adulti vuole solo la persona che ha davanti, e il suo lead si crea con nome,
cognome, email e telefono. Chiedendo i dati per primi si finiva per chiederli
sempre uguali e poi per non avere quelli che servivano: prima di questa riga il
form mandava `flow: 'adulti'` scritto a mano, quindi il tour di un bambino
creava un lead a nome del genitore e il figlio non esisteva.

Tre cose che questo ramo porta con sé:

- **le date di nascita non sono un di più.** Quella del bambino decide il
  corso, quella del genitore la vuole `personalData.birthDate` della chiamata
  che crea l'anagrafica. Senza, il nucleo non nasce — e non nasce **in
  silenzio**, perché quei nodi hanno `continueRegularOutput`;
- **il cellulare smette di essere facoltativo.** Resta tale per l'adulto,
  perché `PGM Crea Lead` si accontenta; per il nucleo no, e `phoneNumber`
  viaggia sia nell'anagrafica del genitore sia in quella del figlio;
- **se sono spuntate tutte e due, vince junior.** È il caso normale al totem —
  il genitore che porta il figlio in piscina e intanto ha guardato la sala pesi
  — e il bambino va registrato comunque; le attività adulti restano nell'email
  e nelle note del tour.

### Il codice fiscale sta in un accordion chiuso, e vale per tutte e due

`personalId` è il campo con cui PerfectGym tiene il codice fiscale — lo dice già
la tabella del sync, `m.personalId` → `codice_fiscale` — e senza di lui la scheda
che n8n crea nasce incompleta: la si finisce a mano, e nessuno sa che c'è da
farlo. Quindi il totem lo chiede, **all'adulto che si sta registrando e al
bambino**, cioè alle due anagrafiche che da qui nascono davvero.

**Chiuso, e non è timidezza.** Sedici caratteri si copiano da una tessera, e al
totem la tessera in tasca quasi nessuno ce l'ha: un campo aperto in mezzo al
modulo è una domanda a cui la risposta normale è «non ce l'ho dietro», e ogni
domanda del genere è un punto in cui una persona in piedi dice «lasciamo stare».
Un `<details>` chiuso è invece un'**offerta**: chi ce l'ha lo apre, chi non ce
l'ha non lo vede nemmeno. È lo stesso `<details>` di `Servizi.astro`, e per la
stessa ragione — nessuno script, e il trova-nella-pagina lo apre lo stesso.

Quattro cose da sapere prima di toccarlo.

**Si chiede a chi si sta registrando, non a chi passa.** Il campo dell'adulto sta
**dentro** `data-tt-persona`, quindi compare esattamente quando compaiono nome e
cognome — cioè quando `servonoISuoiDati()` è vera e l'anagrafica la crea n8n. A
chi il club ha già in archivio il codice fiscale lo ha dato PerfectGym: è la
stessa ricopiatura che il riquadro «ti abbiamo trovato» esiste per togliere.
Quello del bambino sta dentro `data-tt-bambino`, che segue il ramo junior, e per
lui non c'è il caso «ce l'abbiamo già» — di lui PerfectGym non ci ha mai detto
niente.

**Facoltativo vuol dire «puoi non darmelo», non «puoi darmelo sbagliato».** È la
regola del cellulare: se è scritto dev'essere vero, o il dato che parte è peggio
del dato che manca — un `personalId` troncato si siede nella scheda, e lo
corregge solo chi va a guardarlo. Il controllo è **sedici alfanumerici**, e non
lo schema canonico: quello lo rompe l'**omocodia**, cioè i codici in cui
l'Agenzia sostituisce una cifra con una lettera per separare due persone che si
scontrano. Sono codici veri, in tasca a qualcuno, e un controllo elegante che li
rifiuta blocca un dato buono per fare bella figura.

**Un campo dentro un accordion chiuso non si può segnalare.** `segnala()` chiama
`focus()`, e su un elemento non renderizzato non fa niente: il modulo si
fermerebbe mostrando un errore che parla di un campo che non è a schermo — «un
modulo che si blocca su niente», che è la trappola già scritta due volte in
questo file. Quindi `apriExtra()` apre il riquadro **prima** di puntare il campo.
Vale per ogni campo che un giorno finisse dentro un `<details>`.

**E alla fine gli accordion si richiudono**, dentro `azzera()`. Il valore lo
svuota già il giro su `.tt__input`; è il riquadro *aperto* a essere il residuo —
direbbe al visitatore dopo che il codice fiscale è una cosa che gli stiamo
chiedendo. Sul totem ogni cosa lasciata a schermo è una cosa di un'altra persona.

Sul filo, i due nomi:

- verso il pannello viaggia `codiceFiscale`, e dentro `bambino.codiceFiscale`. In
  italiano come tutto il resto del payload — `dataNascita` non si chiama
  `birthDate` — e il pannello lo tiene in `payload`, dove sta già tutto il resto
  del modulo;
- verso n8n viaggiano **anche** `personalId` e `personalIdFiglio`, col nome che
  PerfectGym gli dà, come `cellulare` ripete `telefono` con il nome che quel
  workflow si aspetta. Vanno in `personalData.personalId`: il primo nella
  chiamata che crea l'adulto — `PGM Crea Lead` per gli adulti, `PGM Crea
  Genitore` per il nucleo — il secondo in `PGM Crea Figlio`;
- **vuoto vuol dire assente.** `|| undefined` toglie la chiave da
  `JSON.stringify`, così una stringa vuota non arriva a PerfectGym come la
  proposta di azzerare un `personalId` che l'anagrafica magari ha già. È la
  stessa regola del sync, «un campo assente non è un campo svuotato».

**La mappatura sui nodi la fa n8n, e finché non c'è il campo non arriva.** Il
sito manda il dato con il nome giusto; leggerlo in `personalData` è una riga in
`PGM Crea Lead`, `PGM Crea Genitore` e `PGM Crea Figlio`. Senza quella riga il
codice fiscale resta nel payload del tour — visibile in agenda, quindi non
perso — e la scheda su PerfectGym nasce come prima.

Il ramo lo decide `data-tt-gruppo` sulla casella, che il markup riempie da
`GRUPPI_ATTIVITA` — cioè da `ACTIVITY_TAGS`. Un elenco di slug scritto nel
client divergerebbe il giorno che si aggiunge un corso.

### È lo stesso percorso della chat, e le due regole vivono in un posto solo

**Prima l'email, poi i dati del genitore solo se PerfectGym non li ha già, e i
dati del bambino sempre.** Non è una somiglianza con la chat: è la chat. Le due
condizioni che lo governano stanno in `data/contatto.ts` — `anagraficaNota()` e
`servonoISuoiDati()` — e le leggono `chatAssistente.client.js` e
`tourForm.client.js`. Erano scritte dentro la chat, ed è da lì che sono state
tolte: due copie di quella condizione rispondono in due modi al primo ritocco, e
il ritocco lo fa chi tocca uno solo dei due file.

La ragione per cui i campi spariscono è che non erano una domanda, erano una
**composizione**: esistono per riempire il `personalData` della chiamata che
crea l'anagrafica. Se l'anagrafica c'è, quella chiamata non parte, e i campi
restano solo a far ricopiare a una persona in piedi quello che il club ha già
scritto.

- **Il bambino si chiede sempre, e non dipende da chi è il genitore.** Di lui
  PerfectGym non ci ha mai detto niente, nemmeno per il socio più vecchio del
  club: un corso per bambini vuole **due** anagrafiche, e la seconda non ce l'ha
  nessuno.
- **`anagraficaNota()` non è `haGiaAccount()`, e la differenza è tutta nel
  Lead.** «Può fare login?» per un Lead è no; «i suoi dati ce li abbiamo?» è
  **sì** — è a sistema da una prova, e la verifica ci ha appena restituito nome,
  cognome e telefono. Questa è la seconda domanda, ed è quella giusta qui.
- **Si chiede tutto o niente, mai due campi su tre.** `servonoISuoiDati()` è
  vera appena manca uno dei quattro — id, nome, cognome, un cellulare che passa
  `validaTelefono` — e allora il blocco torna intero, data di nascita compresa.
  Un modulo che cambia forma campo per campo si legge come un guasto, e lascia a
  indovinare perché proprio quelli.
- **L'id fa parte della condizione, e non serve a riempire un campo.** Serve
  perché è `memberId` a decidere su n8n se l'anagrafica va creata: senza id
  l'automazione la crea, e per crearla le servono proprio i dati che nascondendo
  il blocco non avremmo chiesto — nel ramo junior anche la data di nascita,
  senza la quale la chiamata fallisce in silenzio. Le due decisioni devono
  guardare la stessa cosa.
- **Un fisso in archivio vale come un numero assente.** Passa da
  `validaTelefono`, non da «c'è o non c'è»: su un fisso il richiamo su WhatsApp
  non arriva, quindi il campo si chiede. Da qui una conseguenza che si vede solo
  provandola: un numero **straniero** in archivio riporta il blocco a schermo
  precompilato con quel numero, e l'invio si ferma finché l'operatore non sceglie
  il prefisso giusto nella tendina — `validaTelefono('+39', '+44…')` non può
  fare altro. È il comportamento della chat, ed è il verso giusto: la persona
  vede il numero e lo può correggere, invece di veder partire un WhatsApp verso
  un italiano che non esiste.
- **E c'è la via di ritorno**, che qui non è una gentilezza. Al totem l'email la
  digita chi ha l'operatore davanti, e un indirizzo di famiglia riconosce il
  coniuge: chi si vede dire «ti abbiamo trovato: Giulia Bianchi» deve avere
  qualcosa da premere, o registra il tour a nome di un altro. «Non sei tu?»
  azzera tutto e riparte dall'email — non solo il riconoscimento, perché dopo
  un'email diversa anche nome, cognome e telefono precompilati sono di un altro.

L'unica differenza col passo dati della chat è la fine, e non è una scelta: là
un adulto già noto salta il modulo e va dritto in conversazione, qui il passo
resta perché porta i consensi e il comando d'invio — e quello che mostra, per
lui, è la conferma di chi è.

### E in fondo c'è «Richiedi assistenza», che è quello di `/club-life`

Stesso `SupportForm`, stessa etichetta, stessa maniglia: il comando chiama
`window.__athlonOpenSupport`, e **non porta `data-open-support`** — quello lo
ascolta uno script di `HelpDesk.astro` legato alla sezione `.hd`, che su questa
pagina non esiste, quindi l'attributo qui non aggancerebbe niente.

Serve al caso che il modulo non copre: chi al totem non sta registrando una
visita ma ha un problema da segnalare. **Piccolo e in fondo**, con lo stesso
peso che «Lavora con noi» ha su `/link` — in cima o in pieno contenderebbe con
«Ho finito», che è la cosa per cui questa pagina esiste.

Tre cose, e le prime due sono la ragione per cui non è bastato incollare il
pulsante.

- **Il pannello si monta dentro `<main>`, non dopo.** L'oblio dei tre minuti si
  arma sugli eventi che arrivano a `#tour-totem`: montandolo fuori, scrivere
  nell'assistenza non conterebbe come presenza e il modulo del tour si
  svuoterebbe sotto il naso di chi sta scrivendo. Provato: una riga scritta al
  secondo minuto tiene il pannello vivo, e sparisce tre minuti dopo *l'ultima*
  battuta.
- **Chiudere il pannello non svuota i suoi campi**: `form.reset()` sta solo dopo
  un invio riuscito. Su un dispositivo condiviso l'email e il testo di chi ha
  rinunciato a metà resterebbero per il prossimo, ed è esattamente ciò che
  questa pagina esiste per evitare. `azzera()` chiama
  `window.__athlonChiudiSupport`, che svuota e chiude — la pulizia sta in
  `SupportForm` e non qui, o due posti azzererebbero lo stesso modulo e
  divergerebbero al primo campo aggiunto.
- **Il tasto di chiusura del pannello era 38px**, sotto i 48 di un dito, e sul
  totem è l'**unico** modo di chiuderlo: non c'è una tastiera per l'Escape. Non
  si vedeva perché la spazzata misura quello che è a schermo, e un pannello
  chiuso non lo è. Ora cresce a `3rem` sotto le condizioni del totem e della
  televisione; su telefono e scrivania resta 38px.

### Il figlio di un genitore che c'è già: la quarta strada di `stradaPgm`

Nascondere i campi del genitore ha scoperto un buco che c'era da prima e che
nessuna esecuzione mostrava, perché erano tutte verdi. **A decidere era il tipo
di anagrafica, e la domanda giusta è un'altra: «questa persona su PerfectGym c'è
già?»** — cioè `memberId`, che è esattamente su cosa decide la chat
(`Esiste gia su PGM?` in `CHAT ATHLON — DATI`). `haAnagrafica` sbagliava dai due
lati:

- un **Lead** non è Member né Guest, quindi finiva in `lead` o in `nucleo` e la
  sua anagrafica veniva **creata di nuovo**, con la stessa email. Un doppione
  silenzioso, e il Lead è metà delle persone che passano da qui;
- chi era Member o Guest cadeva in `nessuna`, cioè *nessuna* delle due persone
  veniva creata: non il genitore, giustamente, ma **nemmeno il bambino**, che su
  PerfectGym non c'era. Il nucleo restava a metà. Ed era il caso normale al
  totem, non un angolo: il genitore che porta il figlio è spessissimo un Guest,
  perché una prova sua l'ha fatta.

`nucleo` esisteva solo per il genitore nuovo, e `PGM Crea Figlio` legge l'id del
genitore dalla risposta della creazione — quindi senza quella creazione non
aveva a cosa attaccarsi.

Adesso `creaGenitore` è `!memberId`, e la quarta strada è `figlio`: genitore che
c'è già, bambino che non c'è. Il percorso è `PGM Nucleo Esistente` →
`Vaglio Figlio` → `Figlio da Creare?` → `PGM Crea Figlio`, che resta **uno
solo** per tutte e due le strade — un secondo nodo che crea bambini è un nodo
che un giorno diverge. Ci arriva con `memberId` già nell'item, che è la forma
che quel nodo si aspetta. È lo stesso disegno che la chat ha già
(`GET FAMIGLIA` → `Confronta figli` → `Figlio duplicato?`), e non è una
coincidenza: è lo stesso percorso, quindi le stesse strade.

`haAnagrafica` resta calcolato e in uscita, ma non decide più niente qui: lo
legge `Solo Nuovi Junior` per sapere a chi mandare il WhatsApp, che è un'altra
domanda.

Tre cose da sapere prima di toccarla.

**Il doppione qui è probabile, non teorico**, ed è il motivo per cui c'è un
vaglio e non una creazione diretta. Un nucleo che esiste ha buone probabilità di
contenere proprio quel bambino — quello che già fa la scuola nuoto e che oggi
viene a provare un altro corso. Creato una seconda volta diventa due schede con
lo stesso nome, e il giorno che ci si attacca un contratto nessuno sa quale sia
quella buona. La chiave del confronto è **nome, cognome e data di nascita
insieme**: i fratelli condividono il cognome ma non le altre due. Senza accenti
e senza maiuscole, perché «Niccolò» e «NICCOLO» sono la stessa persona.

**Nel dubbio non si crea, ed è il verso opposto a quello del form.** Sul modulo
un invio in più costa meno di una visita persa; qui i due errori non si
somigliano. Un bambino non creato è **visibile** — la sua riga sta nella voce
del tour in agenda, che l'operatore apre comunque per scrivere le note e fissare
il richiamo — mentre un bambino creato due volte non lo vede nessuno finché non
fa danno. Quindi se la lettura del nucleo non risponde, o il genitore non si
trova, si passa oltre e `figlioPerche` dice quale delle quattro ragioni è stata.

**`Aggiorna Member Id` va guardato ogni volta che si aggiunge una strada.**
Leggeva `$('PGM Crea Genitore').item.json.memberId` con una sola guardia
`isExecuted`, sul nodo del lead: su questa strada nessuno dei due gira e
quell'espressione sollevava. Ora ha la terza alternativa, l'id che il form ha
mandato — che è **quello del genitore**, come vuole la regola: la richiesta è
sua, ed è la sua scheda che il desk apre.

**E questo cambia anche «Contattaci», di proposito.** La strada la sceglie
`stradaPgm`, che è un'affermazione su *cosa serve a PerfectGym* e non su *da
quale modulo si arriva*: farla dipendere dal form sarebbe la condizione nascosta
che poi diverge. Quindi da «contattaci» un genitore già a sistema adesso ha il
figlio registrato come lo avrebbe al totem — prima non lo aveva, e non lo diceva
nessuno — e un Lead adulto non si vede più creare una seconda anagrafica. Il
ramo assistenza non è toccato: là il bambino non si chiede, quindi `haBambino` è
falso e la strada resta `nessuna`.

Per verificare: `Vaglio Figlio` mette in chiaro `creaFiglio`, `figlioEsistente`,
`figlioPerche` e `figliVisti`, e `Normalizza e Componi Email` espone
`creaGenitore` e `haBambino` accanto a `haAnagrafica` e `stradaPgm`. Un
`stradaPgm: 'nessuna'` con `haBambino: true` vuol dire ramo adulti; con
`creaGenitore: true` non ci si arriva mai, perché senza id la strada è sempre
`lead` o `nucleo`.

**Non è «Contattaci» in una pagina**, e questa è la scelta da cui dipende tutto
il resto. Le domande sembrano le stesse — email, verifica, attività, anagrafica
— e non lo sono, perché cambia chi è nella stanza. `ContattaciModal` esiste per
far arrivare una richiesta a qualcuno che non c'è: chiede di cosa si vuole
parlare in testo libero, si ramifica sui cinque percorsi di iscrizione, e per un
genitore raccoglie il bambino con la data di nascita e le tre domande sul
livello in acqua. Al totem l'operatore è lì: il contesto lo ha raccolto
camminando e lo scriverà nelle note del tour. Chiedere qui la richiesta in testo
libero vuol dire far digitare a una persona in piedi una cosa che ha appena
detto a voce, e ogni schermata in più è un punto in cui si dice «lasciamo
stare». Quindi tre passi: email, anagrafica con le attività, conferma.

**Il tour è già successo, quindi non si sceglie nessun orario.** L'ora è adesso
e la mette il pannello. È la differenza con `/api/prenotazioni`, che invece
prende uno slot futuro e controlla che sia libero: passare da lì avrebbe voluto
dire chiedere all'agenda il permesso di scrivere un fatto. Per questo la rotta è
`POST /api/tour` (in `APP-ATHLON`), gemella ma non la stessa. Nel pannello
«tour» non è ambiguo: è un tipo di `agenda_voci`, accanto a `task` e
`appuntamento_telefonico`.

**E nasce `da_fare`, non `eseguito`.** Sembra un controsenso — la cosa è
avvenuta — ed è il punto: quello che resta da fare non è il tour, è **chiuderlo**.
Nascere già eseguito vorrebbe dire nascere senza note e senza seguito, cioè
sparire dall'agenda nel momento stesso in cui ci entra. Il conto lo chiude
l'operatore, con «Eseguito e richiama», che segna l'esito e crea il **task**
collegato — `voce_precedente_id`, lo stesso legame della riprogrammazione. Un
task e non un altro tour: riprogrammare vuol dire «non è avvenuto, lo
rifacciamo», qui è avvenuto e quello che resta è una telefonata fra una
settimana, che non ha un'ora.

Quattro cose da sapere prima di toccarlo.

**Le due chiamate, e perché in quest'ordine.** Prima `API_TOUR` sul pannello,
che scrive la voce in agenda; poi `WEBHOOK_CONTATTO` su n8n, che crea il lead su
PerfectGym e la riga su `richieste_contatto`. La prima ferma l'invio se
fallisce, la seconda no. È la stessa scelta dell'appuntamento telefonico e per
la stessa ragione: dire «fatto» per un tour che in agenda non c'è vuol dire
perderlo senza che nessuno se ne accorga, mentre un lead da riconciliare a mano
costa meno di una visita persa. Il webhook è quello dei contatti e non uno nuovo
— un tour è una richiesta di contatto con una visita già fatta — e si riconosce
da `tipoRichiesta: 'tour'`, come l'appuntamento si riconosce da
`tipoRichiesta: 'appuntamento'`.

**Le attività sono le dodici di `ACTIVITY_TAGS`, non le cinque macro di
`contatto.ts`.** Là le cinque scelte sono cinque *percorsi di iscrizione*,
perché quel form si deve ramificare; qui non si ramifica niente, la risposta può
essere più di una — un genitore che porta il figlio in piscina e intanto ha
guardato la sala pesi è il caso normale al totem — e chi la legge è una persona
che quella visita se la ricorda. Sono anche l'unica informazione che questo
modulo raccoglie e che nessun'altra tabella ha: finiscono in
`note_programmazione`, che è quello che il desk legge prima di comporre il
numero.

**La pagina si dimentica, e le strade sono due perché i modi di andarsene sono
due.** Alla conferma parte un conto alla rovescia visibile (venti secondi) che
riporta al primo passo e svuota tutto: è la strada del modulo che arriva in
fondo. L'altra copre quello che si ferma a metà, ed è il caso vero da temere —
qualcuno digita nome, cognome e numero, si distrae, e se ne va senza premere
«Ho finito». Senza un conto suo quei campi restano a schermo **per sempre**, e
la persona dopo li legge. Tre minuti di silenzio, a qualunque passo, ed è lo
stesso numero della chat sul totem dalla stessa misura: troppo presto si
cancella il lavoro di qualcuno che è ancora lì, troppo tardi si mostrano i dati
di uno sconosciuto.

**E il conto segue il dato, non il dito** — la lezione l'aveva già pagata la
chat. Armarlo sui soli eventi di interazione vuol dire che parte perché
qualcuno ha toccato lo schermo, non perché c'è qualcosa da dimenticare: basta
un percorso che arriva al passo 2 senza un `pointerdown` — l'`Enter` sul campo
email — e i dati restano lì per sempre. Quindi si arma anche dove lo stato
**nasce**, cioè dopo la verifica dell'email. Provato: al passo 2 raggiunto di
sola tastiera, il modulo si svuota comunque.

**Fuori dalla memoria della funzione non resta niente.** Nessun
`localStorage`, nessun `sessionStorage`, nessuna chiamata a
`athlonRicordaEmail` o `athlonRicordaUserNumber` — che sono i due meccanismi
con cui il resto del sito ricorda chi ha compilato, e che qui non si usano di
proposito. Quindi non c'è niente da ripulire al caricamento successivo: un `F5`
riparte vuoto per costruzione, e un ritorno dalla cache di navigazione lo
azzera `pageshow` con `persisted`. Per la stessa ragione il campo email **non
porta `data-email-nota`** — non basta che `emailNota.ts` si astenga sul totem,
l'attributo è l'adesione a un meccanismo che questa pagina non vuole — e il
pulsante fisso della chat si nasconde con `:global(.cfab) { display: none
!important }`, come su `/link` ma per un motivo diverso: lì l'assistente era già
in lista, qui è una via d'uscita da un modulo lasciato a metà.

**E l'autofill del browser è il terzo modo di ricordare, quello che non si
scrive.** Il campo del cellulare offriva in tendina il numero del visitatore
precedente, e la causa stava in `CampoTelefono.astro`: `autocomplete` era un
attributo scritto nel markup **prima** di `{...resto}`, quindi un
`autocomplete="off"` passato dal chiamante non lo sostituiva — Astro li emetteva
tutti e due e il browser onora il primo. Ora è un parametro con valore
predefinito, che non si può scavalcare per sbaglio. Vale in generale: **in un
componente condiviso, un attributo che il chiamante deve poter cambiare si
scrive come parametro con un valore predefinito, non come attributo davanti
allo spread.**

**Il link all'informativa sta fuori dall'etichetta del consenso**, e su una
pagina che si apre in sede è un vincolo. Un `<a>` dentro un `<label>` fa due
cose con un tocco solo: apre la pagina *e* spunta la casella — cioè registra un
consenso che nessuno ha dato, e lo registra proprio mentre la persona stava
andando a leggere cosa stava accettando. Altrove il danno si vede meno perché la
navigazione porta via dalla pagina; qui la scheda si aprirebbe accanto e il
modulo resterebbe lì, spuntato. `ContattaciModal` ha ancora il link dentro
l'etichetta, in due punti: va sistemato allo stesso modo, ed è la cosa da fare
la prossima volta che quel form si tocca.

Il cellulare invece è **facoltativo**, ed è l'unico campo del sito che lo sia:
la persona è qui, l'email l'ha già data, e un campo obbligatorio in più davanti
a chi ha fretta di andarsene è quello su cui il modulo si ferma. Se lo scrive
passa comunque da `validaTelefono`, perché su un fisso il richiamo su WhatsApp
non arriva.

### E chi compila riceve il promemoria della visita

L'email la scrive `Componi Email Utente` di `athlon-contatto-compilato`, che da
tre varianti passa a quattro: `assistenza`, `junior`, `baby` e **`tour`**. Non è
un workflow nuovo — un tour è una richiesta di contatto con una visita già
fatta, e duplicare quel flusso vorrebbe dire due posti in cui aggiornare le
regole di PerfectGym.

**E l'email parte solo a chi ha fatto il tour: il desk non riceve niente.**
Scelta del club, e ha una ragione che si tiene: quella visita non è una
richiesta da lavorare, è già avvenuta, e la cosa da fare — chiuderla con le
note e fissare il richiamo — vive in **Agenda**, dove la voce nasce `da_fare` e
si vede da sola. Un'email che annuncia una cosa già visibile è rumore in una
casella che ne ha. Il gate sta in `Componi Email Desk` con un `return []`,
accanto al testo che governa, come in `Componi Email Utente`. Restano la riga
su `richieste_contatto` e quella su Airtable: sono dati, non notifiche.

**E il WhatsApp ai genitori non parte**, che è la trappola nascosta di tutto
questo. `Solo Nuovi Junior` si accendeva su `ramo !== 'adulti'`: passando il
tour di un bambino a `flow: 'junior'` — necessario per il nucleo — quel
messaggio sarebbe partito a chi era appena stato in sede, e nessuno lo aveva
chiesto. Il filtro ha una quarta condizione, `tour` falso. **Vale in generale:
cambiare `flow` accende e spegne cose lontane dal punto in cui lo si cambia** —
`stradaPgm`, il WhatsApp, la variante dell'email — e vanno guardate tutte.

**Non spiega come iscriversi, ricapitola.** È la differenza con le altre tre
varianti, e viene dal fatto che chi la riceve ha appena girato il club con un
operatore: le domande gliele hanno già fatte a voce. Quindi una scheda per ogni
**area spuntata al totem**, con le pagine dove ritrovare le cose con calma.

**Le schede sono più d'una quando le aree sono più d'una**, e non si sceglie la
principale: al totem il caso normale è il genitore che porta il figlio in
piscina e intanto ha guardato la sala pesi. Sceglierne una vorrebbe dire buttare
metà di quello che ha chiesto.

**Nessun prezzo, mai, e non è prudenza: è manutenzione.** Una cifra dentro un
template è una cifra che il giorno del ritocco al listino resta indietro in un
posto che nessuno rilegge — e un prezzo sbagliato in un'email è un prezzo che la
persona ha in mano quando arriva alla cassa. I costi vivono in
`data/abbonamenti.ts` e li stampa il sito: l'email manda alla pagina che li
porta. Vale anche per i giorni del Guest Pass, che infatti non sono scritti.

Quattro cose da sapere prima di toccarla.

**L'area si riconosce dallo slug, non dall'etichetta.** `Normalizza e Componi
Email` ora emette anche `attivitaSlug` — gli id grezzi di `activities.ts` —
accanto alle etichette in italiano che il desk legge. Confrontare stringhe in
italiano vorrebbe dire rompere l'email rinominando una voce, senza che nessuno
se ne accorga.

**E la mappa slug → pagina non è l'identità.** `group-reformer` sta a
`/reformer`: quella pagina è anteriore ad `ACTIVITY_TAGS` e ha tenuto il suo
indirizzo. Comporre l'url dallo slug darebbe un link morto — e un'email con un
link morto non fallisce, arriva.

**Il tour vince sulle altre due domande.** `assistenza` e `ramo` dicono *che
tipo di richiesta* è, il tour dice *da quale modulo arriva*: un socio che
accompagna un amico è tutti e due, e quello che deve ricevere è il promemoria
della visita. Per questo il ramo si legge da `tipoRichiestaVista` — cioè da
quello che il browser ha dichiarato — e non da `statoNucleo`.

**Si ricapitola, e si propone una cosa sola: il Guest Pass, nel solo ramo
adulti.** Tutto il resto dell'email è un promemoria — corsi, abbonamenti,
attività di cui si è parlato, e dove ritrovarli — perché questa persona **è
appena stata in sede**, accompagnata da qualcuno: proporle di venire a provare è
rispondere a una domanda che non ha fatto. Il Pass è l'eccezione, ed è una
scelta del club: chi ha girato la sala pesi e i corsi ha già in mano il motivo
per provarli, e il passo dopo la visita è entrare una volta senza abbonarsi.

Il riquadro sta **dentro il ramo adulti e subito dopo le sue schede**, non in
fondo: segue le attività che l'hanno motivato. Tre condizioni, e le ultime due
non sono prudenza.

- **Almeno un'attività adulti fra quelle spuntate al totem** — è la stessa
  `adulti` che compone le schede, quindi un tour misto lo riceve: il genitore
  che ha guardato la sala pesi mentre iscriveva il figlio è il caso normale.
- **Solo a chi il Pass può averlo.** È riservato a chi non ha avuto un
  abbonamento Athlon dal 2021 (`GUEST_PASS.dal`), quindi a un socio si starebbe
  offrendo una cosa che non può comprare. La condizione è la lista bianca della
  chat — `stato` a `nuovo` o `esiste` — e la verifica che non ha risposto cade
  fuori da sé: quando non sappiamo, non si offre.
- **Niente cifre, niente giorni e nessun elenco delle attività comprese.** Le
  prime due per la regola di tutta questa email; il terzo perché un elenco a
  metà si legge come un elenco completo, ed è così che una prova finisce
  comprata per una cosa che non comprende — il Pass è un Premium, quindi non
  apre il personal training. Durata, prezzo e perimetro li stampa `/prova`, che
  li legge da `GUEST_PASS` e `ATTIVITA_GUEST_PASS`.

**Il link è `/prova/` con lo slash**, come ogni indirizzo interno del sito: senza
si prende un 308 in più, dentro un'email che qualcuno aprirà fra un mese.

L'altra «prova» che compare nel testo è la **prova di inserimento obbligatoria**
dell'agonistico e della pallanuoto, che non è un invito ma il modo in cui si
entra in quei due corsi — sta nel campo `prova` delle loro schede in
`data/junior.ts`, ed è informazione sull'iscrizione.

Per verificare, senza n8n: si esegue il nodo fuori con un payload finto e si
confronta l'HTML con quello del nodo prima della modifica. Su dodici casi ne
deve cambiare **uno solo** — il tour adulti di chi può provare — e in quello
l'unico link nuovo dev'essere `/prova/`, senza `19`, senza `7 giorni` e senza
`GOLD7`.

**L'ultimo comando apre la chat, e la apre davvero.** Porta a
`/club-life/?athlon-chat=1`: quel parametro esiste in `ChatModal.astro` proprio
per i link che arrivano da fuori, e apre l'assistente al caricamento, telefono
compreso. Un pulsante che dice «Chatta con noi» e atterra su una sezione da cui
la chat va ancora cercata è un pulsante che mente. La pagina sotto è l'Help
Desk, quindi con JavaScript spento si atterra comunque dove stanno le risposte
scritte — il verso giusto in cui sbagliare.

E non promette che risponda una persona: dice cosa fa l'assistente. Le altre tre
varianti tengono il loro comando verso l'Help Desk e non cambiano.

I contenuti non sono inventati: le fasce d'età e i claim vengono da
`data/junior.ts`, il turno fisso della Scuola Nuoto e la prenotazione lezione
per lezione del Baby Nuoto dalle regole scritte più su, la prova di inserimento
obbligatoria dell'agonistico e della pallanuoto dal campo `prova` delle loro
schede. Un dato inventato in un'email è peggio di un dato assente, perché la
persona lo porta al desk.

Per verificare: i due nodi Code si eseguono fuori da n8n con un payload finto —
è così che sono stati provati, su sette casi — e ogni link va confrontato con il
`dist`, perché una pagina rinominata qui non fa fallire niente. E prima di
pubblicare, `versionId == activeVersionId`: `update_workflow` non pubblica, e un
nodo in bozza non scrive niente.

Per verificare: la spazzata del totem (1080×1920) e della televisione
(1920×1080) su **tutti e quattro i passi, e sul passo dati in tutte e quattro le
sue forme** — adulti e junior, per uno sconosciuto e per uno riconosciuto — non
solo il primo: i nascosti hanno la gran parte dei comandi e delle etichette, e
sono quelli in cui si trovano i guai. L'ultima passata: nessun overflow, niente
sotto i 19px, nessun comando sotto i 48px, nessun paragrafo sotto i 30 caratteri
per riga. Poi il percorso intero con le due chiamate intercettate: l'invio senza
attività e senza consenso deve fermarsi, il tocco sull'informativa **non** deve
spuntare il consenso, e «Registra un altro tour» deve lasciare i campi vuoti e
nessuna spunta.

E la verifica dell'email va provata su **tutti gli esiti che può dare**, perché
è lei a decidere quali campi esistono: sconosciuto e Lead chiedono tutto, Guest
e Member non chiedono niente del genitore, e un Member di cui PerfectGym non ha
il numero rimette il solo campo del cellulare. Il bambino compare in tutti e
quattro.

**Una casella dentro la sua etichetta non è un bersaglio da misurare**: il tocco
lo prende l'etichetta. Misurando l'`input` i due consensi risultano 34×34 e la
spazzata segnala due guai che non esistono — l'etichetta è 891×62.

E la spazzata va fatta **anche col pannello dell'assistenza aperto**: è la parte
di questa pagina che il totem non aveva mai visto, ed è dove si è trovato il
solo guaio vero di questo giro.

E l'oblio, che si prova con l'orologio finto di Playwright (`page.clock`): un
modulo compilato a metà deve **restare** a 2m30 e **sparire** a 3m15, lo stesso
deve valere per un passo 2 raggiunto di sola tastiera e per un genitore
riconosciuto — di cui deve sparire anche il nome. `localStorage` deve essere
vuoto, e `sessionStorage` avere le sole due chiavi dell'attribuzione
(`athlon_utm`, `athlon_sid`): non è un dato di una persona, ed è la ragione per
cui la regola «niente nella sessione» è rispettata pur con due chiavi in mezzo.

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
| `athlon-sondaggio` | `sondaggi_risposte` |
| `athlon-verifica-iscritto`, `athlon-reset-password` | `eventi_email` |

E le automazioni della posta non partono da un webhook: `INBOX EMAIL DESK -
SUPABASE` ha un trigger Gmail, `INBOX EMAIL DESK - IMPORTO STORICO` si preme a
mano, e scrivono entrambe su `email_messaggi` passando dallo stesso
sotto-workflow. Stanno qui sotto.

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

**Le automazioni sono tre, e il perché è una riga sola scritta in un posto
solo.** `INBOX EMAIL DESK - SUPABASE` (la posta in arrivo) e `INBOX EMAIL DESK -
IMPORTO STORICO` (quella già ricevuta) sanno due cose che l'altra non sa —
quale messaggio, e di chi è — e finiscono entrambe in **`EMAIL DESK - SCRIVI UN
MESSAGGIO`**, il sotto-workflow che legge l'email intera, compone le colonne e
scrive. Il mapping di `email_messaggi` sta là dentro e da nessun'altra parte:
due copie di quel nodo divergerebbero, e la seconda divergenza non la vedrebbe
nessuno finché una colonna non resta vuota su una sola delle due strade.

Il contratto del sotto-workflow è di due campi, `gmail_id` e `utente_id`, più
l'anteprima. Il mittente, i destinatari, l'oggetto e le date li ricava dall'email
stessa: chi lo chiama non li deve ricopiare.

Quattro cose da sapere prima di toccarla.

- **La ricerca della persona *è* il filtro, e non serve nessun `IF`.** Il nodo
  Supabase che interroga `utenti` non produce righe per un mittente
  sconosciuto, quindi quell'item smette semplicemente di esistere. Ed è il
  motivo per cui quel nodo **non** ha `alwaysOutputData`: con quello arriverebbe
  a valle un item vuoto, cioè un'email da scrivere senza persona.
- **L'email intera si legge dopo la ricerca, non prima.** Il trigger sta sulla
  forma semplificata (`simple: true`), e il `simple: false` vive nel
  sotto-workflow, che gira solo per i mittenti già passati dal filtro. Al
  contrario si parserebbe l'email grezza di ogni newsletter per buttarla un nodo
  dopo — che è la causa nota di esaurimento memoria di quel nodo.
- **`corpo` esce sempre pieno.** Chi scrive da un telefono manda spesso solo
  HTML, e la parte testuale non c'è: il testo lo ricava l'automazione, così chi
  legge la tabella ha una colonna da guardare e non due da provare in ordine.
  `corpo_html` resta accanto per fedeltà, e il pannello non lo chiede.
- **L'indice unico è sulla coppia `(gmail_id, utente_id)` e non sul solo
  messaggio**, e la ragione è la posta inviata: un'email che il desk manda a due
  contatti è una riga nella scheda di ognuno dei due. Con l'unico sul solo
  `gmail_id` la seconda veniva rifiutata e uno dei due non l'avrebbe vista mai,
  **in silenzio** — perché il nodo che scrive ha `onError:
  continueRegularOutput`, che serve a non fare di una consegna ripetuta
  un'esecuzione rossa. Le chiamate hanno `retryOnFail`: il trigger Gmail non
  riconsegna, quindi un'esecuzione fallita è un'email perduta per sempre.

Gli allegati non hanno colonne, deliberatamente: il nodo Gmail butta i loro
metadati a meno che non li scarichi, e una colonna che nessuno riempie è peggio
di una colonna che manca. Il giorno che servono si accende
`downloadAttachments` e il file va su Storage, come per l'allegato dell'Help
Desk — nella riga nome, tipo e peso, non il base64.

Un'email conta come **richiesta** e non come tocco in `utente_attivita`: chi
scrive alla casella ha chiesto qualcosa davvero, a differenza di chi digita un
indirizzo in un form e chiude la pagina. La vista `email_thread` raggruppa per
scambio, che è la forma in cui una casella si legge.

#### L'importo storico si rifà, e va rifatto quando l'anagrafica cresce

`INBOX EMAIL DESK - IMPORTO STORICO` ha un trigger manuale: non parte da sé, si
preme. Legge gli indirizzi da `utenti` **una volta sola**, li impacchetta in
ricerche Gmail `from:(a OR b OR …) after:… -in:chats` e passa quello che trova
al sotto-workflow, a gruppi di cinquanta.

- **Le due direzioni in una ricerca sola.** `(from:(a OR b …) OR (in:sent
  to:(a OR b …))) after:… -in:chats` prende quello che quelle persone hanno
  scritto **e** quello che il desk ha scritto a loro: insieme fanno lo scambio,
  e con la sola posta in arrivo la scheda mostrava le domande e non le risposte.
  Quale delle due sia lo dice l'etichetta `SENT` del messaggio e non la query
  che lo ha trovato — l'etichetta resta vera anche se la query cambia.
- **La controparte cambia con la direzione**: su una ricevuta è il mittente, su
  una inviata sono i destinatari, e un'inviata a due contatti diventa **due
  righe**, una per scheda. Il limite noto: i destinatari si leggono da `To`,
  perché la forma semplificata dell'elenco di Gmail non porta il `Cc` — un
  contatto solo in copia non viene agganciato, e finisce fra gli scarti del log.
- **È Gmail a filtrare, non noi**, e questo è il capovolgimento rispetto alla
  posta in arrivo: là arriva tutto e si scarta, qui si chiede solo la posta
  delle persone che abbiamo. Elencare la casella intera per buttarne il novanta
  per cento vorrebbe dire decine di migliaia di chiamate per niente.
- **Le ricerche stanno sotto i 1500 caratteri**, contati sulla stringa finale.
  Gmail tronca le query lunghe senza dirlo, quindi il gruppo si chiude quando la
  query completa sforerebbe. L'elenco degli indirizzi compare due volte nella
  query — una per direzione — quindi gli indirizzi per ricerca sono la metà:
  misurato su quattromila indirizzi sono 267 ricerche, la più lunga di 1499
  caratteri. Contare i soli indirizzi la faceva sforare di una quarantina.
- **L'aggancio si fa in memoria e non con una query per email**, e non è solo
  velocità: `from:` in Gmail può pescare anche per nome visualizzato, quindi il
  confronto esatto con gli indirizzi dell'anagrafica è il controllo vero. Gli
  scartati si contano e si scrivono nel log — se sono tanti, la ricerca sta
  pescando più del dovuto.
- **Le email già prese non si riscaricano.** Prima di chiedere un corpo a Gmail
  si guarda in `email_gia_prese`, la vista di due colonne fatta per questo: la
  parte costosa dell'importo è una chiamata per messaggio, e senza quel
  controllo ogni giro rifarebbe da capo tutto lo scaricato per farlo poi
  rifiutare dall'indice unico. Il nodo che la legge ha `executeOnce` (la domanda
  è una, gli indirizzi in ingresso molti) e `alwaysOutputData`, perché al primo
  giro la tabella è vuota e senza un item in uscita l'importo si fermerebbe lì.
- **A gruppi di cinquanta**, e il `Loop Over Items` è lì per la memoria: senza,
  tutte le email trovate verrebbero lette e parsate nella stessa esecuzione, che
  è il modo di far cadere il nodo Gmail su una casella vera.

**Si può rieseguire quando si vuole**, ed è il modo in cui questo importo
sostituisce l'idea di archiviare la casella: `email_gia_prese` fa saltare quello
che c'è già, e l'indice unico sulla coppia è la rete sotto. Il che porta alla cosa da sapere e non ovvia:
**l'importo prende solo la posta di chi è già in `utenti`**, quindi una casella
di anni può rendere poche righe se l'anagrafica è piccola — e va rifatto ogni
volta che l'anagrafica cresce, perché la volta prima quelle persone non
c'erano. Non è una limitazione da aggirare: è la stessa regola del filtro sul
mittente, applicata al passato.

**Le caselle del club escono dal giro, e questo lo ha insegnato il primo
importo.** Su 84 righe, **47 erano sulla scheda di una collega**
(`valentina@athlonroma.it`, che in `utenti` c'è come tutti gli altri): ventuno
avvisi automatici sul suo certificato medico, e una serie di «Fwd:
Candidatura…», cioè i curriculum di altre persone nella scheda CRM di chi
lavora qui — esattamente ciò che `candidature` tiene fuori dall'anagrafica
commerciale di proposito. Le 47 righe sono state cancellate, e adesso
`DOMINI_NOSTRI = ['athlonroma.it']` toglie quegli indirizzi in due punti: dalla
lista delle ricerche dell'importo, e dal mittente della posta in arrivo — dove
basta svuotarlo, perché la ricerca su `utenti` non trova niente e l'item si
ferma da solo. Aggiungendo un dominio del club (una casella nuova, un secondo
club), va aggiunto in tutti e due.

Le due manopole — da quando importare e quanto lunga può essere una ricerca —
stanno in cima al Code node `Componi le ricerche`. La finestra è **un anno**, che
è il ciclo di un abbonamento: più vecchia di così, la corrispondenza di una
persona serve a un archivio e non al desk, e resta un dato personale in più da
conservare.

E la domanda che tornerà, con la risposta: **importare tutta la casella e
mostrare nel pannello solo ciò che combacia è la strada sbagliata.** Il
vantaggio che sembra dare — «quando una persona entra in anagrafica la sua posta
è già lì» — lo dà anche rieseguire l'importo, perché la casella *è* già
l'archivio e Gmail non perde niente. Quello che aggiunge è tutto costo: dati di
terzi senza scopo nel database del CRM (fatture dei fornitori, curriculum,
certificati medici di gente che non si è mai iscritta), una chiamata a Gmail per
ogni messaggio della casella, i corpi HTML delle newsletter come grosso dei
byte, e una tabella che smette di essere «la corrispondenza delle persone» per
diventare un archivio di posta con una colonna facoltativa. «Non visibile nel
pannello» non è una misura di protezione: è un filtro nella vetrina mentre il
magazzino resta pieno.

### E alla stessa casella l'assistente prepara le bozze, senza mandarle

`ATHLON BOZZE EMAIL` guarda la stessa posta di `INBOX EMAIL DESK - SUPABASE`,
cerca la risposta nelle voci di `/kb.json` — le stesse della chat — e **lascia
una bozza nel thread di Gmail**. Non manda niente: la rilegge una persona del
desk, la corregge o la butta, e la manda lei.

Quella riga è tutto l'impianto. Un assistente che risponde da solo per email
deve sbagliare quasi mai, perché una risposta sbagliata è già partita; un
assistente che prepara una bozza deve solo far risparmiare tempo, e il suo
errore peggiore è farne perdere trenta secondi a chi la rilegge. È la stessa
differenza per cui in chat l'`azione` si valorizza solo dopo una conferma.

**Chi scrive lo si verifica come sul sito.** `athlon-verifica-iscritto`, e il
ramo lo decide `statoNucleo` come per «contattaci» e per la chat: un abbonamento
vivo nel nucleo è assistenza, tutto il resto è una persona che sta valutando.

**E il ripiego su `stato` è un ripiego, non un'alternativa** — questa riga l'ha
insegnata la prima bozza vera. Il ramo era `statoNucleo === 'iscritto' || stato
=== 'iscritto'`, cioè un OR, quindi `stato` vinceva **anche quando `statoNucleo`
diceva altro**: un Member senza abbonamento vivo nel nucleo (`stato: iscritto`,
`statoNucleo: esiste`) finiva nel ramo assistenza, e la bozza gli diceva «sei già
dei nostri, non ti propongo di iscriverti» a una persona che invece va invitata a
iscriversi. È lo stesso scambio fra le due domande che aveva già morso in chat,
nel verso opposto. Il ripiego vale solo quando `statoNucleo` **non è arrivato
affatto**, cioè per un webhook più vecchio che non lo manda:
`(statoNucleo ? statoNucleo === 'iscritto' : stato === 'iscritto')`.

Cinque cose da sapere prima di toccarlo.

**Il recupero è una copia di «Componi contesto» di `CHAT ATHLON`, e va tenuta in
pari.** Punteggio, `ANCORE`, `SOLO_ISCRITTI` e la voce dell'accesso singolo sono
gli stessi: non sono euristiche, sono le regole che tengono il Direttore Tecnico
e la lezione singola fuori dalla vista di chi non deve vederli — e una regola
che il modello può ignorare non è una regola, quindi la voce sparisce dal
contesto invece di essere vietata a parole. Se le due copie divergono, questa
risposta le offre. Consolidarle in un sotto-workflow è il passo giusto e non è
stato fatto qui per non toccare la chat viva nello stesso cambiamento.

**Il recupero è anche il filtro, ed è quello che tiene basso il costo.** Se
nessuna voce del sito somiglia all'email — una fattura, un curriculum, la
newsletter di un fornitore — il modello non viene chiamato affatto: la soglia è
un punteggio di 6, e sta scritta accanto a ogni riga in
`email_bozze.kb_punteggio`. **Le ancore non contano per la soglia**, o la sola
parola «attività» le farebbe sparare su qualunque cosa. Se gli scarti
`fuori_ambito` diventano tanti, è quel numero da guardare, non il modello.

**Prima il recupero, poi la verifica, e l'ordine è una scelta sui dati.**
`athlon-verifica-iscritto` scrive una riga in `eventi_email` per **ogni**
indirizzo che vede, ed `eventi_email` è l'imbuto di chi ha digitato un'email in
un form: interrogarlo per ogni mittente della casella lo trasformerebbe
nell'elenco della posta in arrivo. Si chiede solo per le email che una risposta
la meritano. Il prezzo è che quando si sceglie il contesto il ramo non si sa
ancora, quindi l'ordine lo fa il solo punteggio e le voci riservate agli
iscritti le toglie il nodo dopo.

**Le regole del prompt sono metà quelle della chat e metà nuove, e la linea di
taglio è il canale.** Restano quelle fattuali — si risponde solo con quello che
c'è scritto, le cifre si citano e non si calcolano, la fonte si cita, se non sai
dillo, prima l'attività e poi il prezzo, l'abbonamento prima della lezione
singola. Cadono quelle della chat: le cento parole, l'icona in alto, il pulsante
sotto la risposta, l'`azione`, il Guest Pass da attivare. E se ne aggiungono due
che in chat non servivano: **niente markdown di nessun tipo**, perché la bozza è
in testo semplice e gli asterischi si vedrebbero, e **l'astensione allargata** —
si passa la mano su un reclamo, su una domanda che riguarda il caso personale di
chi scrive (la sua prenotazione, il suo addebito, la scadenza del suo
certificato), su una candidatura, e su qualunque cosa chieda di confermare che
qualcosa è stato fatto. Nessuna bozza è meglio di una bozza da smentire.

**La bozza è in HTML, ma il modello non lo scrive tutto.** L'HTML lo chiedeva la
leggibilità: la prima bozza vera era un muro con sei importi e tre risparmi in due
capoversi, e nessuno legge una tabella scritta in prosa. Ma un modello che
improvvisa attributi `style` produce email che si vedono in tre modi diversi —
Gmail butta i blocchi `<style>`, non carica font esterni e su alcune app mobili
riscrive i colori. Quindi il taglio è questo: il modello usa **quattro tag e
nessun attributo** (`<p>`, `<strong>`, `<ul>`/`<li>`, `<a href>`) e scrive **solo
il corpo**; `Leggi la bozza` sanifica sulla lista bianca, incolla gli stili in
linea uno per uno, e aggiunge saluto e firma — che così non possono uscire in due
copie né in due forme. I link sono `#bb4001` e non `#ff5701` per la stessa ragione
di `--accent-text` in `global.css`: l'arancio pieno non regge il contrasto sotto i
24px. L'unico ornamento è un filetto arancione sopra la firma, cioè un bordo su un
`div`: la sola decorazione che Gmail disegna sempre.

**L'email introduce, il sito spiega — ed è la regola che decide tutto il resto.**
Un'email non è una scheda prodotto: è il modo in cui il club risponde a una
persona, e chi la legge decide in dieci secondi se vuole saperne di più. Quindi
l'apertura dice **che cos'è quella cosa e cosa la rende forte**, e poi due o tre
voci d'elenco che sono **destinazioni, non dati**: il planning per gli orari, la
pagina degli abbonamenti per i costi, la scheda per una regola. Centoquaranta
parole — erano centoventi, e le venti in più sono per la cortesia, non per i
dettagli.

**E la cortesia è il registro, non una riga in più.** Chi scrive alla casella sta
chiedendo una cosa al club, e la risposta si apre ringraziandolo di aver scritto:
una riga sola, che dà del tu e sta attaccata alla sua domanda — «grazie per averci
scritto: ti racconto com'è organizzata la scuola nuoto» è già l'inizio della
risposta, mentre «Gentile cliente, in merito alla Sua richiesta» è un ufficio che
parla a una pratica. Le formule di cortesia sono **due e sono agli estremi** — il
ringraziamento e la chiusa — perché una terza in mezzo non aggiunge calore, lo
diluisce.

Il resto non si aggiunge, si scrive diverso: «volentieri», «se ti va», «quando
vuoi» al posto dell'imperativo secco; un dispiacere di una parola quando la
risposta è un no, prima di dire qual è la cosa più vicina che c'è; mai un ordine e
mai un rimprovero — una scadenza si dice come un'informazione utile, non come un
richiamo. **E il burocratese non è gentilezza**: «restiamo a disposizione per
qualsiasi chiarimento» e «non esiti a contattarci» sono le frasi con cui un
fornitore chiude una pratica, e questo è un club. Vale anche per «cordiali
saluti», che oltretutto uscirebbe doppio: il saluto e la firma li mette il nodo.

**L'identità è già scritta sul sito, e cambia col soggetto.** Ogni pagina spiega
che cos'è quello di cui parla — «Allenati in autonomia» per lo Smart, «Vivi tutto
il club» per il Premium, «Prima la passione. Poi i risultati» per la scuola nuoto,
«79 lezioni a settimana, un'offerta per ogni livello» per i corsi fitness — e
quella riga arriva nel contesto insieme al resto della voce. L'apertura la prende
da lì invece di inventarsi un tono, e prende **forme diverse**: una singola
attività si racconta col suo carattere, un insieme di attività con l'**ampiezza**
(quante sono, quanto diverse), un corso per bambini col metodo e i livelli, un
abbonamento con quello che **apre** e non con quello che costa.

**Entusiasta, non lirico**, ed è una riga che è costata un giro: la prima stesura
diceva al modello di raccontare «dal lato di chi legge», con l'esempio «nuoti per
conto tuo senza sentirti solo». L'esempio era l'istruzione vera, e produceva
bozze smielate — aperture evocative, frasi su come si sentirà, poesia. L'entusiasmo
viene dai fatti, che sono buoni: bastano quelli detti con convinzione. Le metafore
sono vietate esplicitamente, in due regole, perché una sola non era bastata.

Da qui **gli importi non si scrivono più nell'email**: una cifra sola, e solo se ha
chiesto il prezzo di una cosa per nome; il listino, i risparmi e i confronti stanno
nel link, che è il posto giusto per un listino. Vale anche per un iscritto che
chiede della sospensione o del certificato: il succo in due o tre righe, con le
parole di chi lo conosce e non di un ufficio, e poi la scheda per il resto.

*E gli orari si danno col planning*: il link di `/planning` ci va **sempre** quando
la domanda tocca gli orari, e non si affida al prompt — se l'ancora `orari` ha
sparato e quel link non c'è, lo aggiunge il nodo. «Li trovi nell'app» manda a
cercare dentro un'applicazione una cosa che sta su una pagina.

**E il soggetto della procedura è quasi sempre chi scrive.** Le procedure del club
ne hanno uno, ed è scritto nella scheda: la sospensione si chiede dal portale, la
disdetta si manda via email, il turno si prenota dall'app. L'email lo dice, con la
scadenza quando c'è. **«Ci pensiamo noi» non è un eccesso di cortesia, è una frase
che fa smettere di fare**: chi la legge non chiede la sospensione, il termine passa
e il mese gli viene addebitato lo stesso — una frase gentile che costa un addebito
è il modo peggiore di essere gentili. Quello che si offre è il **supporto**, e
quello si può dire: se qualcosa non torna basta rispondere all'email o passare in
sede. «Ti diamo una mano» è vero, «lo facciamo noi» no.

**Con un allegato si aspetta, e lo scarto si registra.** I certificati medici di
idoneità non agonistica arrivano così: per ora l'assistente non li guarda e non
scrive niente — leggerli e dire se vanno bene è il passo dopo, non questo. Una
domanda **sul** certificato — che tipo serve, quando scade — arriva senza
allegato e ha la sua risposta come tutte le altre. E vale la regola del
referral: `email_bozze` ha una riga per ogni email considerata, con `esito` e
`motivo_scarto`, perché le risposte non date che non lasciano traccia non si
possono contare né spiegare. Quello che **non** lascia riga sono le newsletter,
le notifiche e la posta interna: registrarle farebbe di quella tabella un
archivio di posta, che è l'errore che `email_messaggi` evita filtrando sul
mittente.

Per verificare: sul workflow, `versionId == activeVersionId` (vale la regola
delle bozze n8n, `update_workflow` non pubblica); su Supabase,
`email_bozze_esiti` dice quante bozze e quanti scarti per motivo. In Gmail, ogni
bozza deve stare **dentro** il thread dell'email a cui risponde e avere un
destinatario: senza `threadId` è una bozza orfana, senza `sendTo` è una bozza
che non si può mandare.

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

## Il banner "hai visto un'attività" si costruisce su quello che il sito registra già

Chi visita la pagina di un'attività per adulti — Calisthenics, per dire — e se
ne va senza lasciare niente, tornando il giorno dopo non riceveva nessuna
proposta: il sito non lo riconosceva. `src/scripts/prova_suggerita.ts` mostra
un banner discreto, non un modal che si apre da solo, con un pulsante verso
`/prova` — e il grosso di quello che serve esisteva già: `vid` (via
`attribuzione.ts`), il registro di ogni pageview (`visite_pagina`), e la vista
`visitatori` che dice se un vid è già un contatto.

**La whitelist è `PAGINE_ADULTI`, non un elenco nuovo.** Il webhook n8n
(`athlon-suggerisci-prova`) deve confrontare `visite_pagina.pagina` con le
pagine di attività adulti — mai home, junior, wiki, eventi, news, planning —
ma quella lista vive nel codice del sito, non in Supabase. Invece di
duplicarla a mano in n8n (che marcirebbe il giorno che si aggiunge un corso),
`src/pages/pagine-adulti.json.ts` la espone come endpoint statico generato da
`PAGINE_ADULTI` (`data/pagine.ts`) — stesso pattern di `/kb.json`/`/llms.txt`.
**È un oggetto `{ pagine: [...] }` e non un array nudo**, o il nodo HTTP
Request di n8n lo spezzerebbe in tanti item quante sono le attività, invece di
un item solo da confrontare.

**L'esclusione "è già un contatto" non chiama PerfectGym.** La vista
`visitatori` (vedi sopra) affianca già `utente_id` quando lo stesso `vid` ha
lasciato un dato in qualunque form o chat del sito: `utente_id is not null`
copre da sola sia "ha già chiesto una prova" sia "è già socio con un contatto
lasciato altrove", senza nessuna chiamata OData. **E filtra anche su
`vid_stabile`**, come fa già `visitatori` per il resto: un vid rigenerato
senza consenso pubblicitario non tornerà mai, e includerlo nel conteggio delle
pagine viste sarebbe rumore, non un dato.

**Le due finestre**: la pagina va vista **almeno 24 ore fa**, e non oltre 30
giorni. Fino a **tre attività**, le più recenti per pagina distinta — il
webhook registra ogni chiamata, scarti compresi, nella tabella
`prove_suggerite` (`esito`: `proposto` | `scartato-contatto-noto` |
`scartato-nessuna-pagina-attivita`), sul modello di `richieste_referral`.

**Il consenso è `advertisement`**, lo stesso di `vid`: lo script esce subito
se `window.athlonVidStabile()` è falso, prima ancora di incapsulare qualunque
cosa in `quandoConsentito`. **Niente sul totem**, per la stessa ragione di
`emailNota.ts`: un dispositivo condiviso non deve mostrare a chi arriva dopo
le attività viste da chi è passato prima.

**Il banner non apre `ProvaModal`.** Un modal che si apre da solo era il
vincolo da evitare; il pulsante è un link semplice a `/prova`, la pagina che
già racconta il Guest Pass — nessuna logica di apertura da riusare, nessuna
modifica al modal.

Per verificare: inserire in `visite_pagina` una riga con `pagina` di
un'attività adulti, `vid_stabile = true`, `created_at` 25 ore fa, e chiamare
il webhook con quel `vid` — deve rispondere con l'attività. Con `created_at`
2 ore fa, o con una pagina non nell'elenco, deve rispondere `{ "attivita": [] }`.
Con un `vid` che risolve a un `utente_id` (via `visitatori`), deve scartare
come `scartato-contatto-noto` anche se le pagine ci sono.

## `/surveys` è un menu di mini survey, e la recensione si chiede solo ai promotori

Otto questionari da tre giudizi e un NPS — `/surveys/<tema>/` — più il menu su
`/surveys/`. I temi stanno in `src/data/surveys.ts`, la pagina è
`pages/surveys/[survey].astro`, la meccanica `lib/surveyForm.client.js`, e le
risposte finiscono su `sondaggi_risposte` (Supabase `app-athlon`) passando dal
webhook `athlon-sondaggio`.

**Otto survey brevi e non una lunga**, ed è la scelta da cui dipende tutto il
resto. La media di dodici domande è un numero solo e non dice dove intervenire;
cinque domande su un tema dicono *quale* cosa non va e si compilano in un
minuto, che è il tempo che ha in mano una persona ferma alla reception. Il
tetto è **sette**, e vale la stessa ragione al contrario: oltre, la survey
diventa un questionario, che compila solo chi ha già deciso di lamentarsi —
cioè il campione peggiore che si possa raccogliere.

**Ogni domanda controlla una promessa scritta sul sito**, ed è la regola da cui
si scrive la prossima. Il sito dichiara un perimetro preciso — «assistenza
bagnino sempre presente», «prenoti a partire da 3 giorni prima», «se qualcosa
cambia lo sai prima», «gruppi da 10 persone con istruttore dedicato», «brevetti
aggiornati circa ogni due mesi» — e una survey che non chiede proprio di quelle
cose misura la simpatia, non il servizio: «com'è la piscina» dà una media che
non si può usare per decidere niente, «l'acqua era alla temperatura giusta»
dice se abbiamo mantenuto un numero che abbiamo scritto noi. Da qui anche
quante sono: la piscina ne ha sette perché dichiariamo temperatura, corsie,
bagnino e turni; la reception cinque.

**E il raccordo va nei due versi.** Se scrivendo una domanda ci si accorge che
una cosa che facciamo non è scritta da nessuna parte, si scrive prima sulla
pagina e poi la si chiede — è successo con «a chi si segnala un attrezzo
guasto», che la survey della manutenzione dava per noto e il sito non diceva:
ora sta nella f.a.q. di `/gym-floor` **e** nella scheda `adulti/gym-floor`, che
è dove il `kb.json` la prende. Nell'altro verso, una risposta che dice che una
promessa non regge è un cambiamento della pagina prima che della domanda.

**E il verso opposto ha già prodotto due schede.** Chiedere «la risposta è
arrivata in tempi ragionevoli» misurava il metro di chi risponde, non il
servizio: la promessa non era scritta da nessuna parte. Ora c'è —
`generali/tempi-di-risposta`, poche ore e in genere un'ora negli orari di
apertura — e la domanda chiede quella. Stessa cosa per la manutenzione: «viene
riparato in fretta» chiedeva una velocità che il club non può promettere su un
pezzo di ricambio, quindi la scheda della Gym Floor dichiara il ciclo — presa in
carico e gestita fino alla risoluzione — e la domanda verifica quello. Le due
domande che si somigliavano sono diventate una.

Il campo `fonte` di ogni survey tiene agganciati i due lati: in fondo alla
pagina rimanda a dove quella promessa sta scritta, così chi risponde può
vederla e chi tocca quella pagina trova qui le domande che la controllano. Un
rimando morto in fondo a un questionario si nota; una domanda che ha smesso di
corrispondere a quello che promettiamo, no.

**Gli `id` delle domande non si rinominano.** Sono il nome della colonna dentro
`risposte` su Supabase e nel pannello: cambiarne uno spezza in due la serie
storica di quella domanda, senza che niente dia errore.

**Su `/club-life` c'è la porta, non la prima domanda.** La fascia «Raccontaci
come sta andando» sta fra i Servizi e l'Help Desk — il posto che era della
fascia «Porta un amico», e per la stessa ragione: è una cosa che chiediamo noi,
in mezzo a due sezioni che raccontano cosa diamo. **Prima** dell'Help Desk di
proposito: dopo, la pagina la chiude il modulo dell'assistenza, e un
questionario dopo «richiedi assistenza» si legge come un passaggio del reclamo
appena aperto. E porta al menu invece di cominciare una survey lì: chi apre
Club Life sta cercando una news o una risposta, e la prima decisione vera è di
quale cosa parlare. Il numero degli argomenti lo conta `SURVEYS.length`, non è
scritto: una cifra ricopiata resta a otto il giorno del nono tema.

**L'indirizzo per tema è il punto, il menu è il ripiego.** Una survey si manda
in una newsletter, si stampa in un QR accanto agli spogliatoi, si incolla in una
risposta del desk: `/surveys/pulizia/` *è* già la domanda. Il menu esiste per
chi arriva dal link generico, e chi arriva da lì non deve poterlo saltare per
sbaglio. Niente ancore su una pagina sola: un link diretto che deve aprire un
pannello via JavaScript è un link che non funziona quando lo script non arriva.

**`noindex` e fuori dalla sitemap**, come `/referral` e `/attiva`: un
questionario indicizzato raccoglie giudizi di chi non frequenta. Il filtro in
`astro.config.mjs` esclude `/surveys` per intero.

**La dedica in cima al menu non è un preambolo di cortesia**, ed è la parte che
decide quante risposte arrivano: dice perché chiediamo (è da lì che decidiamo
dove intervenire), cosa ci impegniamo a fare — migliorare la qualità dei
servizi, rispondere con puntualità, dire con chiarezza cosa comprende l'offerta
e per quanto tempo vale — e cosa costa rispondere. «La tua opinione è importante
per noi» non dice nessuna delle tre.

**E il titolo cambia interlinea sotto i 700px.** A `--lh: 0.92` le due righe si
toccano appena il titolo va a capo, e sul telefono va a capo sempre: il corpo
scende col `clamp`, l'interlinea è un rapporto e resta stretta uguale. Si passa
da `--lh` e mai da `line-height`, o la spaziatura sopra le maiuscole accentate
resta quella di prima e le tronca.

**L'NPS c'è in tutte, e non è ripetizione.** Le stelle misurano il servizio,
l'NPS misura la disposizione a parlarne — che è esattamente quello che una
recensione è — e ripeterlo rende i temi confrontabili («sugli spogliatoi
promotori 20%, sulle lezioni 70%»), che è la ragione per cui le pagine sono otto
e non una.

**La soglia della recensione è NPS ≥ 9 *oppure* media ≥ 4,5**, in OR e non in
AND: chiedere entrambe vorrebbe dire non chiederla a chi ha dato 5, 5, 4 e un 9,
cioè a un promotore vero, per un decimale. E il verso in cui si sbaglia è
deliberato — non chiedere una recensione a chi l'avrebbe scritta costa una
recensione, chiederla a chi ha appena detto che gli spogliatoi sono sporchi la
scrive. Quando non sappiamo (nessun voto, nessun NPS) non si chiede: è la lista
bianca del Guest Pass applicata qui.

**La regola vive in `giudizioPositivo()` e in un solo altro posto.** Il browser
la usa per scegliere la schermata finale, n8n la riapplica prima di scrivere:
n8n non importa il codice del sito, quindi le due copie vanno tenute in pari, e
questa è l'unica duplicazione dichiarata. Media e `positivo` **si ricalcolano**
su n8n invece di prendere quelli del payload: sono dati derivati e decisioni, e
un webhook pubblico non accetta decisioni da fuori.

**Il campo aperto c'è sempre, e a cambiare col giudizio è l'etichetta.** È
l'unica domanda che può dirci una cosa che non avevamo pensato di chiedere — le
stelle misurano quello che sappiamo già di dover misurare — quindi nasconderlo a
chi è contento vorrebbe dire raccogliere suggerimenti solo dagli scontenti. Ma
la domanda non può essere la stessa per tutti: «cosa potevamo fare meglio» a chi
ha dato cinque stelle è una domanda a cui quella persona non ha risposta, e la
lascia in bianco. Quindi tre forme, e le sceglie `aggiornaNota()` mentre si
risponde: neutra finché non c'è un giudizio (ed è quella che il markup porta
scritta, cioè quella che vede chi ha JavaScript spento), «cosa potevamo fare
meglio» sotto soglia, «c'è qualcosa che ti piacerebbe trovare» sopra.

**La prima versione lo nascondeva sopra soglia**, sul modello del voto alla
chat, e la differenza fra i due casi è che lì la nota è un'appendice a un voto e
qui è metà del dato: un questionario a stelle senza campo libero raccoglie solo
risposte alle domande che qualcuno ha già pensato di scrivere.

**L'email è facoltativa e quasi sempre non si digita.** Tre strade in ordine: il
parametro `email` o `UserNumber` nel link (una newsletter sa a chi scrive),
l'email che il browser ricorda (`emailNota.ts`), il campo. Un'email nel link
**vince sul ricordo e toglie `data-email-nota` dal campo**, o `emailNota.ts` lo
riempirebbe di nuovo al primo fuoco — la trappola già vista sul modulo del tour.
Se resta vuoto la risposta parte comunque: un giudizio anonimo vale, il `vid` lo
aggancia alla visita, e un campo obbligatorio davanti a una survey volontaria è
il punto in cui si chiude la pagina.

**L'invio può fallire e lo si dice**, ed è l'eccezione alla regola dei form del
sito. Là in fondo c'è una richiesta che costa più se si perde che se si duplica;
qui c'è un giudizio — mandarlo due volte sporca la media, e dire «grazie» per
una risposta che non è arrivata è una bugia che nessuno può scoprire. Quindi
errore in chiaro e il pulsante torna premibile. La `fetch` porta `keepalive`,
come il voto alla chat: una survey è spesso l'ultima cosa che si tocca prima di
chiudere la scheda.

**Le stelle e l'NPS sono `input[type=radio]`, non pulsanti governati da uno
script.** Selezione, tab e screen reader funzionano prima che il client arrivi,
e l'accensione delle stelle fino a quella scelta la fa `:has` in CSS. Il
bersaglio è l'etichetta (3rem), non l'`input`, che è fuori schermo: misurando
l'`input` una spazzata segnala 26 bersagli da 1×1 che non esistono — è la stessa
falsa positività delle caselle di consenso al totem.

Per verificare: la spazzata del totem (1080×1920) e della televisione
(1920×1080) su tutte e tre le schermate — le domande **con la nota aperta**, il
grazie del promotore, il grazie degli altri — deve dare nessun overflow, niente
sotto i 19px, nessun comando sotto i 48px e nessun paragrafo sotto i 30
caratteri per riga (ultima passata: min 40, mediana 72). Poi il percorso intero
con la chiamata intercettata: un giudizio basso deve far comparire la nota e
finire sulla schermata del team, uno alto deve saltarla e mostrare il pulsante
di Google, e l'invio senza nemmeno un voto deve fermarsi. E su n8n,
`versionId == activeVersionId`: `update_workflow` non pubblica.

## La prova di inserimento chiede prima e prenota dopo

`ProvaNuotoModal.astro` + `lib/provaNuotoForm.client.js` + `data/proveNuoto.ts`.
Lo aprono i pulsanti «Richiedi la prova di inserimento» di `/pallanuoto` e
`/nuoto-agonistico`, che `PaginaJunior` già marcava con
`data-cta-intent="insertion_trial"`.

Sei schermate, e **l'ordine è la cosa che conta**:

```
categoria → requisiti ─┬ tutti sì → giorno → email → dati → prenotata
                       └ un no    → scuola nuoto, e finisce qui
```

Prima quegli stessi pulsanti aprivano `ContattaciModal`, cioè un modulo di
richiesta informazioni: la prova ne usciva come una domanda a cui il desk
rispondeva al telefono, e **il livello tecnico non lo chiedeva nessuno**. Il
caso che costava era chi si presentava a una prova agonistica senza saper
nuotare: non è colpa di nessuno, è una domanda che nessuno aveva fatto.

Adesso la fa il modulo, e la fa **una alla volta**. Non un elenco di caselle da
spuntare: un elenco si spunta tutto per arrivare in fondo — è quello che
succede a ogni «dichiaro di aver letto» — mentre una domanda sola, con due
pulsanti larghi e uguali, si legge davvero. Sì e No hanno la stessa dimensione
di proposito: uno più grande dell'altro è un consiglio su cosa rispondere.

**Le domande non stanno scritte nel modulo: si leggono dal livello del corso.**
`categoriaDa()` prende `livello.voci` da `data/junior.ts` — le stesse voci che
la scheda stampa come «Livello minimo richiesto B2 · Dorso, Stile libero, Gambe
rana» — e `FRASI` dice soltanto *come si chiede* ogni voce, perché a una sigla un
genitore non può rispondere.

È così per un errore, e vale ricordarlo: la prima versione ricopiava l'elenco a
mano, e nel ricopiarlo aveva aggiunto tre prove che il club non chiede da
nessuna parte — le virate, i venticinque metri di fila, l'acqua alta. **Un
questionario che filtra le persone non può contenere un requisito che la pagina
non dichiara**: chi si vede rifiutare la prova non lo troverebbe scritto in
nessun posto, e chi la ottiene avrebbe dichiarato cose che nessuno gli chiederà.
Adesso una voce nuova senza frase **non compila**, che è il modo giusto di
accorgersene.

Un caso merita la sua riga: `Stile libero bilaterale` (B3) nomina la
respirazione bilaterale **nella domanda** e non solo nell'aiuto. È l'unica cosa
che lo distingue dallo `Stile libero` del B2, e «sa nuotare a stile libero?»
avrebbe raccolto un sì anche da chi respira sempre dallo stesso lato.

Gli **id** devono combaciare con quelli in `lib/proveNuoto.ts` del pannello:
sono la chiave con cui la rotta verifica che la prenotazione arrivi con tutti i
requisiti dichiarati. Li genera `idDa()` dalla voce, quindi cambiano solo se
cambia la voce sulla scheda — e in quel caso vanno cambiati anche di là,
altrimenti ogni invio torna un 422.

**Un solo «no» chiude il ramo**, e la schermata che si apre non dice «no»: dice
qual è il percorso — la Scuola Nuoto Bambini — e nomina *la prova che manca*,
non «non hai i requisiti». Un genitore che legge «riesce a nuotare 25 metri di
fila?» sa cosa deve accadere prima di riprovare; da un giudizio generico non sa
niente. Le due uscite sono l'articolo del Wiki sull'iscrizione (come si fa) e la
pagina del corso (cos'è), più «torna alle domande» per il caso vero di chi ha
capito male una parola da piscina.

**Il questionario sta prima del calendario.** Vedere le date e poi sentirsi
dire «non sei idoneo» è la sequenza che fa arrabbiare; sentirselo dire prima,
con l'indicazione del corso giusto, è un'informazione utile.

Il giorno porta **un orario solo** — la prova si fa dentro l'allenamento del
gruppo — quindi non c'è la griglia degli orari di `AppuntamentoModal`: solo le
pillole dei giorni, con quanti posti restano scritti sopra. «Ultimo posto» è
l'informazione che fa scegliere quel giorno invece di rimandare.

`ContattaciModal` esclude questo intento a mano (`if (cta.dataset.ctaIntent ===
'insertion_trial') return`): sono gli stessi pulsanti `data-cta="resolve"`, e
senza quella riga si aprirebbero due pannelli sullo stesso clic.

**L'email si verifica, e il nucleo familiare lo compone la chat.** Il passo
`email` è quello della chat e del totem: `WEBHOOK_VERIFICA` dice se PerfectGym
ha già quell'indirizzo, `anagraficaNota` e `servonoISuoiDati` — le stesse
funzioni, non una copia — decidono se i campi del genitore vanno chiesti o
soltanto riempiti. Riempiti restano visibili e modificabili: un dato che arriva
da un gestionale va potuto guardare prima di confermarlo.

Sta **dopo** il giorno e non prima, al contrario dell'appuntamento telefonico,
perché qui la cosa contesa è il posto in vasca: prima si mette al sicuro quello.

Due date di nascita, con due regole diverse, e le impone il workflow a valle.
Quella del **minore** sempre: `Members/AddGuestMember` vuole `birthDate`, e
senza non si può creare la sua scheda. Quella del **genitore** solo quando la
verifica non ha restituito un `memberId`, cioè solo quando la sua scheda va
creata adesso — con un `memberId` si crea unicamente il figlio, sotto di lui, e
quel campo non lo legge nessuno. Il modulo lo mostra di conseguenza.

Poi l'invio, in tre chiamate e in quest'ordine:

1. `POST crm.athlonroma.it/api/prove-nuoto` — occupa il posto, che è la cosa
   contesa e che sono in due a potersi prendere;
2. `POST webhook/chat-athlon-dati` — **lo stesso webhook della chat**, con
   `ambito: 'junior'`. Dentro c'è già tutto: crea il genitore se non c'è, poi
   `GET FAMIGLIA` legge i `familyChildren` del suo `memberId`, `Confronta figli`
   cerca il minore per nome e cognome — senza maiuscole né accenti, il criterio
   con cui un genitore direbbe «è lui» — e lo aggiunge al nucleo con
   `parentMemberId` solo se non lo trova. Riscriverlo qui avrebbe voluto dire una
   seconda implementazione della stessa regola contro lo stesso gestionale;
3. `POST webhook/athlon-prova-nuoto` — le tre email.

Se la 2 o la 3 falliscono si prosegue: il posto è occupato e la riga nel
pannello porta nome, cognome e telefono, quindi la prova si fa e il resto lo
sistema il desk. All'inverso — la scheda creata e nessun posto — resterebbe una
famiglia nuova su PerfectGym senza nessuna prova a cui presentarsi.

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

### Una f.a.q. scritta in una pagina non arriva all'assistente

`kb.json` raccoglie le f.a.q. **dei corsi** — quelle dichiarate in `corsi.ts` e
`junior.ts` — e il testo delle schede del wiki. Le f.a.q. scritte a mano
nell'array di una pagina `.astro` no: vivono in quella pagina e basta.

Non è un difetto, è il taglio del file: le voci sono i contenuti, non il
markup delle pagine. Ma è una trappola quando si corregge un errore della
chat, perché il posto dove viene naturale scrivere la risposta è la pagina, e
lì l'assistente non la legge. È successo con la Gym Floor: la f.a.q. di
`/gym-floor` diceva già che l'accesso si prenota e che c'è la fascia Con
Assistenza, e la chat continuava a rispondere «entri quando vuoi, senza
prenotazione» — perché quello che leggeva erano `activityInfo` e la scheda
`adulti/gym-floor`.

Quindi: **un dato che deve arrivare all'assistente va messo dove il `kb.json`
lo prende** — i dati (`abbonamenti.ts`, `planning`, `club.ts`), una scheda del
wiki, o la f.a.q. di un corso. La f.a.q. della pagina è per chi legge la
pagina, e le due cose si scrivono insieme. Per controllare dove è finita una
frase: `grep` sul `dist/kb.json`, che è l'unica verifica che conta.

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

## Il calendario del Direttore Tecnico e' un'altra agenda, non un parametro

Le tre schede dell'Help Desk sulla direzione tecnica del nuoto —
`direzione-tecnica.md`, `didattica.md`, `brevetti.md` — avevano in fondo l'embed
di Calendly `athlonclub/nuoto2`, incollato a mano, ed erano le ultime tre cose
del sito rimaste su Calendly. Adesso prenotano sul calendario del club:
`data/appuntamentoNuoto.ts` per gli indirizzi, `AppuntamentoNuotoInline.astro`
per il riquadro, e nel Markdown un contenitore vuoto
`<div data-athlon-appuntamento-nuoto>` — lo stesso patto dell'embed che
sostituisce, dove il Markdown scriveva un `div` e a riempirlo era roba di un
terzo. **Quindi `data/calendly.ts` non esiste piu'**, la voce di Calendly esce
da `data/privacy.ts` e i domini terzi del `<head>` restano uno.

Dieci minuti, dal lunedi' al venerdi' fra le 15 e le 16, con un'ora di
preavviso: trenta slot a settimana, e il numero e' il punto — e' l'ora che una
persona sola dedica alle famiglie, non lo sportello del club.

**Un file di dati a parte e non un parametro su `data/appuntamento.ts`**, e la
ragione e' che sono due agende: gli orari li serve un'altra rotta
(`/api/appuntamenti-nuoto/slot`) che legge un'altra tabella, quindi una
telefonata del desk alle 15:20 non tocca il Direttore Tecnico e un tour di
quarantacinque minuti non gli chiude l'ora. Con un calendario solo quel conflitto
sarebbe stato invisibile e permanente.

**Ma il modulo e' lo stesso, e questa e' l'altra meta' della scelta.** I passi
sono `AppuntamentoPassi.astro` con `variante="nuoto"` e la logica e'
`appuntamentoForm.client.js` con la stessa variante: due copie di quel percorso —
orari, identita', dati, un ultimo passo, fatto — divergerebbero al primo difetto
corretto in una sola. Quello che la variante cambia sta in tre posti e basta: gli
indirizzi (`V.slot`, `V.prenota`), i testi del primo passo, e l'ultimo passo.

Cinque cose da sapere prima di toccarlo.

**L'ultimo passo e' l'unico bivio vero.** Al desk si chiede l'argomento della
chiamata — una telefonata senza sapere di cosa si parla e' tempo buttato per
tutti e due — al Direttore Tecnico si chiede **il bambino**, perche' l'argomento
e' lui: nome e cognome sono la chiave con cui la chiamata si aggancia alla sua
anagrafica su PerfectGym. Nient'altro: chi prenota e' già iscritto, quindi la
data di nascita e il resto stanno sulla sua scheda, e chiederli qui sarebbe far
ricopiare a una persona quello che il club ha già scritto. `campoOggetto` non
esiste in questa variante, e la guardia dentro `invia()` e' cio' che rende il
passo condiviso davvero condiviso.

**Il blocco dei dati risponde a un'altra domanda.** Per il richiamo del desk
basta «ha un account?» (`haGiaAccount`): chi ce l'ha ha lasciato i suoi dati, e
richiederglieli e' il modo più rapido per far chiudere la pagina a un socio. Qui
no, e la ragione e' il telefono: quella chiamata la fa il Direttore Tecnico, e un
numero che in archivio manca — o che e' un fisso — e' un numero su cui non
arriva. Quindi vale la regola del totem, `servonoISuoiDati()`: o si chiede tutto,
o si conferma tutto. Un fisso in archivio vale come un numero assente.

**La riga «riservato agli iscritti» sta sopra i giorni, prima di qualunque
campo**, e non e' un cancello: il modulo non blocca nessuno. Vale la regola di
tutti i form del sito, e la verifica la fa il pannello per chi risponde, non per
chi chiede — un appuntamento da riconciliare costa meno di una famiglia iscritta
respinta perche' il nome del bambino su PerfectGym e' scritto in un altro modo.
Ma dirlo prima serve: scoprire al telefono che il servizio non era per se' e' il
momento peggiore per scoprirlo.

**Il sito non chiama n8n a prenotazione fatta**, al contrario del calendario del
desk che chiama due webhook. Le due email le manda la rotta del pannello, e la
ragione e' che meta' di cio' che dicono — se la famiglia risulta iscritta, a
quale corso — nasce **dentro** quella rotta, dopo la prenotazione: farlo tornare
al browser perche' lo rigiri a n8n vorrebbe dire far decidere al client cosa si
scrive a nuoto@athlonroma.it. E il lead su PerfectGym non serve: chi prenota qui
e' a sistema per definizione.

**Il controllo del contenitore nel wiki va scritto in negativo.**
`includes('data-athlon-appuntamento')` e' vero anche su
`data-athlon-appuntamento-nuoto`, quindi le tre schede della direzione tecnica si
vedevano montare **tutti e due** i riquadri — due form con gli stessi stili, uno
senza il suo posto dove andare. La guardia e'
`/data-athlon-appuntamento(?![-\w])/`: dopo il nome non ci deve essere altro.

Per verificare, sul `dist`: le tre schede della direzione tecnica hanno un solo
`data-appuntamento-nuoto-inline` renderizzato e i campi `apn-minore-nome` e
`apn-minore-cognome`; `preiscrizioni-nuoto` tiene il suo riquadro del desk e non
prende quello nuovo; e in `src/` non compare più nessun `calendly-inline-widget`.

### La spazzata di tutte le pagine, e i tre guai che ha trovato

Girata su tutto il `dist` — 99 pagine dopo aver scartato le quattro di `meta
refresh` — nei due formati, più i **quattro passi** del calendario del Direttore
Tecnico e il passo dati in tutte e quattro le sue forme (sconosciuto, Lead,
Member completo, Member senza numero utile). Overflow: nessuno, in nessuno dei
due formati. Testo sotto i 19px: nessuno. Caratteri per riga: mediana 81 sul
totem e 115 sulla televisione.

I tre difetti erano lo **stesso** difetto scritto in tre punti, e vale la pena
riconoscerlo perché tornerà: **una misura fuori da `--text-*` resta indietro
ovunque la radice cresca**, e la si scopre solo dove la radice cresce.

- **`.footer-contact-btn`** — 0,4rem di padding attorno a una riga di
  `--text-xs` fanno 1,6rem, cioè 43px sul totem: cinque sotto la misura di un
  dito, su **ogni** pagina del sito. Il freno è `min-height` e non più padding,
  perché l'altezza deve stare sopra una soglia e non crescere di una quantità
  fissa: così il giorno che `--text-xs` viene ritoccato la regola tiene ancora.
- **`.ap__giorno-quanti`** — `0,62rem`, cioè 16,7px sul totem, ed è il numero
  dei posti rimasti: quello che fa scegliere un giorno invece di rimandare.
  Vale per tutte e tre le agende, perché la regola sta nel blocco `is:global`
  di `AppuntamentoModal.astro`.
- **`.activity-row__mark`** — il `?` di `/abbonamenti` aveva già la sua regola
  per il totem e la televisione era rimasta fuori: 17,7px, l'unico testo del
  sito sotto il fondo della scala in quella modalità.

Tutti e tre si correggono **dentro** le condizioni del totem e della
televisione, non alla radice: su telefono e scrivania quelle misure sono state
scelte lì e restano quelle.

E una segnalazione della spazzata non era una misura: il **link
all'informativa stava dentro l'etichetta del consenso**, in tutte e due le
agende. È la trappola già scritta per `/tour` — un `<a>` dentro un `<label>` fa
due cose con un tocco solo, apre la pagina *e* spunta la casella, cioè registra
un consenso che nessuno ha dato e lo registra proprio mentre la persona stava
andando a leggere cosa stava accettando. Qui morde più che su un modal, perché
il riquadro vive **incorporato in una pagina del wiki**: la scheda si apre
accanto e il modulo resta lì, spuntato. Ora è fuori, `inline-flex` con
`min-height: 3rem`, e la prova è quella: si tocca l'informativa e il consenso
resta `false` — provato nei tre formati, telefono compreso, dove il bersaglio
misura esattamente 48px. Resta da fare in `ContattaciModal`, che ce l'ha in due
punti.

Tre cose sono **falsi positivi noti**, e conviene saperle o si ritrovano ogni
volta:

- i quadrati di **`/diagnostica-schermo`** *sono* la prova — la pagina disegna
  bersagli di misure assortite da premere e misurare;
- le **briciole del percorso** delle news (`nav.nws__crumbs > a`) sono testo,
  non bersagli, come i link dentro un paragrafo;
- le caselle **`disabled`** degli elenchi markdown del wiki (13×13) non si
  premono: sono un segno di spunta disegnato, non un comando.

E sulla televisione **i bersagli non sono un criterio**: nessuno la tocca. Là
valgono overflow, corpo del testo e caratteri per riga — gli 84 comandi «sotto
i 48px» che una spazzata segnala su quel formato sono la barra, il footer e i
link-comando, tutti governati dalla loro riga di testo.

Resta aperta una cosa, ed è una scelta di disegno e non un difetto: sulla
televisione **tre schede della home** (`p.card__desc`) fanno 25–27 caratteri per
riga. Il carosello ne mostra quattro per volta, e su 58rem di contenitore ogni
scheda tiene 13,4rem contro le 19,9 della scrivania — è il prezzo della radice
grande, scritto nella sezione della televisione. Scendere a tre schede per
volta porterebbe la riga sopra i 30, ma quel testo compare **al passaggio del
puntatore**, che su un televisore non esiste: allargare le schede per una
descrizione che là non si legge è un cambiamento della home page pagato per
niente. Se un giorno quel testo diventa sempre visibile, allora sì.

## Un numero in vetrina si legge da un posto solo, e il build lo controlla

Il sito diceva quanti sono i corsi fitness in tre punti, e diceva tre cose
diverse: il menu «15 corsi», `/corsi-fitness` «19 corsi» — ed elencava 19
schede vere — la home «Diciotto corsi». Tre file, tre affermazioni sulla
stessa cosa, nessuno che leggesse dall'altro.

La causa non era la distrazione ma la **copia**: l'header teneva un elenco dei
corsi ricopiato a mano, fermo al giorno in cui fu scritto (non sapeva di
Matwork 4.1, aggiunto più tardi solo alla pagina dei corsi), e la home una
frase fissa mai più toccata. Ora `data/corsi.ts` esporta `CORSI_FITNESS`,
`LEZIONI_FITNESS` e `NUMERO_CORSI_FITNESS`, e header e home li leggono.

**Fitness è «senza `eyebrow`», non un elenco di slug.** Le quattro attività in
acqua dichiarano un occhiello proprio — «Athlon Aqua», «Nuoto» — che è già il
modo in cui il sito le tiene distinte. Un corso fitness nuovo entra da solo;
uno in acqua ne resta fuori perché ha il suo occhiello, non perché qualcuno si
è ricordato di escluderlo.

**Si conta `varianti` e non `lezioni`, e questa è la riga da non invertire.**
`lezioni` è l'elenco dei nomi con cui un corso compare nel palinsesto, e ne
porta anche gli **alias**: il Pilates ha `['Pilates Matwork', 'Mat 4.1',
'Matwork 4.1']`, dove le ultime due sono la stessa lezione scritta in due modi
dal planning. Contando quello vengono venti lezioni, cioè una che non esiste —
ed è l'errore che una riscrittura fatta «sul campo ovvio» commette. `varianti`
è quello che la pagina del corso disegna, una scheda per lezione, ognuna col
suo `id` che è già l'ancora del menu (`/yoga#hatha`, `/pilates#matwork-41`).

**La lista di `/corsi-fitness` resta scritta a mano, e il build la controlla.**
Porta una foto per scheda e la classificazione per famiglia di allenamento che
non esistono altrove, quindi non si può derivare; quello che non può fare è
divergere dal numero. Un `throw` confronta la sua lunghezza con
`NUMERO_CORSI_FITNESS` e **ferma il deploy** se non combaciano, dicendo quale
delle due va aggiornata. Si confrontano i **numeri e non i nomi**: qui alcune
schede si chiamano come le nomina il club («Ginnastica Pilates», «Motr®») e nei
dati portano il nome della lezione («Pilates Matwork», «MOTR®»), e un confronto
sui nomi fallirebbe su una differenza voluta.

E la stessa forma di guasto stava sulla **fascia d'età della Scuola Nuoto
Bambini**: `data/contatto.ts` — il modulo contatti, che compare su *ogni*
pagina — diceva «Nati dal 2012 al 2022», la stagione precedente, mentre la
pagina del corso diceva già 2013-2023. Un genitore poteva concludere che suo
figlio è fuori quando è dentro. Ora `SNB_ETA` in `junior.ts` è l'unica fonte, e
`contatto.ts` la importa.

Per verificare, sul `dist`: il badge del sottomenu, la descrizione della card
in home e il titolo di `/corsi-fitness` devono dire lo stesso numero, il menu
deve avere esattamente quelle voci con le ancore che nelle pagine bersaglio
esistono davvero, e «nati dal … al …» deve combaciare fra la pagina del corso e
il modulo contatti su una pagina qualsiasi. L'ultima passata: 19 in tutti e tre
i posti, 19 voci con sette ancore tutte risolte, 2013-2023 ovunque.
