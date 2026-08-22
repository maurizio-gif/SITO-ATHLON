/**
 * I comandi della pagina `/link`, cioè il link nella bio di Instagram.
 *
 * Sta in un file di dati e non dentro la pagina per la ragione di sempre — chi
 * la cambia non deve leggere il markup — ma soprattutto perché **due voci sono
 * condizionate**, e la condizione va scritta una volta accanto al dato che la
 * decide, non indovinata da chi rimette mano alla pagina sei mesi dopo.
 *
 * ## Non è l'indice del sito, ed è la scelta che regge tutto il resto
 *
 * Una linktree che elenca le pagine è il menu del sito scritto due volte, e la
 * seconda copia divergerà. Questa risponde ai motivi per cui si tocca il link
 * di una bio, che sono gli stessi intenti già dichiarati in `cta.ts`: provare
 * (`trial`), sapere quando (il planning), parlare con qualcuno (`talk` e
 * l'assistente), venire in sede. Sei comandi, e sei è un tetto: al settimo la
 * pagina torna a essere un menu.
 *
 * ## Tre dei sei aprono un modal, e per questo non portano da nessuna parte
 *
 * `ProvaModal`, `ContattaciModal` e `ChatModal` stanno in `Layout.astro`, cioè
 * anche qui: la prova e la richiesta si compilano **sulla pagina della bio**,
 * senza un secondo tocco e senza una seconda pagina da caricare su una rete
 * telefonica. È la ragione principale per cui questa pagina è nel sito invece
 * che su un servizio di linktree, dove ogni conversione costa un salto.
 *
 * L'`href` di quelle tre resta valido e va tenuto: è il ripiego per chi non ha
 * JavaScript e per il click che apre una scheda nuova. Vale la regola dei
 * pulsanti d'iscrizione — l'intercettazione è un miglioramento, non un
 * requisito.
 *
 * ## L'UTM sta nel link della bio, non qui
 *
 * Il browser interno di Instagram non passa il referrer, quindi senza
 * `?utm_source=instagram&utm_medium=bio` sull'indirizzo incollato nel profilo
 * ogni richiesta che nasce da lì risulta senza campagna in `richieste_*`.
 * `scripts/attribuzione.ts` memorizza il **primo tocco**, quindi taggare quel
 * solo indirizzo copre tutto il percorso: i link qui sotto non portano UTM, e
 * non devono, o il primo tocco verrebbe riscritto a ogni passaggio.
 *
 * Quello che serve a distinguere *quale* comando è stato premuto è `data-link`,
 * che la pagina mette su ognuno: un tag di GTM lo legge senza che si debba
 * aggiungere un attributo per volta.
 */
import { getCollection } from 'astro:content';
import { CLUB } from './club';
import { GUEST_PASS } from './abbonamenti';
import { POSIZIONI } from './lavora';
import { PAGINE_ADULTI } from './pagine';
import { JUNIOR } from './junior';
import { TALK, TRIAL } from './cta';

export interface VoceLink {
  /** Chiave stabile: finisce in `data-link`, ed è come GTM chiama il comando. */
  id: string;
  /** L'etichetta, all'imperativo o al sostantivo: dice cosa c'è dall'altra parte. */
  label: string;
  /**
   * La riga sotto: il prezzo, la durata, cosa accade. Facoltativa.
   *
   * **Sta in una riga su un telefono da 390px**, e la misura è il vincolo, non
   * un gusto: la nota che va a capo alza la sua scheda e sola fra sei, e sei
   * schede di altezze diverse si leggono come un elenco disordinato invece che
   * come un menu. Trentacinque caratteri circa, misurati.
   */
  nota?: string;
  /**
   * Dove porta. Per i tre comandi che aprono un modal è il ripiego senza
   * JavaScript, non la destinazione normale.
   */
  href: string;
  /** Il `data-cta` che apre il modal del Layout, quando ce n'è uno. */
  cta?: 'trial' | 'talk' | 'assistente';
  /** Fuori dal sito: scheda nuova e `rel="noopener"`. */
  esterno?: boolean;
}

/** L'indirizzo come lo cerca Maps, dai dati del club e non da una terza copia. */
const INDIRIZZO = `${CLUB.street}, ${CLUB.postalCode} ${CLUB.city}`;

/**
 * La promo del mese è un link **solo mentre esiste**.
 *
 * Due condizioni, e servono entrambe: il documento non è una bozza, e la
 * scadenza non è passata. Senza la seconda, la bio manderebbe su una landing
 * che promette un'offerta finita — cioè la versione peggiore del problema che
 * `/lavora` risolve con l'elenco vuoto: un'offerta inventata è peggio di
 * un'offerta assente.
 *
 * Si valuta **al build**, non nel browser, e va detto perché sembra fragile:
 * il sito è statico, quindi la voce resta in pagina fino al deploy successivo.
 * Non è un problema in pratica, ed è per come la promo si cambia — da Tina, che
 * scrive sul repository: cambiare la promo *è* un commit, quindi un deploy, e
 * la condizione si rivaluta esattamente quando il dato cambia. Il caso che
 * resta scoperto è la promo che scade senza che nessuno tocchi niente, e lo
 * chiude il deploy successivo.
 */
