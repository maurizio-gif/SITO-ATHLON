/**
 * Il registro di ogni pagina vista, non solo di chi compila un modulo.
 *
 * Le tabelle `richieste_*` e `eventi_email` contengono solo chi è arrivato in
 * fondo a un modulo. Per sapere «quanti accessi» e «quanti mi hanno lasciato
 * dei dati» serve anche il numeratore che manca: ogni caricamento di pagina,
 * con lo stesso `vid`/`sid` di `scripts/attribuzione.ts`, verso la tabella
 * `visite_pagina` (vedi `supabase/migrations/20260822_tracciamento_completo.sql`)
 * e la vista `visitatori` che la aggrega.
 *
 * `navigator.sendBeacon`, non `fetch`: è un caricamento di pagina, quindi può
 * essere seguito da una navigazione immediata, e un `fetch` normale può essere
 * interrotto a metà da un cambio pagina. `sendBeacon` sopravvive alla
 * navigazione per costruzione — è il suo scopo. Il corpo è un `Blob` con
 * `type: 'application/json'`: `sendBeacon` con una stringa nuda lo manderebbe
 * come `text/plain`, e il webhook si aspetta JSON.
 *
 * Come `athlon_utm`, non passa dal consenso: `vid`/`sid` restano quelli che
 * `attribuzione.ts` già decide (vid degradato a una pagina sola senza
 * consenso pubblicitario, sid sempre presente perché non identifica nessuno
 * da solo). Il beacon non aggiunge un secondo cancello di consenso sopra un
 * dato che quel modulo ha già deciso come trattare.
 */
const URL = 'https://automazione.n8ndevelop.it/webhook/athlon-visita-pagina';

function manda(): void {
  try {
    const w = window as unknown as {
      athlonGetUtm?: () => Record<string, string>;
      athlonGetVid?: () => string;
      athlonGetSid?: () => string;
    };
    const corpo = JSON.stringify({
      vid: w.athlonGetVid ? w.athlonGetVid() : null,
      sid: w.athlonGetSid ? w.athlonGetSid() : null,
      pagina: location.pathname + location.search,
      referrer: document.referrer || null,
      titolo: document.title || null,
      utm: w.athlonGetUtm ? w.athlonGetUtm() : {},
    });
    const blob = new Blob([corpo], { type: 'application/json' });
    if (navigator.sendBeacon && navigator.sendBeacon(URL, blob)) return;
    /* Browser senza sendBeacon, o coda piena: un fetch con keepalive è il
       ripiego, non la strada principale — non aspetta risposta e non blocca
       niente se fallisce. */
    fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(
      () => {}
    );
  } catch {
    /* Un pageview mancato non deve mai rompere la pagina che lo genera. */
  }
}

manda();

export {};
