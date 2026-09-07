/**
 * Il vocabolario del form «Contattaci», in un posto solo.
 *
 * Il form nasce dai 55 nodi di `CONTATTACI - ATHLON` su n8n, dove le domande
 * stavano dentro le pagine del form ospitato: una tendina qui, uno switch là,
 * e per sapere cosa chiede il modulo bisognava aprire l'automazione. Ora le
 * domande sono del sito, e stanno qui — le schermate del modal e la logica del
 * client leggono da questo file, così cambiare un'opzione è cambiare una riga
 * e non tre punti che divergono al primo ritocco.
 *
 * Le cinque macro-attività sono le stesse della tendina «Per quale attività hai
 * bisogno di informazioni?», e restano cinque perché sono cinque percorsi di
 * iscrizione diversi, non cinque etichette: l'adulto scrive una richiesta, il
 * baby nuoto vuole il bambino e il genitore, la scuola nuoto vuole anche il
 * livello in acqua. È la ramificazione che l'automazione fa oggi, e il form la
 * deve fare prima — chiedere a un genitore di pallanuoto quale corso fitness
 * gli interessa è la domanda che fa chiudere la pagina.
 */
import { ACTIVITY_TAGS } from './activities';
import { SNB_ETA } from './junior';
import { PREFISSO_PREDEFINITO, validaTelefono } from './prefissi';

/** L'endpoint che verifica l'email su PerfectGym: lo stesso del form di prova. */
export const WEBHOOK_VERIFICA = 'https://automazione.n8ndevelop.it/webhook/athlon-verifica-iscritto';

/**
 * L'endpoint che riceve la richiesta completa.
 *
 * Nuovo, e non quello del form n8n di oggi: `CONTATTACI - ATHLON` parte da un
 * Form Trigger e i suoi nodi leggono i campi con le etichette in italiano —
 * `$json['Il tuo indirizzo email']`. Un webhook che riceve JSON non può
 * riusarlo, e riscriverlo sopra spegnerebbe il form vecchio nel momento del
 * salvataggio. I due convivono finché questo sito non è pubblicato.
 */
export const WEBHOOK_CONTATTO = 'https://automazione.n8ndevelop.it/webhook/athlon-contatto-compilato';

/**
 * L'endpoint che chiede a PerfectGym di mandare la mail per reimpostare la
 * password. Riceve `{ email }` e risponde `inviata`, `errore` o
 * `email_non_valida`.
 *
 * Esiste per togliere un attrito preciso: chi ha già un account arrivava sulla
 * pagina `ForgotPassword` del portale e là doveva **ridigitare** l'indirizzo che
 * aveva appena scritto nel nostro campo, in un'applicazione con un'altra grafica
 * e in un'altra scheda. Ora il pulsante fa partire la mail e la persona resta
 * qui.
 *
 * Dietro c'è `POST /Api/v2.2/MemberAuth/SendResetPasswordLink`, e come sempre la
 * chiamata la fa n8n: le chiavi di PerfectGym non stanno nel browser.
 *
 * **`inviata` non è una prova di consegna**, e sono due cose distinte. La prima:
 * quell'endpoint risponde `200` anche per un indirizzo che non esiste — provato,
 * `content-length: 0` — perché non deve rivelare a un estraneo se un account c'è.
 * Qui non è un problema, perché il pulsante lo vede solo chi la verifica ha già
 * riconosciuto. La seconda: la mail parte solo se in PerfectGym c'è la regola di
 * automazione «User password reset has been requested». Senza quella la risposta
 * è `200` e non parte niente — è la sola parte di questo percorso che non si può
 * verificare dal codice.
 */
export const WEBHOOK_RESET = 'https://automazione.n8ndevelop.it/webhook/athlon-reset-password';

/* Il calendario non sta più qui, e non è più nemmeno di Calendly: gli orari
   liberi li serve il pannello del club e l'appuntamento nasce nella sua
   agenda. Gli indirizzi in `data/appuntamento.ts`, la logica in
   `lib/appuntamentoInline.client.js` — condivisa dai tre posti che la usano:
   questo form, quello della prova e l'assistente in chat. */

