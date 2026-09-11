# Le newsletter, e il `UserNumber` appeso a ogni link

Template HTML pronti da incollare nell'ESP. Non sono pagine del sito: non
passano dal build di Astro, non finiscono nel `dist`, e i loro link sono
**assoluti** su `https://www.athlonroma.it` perché una email si apre fuori dal
sito e un percorso relativo lì non esiste.

## `{{UserNumber}}` è un segnaposto, e va sostituito dall'ESP

Ogni link verso il sito porta `?UserNumber={{UserNumber}}`, e quel valore è il
campo pubblico `number` di PerfectGym — lo stesso che `scripts/numeroSocio.ts`
legge dall'URL e ricorda per tutta la visita. Chi apre la newsletter arriva sul
sito **già riconosciuto**: la chat, «contattaci», il referral e l'Help Desk non
gli richiedono l'email, perché il numero c'è già.

`@UserNumber` è la forma che usa l'ESP del club, ed è quella nel file. **Su un
altro ESP la sintassi cambia** — SendGrid vuole `{{UserNumber}}`, Mailchimp
`*|USERNUMBER|*`, Brevo `{{contact.USERNUMBER}}` — e allora si sostituisce in
blocco: il segnaposto compare solo dentro i link del sito, e un `sed` sul file
basta.

**Il segnaposto della disiscrizione invece è ancora `{{UnsubscribeURL}}`**, e
va allineato alla stessa sintassi il giorno che si tocca: è nel footer, una
occorrenza sola. Sta scritto qui perché è l'unico posto del file che continua a
parlare un'altra lingua, e un link di disiscrizione che non si risolve è il
genere di cosa che nessuno prova prima di inviare.

Tre cose da sapere.

- **La grafia del parametro è `UserNumber`**, con le due maiuscole.
  `numeroSocio.ts` accetta anche `userNumber`, `usernumber` e `user_number`,
  ma la forma canonica è quella e va tenuta: le altre tre sono un ripiego per
  i link scritti a mano, non un invito a scriverli in quattro modi.
- **Il valore va nel contatto dell'ESP**, non nell'email. Se il campo è vuoto,
  il link atterra con `?UserNumber=` e non succede niente di male — la persona
  si vede chiedere l'email come sempre. È il verso giusto in cui sbagliare.
- **Sui link che non sono del sito il parametro non ci va**, e non è una
  dimenticanza: il Portale PerfectGym (`athlon.perfectgym.com`), il download
  dell'app (`onelink.to/athlon`) e i `mailto:` non leggono quel parametro, e
  appenderglielo aggiunge rumore a un indirizzo che qualcuno potrebbe copiare.

## `scuola-nuoto-bambini-2026-27.html`

L'email di inizio stagione per i genitori già iscritti alla Scuola Nuoto
Bambini. I contenuti vengono tutti dalle schede del wiki in
`src/content/articles/snb/` e da `data/junior.ts`: **non c'è nessun dato
inventato e nessun prezzo**, per la stessa ragione scritta in `CLAUDE.md` per
le email di n8n — una cifra dentro un template è una cifra che il giorno del
ritocco al listino resta indietro in un posto che nessuno rilegge. Gli importi
li stampa `/wikiathlon/snb/preiscrizioni-nuoto/`, che l'email linka.

Le uniche due cifre presenti sono la quota gara (8 €, da `snb/gare-nuoto.md`) e
le temperature delle vasche (da `snb/temperature-piscine.md`): non sono prezzi
di abbonamento e stanno dentro la frase che le spiega.

**L'URL del logo non è verificabile da qui**, e va aperto in un browser prima
dell'invio: `www.athlonroma.it` è fuori dalla policy di rete dell'ambiente in
cui questo repository si scrive — la stessa condizione già scritta in
`CLAUDE.md` per il CDN di CookieYes — quindi un 404 da qui non si distingue da
un dominio irraggiungibile. Un'immagine rotta nell'intestazione la vede ogni
destinatario, e non si corregge dopo l'invio.

**La testata è su banda scura perché il logo lo è.** `Logo-oriz-full.png`
porta la scritta «ATHLON CLUB 4.0» in bianco — è la versione per fondo scuro,
la stessa che il Footer del sito usa sul suo fondo nero. Su bianco restava il
solo pittogramma arancione e il nome del club spariva dalla testata. Si vede
renderizzando e non leggendo: nel file il logo sembra a posto finché non lo si
guarda su un fondo. Il repository non ha una variante con la scritta scura, e
inventarne una vorrebbe dire un file nuovo che su WordPress non c'è.

**Il logo è `Logo-oriz-full.png` e non `-2`.** È la copia fatta apposta in
`public/`: il WordPress originale serve il primo nome, e una email vive per
mesi nelle caselle — un logo che dà 404 il giorno dello spostamento del dominio
è un buco nell'intestazione di ogni copia già inviata. I due file sono
**identici byte a byte** (834 × 159, 7,3 kB): quello che cambia non è
l'immagine ma quale dei due nomi l'host risponde, ed è per questo che qui non
si usa il `CLUB.logo` del sito.

