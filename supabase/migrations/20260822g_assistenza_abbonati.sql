-- Chi ha un abbonamento attivo non chiede informazioni: chiede assistenza.
--
-- `richieste_contatto` sapeva se il nucleo e' iscritto (`stato_nucleo`) ma non
-- come la richiesta era stata trattata, e sono due cose diverse: la prima e' un
-- fatto su PerfectGym al momento della verifica, la seconda e' il percorso che
-- il form ha fatto fare alla persona. Tenerle separate serve il giorno che la
-- regola cambia — allora le righe vecchie restano leggibili per come sono
-- andate, invece di essere reinterpretate da una condizione nuova.
--
-- **`tipo_richiesta` e' la classificazione, non lo stato.** Due valori:
--   - `assistenza`   il nucleo ha un abbonamento vivo. Niente raccolta dati,
--                    niente appuntamento telefonico, e al desk arriva come
--                    richiesta di assistenza.
--   - `informazioni` tutti gli altri: e' il percorso commerciale, con i dati,
--                    l'anagrafica su PerfectGym e il calendario del richiamo.
--
-- `contratti_vivi` e' il conteggio da cui quella scelta e' nata — titolare piu'
-- i primi tre figli, contratti `Current`, `NotStarted` o `Freezed` con quota
-- diversa da zero. Lo calcola gia' `athlon-verifica-iscritto` e lo scrive gia'
-- in `eventi_email`: qui serve perche' senza di lui una riga `assistenza` non
-- si puo' piu' spiegare a distanza di mesi, quando l'abbonamento e' scaduto e
-- `stato_nucleo` da solo non dice quanti erano.
--
-- Nessun default sulle righe vecchie: sono tutte anteriori alla regola, e
-- scriverci `informazioni` sarebbe dichiarare una classificazione che nessuno
-- ha fatto. `null` vuol dire «prima che questa distinzione esistesse», che e'
-- il dato vero.

alter table public.richieste_contatto
  add column if not exists tipo_richiesta text,
  add column if not exists contratti_vivi integer;

comment on column public.richieste_contatto.tipo_richiesta is
  'assistenza (nucleo con abbonamento vivo: nessun dato raccolto, nessun richiamo) oppure informazioni. Null sulle righe anteriori alla distinzione.';

comment on column public.richieste_contatto.contratti_vivi is
  'Contratti vivi trovati su PerfectGym per il nucleo (titolare + primi tre figli) al momento della verifica email. E'' il numero da cui nasce tipo_richiesta.';

-- Le richieste di assistenza sono la coda che il desk lavora per prima: senza
-- indice, filtrarle vuol dire leggere tutta la tabella.
create index if not exists richieste_contatto_tipo_richiesta_idx
  on public.richieste_contatto (tipo_richiesta, created_at desc);