/**
 * Il portale, per chi risulta già registrato: reset password e accesso.
 *
 * `reset` non è più la strada principale — la mail la fa partire
 * `WEBHOOK_RESET` — ma resta, ed è il ripiego che serve: se la chiamata non
 * riesce, la persona deve avere ancora un modo di reimpostare la password, e
 * quel modo è la pagina del portale.
 */
export const PORTALE = {
  reset: 'https://athlon.perfectgym.com/ClientPortal2/#/ForgotPassword',
  login: 'https://athlon.perfectgym.com/ClientPortal2/#/Login',
} as const;

/**
 * Se questa email ha già un account sul portale.
 *
 * Sta qui e non dentro un form perché la usano in due — «contattaci» e il
 * controllo davanti ai pulsanti d'iscrizione — e sarà la stessa ovunque si
 * aggiunga un passo «verifica l'email». Una regola come questa scritta in due
 * posti è una regola che a un certo punto risponde in due modi.
 *
 * **Lo decide `memberType`, non `stato`.** L'automazione distingue quattro
 * valori: `Member` e `Guest` hanno un account, `Lead` e l'assenza no — un Lead
 * è un contatto e non una persona che può fare login. `stato` invece unisce
 * Lead e Guest sotto `esiste`, quindi non basta.
 *
 * Il ripiego su `stato === 'iscritto'` copre una versione del webhook che non
 * mandi `memberType`: riconosce solo il Member, cioè tratta un Guest come uno
 * senza account. È il verso giusto in cui sbagliare — chi ha un account e viene
 * mandato a registrarsi lo scopre subito e fa il reset, mentre chi non ce l'ha
 * e viene mandato al login resta fuori senza capire perché.
 */
export function haGiaAccount(esito: { memberType?: string; stato?: string }): boolean {
  if (esito.memberType) return /member|guest/i.test(esito.memberType);
  return esito.stato === 'iscritto';
}

/**
 * Se PerfectGym **ha già un'anagrafica** per questa email.
 *
 * È una terza domanda, diversa dalle altre due di questo file, e la differenza
 * è tutta nel Lead. `haGiaAccount` chiede «può fare login?» e un Lead no;
 * `eSocio` chiede «paga un abbonamento?» e un Lead no. Questa chiede «i suoi
 * dati ce li abbiamo?», e di un Lead **sì**: è a sistema perché ha fatto una
 * prova o ha lasciato un contatto, e la verifica ci ha appena restituito nome,
 * cognome e telefono. Richiederglieli è fare una domanda a cui ha già risposto.
 *
 * La usano la chat e il modulo del totem, e devono rispondere allo stesso modo
 * perché sono lo stesso percorso: email, poi i dati solo se mancano.
 *
 * `errore` non è «no», è «non lo sappiamo»: se la verifica non ha risposto i
 * dati si chiedono, che è il verso giusto in cui sbagliare — una domanda in più
 * costa un campo, una in meno costa un'anagrafica senza nome.
 */
export function anagraficaNota(esito: { stato?: string; statoNucleo?: string }): boolean {
  const nucleo = esito.statoNucleo || esito.stato;
  return (
    nucleo === 'iscritto' ||
    nucleo === 'esiste' ||
    esito.stato === 'iscritto' ||
    esito.stato === 'esiste'
  );
}