### Il video nella hero è un poster, non un player

Gmail, Outlook e Apple Mail buttano `<iframe>` e `<video>`: un blocco che non
rende lascia un buco bianco in cima all'email. Quindi il video è un **poster
cliccabile** con la barra del play sotto, e il click porta allo Short
(`youtube.com/shorts/uZcxkejW8fE`). Il link va a YouTube e **non porta
`UserNumber`**, per la stessa ragione del Portale: quel parametro lì non lo
legge nessuno.

Il blocco regge **anche senza l'immagine**, che è il caso normale — molti
client non caricano le immagini finché non glielo si chiede: la barra scura è
HTML e non un ritaglio del poster, quindi resta visibile e cliccabile da sola,
e l'`alt` dice cos'era. Provato nei due stati.

Il poster è la copertina che YouTube genera,
`i.ytimg.com/vi/uZcxkejW8fE/maxresdefault.jpg`. **Non è verificabile da qui** —
`i.ytimg.com` è fuori dalla policy di rete di questo ambiente — e ha due cose
da guardare in anteprima:

- **`maxresdefault` non esiste per ogni video**, solo per quelli con una
  sorgente da 720p in su. Se manca, l'indirizzo da mettere è `hqdefault.jpg`,
  che c'è sempre: è 480 × 360, quindi meno nitido, ma un poster sgranato è
  meglio di un'immagine rotta.
- **Uno Short è verticale**, e la copertina 16:9 può uscire con le bande ai
  lati. Se non convince, al posto suo va bene una foto del club già su
  WordPress — per esempio la hero della pagina del corso,
  `/wp-content/uploads/2024/08/P1120412.jpg`: cambia una riga, il link resta
  quello.


### Due cose che l'email dice e il sito no

Vengono dal club e non dal wiki, quindi **in chat l'assistente risponde
diversamente**: il `kb.json` legge le schede, non questo file. Chi le legge qui
e poi le richiede alla chat ottiene l'altra risposta, ed è il difetto che
`CLAUDE.md` descrive per le f.a.q. scritte solo in una pagina. Vanno portate in
`src/content/articles/snb/` la prossima volta che si toccano quelle schede:

- **la tolleranza sul certificato medico nelle prime settimane** —
  `cosa-occorre-2.md` e il punto 4.1 dicono solo che senza certificato il badge
  resta sospeso, che è la regola e non il margine;
- **il Direttore Tecnico non riceve nella prima settimana di corso** —
  `direzione-tecnica.md` dice per chi è il servizio e non dice da quando;
- **i braccioli li fornisce il club** — `cosa-occorre-2.md` la regola ce l'ha
  già («tavolette, pull buoy, pinne e tutto il materiale didattico necessario
  per le lezioni è fornito dal club») e non li nomina. Un genitore non sa se
  un bracciolo conti come materiale didattico, quindi lo mette in borsa per
  istinto: qui è nominato perché una regola generale non risponde alla domanda
  che le persone fanno davvero;
- **nell'area attesa le telecamere mostrano la vasca** — `accosso-corso.md`
  nomina la «zona attesa» e non dice che da lì si vede nuotare, che è l'unica
  cosa per cui un genitore la sceglie invece della balconata;
- **la prima settimana vale per il centro, non per i soli spogliatoi** —
  `accosso-corso.md` ha la regola dell'accompagnatore unico, ma non dice che
  nei giorni di apertura è più stretta e riguarda l'ingresso al club;
- **negli spogliatoi non si portano né si consumano alimenti** — non è scritto
  da nessuna parte nel wiki;
- **le gare della Scuola Nuoto si nuotano in casa** — `snb/gare-nuoto.md` dice
  «nel nostro impianto o in altri di Roma», e quella seconda metà è dei gruppi
  agonistici: sono loro che vanno in trasferta. Questa non è una riga in più
  come le altre tre, è una **correzione**: finché la scheda resta com'è,
  l'assistente manda un genitore della Scuola Nuoto a prepararsi per una gara
  fuori sede.

La tolleranza è scritta **con la sua scadenza nella stessa riga**, e non è uno
scrupolo: «nelle prime settimane c'è tolleranza» da solo è una frase da cui si
compone «allora il certificato può aspettare», che è la meccanica dei due fatti
vicini scritta dieci volte in `CLAUDE.md`. Margine e scadenza stanno insieme o
non tengono.

Prima di inviare, due valori da confermare col desk perché **il wiki li dice in
due modi**:

1. **L'apertura degli spogliatoi.** `snb/accosso-corso.md` dice «15 minuti
   prima», il punto 4.5 del regolamento in `snb/preiscrizioni-nuoto.md` dice
   «esclusivamente a partire da 10 minuti prima». Il template usa **15**, che è
   la scheda operativa; se vale il regolamento, va cambiato qui e sulla scheda.
2. **L'età dell'accompagnatore.** La scheda dice «fino a 8–9 anni», il
   regolamento «fino agli 8 anni compiuti». Il template usa **8**.
