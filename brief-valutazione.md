# Richiesta di valutazione — sistema digitale per centro sportivo

Hai accesso alla rete: **usa ricerche reali e cita le fonti** (listini pubblici,
tariffe di agenzie, prezzi SaaS, benchmark di settore). Dove non trovi un dato,
dillo invece di stimarlo a sentimento.

## Contesto

Ho costruito un sistema digitale completo per un centro sportivo a Roma (piscine,
sala pesi, corsi fitness e junior, scuola nuoto). Voglio capire **quanto vale sul
mercato italiano del fitness**, per un club da **2–4 milioni di euro di fatturato**.

Il gestionale del club è **PerfectGym**. Le automazioni girano su **n8n**, il
database è **Supabase/Postgres**, il sito è **Astro** su Vercel, il CRM è
**Next.js**. WhatsApp via Spoki, email via SendGrid, consenso via CookieYes.

## Cosa esiste, in quantità misurate (non stime)

**Sito pubblico** — 91 pagine generate, 30 template, 34 componenti, 52 schede di
contenuto, ~52.000 righe. CMS git-backed (TinaCMS) per la redazione. Ottimizzato
per tre formati: desktop/mobile, **totem verticale 9:16** all'ingresso del club, e
**televisione 16:9** in sala. Migrazione da WordPress con 105 regole di redirect e
due sottodomini assorbiti. Google Consent Mode v2, font e immagini self-hosted.

**Assistente in chat** — agente LLM che risponde **solo** dai contenuti veri del
sito, tramite una knowledge base (`kb.json`) **generata automaticamente dai dati**
(listini, palinsesto, schede): si cambia un prezzo in un file e cambia ovunque.
Verifica l'email su PerfectGym prima di rispondere e cambia ramo a seconda che chi
scrive sia sconosciuto, lead, o abbonato. Può aprire l'iscrizione, la richiesta di
prova, il calendario di richiamo (Calendly) e il ticket al desk. Chiede un voto da
1 a 5 stelle. Sul totem dimentica la conversazione dopo 3 minuti. Ad oggi 167
conversazioni e 898 messaggi archiviati.

**Bozze email automatiche** — legge la casella del desk su Gmail, cerca la risposta
nella stessa knowledge base e **lascia una bozza nel thread**. Non manda niente:
la rilegge e la manda una persona. Si astiene su reclami e casi personali.

**Motore dei form** — prova/guest pass, contattaci, referral (invita un amico),
help desk con allegato, candidature di lavoro, registrazione tour al totem, reset
password. Tutti verificano l'email sul gestionale **prima** di chiedere i dati, e
saltano i campi che il gestionale ha già.

**Integrazione PerfectGym** — lettura OData, creazione di anagrafiche e di **nuclei
familiari** (genitore + figlio), lettura contratti, riallineamento in blocco di
38.586 schede.

**Automazioni del ciclo di vita** — ~30 flussi n8n attivi: rinnovi annuali,
disdette, tesseramento, promemoria certificato medico, WhatsApp e email
transazionali, sincronizzazione dei pubblici Meta (Custom Audience segmentate e
mutuamente esclusive) più evento Lead in Conversions API.

**Base dati** — 32 tabelle e 25 viste. Anagrafica unica con deduplica in Postgres
(per id gestionale ed email), trigger che agganciano ogni richiesta alla persona.
Contiene oggi 39.117 anagrafiche, 9.629 contratti, 9.435 pageview tracciate,
7.761 voci di agenda. Migrazione dello storico da Airtable, rieseguibile.

**CRM operativo su misura** — 22 sezioni: agenda commerciale, opportunità calde
calcolate sui contratti, contratti, richieste, conversazioni della chat con
trascritto, gestione scuola nuoto con report, timbrature dello staff con
geofence, notifiche push, analytics, log operatori, candidature. ~27.000 righe,
205 file, in produzione con dati reali.

**Attribuzione proprietaria** — identificativo di visita, UTM di primo tocco,
pageview ed eventi collegati alla persona quando lascia un contatto; tutto
subordinato al consenso pubblicitario.

Totale: **~79.000 righe di codice** fra sito e CRM, tutto in produzione.

## Cosa ti chiedo

Rispondi **voce per voce**, non con un numero unico:

1. **Costo di ricostruzione** — cosa pagherebbe un club italiano a un'agenzia per
   farsi costruire ciascuna voce da zero, oggi. Forcella da/a in euro.
2. **Equivalente a canone** — quali prodotti in commercio sostituirebbero ciascuna
   voce, a che prezzo di listino, e **cosa resterebbe fuori**.
3. **Prezzo di rivendita** — se lo impacchettassi come prodotto per un secondo
   club da 2–4 M€: setup una tantum + canone mensile difendibile.
4. **Le voci difendibili** — quali di queste un concorrente NON può replicare in
   fretta, e perché.
5. **Il rischio** — cosa obietterebbe un compratore esperto, e quanto vale lo
   sconto che chiederebbe.

Formato: una tabella per le prime tre domande, prosa breve per le altre due.
Dichiara le fonti dei prezzi e segna quali cifre sono ricerca e quali sono stima.
Non arrotondare verso l'alto per compiacermi: se una voce vale poco, dillo.