/**
 * Se i dati della persona vanno **chiesti**, o se li abbiamo già tutti.
 *
 * Non è la negazione di `anagraficaNota`, ed è il punto: sapere che una persona
 * è a sistema non vuol dire avere i suoi dati. Un'anagrafica può essere nata da
 * un form che chiedeva solo l'email, o portare un numero che non è un
 * cellulare. Quindi la domanda non è «lo conosciamo» ma «abbiamo tutto e tre»,
 * e basta che ne manchi uno perché il blocco torni intero.
 *
 * **Intero e non a pezzi**, e questa è una scelta: mostrare due campi su tre
 * lascia la persona a indovinare perché proprio quelli, e un modulo che cambia
 * forma campo per campo si legge come un guasto. O si chiede, o si conferma.
 *
 * Il telefono passa da `validaTelefono` e non da «c'è o non c'è»: un numero
 * fisso in archivio è un numero su cui il richiamo non arriva, quindi vale come
 * assente e il campo si chiede.
 *
 * **E serve l'id**, che è la condizione meno ovvia delle quattro. Non serve a
 * riempire un campo: serve perché è `memberId` a decidere, su n8n, se
 * l'anagrafica va creata — è così nella chat (`Esiste gia su PGM?`) e nel
 * modulo del totem. Senza id l'automazione crea la persona, e per crearla le
 * servono proprio i dati che nascondendo il blocco non avremmo chiesto: nel
 * ramo junior anche la data di nascita, senza la quale la chiamata fallisce
 * **in silenzio**. Le due decisioni devono guardare la stessa cosa, o il modulo
 * smette di chiedere quello che l'automazione si aspetta di ricevere.
 */
export function servonoISuoiDati(persona: {
  nota: boolean;
  id?: string | number | null;
  nome?: string;
  cognome?: string;
  telefono?: string;
}): boolean {
  return !(
    persona.nota &&
    persona.id &&
    persona.nome &&
    persona.cognome &&
    validaTelefono(PREFISSO_PREDEFINITO, persona.telefono || '').ok
  );
}

/**
 * Se questa email è **già passata dal club**: iscritta una volta, o una prova
 * fatta anche anni fa.
 *
 * Il nome dice «socio» e la lettura ovvia sarebbe «paga un abbonamento adesso»:
 * non è quella. Su PerfectGym `Member` vuol dire che quella persona **è stata
 * iscritta o ha fatto una prova in passato**, e resta `Member` anche a
 * contratto finito — quindi questa riga risponde a «l'abbiamo già avuta?», non
 * a «l'abbiamo adesso?». Confermato dal club il 07/09/2026, ed è la ragione per
 * cui il confronto va bene com'è per tutte e due le domande del referral.
 *
 * È diversa da `haGiaAccount`, e la differenza è tutto il referral: là dentro
 * `Guest` conta come «ha un account», qui no. Chi invita dev'essere già dei
 * nostri; chi è invitato non deve esserlo mai stato, perché il pass è la prima
 * settimana di chi il club non lo conosce.
 *
 * **`Guest` passa, e non è una svista.** Non è il contrario della regola qui
 * sopra: un `Guest` su PerfectGym può essere un bambino di un nucleo o chi ha
 * lasciato i dati a un tour, senza aver mai avuto un pass né un abbonamento.
 * Scartarli tutti sarebbe più severo del vero, e il verso in cui si sbaglia è
 * scelto — vedi `data/referral.ts`, dove il perimetro sta scritto per esteso.
 */
export function eSocio(esito: { memberType?: string; stato?: string }): boolean {
  if (esito.memberType) return /member/i.test(esito.memberType);
  return esito.stato === 'iscritto';
}

/**
 * La scheda con turni, costi e procedura: la chiusura del ramo junior.
 *
 * **Non si chiama più «preiscrizioni», e lo slug sì.** Il documento è
 * `Iscrizione Corsi 2026/27` e le iscrizioni sono aperte ad abbonamento
 * mensile: la parola «preiscrizione» descriveva la stagione di due anni fa e
 * dire a un genitore che si preiscrive quando può iscriversi è mandarlo a
 * cercare un secondo passaggio che non esiste. L'indirizzo invece resta
 * `preiscrizioni-nuoto`, ed è deliberato: è indicizzato, è la destinazione di
 * `/snb-landing` in `vercel.json`, ed è uno dei 22 percorsi che il wiki vecchio
 * ha identici qui — rinominarlo costerebbe tre redirect per guadagnare una
 * parola che nessuno legge.
 */
export const ISCRIZIONI = '/wikiathlon/snb/preiscrizioni-nuoto';

/** Quale percorso segue la richiesta dopo la macro-attività. */
export type Ramo = 'adulti' | 'baby' | 'junior';

