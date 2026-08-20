/**
 * Calendly, in un posto solo: lo script, gli eventi e i parametri d'aspetto.
 *
 * Prima erano sparsi in tre file. Gli indirizzi dei tre eventi del contatto
 * stavano in `data/contatto.ts`, quello del richiamo dalla chat era una stringa
 * dentro `lib/chatAssistente.client.js`, e il form della prova non ne aveva.
 * Tre posti vogliono dire che il giorno in cui il club rinomina un evento se ne
 * aggiorna uno e gli altri due puntano al vuoto — e un link Calendly rotto non
 * dà errore, dà una pagina «questo evento non esiste» a chi stava per prenotare.
 */

/** Lo script dell'embed. Si carica una volta per pagina, e solo quando serve. */
export const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';

/**
 * I parametri d'aspetto dell'embed, gli stessi per tutti i calendari del sito.
 *
 * `hide_event_type_details` toglie la colonna che Calendly mette sopra il
 * calendario — nome dell'evento, durata, tipo di incontro, descrizione — e
 * dentro i nostri pannelli è tutta roba già detta: l'intestazione sopra il
 * riquadro dice cos'è e la riga sotto dice quanto dura. Era la stessa cosa
 * scritta due volte a mezza schermata di distanza.
 *
 * **Non va nel link di ripiego**, e la differenza è il contesto: quello apre
 * calendly.com in una scheda nuova, dove la nostra intestazione non c'è più e
 * il titolo dell'evento è l'unica cosa che dice cosa si sta prenotando.
 */
export const CALENDLY_ASPETTO = 'hide_gdpr_banner=1&hide_event_type_details=1';

/**
 * Gli eventi sull'account del club. Non sono interscambiabili: hanno durate,
 * disponibilità e moduli diversi, e `recall` ha una domanda personalizzata
 * obbligatoria che gli altri non hanno.
 */
export const CALENDLY = {
  /** L'adulto che ha scritto una richiesta e vuole essere richiamato. */
  richiamami: 'https://calendly.com/athlonclub/richiamami',
  /** Il genitore del baby nuoto: si parla di vasca, orari e accompagnatore. */
  baby: 'https://calendly.com/athlonclub/baby',
  /** Scuola nuoto, agonistico, pallanuoto: l'assistenza sull'inserimento. */
  assistenza: 'https://calendly.com/athlonclub/assistenza',
  /**
   * Il richiamo che l'assistente propone in chat. È un `outbound_call` — il
   * club chiama — e il suo modulo ha **una** domanda personalizzata,
   * obbligatoria, in posizione 0: si precompila come `a1`, e vuota blocca la
   * prenotazione.
   */
  recall: 'https://calendly.com/athlonclub/recall',
} as const;
