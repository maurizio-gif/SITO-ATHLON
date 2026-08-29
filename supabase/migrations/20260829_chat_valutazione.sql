-- La valutazione della chat: una stella da 1 a 5, chiesta dentro la
-- conversazione e scritta sulla riga della conversazione stessa.
--
-- **Sta qui e non su `utenti`**, benché la richiesta fosse «salvala
-- sull'anagrafica»: una persona può avere dieci chat, e un voto senza la
-- conversazione che l'ha generato non si può né spiegare né rileggere — il
-- desk che vede «2 stelle» sulla scheda vuole sapere *quale* chat è andata
-- male. Con `utente_id` già su questa tabella l'anagrafica ce l'ha comunque:
-- la scheda della persona mostra le sue conversazioni, e ognuna porta il suo
-- voto.
--
-- La scrive l'automazione n8n `CHAT ATHLON — VALUTAZIONE`, che trova la riga
-- dalla `sessione` — l'unica chiave che il browser conosce.
alter table public.chat_conversazioni
  add column if not exists valutazione smallint,
  add column if not exists valutazione_il timestamptz,
  add column if not exists valutazione_nota text;

-- Un voto fuori scala è un errore di chi scrive, non un dato: meglio il
-- rifiuto che una colonna con dentro 0, 7 o -1.
do $$
begin
  alter table public.chat_conversazioni
    add constraint chat_conversazioni_valutazione_ck check (valutazione between 1 and 5);
exception
  when duplicate_object then null;
end $$;

comment on column public.chat_conversazioni.valutazione is
  'Da 1 a 5 stelle, come l''ha data la persona dentro la chat. Null = non l''ha data: la domanda si fa una volta sola e si può ignorare.';
comment on column public.chat_conversazioni.valutazione_il is
  'Quando ha votato. Serve a distinguere «non ha ancora votato» da «ha votato oggi»: la conversazione può essere di ieri.';
comment on column public.chat_conversazioni.valutazione_nota is
  'La riga che ha scritto dopo il voto, se l''ha scritta. Facoltativa: chiederla come obbligatoria avrebbe fatto crollare i voti raccolti.';

-- Solo le righe votate: l'indice serve a «quante stelle prende l'assistente»,
-- che è una domanda su una minoranza delle conversazioni.
create index if not exists chat_conversazioni_valutazione_idx
  on public.chat_conversazioni (valutazione)
  where valutazione is not null;