async function promoAttiva(): Promise<boolean> {
  const voci = await getCollection('promo', ({ data }) => !data.draft);
  const promo = voci[0]?.data;
  if (!promo) return false;
  return promo.scadenza.getTime() > Date.now();
}

/**
 * I comandi pieni, in ordine di quanto è probabile che siano il motivo del
 * tocco. La prova sta prima perché è l'unico prodotto d'ingresso del club; il
 * planning perché è la cosa più cercata del sito, dai soci e dai curiosi.
 *
 * L'assistente sta **prima** di «Scrivici» benché siano lo stesso intento:
 * risponde in tempo reale, mentre la richiesta al team passa da una persona.
 * Chi ha una domanda e due comandi davanti deve trovare per primo quello che
 * gli risponde subito.
 */
export async function comandiLink(): Promise<VoceLink[]> {
  const promo = await promoAttiva();

  return [
    {
      id: 'prova',
      label: TRIAL.label,
      nota: `${GUEST_PASS.giorni} giorni di club completo a ${GUEST_PASS.prezzo} €`,
      href: '/abbonamenti#guest-pass',
      cta: 'trial',
    },
    ...(promo
      ? [
          {
            id: 'promo',
            label: 'La promo del mese',
            nota: 'Quota di attivazione in omaggio',
            href: '/promo',
          },
        ]
      : []),
    {
      id: 'planning',
      label: 'Orari e planning',
      nota: 'Il palinsesto della settimana',
      href: '/planning',
    },
    {
      id: 'assistente',
      label: 'Chatta con noi',
      nota: 'Risposte in tempo reale',
      href: '/club-life#help-desk',
      cta: 'assistente',
    },
    {
      id: 'contatto',
      label: TALK.label,
      nota: 'Ti risponde il team, in pochi minuti',
      href: TALK.href,
      cta: 'talk',
    },
    {
      id: 'mappa',
      label: 'Come arrivare',
      nota: `${CLUB.street} · ${CLUB.area}`,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(INDIRIZZO)}`,
      esterno: true,
    },
  ];
}

/** Una voce di testo: nessun `nota`, nessun `cta` — solo un nome e un indirizzo. */
export interface VoceSemplice {
  id: string;
  label: string;
  href: string;
}

/**
 * Le due liste di attività, per chi scorre la bio già sapendo cosa cerca —
 * «fate acqua fitness?», «a che ora è il pilates?» — e vuole la pagina di
 * quel corso, non un pulsante generico.
 *
 * **La fonte è quella che usa già il resto del sito**, non una copia scritta
 * qui: `PAGINE_ADULTI` e `JUNIOR` sono gli stessi elenchi che popolano i
 * rimandi fra pagine e il menu dell'header. Aggiungere un corso in
 * `corsi.ts` o `junior.ts` lo fa comparire anche qui, senza toccare questo
 * file — è la stessa ragione per cui `ACTIVITY_TAGS` alimenta tre posti in
 * una volta (vedi AGENTS.md).
 *
 * Gli adulti sono in ordine alfabetico italiano, come fa `Header.astro` con
 * i corsi fitness: sono ventidue voci, e senza un ordine riconoscibile
 * diventano un elenco da leggere invece che da scorrere. I corsi junior sono
 * quattro e restano nell'ordine in cui li scrive `junior.ts` — la
 * progressione per età, che per soli quattro nomi si legge più naturale di
 * un ordine alfabetico.
 */
export function attivitaLink(): { adulti: VoceSemplice[]; junior: VoceSemplice[] } {
  return {
    adulti: [...PAGINE_ADULTI]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
      .map((c) => ({ id: c.slug, label: c.nome, href: `/${c.slug}` })),
    junior: JUNIOR.map((c) => ({ id: c.slug, label: c.nome, href: `/${c.slug}` })),
  };
}

/**
 * Le voci secondarie: testo e non un pulsante.
 *
 * Ne resta una sola, «Lavora con noi», e segue le posizioni aperte:
 * `POSIZIONI` vuoto è uno stato legittimo — la pagina lo dice per intero e la
 * candidatura spontanea resta — ma dalla bio non si manda nessuno su un
 * elenco vuoto.
 *
 * Abbonamenti, Athlon TV e il referral sono usciti da questa pagina: erano
 * link di serie B che non parlavano a chi arriva da un video su Instagram.
 * Chi vuole abbonarsi lo trova dal Guest Pass o dalla promo; chi è già socio
 * conosce già `/referral`.
 */
export function secondarieLink(): VoceSemplice[] {
  return POSIZIONI.length ? [{ id: 'lavora', label: 'Lavora con noi', href: '/lavora' }] : [];
}
