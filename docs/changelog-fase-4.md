# Fase 4 — Changelog

Implementazione del sistema verbale, delle tre sezioni approvate e della
gerarchia CTA a sei stati. 25 file modificati, 3 nuovi, 1009 righe aggiunte e
259 rimosse. Build pulita su 75 pagine.

Le istruzioni di Fase 4 hanno avuto precedenza sulla proposta di Fase 3 in ogni
punto di conflitto, e i conflitti risolti sono elencati sotto pagina per pagina.

---

## Nuovi file

| File | Cosa fa |
| --- | --- |
| `src/data/cta.ts` | Il sistema CTA in un punto solo: sei categorie, la configurazione della prova, gli intenti, gli attributi di contesto. È il punto in cui la fase successiva sostituirà «vai al form» con «apri il modal». |
| `src/components/home/ComeFunziona.astro` | La sezione «Come funziona Athlon», fra il racconto del brand e il catalogo. |
| `docs/lead-flow-contract.md` | La specifica di handoff per il modal. |

---

## Il sistema CTA

Sei categorie al posto delle quattro di Fase 3: `explore`, `resolve`, `trial`,
`talk`, `buy`, `member`. La correzione che le distingue: **una CTA che porta a
un'ancora interna non è un lead**, quindi «Trova il corso giusto per te» e
«Trova il tuo allenamento in acqua» sono `explore` finché la risposta la dà la
pagina, e diventeranno `resolve` col modal.

**Prova Athlon.** Un solo prodotto — Guest Pass Premium, sette giorni — e una
sola configurazione: **113 CTA in tutto il sito puntano allo stesso form**, con
l'attività di provenienza nel parametro `medium`. Prima c'erano due percorsi
diversi (form n8n sulle pagine attività, registrazione al portale su
`/abbonamenti`) e l'URL era scritto a mano in quattro file. Il pattern
«Prova [disciplina]» è stato eliminato: **zero occorrenze** residue.

Ogni CTA di intento porta in pagina `data-cta`, `data-cta-intent`,
`data-cta-activity`, `data-cta-source`. Nessun VID, nessun tracking, nessuna
automazione.

---

## Home · `/`

**File** `src/pages/index.astro` · `components/home/Hero.astro` ·
`components/home/ComeFunziona.astro` (nuovo) · `components/home/InfoCards.astro` ·
`components/home/Stats.astro`

**Copy**

| Prima | Dopo |
| --- | --- |
| — | Nuova sezione **Come funziona Athlon**, occhiello *Athlon Club 4.0*, sottotitolo «Sport, servizi e tecnologia fanno parte dello stesso club» |
| Occhiello caroselli: «Attività Sportive» | «Sala, corsi, reformer e piscina» / «In acqua, dai tre mesi in poi» |
| Card: «400 mq di sala pesi e cardio di ultima generazione» | «400 mq. Da soli o con un trainer in sala.» |
| Card: «Nuoto libero in piscina, con assistenza bagnino» | «Cinque corsie a capienza controllata, tecnico a bordo vasca.» |
| Card: «Personal Trainer\*» (asterisco senza nota) | «Personal Training» |
| Card: «Oltre 80 corsi a settimana, per ogni livello» | «Diciotto corsi in due sale, dalle 7:40 alle 21.» |
| Stat: «200+ Corsi a settimana» | «180 Lezioni a settimana», derivato dal planning |
| Le altre otto card | Un fatto ciascuna (vedi diff) |

Eyebrow, H1 (*Athlon Club 4.0*) e lede (*Innovare è la nostra miglior
tradizione*) **invariati**. «Chi siamo» **invariato**: la working proposition
«Un club che organizza lo sport, dal 1973» non è stata implementata, come da §2.

I tre blocchi della sezione nuova seguono beneficio → meccanismo → prova, e
nessuno promette disponibilità: «Ogni fascia ha una capienza definita: mentre
prenoti vedi quanti posti restano», non «il posto c'è».

**CTA**

| Posizione | Prima | Dopo | Categoria | Destinazione | Contesto |
| --- | --- | --- | --- | --- | --- |
| Hero, primaria | Iscriviti ora → | Prova Athlon → | `trial` | form Guest Pass | `activity` assente, `source=/` |
| Hero, secondaria | — | Scopri gli abbonamenti | `explore` | `/abbonamenti` | — |
| Hero, utility | Accedi → | invariata | `member` | pannello account | — |
| InfoCards ×3 | Scopri di più | Vedi i piani · Vedi la promo · Apri il planning | `explore` | invariate | — |