export interface Macro {
  id: string;
  /** L'etichetta breve, quella del pulsante. */
  label: string;
  /** La riga sotto: chi è, e per quale età. Era fra parentesi nella tendina. */
  nota: string;
  ramo: Ramo;
  /** `gruppoAttivita` nel payload, come nei form degli altri club. */
  gruppo: 'adulti' | 'junior';
}

/**
 * Le cinque scelte del primo passo.
 *
 * Gli `id` sono quelli di `activities.ts` dove esiste una corrispondenza —
 * `baby-nuoto`, `scuola-nuoto-bambini`, `pallanuoto`, `nuoto-agonistico` —
 * così la richiesta arriva a n8n con la stessa parola che il sito usa per
 * taggare articoli, eventi e planning. `adulti` non è un'attività ma il loro
 * insieme, e lì l'attività precisa la chiede il passo dopo.
 */
export const MACRO: Macro[] = [
  {
    id: 'adulti',
    label: 'Adulti',
    nota: 'Dai 13 anni: sala pesi, corsi, reformer, acqua, nuoto libero.',
    ramo: 'adulti',
    gruppo: 'adulti',
  },
  {
    id: 'baby-nuoto',
    label: 'Baby Nuoto',
    nota: 'Dai 3 mesi ai 3 anni, in acqua con un genitore.',
    ramo: 'baby',
    gruppo: 'junior',
  },
  {
    id: 'scuola-nuoto-bambini',
    label: 'Scuola Nuoto Bambini',
    // Letta da `junior.ts` e non ricopiata: questa nota compare nel modulo
    // contatti, che sta su **ogni** pagina del sito, e portava ancora la
    // stagione precedente - 2012-2022 - mentre la pagina del corso diceva
    // 2013-2023. Un genitore poteva concludere che suo figlio e' fuori
    // quando e' dentro.
    nota: `Nati dal ${SNB_ETA.dal} al ${SNB_ETA.al}.`,
    ramo: 'junior',
    gruppo: 'junior',
  },
  {
    id: 'nuoto-agonistico',
    label: 'Nuoto Agonistico ASI',
    nota: 'Chi già nuota e vuole gareggiare.',
    ramo: 'junior',
    gruppo: 'junior',
  },
  {
    id: 'pallanuoto',
    label: 'Pallanuoto',
    nota: 'Squadre giovanili, dai gruppi propedeutici in su.',
    ramo: 'junior',
    gruppo: 'junior',
  },
];

export const MACRO_BY_ID: Record<string, Macro> = Object.fromEntries(
  MACRO.map((m) => [m.id, m])
);

/**
 * Dove si va a leggere come si fa l'iscrizione, per ramo.
 *
 * Due destinazioni e non una, perché i due percorsi finiscono in due posti
 * diversi: la scuola nuoto ha turni e fasce d'età da scegliere prima di
 * comprare, e quelli stanno nella scheda; il baby nuoto no — si aggiunge un
 * abbonamento o si prenota una lezione, e si fa **dentro** il portale. Mandare
 * un genitore del baby su una scheda di turni sarebbe mandarlo a leggere una
 * cosa che non deve scegliere.
 *
 * `adulti` non c'è, e non è una dimenticanza: l'adulto scrive una richiesta in
 * testo libero e gli risponde una persona. Non esiste una pagina di istruzioni
 * a cui mandarlo, e inventarne una vorrebbe dire far leggere una procedura a
 * chi ha appena chiesto di parlare con qualcuno.
 */
export const ISTRUZIONI: Record<Exclude<Ramo, 'adulti'>, string> = {
  junior: ISCRIZIONI,
  baby: '/baby-nuoto',
};

/**
 * Come si aggiunge il figlio al proprio profilo, passo per passo.
 *
 * Sono le tre voci di menu del portale, con le parole che il portale usa: è
 * l'unico modo perché servano. «Aggiungi tuo figlio dal nucleo familiare» è
 * una descrizione, non un'istruzione — chi si trova davanti la schermata deve
 * riconoscere la voce da premere, e le maiuscole sono quelle che legge.
 *
 * Il passo di mezzo è il punto in cui le persone si fermano: il comando sta in
 * fondo alla scheda del nuovo componente, sotto i campi, e chi non scorre
 * conclude che l'account non si può creare. Per questo «scorri in basso» è un
 * passo suo e non un incidentale.
 */
