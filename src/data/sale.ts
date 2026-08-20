/**
 * Le sale e le vasche del club, nell'ordine in cui compaiono nelle legende.
 *
 * Una lista sola perché serve in tre posti che devono dire la stessa cosa: la
 * tendina «sala» del planning in Tina, la legenda sotto ogni tabella orari
 * (`roomsOf`) e i due elenchi di colori in `planning.ts`. Prima l'ordine della
 * legenda stava scritto dentro `roomsOf`, cioè in copia: due elenchi delle
 * stesse sale sono due elenchi che a un certo punto divergono.
 *
 * Il nome è la chiave: una sala scritta in modo diverso nel palinsesto — «Sala
 * a», «Vasca grande» — non trova il suo colore e sparisce dalla legenda, senza
 * che niente si lamenti. Per questo in Tina la sala si scegli da un elenco
 * invece di scriverla, e aggiungerne una qui obbliga a darle un colore:
 * `planning.ts` controlla al build che ognuna ce l’abbia, in chiaro e in scuro.
 */
export const SALE = [
  'Sala A',
  'Sala B',
  'Sala C',
  'Vasca Media',
  'Vasca Grande',
  'Gym Floor',
] as const;

export type Sala = (typeof SALE)[number];