**Athlon Club 4.0** — La home non lo spiega: lo mette in fila. L'H1 dice il nome
del modello, la sezione nuova mostra i tre gesti che tengono insieme fisico e
digitale (prenotazione, programma, continuità), il blocco app chiude con la prova
materiale. Dopo la definizione il nome non torna più.

**Invariato** — eyebrow, H1, lede, i quattro contatori tranne l'unità corretta,
il paragrafo locale di «Chi Siamo», i titoli delle card (anchor text interno),
struttura, virtual tour, sezione app, eventi, news, title e description.

---

## Gym Floor 4.0 · `/gym-floor`

**File** `src/pages/gym-floor.astro`

**Copy**

| Prima | Dopo |
| --- | --- |
| Lede: «Aperti dalle 6 di mattina.» | «Allenati come preferisci. Non allenarti mai a caso.» |
| H2: «Allenati nella nostra Gym Floor 4.0» | «Tre modi di usare la sala» |
| «Athlon si evolve. La Sala Pesi è stata completamente rinnovata…» | «Quattrocento metri quadri con la vista sulle piscine. Prima di entrare scegli come vuoi allenarti…» |
| H2: «Scopri i nostri nuovi spazi» | «Cosa c'è, area per area» + «Quaranta voci d'attrezzatura» |
| H2: «Più di 30 piani di allenamento» | «Trenta piani, tre obiettivi, un punto di partenza», con **Start Up** promosso in evidenza |
| H2 finale: «Hai bisogno di un allenamento individuale?» | «Un'ora con qualcuno che sa il tuo nome» |
| — | Nuova fascia **Libero · Assistito · Connesso** |

**Correzioni richieste al §15, tutte recepite:** «nessuno che ti guarda le
spalle» → «in autonomia con il tuo programma»; «la prima ora e il primo
pomeriggio sono le più tranquille» → rimossa dalla sezione nuova (resta solo
nella f.a.q., dove era già); «Non reimposti niente» → «Quando torni, ritrovi il
tuo percorso».

**CTA**

| Posizione | Prima | Dopo | Categoria | Destinazione |
| --- | --- | --- | --- | --- |
| Hero | Iscriviti ora → | Prova Athlon → | `trial` | form Guest Pass, `activity=gym-floor` |
| Hero, secondaria | — | Scopri gli abbonamenti | `explore` | `/abbonamenti` |
| Orari | Prenota la tua sessione → | invariata | `member` | calendario portale |
| Chiusura | Personal Trainer → | Conosci i personal trainer → | `explore` | `/personal-training` |

Nessuna «Prova la Gym Floor».

**Athlon Club 4.0** — Un gesto solo, dimostrato tre volte: la scelta della
modalità (organizzazione), il piano nell'app (contenuto), i Matrix collegati
all'account (continuità). Gym Floor 4.0 resta uno dei prodotti dell'ecosistema.

**Invariato** — H1, eyebrow, riga di fatti, orari, tutte le liste
d'attrezzatura, il tour virtuale, i quattro testi dei percorsi, tutte le f.a.q.,
il prezzo del singolo accesso, title e description.

---

## Corsi fitness · `/corsi-fitness`

**File** `src/pages/corsi-fitness.astro`

**Copy**

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Attività adulti» | «Athlon Classes» |
| Claim: «Solo l'imbarazzo della scelta.» | «18 corsi. 5 modi di allenarti.» (derivati) |
| Eyebrow: «Più di 80 corsi a settimana» | «Come scegliere» |
| H2: «Scegli come allenarti» + elenco dei nomi | «5 famiglie, per non scegliere a caso» + fascia di orientamento |
| H2: «**Venti** corsi fra cui scegliere» (la f.a.q. ne calcolava 18) | «I corsi, uno per uno» + conteggio derivato |
| Card: «Scopri di più →» | «Vedi il corso →» |

**Athlon Classes** — cinque famiglie come **tag**, non come discipline:
Forza e tono · Fiato · Musica · Postura · Mobilità. Le due righe segnalate al §16
sono state riviste: «Per la schiena e per come stai in piedi» → «Core, controllo
e precisione del movimento» (via la promessa funzionale); «Allungamento e
respiro, ritmo lento» → «Respiro e allungamento, dal ritmo lento al più
dinamico», che tiene dentro il Power Yoga.

