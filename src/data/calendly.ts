/**
 * Quel che resta di Calendly, e dove.
 *
 * Il sito non ne importa più niente: il richiamo telefonico — form dei
 * contatti, form della prova, assistente in chat, scheda «Iscrizione Corsi» —
 * lo prende il calendario del club, che legge gli orari dall'agenda del
 * pannello e ci scrive dentro l'appuntamento (`lib/appuntamentoInline.client.js`
 * e `data/appuntamento.ts`). Gli eventi che stavano qui — `richiamami`,
 * `baby`, `assistenza`, `recall` — non li chiama più nessuno.
 *
 * **Restano tre embed, e sono incollati a mano nel Markdown**: l'evento
 * `nuoto2` in fondo a `brevetti.md`, `didattica.md` e
 * `direzione-tecnica.md`. Sono le tre schede della direzione tecnica del
 * nuoto, con una loro disponibilità e un loro modulo, e restano su Calendly
 * finché non si decide dove va quella prenotazione.
 *
 * Questo file non esporta più indirizzi di proposito: un elenco che nessuno
 * importa è un elenco che nessuno aggiorna, e il giorno in cui uno di quegli
 * eventi viene rinominato sarebbe una bugia scritta in un posto autorevole.
 * Per trovare gli embed rimasti si cerca `calendly-inline-widget` dentro
 * `src/content/articles/`.
 */
export const CALENDLY_RESIDUI = [
  'src/content/articles/snb/brevetti.md',
  'src/content/articles/snb/didattica.md',
  'src/content/articles/snb/direzione-tecnica.md',
] as const;
