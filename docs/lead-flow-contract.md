# LEAD FLOW CONTRACT — HANDOFF

Gli ingressi che il modal della fase successiva dovrà gestire. Questa specifica
non è implementata: descrive cosa il sito già sa nel momento in cui una CTA
viene toccata, così il modal non chiede di nuovo quello che è già noto.

Il contratto sta in `src/data/cta.ts`. Ogni CTA di intento porta in pagina
quattro attributi:

```html
data-cta="trial|resolve|talk|explore|buy|member"
data-cta-intent="trial|junior_info|insertion_trial|…"
data-cta-activity="reformer"      <!-- assente sulle pagine generali -->
data-cta-source="/reformer"
```

Sostituire «vai al form esterno» con «apri il modal» richiede di cambiare
`trialCta()` in quel file, non le pagine.

---

## 1. Prova Athlon

| | |
| --- | --- |
| **CTA label** | Prova Athlon |
| **Tipo** | `trial` |
| **intent** | `trial` |
| **activity** | dalla pagina di partenza (`gym-floor`, `group-reformer`, `pilates`, `membership`…), assente su home, header e planning |
| **source page** | ogni pagina attività, home, header, planning, abbonamenti, Club Life |
| **Presente in** | 113 punti del sito, tutti dalla stessa configurazione |
| **Destinazione temporanea** | form n8n `40cc4d53-8515-4657-b6ae-6bb0fa1acf77`, con `source=SitoWeb` e `medium={activity}` |
| **Dati già precompilabili** | attività di provenienza, pagina di partenza |
| **Risultato che l'utente si aspetta** | sapere se può avere il Guest Pass Premium di 7 giorni e come si attiva |
| **Output futuro** | verifica identità → interrogazione PerfectGym → eleggibilità dal 2021 → se eleggibile, codice e istruzioni immediate; se non eleggibile, percorso alternativo |

**Vincolo commerciale.** La prova è un prodotto solo: Guest Pass Premium, sette
giorni, prezzo come nel repository, eleggibilità legata allo storico dal 2021.
Non esistono «prova la Gym Floor» o «prova il Reformer», e la parola *gratuita*
non compare da nessuna parte.

---

## 2. Trova il corso giusto per tuo figlio

| | |
| --- | --- |
| **CTA label** | Trova il corso giusto per tuo figlio |
| **Tipo** | `resolve` |
| **intent** | `junior_info` |
| **activity** | `scuola-nuoto-bambini` |
| **source page** | `/scuola-nuoto-bambini` |
| **Destinazione temporanea** | form n8n `a4283d20…` con `medium=SNB` |
| **Dati già precompilabili** | attività, pagina; stagione e annate ammesse sono nella pagina |
| **Risultato che l'utente si aspetta** | quale turno è adatto all'età di suo figlio, e quanto costa |
| **Output futuro** | chiedere solo ciò che manca — dati del genitore, anno di nascita, esperienza in acqua — e restituire turni e costi coerenti, poi offrire messaggio, telefonata o appuntamento |
| **Requirement** | il form oggi non chiede l'anno di nascita: senza quel campo la CTA promette una risposta che il modulo non permette di dare |

---

## 3. Registrati per prenotare la tua lezione

| | |
| --- | --- |
| **CTA label** | Registrati per prenotare la tua lezione |
| **Tipo** | `resolve` |
| **intent** | `junior_info` |
| **activity** | `baby-nuoto` |
| **source page** | `/baby-nuoto` |
| **Destinazione temporanea** | form n8n `a4283d20…` con `Medium=PulsanteBabyNuoto` (la maiuscola è quella del sito vecchio e va riprodotta) |
| **Dati già precompilabili** | attività, pagina; i prezzi di lezione (32 €) e mese (89 €) sono già in pagina |
| **Risultato che l'utente si aspetta** | essere registrato e poter prenotare una lezione |
| **Output futuro** | registrazione → età in mesi → turni disponibili → prenotazione |
| **Requirement** | l'etichetta promette una registrazione che porta a prenotare: il modal deve chiudere con una prenotazione, non con «ti contattiamo». Finché la destinazione è il form, la promessa è coperta solo a metà — è il primo punto da sistemare quando il flusso esiste. |

---

## 4. Richiedi la prova di inserimento