export const NUCLEO_PASSI = [
  'Entra nel portale e apri <strong>Nucleo Familiare</strong>.',
  'Premi <strong>Aggiungi membro al nucleo familiare</strong> e compila i suoi dati.',
  'Scorri in basso e premi <strong>Crea Account</strong>.',
] as const;

/**
 * Le due strade per iscrivere un bambino al Baby Nuoto, dentro il portale.
 *
 * Restano due perché sono due prodotti e non due modi di comprare lo stesso:
 * l'abbonamento tiene il posto ogni settimana, la lezione singola no. Un
 * genitore che non sa ancora se il bambino reggerà l'acqua compra la singola;
 * chi ha già deciso vuole il posto fisso. Offrirne una sola vuol dire perdere
 * l'altra metà.
 */
export const MODALITA_BABY = [
  {
    titolo: 'Abbonamento mensile',
    nota: 'Il posto è tenuto ogni settimana.',
    passi: [
      'Nella tua area riservata apri <strong>Abbonamenti</strong>.',
      'Scegli l’anagrafica del bambino in alto, poi <strong>Aggiungi abbonamento</strong>.',
    ],
  },
  {
    titolo: 'Singola lezione',
    nota: 'Si prenota e si paga una volta.',
    passi: [
      'Apri <strong>Corsi/PT</strong>, poi <strong>Prenota</strong>.',
      'Categoria <strong>Baby Nuoto</strong>: scegli la lezione e paga.',
    ],
  },
] as const;

/**
 * Le attività fra cui scegliere nel ramo adulti.
 *
 * Derivate da `ACTIVITY_TAGS` e non riscritte: è la regola del progetto —
 * le attività escono da `activities.ts` e da lì popolano Tina, la validazione
 * e l'Help Desk. Una lista a mano qui sarebbe la sesta copia, e la prima a
 * restare indietro.
 *
 * Nota una differenza voluta rispetto alla tendina di n8n, che ne elencava
 * sette: qui ce ne sono otto, perché `ACTIVITY_TAGS` include il **personal
 * training**, che il club vende e che ha una pagina sua. Ometterlo dal form
 * dei contatti significherebbe che l'unica richiesta che non si può fare è
 * quella del servizio più caro.
 */
export const ATTIVITA_ADULTI = ACTIVITY_TAGS.filter((a) => a.audience === 'adulti');

/**
 * Le tre domande sul livello in acqua, per la scuola nuoto e per chi arriva
 * dall'agonistico o dalla pallanuoto.
 *
 * Servono alla direzione tecnica per assegnare il corso senza una prova in
 * vasca, ed è il motivo per cui il form le fa: sono le stesse tre di oggi, con
 * le stesse parole. La prima è facoltativa perché lo era — un genitore che non
 * sa dire se «un corso» conta può passare oltre invece di indovinare.
 */
export const DOMANDE_LIVELLO = [
  {
    id: 'haFrequentato',
    label: 'Ha mai frequentato un corso di nuoto?',
    obbligatoria: false,
  },
  {
    id: 'saNuotare',
    label: 'Sa nuotare senza ausili (braccioli, ciambella)?',
    obbligatoria: true,
  },
  {
    id: 'stileLibero',
    label: 'Sa eseguire correttamente lo stile libero completo?',
    obbligatoria: true,
  },
] as const;

/**
 * Il testo del consenso, parola per parola quello del form n8n di oggi.
 *
 * Sta qui e non nel markup perché compare in due schermate — i dati
 * dell'adulto e i dati del genitore — e due copie di una frase di consenso che
 * divergono sono un problema che non si vede finché non lo chiede qualcuno.
 */
export const CONSENSO_PRIVACY =
  'Ho letto l’informativa e acconsento al trattamento dei miei dati da parte di Point 2000 SSDrl per rispondere a questa richiesta.';

export const CONSENSO_MARKETING =
  'Voglio ricevere comunicazioni su corsi, promozioni e novità del club. Posso revocare quando voglio.';