**Nessuna card duplicata**: una sola griglia canonica (18 card, verificate),
ogni corso un URL solo, e un corso può stare in due famiglie — Booty Workout in
Musica e Forza, Antigravity® in Postura e Mobilità.

**CTA**

| Posizione | Prima | Dopo | Categoria | Destinazione |
| --- | --- | --- | --- | --- |
| Hero | Iscriviti ora → | Trova il corso giusto per te → | `explore` | `#famiglie` (ancora nella stessa pagina) |
| Hero, secondaria | — | Vedi gli orari | `explore` | `#orari` (ancora aggiunta) |
| Intro | Prenota ora → | Prenota una lezione → | `member` | calendario portale |

Classificata `explore` e non lead, come da §16.

**Invariato** — H1, title, description, la f.a.q. con tutti i diciotto nomi
(mappa keyword della pagina), il palinsesto, il modale delle schede lezione.

---

## Group Reformer · `/reformer`

**File** `src/pages/reformer.astro`

**Copy**

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Pilates Reformer» | «Athlon Reformer» |
| Lede: «Il Pilates che ti trasforma, in gruppo.» | «La precisione del Reformer. L'energia del gruppo.» |
| Eyebrow: «Il Pilates che ti trasforma» (ripetizione) | «Il format» |
| H2: «Il Pilates come non l'hai mai provato» | «Il Pilates sul Reformer, in gruppi da dieci» (recupera la keyword) |
| Due paragrafi promozionali | Dieci Allegro in Sala C, un istruttore, cinquanta minuti, 34 sessioni |
| Blocco «Benefici» («ti fa sentire rinato») | «Com'è fatta la sala» |
| Blocco «Cosa aspettarsi» («un'avventura per il tuo corpo») | «Cosa allena» |
| Blocco «Per chi è adatto» («tutti ottengono risultati») | «Se non l'hai mai fatto» |
| — | Fascia format: 10 Reformer · 50 minuti · 1 istruttore · 10 persone |

**Fact check del §17.** Non implementate perché non documentate: «ogni esercizio
ha la resistenza giusta per te», la sequenza gambe/glutei/core/parte alta,
«senza salti», «il coach carica le molle con te», «sceglie le tue varianti».
Implementate solo le fonti reali: riga di dati della pagina, nota degli accessi
singoli su `/abbonamenti` («gruppi da 10 con istruttore»), descrizione della
scheda lezione del planning. Uso «istruttore» e non «coach» perché è la parola
del repository per questa attività.

**CTA**

| Posizione | Prima | Dopo | Categoria | Destinazione |
| --- | --- | --- | --- | --- |
| Hero | Iscriviti ora → | Prova Athlon → | `trial` | form, `activity=group-reformer` |
| Hero, secondaria | — | Vedi orari e disponibilità | `explore` | `#orari` (ancora aggiunta) |
| Sezione prova | Richiedi qui la settimana di prova → | Prova Athlon → | `trial` | stessa configurazione |
| Piano Premium | Scopri di più → | Prenota una lezione → | `member` | calendario reformer |

**Invariato** — H1, riga di fatti, paragrafo tecnico delle caratteristiche e
quattro barre (vengono dal planning), orari, tutte le f.a.q., video, title,
description.

---

## Personal Training · `/personal-training`

**File** `src/pages/personal-training.astro` ·
`src/content/servizi/personal-training.md` ·
`src/content/articles/adulti/gym-floor.md`

**Il refuso.** «Analisi posturale» e «test della composizione corporea» erano in
**tre** posti, non due: la f.a.q. di questa pagina, la scheda servizi di Club
Life e — non segnalata prima — il passo 3 della procedura PT nella scheda wiki
`adulti/gym-floor.md`. Tutte e tre rimosse; **zero occorrenze** nel repository.
Nessuna metodologia inventata al loro posto: la f.a.q. «Cosa include la prima
seduta?» è sostituita da «Mi allena sempre la stessa persona?», la cui risposta è
verificabile dal prodotto (il calendario è del singolo trainer, `bookPT(trainerId)`).

**Copy**

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Servizi extra» | «Allenamento individuale» |
| Sub hero: «Schede su misura… con un coach dedicato accanto a te» | «Un'ora con qualcuno che sa il tuo nome» + le sei specializzazioni reali |
| H2: «Un percorso su misura» | «Scegli chi ti segue.» (non «Scegli il trainer, non il pacchetto», §18) |
| H2: «Modalità di adesione» | «Una seduta, o un pacchetto al mese» |

**CTA**

| Posizione | Prima | Dopo | Categoria | Destinazione |
| --- | --- | --- | --- | --- |
| Hero | — | Conosci i nostri trainer → | `explore` | `#trainer` (ancora aggiunta) |
| Intro | Prenota ora → | Prenota una seduta → | `buy` | `#/PersonalTraining` |
| Schede ×6 | Disponibilità → | Verifica la disponibilità → | `buy` | calendario del singolo trainer |
| Listino | Accedi ora → | Aggiungi al tuo abbonamento → | `buy` | portale |

«Trova il Personal Trainer giusto per te» **non** implementata: la pagina non ha
un meccanismo di orientamento, solo un'ancora, e chiamarla lead sarebbe
sbagliato (§18). Il trainer senza `trainerId` continua a ricadere su «Prenota una
seduta», che è la formulazione corretta per lui.

**Invariato** — H1, le sei schede trainer verbatim, le tre ragioni («hai un
appuntamento, non un buon proposito»), tutti i prezzi, le altre f.a.q.

---

## Aqua Fitness · `/aqua-fitness`

**File** `src/data/corsi.ts` · `src/pages/[corso].astro`

**Copy**

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Attività adulti» | «Athlon Aqua» |
| Claim: «Attività ginnico motorie acquatiche applicative alle discipline del nuoto» | «L'acqua è l'attrezzo.» |
| H2: «Il fitness in acqua» | «Ti spinge indietro a ogni movimento» |
| «un'opzione eccellente… benefici significativi per la salute fisica e mentale» | «L'acqua oppone resistenza al movimento e allo stesso tempo riduce il carico del peso corporeo» |
| Cinque descrizioni con «adatta a tutte le età e a tutti i livelli», «benessere generale» | Riscritte: restano intensità, altezza dell'acqua, cosa si allena |

**Correzioni del §19 recepite:** non implementate «spingi di più e le
articolazioni ricevono di meno» né «per chi ha un ginocchio da rispettare»;
nessun claim medico o riabilitativo, e fuori anche «circolazione» e
«metabolismo», che erano effetti dichiarati.

**Tre categorie, un criterio** — In appoggio (120 cm) · In sospensione (vasca
grande, 140–250 cm) · In sella (Hydrobike, 45 minuti). «A basso impatto» non è
più una categoria: è tornato dentro la descrizione di Aqua Soft, dov'è vero.
Implementate come etichetta di gruppo sopra le stesse cinque schede — nessuna
card duplicata, nessun nome di lezione cambiato.

**CTA** — Hero: Prova Athlon (`trial`) + «Trova il tuo allenamento in acqua»
(`explore`, ancora `#lezioni`); intro: «Prenota una lezione» (`member`).

**Invariato** — H1, title, description, i nomi delle cinque lezioni, altezze
dell'acqua, durate, barre, orari, cosa portare, certificato, f.a.q.

---

## Nuoto Libero Assistito · `/nuoto-libero`

**File** `src/data/corsi.ts`

| Prima | Dopo |
| --- | --- |
| Nessun claim | «Libero di nuotare. Mai lasciato a te stesso.» |
| H2: «La pura essenza del nuoto» | «Il nuoto libero, secondo Athlon» |
| «Una vasca di 25 metri… Nuota in tranquillità con il supporto costante…» | «A bordo vasca trovi Tecnici Federali, per tutta la durata del turno…» |
| Quattro punti senza titolo | Quattro passaggi con titolo: prenoti · trovi la corsia · c'è un tecnico · puoi avere un programma |

**Correzioni del §20 recepite:** nessun confronto «non solo un assistente
bagnanti»; non implementato «guarda la tua bracciata e ti dice cosa correggere».
Il programma personalizzato resta **con il testo attuale**, in attesa di sapere
chi lo prepara e come si richiede.

**CTA** — Prova Athlon (`trial`) · «Vedi corsie e orari» (`explore`) · «Prenota
il tuo allenamento» (`member`, perché qui sono turni e non lezioni).

---

## Scuola Nuoto Adulti · `/scuola-nuoto-adulti`

**File** `src/data/corsi.ts`

| Prima | Dopo |
| --- | --- |
| Nessun claim | «Impari con un metodo. Ti alleni con i tuoi tempi.» |
| H2: «Imparare a nuotare a qualsiasi età» | «Il livello lo assegniamo noi. L'orario lo scegli tu.» |
| Tre domande retoriche di fila | Il funzionamento, in due frasi |
| Punto: «Abbiamo la soluzione» | «Ti vediamo in acqua» |
| **F.a.q. contraddittoria** «le lezioni sono aperte a tutti i livelli» | Risposta coerente col sistema dei livelli *(eccezione approvata n. 2)* |

**CTA** — Prova Athlon (`trial`, legittima: Premium comprende Scuola Nuoto
Adulti e il Guest Pass dà «accesso completo a tutte le attività», verificato su
`/abbonamenti`) · «Vedi livelli e orari» (`explore`) · «Prenota la tua lezione»
(`member`). «Trova il percorso giusto per te» resta per il modal.

---

## Scuola Nuoto Bambini · `/scuola-nuoto-bambini`

**File** `src/data/junior.ts` · `src/components/junior/PaginaJunior.astro`

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Dai 3 anni in poi» | «Scuola Nuoto Athlon · dal 1973» |
| Claim: «Attività in acqua senza genitore» | «Prima la passione. Poi i risultati.» |
| H2: «Benvenuti nella nuova era della Scuola Nuoto Bambini Athlon» | «Dai 3 anni, in acqua senza il genitore» (il dato pratico resta, spostato) |
| — | Nuova sezione **Il Metodo Athlon** |

**I quattro pilastri**, tutti da `snb/didattica.md` e dalle schede della pagina:
**Inserimento** (turni per età, più corsi e istruttori nello stesso orario,
istruttore definitivo dopo due settimane) · **Livello** (si cambia gruppo senza
cambiare orario, percorso didattico individuale) · **Progressione** (brevetti
raggiunti e prove per il livello successivo nel tuo account, aggiornati circa
ogni due mesi; Direttore Tecnico prenotabile) · **Brevetto** (sessione a fine
maggio, diploma e libretto; Trofeo Athlon facoltativo).

«Passione» non è un pilastro: è la promessa sopra il metodo, come da §22.

**CTA** — «Richiedi orari e costi» → **«Trova il corso giusto per tuo figlio»**
(`resolve`, `intent=junior_info`, `activity=scuola-nuoto-bambini`), destinazione
il form esistente. Aggiunta «Parla con il Direttore Tecnico» (`explore`) verso la
scheda dell'Help Desk, che esiste. Nessuna promessa di risposta automatica.

**Invariato** — H1, annate, date di stagione, turni, progressi, brevetto, gare,
organizzazione, i sei spazi con i tour, temperature, tutte le f.a.q. genitori.

---

## Baby Nuoto · Pallanuoto · Nuoto Agonistico

**File** `src/data/junior.ts`

| Pagina | Prima | Dopo |
| --- | --- | --- |
| Baby Nuoto | Claim: «Un'esperienza unica per il tuo bambino, in acqua con te» | «In acqua con te, dai tre mesi.» |
| Baby Nuoto | H2: «Attività in acqua con il genitore» | «Come funziona una lezione» |
| Baby Nuoto | CTA: «Registrati ora per prenotare» | «Trova il turno per il tuo bambino» (`resolve`) |
| Pallanuoto | CTA: «Richiedi orari e costi» | «Richiedi la prova di inserimento» (`resolve`, `insertion_trial`) |
| Nuoto Agonistico | CTA: «Richiedi orari e costi» | «Richiedi la prova di inserimento» |
| Nuoto Agonistico | H2: «Nuoto agonistico e preagonistico» | «Dal gruppo alla gara, un passo alla volta» |

Claim di Pallanuoto **invariato** («Nuoto, squadra e tattica di gioco»): era già
concreto. «Parla con il team nuoto» **non** implementata: nessuna destinazione
reale (§25).

Nota su Baby Nuoto: la scheda aveva **due** chiavi `cta`, e la seconda vinceva
sulla prima. Rimosso il duplicato.

---

## Corso Gestanti · `/gestanti`

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Aqua Fitness» | «Athlon Aqua» |
| Claim = H2 = «Ginnastica in acqua per gestanti» | Claim «Cinquanta minuti in cui l'acqua ti tiene su.» · H2 «Come funziona la lezione» |

**CTA** — Prova Athlon (`trial`: Premium comprende Corso Gestanti, verificato) ·
«Vedi giorno e orario» (`explore`, ed è corretto al singolare: in palinsesto c'è
un turno, sabato 11:00–11:50) · «Prenota la lezione» (`member`). Non «Prova una
lezione», come da §26.

---

## Le quindici discipline

**File** `src/data/corsi.ts`

Nove claim riscritti, tre aggiunti dove mancavano, tre lasciati invariati perché
già nel tono giusto (Calisthenics, Difesa Personale, Strength Development™).

| Disciplina | Prima | Dopo |
| --- | --- | --- |
| Antigravity® | Sei pronto a volare? | Yoga e pilates, appesi a un'amaca. |
| Body Pump® | Il corso di rinforzo muscolare… più famoso al mondo | Bilanciere, carichi leggeri, tante ripetizioni. |
| Body Sculpt | Scolpisci il tuo corpo. Potenzia la tua forma | Tonificazione a corpo libero e con piccoli attrezzi. |
| Booty Workout | Tonifica il tuo lato B | Cinquanta minuti a tempo, per gambe e glutei. |
| GP Coreo | La fusione della danza con il fitness | La tecnica della danza, dentro un allenamento. |
| HBX | Allenati come un campione | Sacco, guantoni e lavoro a intervalli. Fusion o Boxing. |
| Motr® | Pilates, yoga e potenziamento muscolare | Un attrezzo instabile, tre discipline in una lezione. |
| Pilates | Forza, flessibilità, equilibrio e coordinazione | Il centro del corpo, un movimento alla volta. |
| Yoga | Scopri il tuo yoga ideale | Hatha, Power e Yogassè: tre lezioni diverse. |
| Balli di Gruppo | — | Coreografie semplici, in gruppo. |
| Ginnastica Dolce | — | Ritmo lento, articolazioni al centro. |
| Ginnastica Posturale | — | Un'ora sul controllo della postura. |

**Fact check del §28.** Yoga: non definite «scuole» — «tre lezioni diverse», che
è quello che sono in palinsesto. Pilates: rimossa la sensazione soggettiva («la
sensazione è di scarico, non di fatica») e sostituita col lavoro effettivo (bassa
intensità, respirazione guidata, poche ripetizioni). Antigravity®: resta solo la
proprietà dell'attrezzo («in sospensione il peso del corpo è sostenuto
dall'amaca»), niente effetti sulla colonna. Posturale e Dolce: nessuna
formulazione che possa sembrare terapeutica. Yogassè: rimosse «adatto a tutti i
livelli», «benessere generale» e la formula sui chakra; resta la sequenza reale
della lezione.

**CTA, pattern comune** — Prova Athlon (`trial`, con lo slug della disciplina
come contesto) · Vedi gli orari (`explore`) · Prenota una lezione (`member`) ·
corsi simili invariati. Nessun «Prova [disciplina]». I marchi mantengono ® e ™.

---

## Abbonamenti · `/abbonamenti`

**File** `src/pages/abbonamenti.astro`

| Prima | Dopo |
| --- | --- |
| H1: «Scegli il tuo accesso. Inizia oggi.» | «Due modi di vivere Athlon.» |
| Eyebrow: «Benvenuto nel club» | «Abbonamenti adulti» |
| H2: «Smart o Premium» | «Come vuoi vivere il club?» (non «Quale dei due sei», §29) |
| Smart, badge «Essenziale» | «Autonomia» + riga «Allenati in autonomia.» |
| Smart, desc «L'essenziale per allenarti ogni giorno» | «…costruisci la tua routine fra sala e vasca, senza dipendere dal palinsesto dei corsi» |
| Premium, badge «Consigliato · Accesso completo» | «Consigliato · Tutto il club» + riga «Vivi tutto il club.» |
| Premium, desc | Le attività per nome, «entri nel palinsesto completo» |
| «Prova prima. Una settimana… senza impegno» | «Prova Athlon. 7 giorni Premium per conoscere il club.» |

Nessuna formulazione del tipo «senza orari da rispettare»: la libertà di Smart è
**rispetto al palinsesto dei corsi**, non rispetto alle prenotazioni, che
esistono anche per Gym Floor e corsie.

**CTA**

| Posizione | Prima | Dopo | Categoria | Destinazione |
| --- | --- | --- | --- | --- |
| Piani ×6 | Scegli → | Iscriviti a Smart → / Iscriviti a Premium → | `buy` | registrazione col piano già selezionato |
| Guest Pass | Attiva il Guest Pass → | Prova Athlon → | `trial` | form (una destinazione sola per l'offerta) |
| Accessi singoli | Prenota una lezione → | invariata | `buy` | portale |
| Chiusura | Parla con il nostro staff → (**404**) | **rimossa** | — | `BLOCKED CTA — FUTURE MODAL` |

«Hai bisogno di aiuto a scegliere?» non pubblicata: nessuna destinazione (§29 +
§36). Indirizzo e orari restano.

**Athlon Club 4.0** — Con la trasparenza e con quello che succede dopo il
pagamento: prezzi e condizioni leggibili per intero senza parlare con nessuno, e
un abbonamento che si compra online, si sospende dall'area riservata e si disdice
senza passare in reception.

**Invariato** — tutti i prezzi, risparmi, quota di attivazione, condizioni di
rinnovo e disdetta, sospensioni, certificato, requisiti e codice del Guest Pass,
le liste delle attività comprese con le icone, f.a.q., orari, indirizzo, title,
description.

---

## Club Life · `/club-life`

**File** `src/pages/club-life.astro` · `components/clublife/Servizi.astro` ·
`components/clublife/HelpDesk.astro`

| Prima | Dopo |
| --- | --- |
| Eyebrow: «Athlon Community» | «Athlon Club 4.0» |
| Lede: «Tutto quello che succede nel club, e tutto quello che serve saperne» | «Il club continua anche quando non sei al club.» + i cinque verbi del socio |
| Servizi: eyebrow «Compresi nel club» · H2 «Servizi» | «Quello che trovi» · «Un account, e il club a portata di mano» |
| Help Desk: «Trova subito la risposta alla tua domanda» | «Quando ti serve una risposta» |

Non implementati «Se qualcosa non torna» né «Chiedi, e la risposta è già
scritta», come da §30. La pagina resta orientata al socio: nessuna CTA lead
aggiunta.

**Athlon Club 4.0** — È la prova più diretta: un account che apre prenotazioni,
programmi, progressi, ricevute, sospensioni, disdette e contenuti, trentotto
schede che rispondono senza far venire nessuno in reception, e nella stessa
pagina gli eventi del club fisico.

**Invariato** — le sei schede servizi nei loro dati (tranne il refuso PT),
eventi, news, tutte le schede dell'Help Desk, il box di ricerca, title,
description.

---

## Planning · Eventi

| Pagina | Prima | Dopo | Categoria |
| --- | --- | --- | --- |
| `/planning` | Prenota una lezione → · Scarica l'app | Prenota una lezione → (`member`) · **Prova Athlon** (`trial`) · Scarica l'app come link (`member`) | — |
| `/eventi` | Scopri di più → | Scopri l'evento → | `explore` |
| `/eventi/[slug]` | Prenota ora → | Registrati per partecipare → | `buy` |

Il planning resta completamente utile senza identificazione: nessun form davanti
agli orari.

---

## Errori corretti

| Errore | Dove | Correzione |
| --- | --- | --- |
| **404 `/contatti`** | Header (3 punti), Footer (2), `/abbonamenti` (1) | Link rimossi, pagina **non** creata; la CTA torna col modal |
| **404 `/lavora`** | Footer — non segnalato prima | Link rimosso |
| **Refuso PT** in tre posti | `/personal-training`, `/club-life`, `adulti/gym-floor.md` | Rimosso, zero occorrenze |
| **«Venti corsi» ≠ 18** | `/corsi-fitness` | Conteggio derivato dai dati |
| **«200+ corsi a settimana»** | Home | «180 lezioni a settimana», derivato dal planning; unità corretta |
| **`href="#"`** | Modale attività su `/abbonamenti` | Il link parte nascosto e senza href; lo script lo compila |
| **Doppia chiave `cta`** | `junior.ts`, Baby Nuoto | Duplicato rimosso |
| **Spazio mancante** | `/gym-floor`, «percorsi<strong>Start Up</strong>» | Corretto (trappola Astro sui tag inline) |
| **Due percorsi Guest Pass** | form n8n vs portale | Una configurazione sola, 113 CTA |

### Segnalati e non toccati

**404 `/privacy`, `/mog`, `/codice-condotta`** — nel footer di tutte le 35
pagine. Sono documenti legali (§40: testi legali non si toccano) e togliere il
link alla privacy policy è peggio del 404: servono i documenti o i loro URL
reali.

**«a tutti i livelli»** resta in tre punti, per scelta: la f.a.q. standard delle
pagine attività (f.a.q. operativa, §40), la meta description di `/reformer`
(metadato SEO, §38) e le descrizioni di Athlon TV, che sono i testi del club su
Vimeo.

---

## Dati verificati prima di scrivere

| Fatto | Fonte |
| --- | --- |
| Guest Pass = 7 giorni, accesso completo, requisito dal 2021 | `/abbonamenti`, sezione guest |
| Premium comprende Scuola Nuoto Adulti e Corso Gestanti | `abbonamenti.astro`, `plans[].activities` |
| 180 lezioni a settimana su cinque fasce | `planning-settembre.json` via `totalLessons()` |
| 18 corsi fitness, 79 lezioni, due sale, 07:40–21:00 | fascia `corsi-fitness` del planning |
| 10 Reformer Balanced Body Allegro, 34 sessioni, 50 minuti, Sala C, gruppi da 10 | riga di fatti `/reformer` + accessi singoli `/abbonamenti` |
| 40 voci d'attrezzatura in quattro aree (7 · 14 · 12 · 7) | `gym-floor.astro`, liste `aree[].items` |
| Prenotazione fino a tre giorni prima, capienza per fascia | `adulti/gym-floor.md`, f.a.q. Gym Floor |
| Livelli assegnati dagli istruttori, Base/Intermedio/Avanzato | `corsi.ts`, scuola-nuoto-adulti |
| Metodo SNB: gruppi in vasca, istruttore dopo 2 settimane, brevetti ogni ~2 mesi, sessione a fine maggio | `snb/didattica.md` |
| Prova di inserimento obbligatoria per pallanuoto e agonistico | `junior.ts`, campo `prova` |
| Corso Gestanti: un turno, sabato 11:00–11:50, Vasca Grande | `planning-settembre.json` |
| Altezze dell'acqua: 120 cm in appoggio, 140–250 cm vasca grande, Hydrobike 45 minuti | `corsi.ts`, note delle varianti |
| Il calendario PT è del singolo trainer | `personal-training.astro`, `bookPT(trainerId)` |

---

## Test eseguiti

- **Build di produzione**: pulita, 75 pagine.
- **Link interni**: nessun 404 fra le pagine, tranne i tre documenti legali già segnalati.
- **`/contatti`**: zero riferimenti nel repository.
- **CTA trial**: 113, tutte dalla stessa configurazione e con lo stesso host di destinazione.
- **Categorie CTA**: 113 `trial`, 46 `explore`, 23 `member`, 14 `buy`, 8 `resolve`; nessuna CTA member presentata come prospect.
- **Un solo H1 per pagina**: verificato su tutte; l'unica pagina con zero H1 è il reindirizzo legacy `scuola-nuoto-bambini-3`.
- **Formule vietate**: ricerca globale su tutte le pagine costruite, zero occorrenze delle diciannove cercate.
- **Marchi**: ® e ™ intatti (Antigravity® 122, Body Pump® 122, Motr® 121, Strength Development™ 52).
- **Athlon Classes**: 18 card nella griglia canonica, cinque famiglie come tag, nessun URL duplicato.
- **Responsive** delle sezioni nuove a 390, 768 e 1280 px: colonne 3→1, 5→2→1, 4→2→1, nessun overflow orizzontale, nessun figlio fuori dal contenitore, nessun errore JS.
- **Regola tipografica di progetto**: verifica con `TextMetrics` su dodici pagine, 317 elementi nella display face, margine minimo 1.12 px — nessun titolo tagliato.
- **Spaziatura sui tag inline**: audit `grep` del progetto, una sola occorrenza residua, preesistente e visivamente corretta.