| | |
| --- | --- |
| **CTA label** | Richiedi la prova di inserimento |
| **Tipo** | `resolve` |
| **intent** | `insertion_trial` |
| **activity** | `pallanuoto` · `nuoto-agonistico` |
| **source page** | `/pallanuoto` · `/nuoto-agonistico` |
| **Destinazione temporanea** | form n8n `a4283d20…` con `medium=PALLANUOTO` / `medium=NuotoAgonistico` |
| **Dati già precompilabili** | attività, pagina, livello minimo richiesto (è nella scheda del corso) |
| **Risultato che l'utente si aspetta** | quando e come si svolge la valutazione del livello tecnico |
| **Output futuro** | richiesta di prova con proposta di data |

La prova di inserimento è obbligatoria e documentata per entrambe le attività
(`junior.ts`: «valutazione del livello tecnico prima dell'ammissione al corso»),
quindi la CTA può nominarla.

---

## 5. Hai bisogno di aiuto a scegliere?

| | |
| --- | --- |
| **CTA label** | Hai bisogno di aiuto a scegliere? |
| **Tipo** | `resolve` |
| **intent** | `membership_advice` |
| **activity** | `membership` |
| **source page** | `/abbonamenti` |
| **Destinazione** | **nessuna: non pubblicata** |
| **Dati già precompilabili** | pagina, eventuale piano guardato per ultimo |
| **Risultato che l'utente si aspetta** | capire se gli serve Smart o Premium |
| **Output futuro** | messaggio, telefonata o appuntamento in sede |
| **Stato** | `BLOCKED CTA — FUTURE MODAL`. La pagina resta completamente leggibile senza form; la CTA entra quando il modal esiste. |

---

## 6. Parla con noi

| | |
| --- | --- |
| **CTA label** | Parla con noi |
| **Tipo** | `talk` |
| **intent** | `contact` |
| **activity** | dalla pagina di partenza |
| **source page** | header, `/abbonamenti`, `/personal-training`, footer |
| **Destinazione** | **nessuna: non pubblicata** (`TALK.available = false` in `cta.ts`) |
| **Dati già precompilabili** | attività, pagina |
| **Risultato che l'utente si aspetta** | parlare con una persona del club |
| **Output futuro** | tre strade dentro lo stesso modal: lascia un messaggio · prenota una telefonata · prenota un appuntamento in sede |
| **Stato** | `BLOCKED CTA — FUTURE MODAL`. `/contatti` non esiste e non va creata: i link che ci puntavano sono stati rimossi. Quando il modal è pronto basta mettere `available: true` e i punti previsti la mostrano. |

---

## 7. Trova il corso giusto per te · Trova il tuo allenamento in acqua

| | |
| --- | --- |
| **CTA label** | Trova il corso giusto per te · Trova il tuo allenamento in acqua |
| **Tipo oggi** | `explore` — portano a un'ancora della stessa pagina, che la risposta la dà |
| **Tipo futuro** | `resolve`, con `intent = class_finder` |
| **activity** | `corsi-fitness` · `aqua-fitness` |
| **source page** | `/corsi-fitness` · `/aqua-fitness` |
| **Destinazione** | `#famiglie` (cinque famiglie Athlon Classes) · `#lezioni` (tre modi di stare in acqua) |
| **Output futuro** | poche domande — obiettivo, giorni disponibili, esperienza — e tre lezioni consigliate con i loro orari |

Finché la risposta la dà la pagina, queste CTA non sono lead e non sono
classificate come tali.

---

## 8. Eventi

| | |
| --- | --- |
| **CTA label** | Registrati per partecipare |
| **Tipo** | `buy` / `resolve` a seconda dell'evento |
| **source page** | `/eventi/[slug]` |
| **Destinazione attuale** | default dello schema: registrazione al portale |
| **Stato** | `DA VERIFICARE`. I tre eventi in calendario sono gratuiti e aperti a chi non è iscritto, ma nessuno ha un `ctaHref` proprio: la destinazione è la registrazione al portale, quindi l'etichetta dice quello. Con una vera destinazione di prenotazione l'etichetta diventa «Prenota il tuo posto gratuito». |

---

## Cosa il modal riceverà, in sintesi

```
intent        trial | junior_info | insertion_trial | membership_advice
              | class_finder | swim_level | contact
activity      slug di activities.ts, o `membership`, o assente
sourcePage    percorso della pagina
sourceCta     ricavabile dall'etichetta e dalla posizione
```

Nessun VID, nessun tracking, nessuna automazione in questa fase: solo il
contesto, in chiaro nel markup, perché la fase successiva non debba ricostruirlo.
