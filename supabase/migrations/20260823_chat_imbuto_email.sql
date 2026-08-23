-- chat_imbuto: aggiunge il gradino dell'email fra l'apertura e la scrittura.
--
-- Mancava il passo che risponde a «di chi apre, quanti arrivano a scrivere
-- l'indirizzo prima ancora di scegliere l'attivita'»: senza, il primo salto
-- visibile nell'imbuto era da "ha aperto" a "ha scritto", e i due passi
-- dell'assistente (email, poi attivita') restavano invisibili quanto quello
-- che chat_conversazioni gia' non vedeva (nasce solo al primo messaggio).
--
-- L'email non passa da eventi_interazione: la scrive l'endpoint di verifica
-- (athlon-verifica-iscritto) su eventi_email, lo stesso che serve tutte le
-- verifiche del sito, non solo quella della chat. Il join e' sullo stesso
-- `sid` con cui l'imbuto gia' aggancia chat_conversazioni/chat_lead/
-- chat_ticket: e' la sessione di navigazione, non la sessione della
-- conversazione (quella vive in chat_conversazioni.sessione ed e' un'altra
-- cosa), quindi resta corretto anche per chi ha aperto il pannello piu'
-- volte nella stessa visita.
--
-- Progetto Supabase: app-athlon.

create or replace view public.chat_imbuto as
  with aperture as (
    select sid, min(created_at) as aperta_il, count(*) as aperture,
           (array_remove(array_agg(origine order by created_at), null))[1] as prima_origine,
           (array_agg(percorso order by created_at))[1] as pagina_di_apertura
    from public.eventi_interazione
    where tipo = 'chat_open' and sid is not null
    group by sid
  )
  select a.sid, a.aperta_il, a.aperture, a.prima_origine, a.pagina_di_apertura,
         exists (select 1 from public.chat_conversazioni c where c.sid = a.sid) as ha_scritto,
         exists (select 1 from public.chat_lead      l where l.sid = a.sid)     as ha_lasciato_dati,
         exists (select 1 from public.chat_ticket    t where t.sid = a.sid)     as ha_aperto_ticket,
         -- In coda e non subito dopo pagina_di_apertura: CREATE OR REPLACE VIEW
         -- rifiuta di rinominare/spostare una colonna esistente (ha_scritto era
         -- gia' in quella posizione), quindi la colonna nuova si accoda.
         exists (select 1 from public.eventi_email   e where e.sid = a.sid and e.tipo = 'verifica-iscritto') as ha_digitato_email
  from aperture a
  order by a.aperta_il desc;

comment on view public.chat_imbuto is
  'Quante volte l''assistente viene aperto e quanto lontano arriva chi lo apre: ha digitato l''email, ha scritto, ha lasciato i dati, ha aperto un ticket. Senza l''evento di apertura questa domanda non aveva risposta - chi apriva e chiudeva senza scrivere non esisteva da nessuna parte.';

alter view public.chat_imbuto set (security_invoker = true);
