/**
 * I numeri dentro i testi dei servizi, sostituiti in un posto solo.
 *
 * I prezzi vivono in `abbonamenti.ts` e le condizioni dell'invito in
 * `referral.ts`: scriverli anche in un documento di Tina vorrebbe dire poterli
 * cambiare in un posto solo dei due, e scoprirlo dal listino sbagliato in
 * vetrina. È la stessa scelta che il planning fa con `{n}` e `{ore}` dentro i
 * testi delle fasce: il segnaposto sta nel testo, il valore sta nei dati.
 *
 * **Sta qui e non nel componente, ed è la ragione per cui questo file esiste.**
 * La prima stesura sostituiva dentro `Servizi.astro`, che disegna la sezione di
 * `/club-life`. Ma quei testi li legge anche `/kb.json`, la knowledge base
 * dell'assistente, che non passa da nessun componente: nel `dist` finiva
 * `{pt-pacchetti}` in chiaro, cioè un assistente che a chi chiede il prezzo del
 * personal training risponde con le graffe. Misurato sul build: otto
 * segnaposto, tutti dentro `kb.json`.
 *
 * Chi aggiunge un segnaposto lo aggiunge qui, e i due consumatori lo prendono
 * insieme. Un segnaposto che nessuno sostituisce resta a schermo con le graffe,
 * quindi si vede subito — è il modo giusto di sbagliare.
 */
import { PERSONAL } from './abbonamenti';
import { AMICI, PASS, VOUCHER } from './referral';

const NUMERI: Record<string, string> = {
  '{pt-pacchetti}': PERSONAL.pacchetti.map((p) => `${p.etichetta} a €${p.prezzo}`).join(', '),
  '{pt-singola}': `€${PERSONAL.singolaIscritti}`,
  '{ref-amici}': String(AMICI),
  '{ref-giorni}': String(PASS.giorni),
  '{ref-prezzo}': `€${PASS.prezzo}`,
  '{ref-prezzo-pieno}': `€${PASS.prezzoPieno}`,
  '{ref-voucher}': `€${VOUCHER.valore}`,
  '{ref-voucher-uso}': VOUCHER.uso,
};

/** Il testo di un servizio, coi segnaposto sostituiti dai valori veri. */
export function conNumeri(testo: string): string {
  return Object.entries(NUMERI).reduce((out, [k, v]) => out.split(k).join(v), testo);
}
