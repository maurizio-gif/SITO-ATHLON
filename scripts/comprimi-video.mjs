/**
 * Ricodifica le clip di sfondo del sito.
 *
 * Sono tutte video di sfondo: partono da sole, in loop, mute, dietro un testo o
 * dentro una scheda. Alcune erano esportate con impostazioni da montaggio, non
 * da web — e si vedeva nel peso: 47,8 MB per la clip del Calisthenics, 9,6 Mbps
 * per una che sta in un riquadro da 1228 px.
 *
 * ## Tre misure prima di scegliere
 *
 * **Quanto è grande in pagina.** Misurato in browser a 390, 1280 e 2560 px, e
 * poi anche a 1080×1920 (il totem) e 1920×1080 (la televisione), che la prima
 * versione di questo elenco non aveva guardato:
 *
 * | clip | telefono | desktop | totem | tv |
 * | --- | --- | --- | --- | --- |
 * | riquadro di una scheda corso | 362 | 641 | 1026 | 917 |
 * | pannello del planning | 390 | 736 | 1032 | 1448 |
 * | hero a tutta pagina | 390 | 1280 | 1080 | 1920 |
 *
 * Da qui una conclusione che vale più di tutte: **la risoluzione non si tocca.**
 * 362 px CSS su un telefono a densità 3× sono 1086 pixel fisici, quindi un
 * sorgente da 1080 di larghezza è esattamente la misura giusta; sul totem e
 * sulla televisione il riquadro arriva a 1026 e 1448 px, dove 1080 è già un
 * ingrandimento. Le due clip scese a 720p prima che queste misure esistessero —
 * Baby Nuoto e Reformer — sono ingrandite su quei due schermi.
 *
 * **Quanto è difficile da codificare, misurato in VMAF.** Il CRF si scegle su
 * una finestra di quattro secondi al 40% della clip: si prova dal gradino più
 * aggressivo verso il basso e si tiene il primo che resta sopra la soglia di
 * trasparenza — **95** per una sorgente H.264, **92** dove la sorgente è già un
 * HEVC compresso, perché lì il riferimento porta i suoi artefatti e chiedere di
 * riprodurli anche quelli costa quanto il contenuto.
 *
 * Due trappole nella misura, entrambe costate:
 *
 *  - **la finestra di riferimento va estratta senza perdita, e le prove devono
 *    partire da lei.** Confrontare una finestra ricodificata con la stessa
 *    finestra *copiata* dal sorgente sembra ovvio e non lo è: su AQUA-SOFT il
 *    taglio cadeva un fotogramma più avanti, e su acqua che schizza un
 *    fotogramma di scarto vale cinquanta punti di VMAF (41 invece di 91);
 *  - **la verifica finale seleziona per numero di fotogramma** (`select` +
 *    `between(n,…)`), non per secondo, che è l'unico modo di essere sicuri di
 *    confrontare lo stesso istante su due file diversi.
 *
 * **Quanto si guadagna davvero, pesando il file.** La prima versione stimava il
 * guadagno confrontando il bitrate della finestra col bitrate *medio* del file:
 * due misure diverse. Se la finestra cade in un punto difficile — al 40% di una
 * clip di allenamento capita spesso — la stima dice «non conviene» dove
 * converrebbe, e viceversa: sulla hero prometteva −17% e la ricodifica vera ha
 * dato **+5%**. Quindi si codifica e si pesa, e la ricodifica si tiene solo se
 * pesa almeno il 10% in meno.
 *
 * ## E dove non conviene, si rimuxa
 *
 * Il risultato di quelle misure è stato una sorpresa: **quasi nessuna di queste
 * clip era gonfia.** Ricodificate a qualità indistinguibile, quindici su venti
 * *crescono* — Body Pump +60%, Hydrobike +50%, Motr +28%, Aqua Soft +24%. I loro
 * 2,5–3,5 Mbps a 1080×1920 sono contenuto, non spreco, e l'acqua è il contenuto
 * peggiore che esista per H.264.
 *
 * Per quelle si rimuxa: `-c copy`, che è lo stesso flusso video bit per bit, più
 * le due cose che mancavano e non costano un pixel — **niente traccia audio** e
 * **`+faststart`**.
 *
 * ## Il resto delle regole, che non cambiano
 *
 *  - **H.264 per tutte, anche quando costa.** Sei clip erano in HEVC: efficiente,
 *    ma Firefox non lo decodifica affatto e Chrome solo con supporto hardware —
 *    lì erano un rettangolo nero. Convertite pesano il doppio o il triplo
 *    (Body Sculpt 3,7 → 9,1 MB), e si fa comunque: lì il criterio non è il peso,
 *    è che il video si veda.
 *  - **30 fps al massimo.**
 *  - **`-movflags +faststart`**: sposta l'indice all'inizio del file. Senza, il
 *    browser scarica fino in fondo prima del primo fotogramma — ed era così su
 *    quindici file su ventisei, 175 MB di clip che partivano solo a scaricamento
 *    finito.
 *  - **`yuv420p`**: l'unico formato che tutti i decoder accettano.
 *  - **Nessuna traccia audio.** Sono scenografia, mute, e il puntatore non le
 *    raggiunge nemmeno: una traccia che nessuno può sentire è solo peso. Erano
 *    7,2 MB in sedici file, e su Booty Workout un quinto dell'intero file.
 *    L'unica eccezione possibile è la hero della home — la sola clip che il
 *    visitatore porta a schermo intero, dove `Hero.astro` toglie il muto di
 *    proposito.
 *  - **La hero della home non si tocca**, per decisione del club. Per il verbale:
 *    misurata, a qualità trasparente scenderebbe da 20,1 a 16,5 MB (−18%), non
 *    agli 8 MB che il tetto di 1300k prometteva — quelli sono a qualità più
 *    bassa, accettata perché la clip sta sotto uno scrim dal 50 al 92% di nero.
 *
 * Le clip in `public/` sono già il risultato di questo script: rilanciarlo così
 * com'è ricomprime del già compresso. Si lancia a mano, coi binari presi al
 * volo — non sono dipendenze del sito:
 *
 *     npm i --no-save ffmpeg-static ffprobe-static && node scripts/comprimi-video.mjs
 *
 * Scrive in `.video-out/` e non tocca gli originali: lo scambio si fa dopo aver
 * letto i numeri e guardato i fotogrammi con `scripts/confronta-video.mjs`.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const run = promisify(execFile);
const OUT = '.video-out';

/**
 * Cosa si è fatto a ogni clip, e con che numeri.
 *
 * `crf` è il gradino scelto dalla scala VMAF e `vmaf` il punteggio verificato su
 * tre finestre del file intero, non su quella su cui si è scelto. `rimux: true`
 * vuol dire che la ricodifica a qualità trasparente pesava più del sorgente:
 * restano gli stessi pixel, senza audio e con l'indice davanti.
 */
const CLIP = [
  /* --- ricodificate: qui c'era spreco vero ------------------------------- */
  { src: 'public/wp-content/uploads/2024/08/CALISTHENICS-.mp4', crf: 24, maxrate: '11212k', vmaf: 95.19 },
  { src: 'public/wp-content/uploads/2024/08/Gpasse.mp4', crf: 27, maxrate: '7582k', vmaf: 96.63 },

  /* --- da HEVC a H.264: si fa per la compatibilità, e costa -------------- */
  { src: 'public/wp-content/uploads/2026/05/Body-Sculpt-New.mp4', crf: 25, maxrate: '6166k', vmaf: 95.46 },
  { src: 'public/wp-content/uploads/2026/08/Gym-Floor-Piani-di-Allenamento.mp4', crf: 27, maxrate: '4112k', vmaf: 94.29 },
  { src: 'public/wp-content/uploads/2026/05/HBX-FUSION-SCRITTE-NEW.mp4', crf: 27, maxrate: '5046k', vmaf: 91.46 },
  { src: 'public/wp-content/uploads/2026/05/POWER-YOGA-NEW.mp4', crf: 24, maxrate: '5980k', vmaf: 93.53 },
  { src: 'public/wp-content/uploads/2026/05/STRENGTH-DEVELOPMENT-NEW.mp4', crf: 25, maxrate: '8004k', vmaf: 93.69 },
  { src: 'public/wp-content/uploads/2026/05/booty-workout_JGhsobrd.mp4', crf: 24, maxrate: '2352k', vmaf: 94.65 },

  /* --- rimux: la ricodifica trasparente pesava più del sorgente ---------- */
  { src: 'public/wp-content/uploads/2025/03/AQUA-TONIC.mp4', rimux: true, ricodifica: '+14%' },
  { src: 'public/wp-content/uploads/2026/05/AQUA-SOFT-NEW.mp4', rimux: true, ricodifica: '+24%' },
  { src: 'public/wp-content/uploads/2026/05/body-pump_HVfMP7Ky.mp4', rimux: true, ricodifica: '+60%' },
  { src: 'public/wp-content/uploads/2025/03/Yogasse.mp4', rimux: true, ricodifica: '+14%' },
  { src: 'public/wp-content/uploads/2026/05/aqua-gym_M6QBdqYk.mp4', rimux: true, ricodifica: '+21%' },
  { src: 'public/wp-content/uploads/2024/08/Nuoto.mp4', rimux: true, ricodifica: '+23%' },
  { src: 'public/wp-content/uploads/2024/11/Motr-1.mp4', rimux: true, ricodifica: '+28%' },
  { src: 'public/wp-content/uploads/2026/05/difesa-personale-ultimo_wJT8l40H-1.mp4', rimux: true, ricodifica: '−6%' },
  { src: 'public/wp-content/uploads/2025/12/Athlon-Tour-2025-COMPRESSED.mp4', rimux: true, ricodifica: '+85%' },
  { src: 'public/wp-content/uploads/2024/08/BOXING-2.mp4', rimux: true, ricodifica: '+7%' },
  { src: 'public/wp-content/uploads/2024/11/Antigravity-2.mp4', rimux: true, ricodifica: '+13%' },
  { src: 'public/wp-content/uploads/2024/11/HYDROBIKE-3-1.mp4', rimux: true, ricodifica: '+50%' },
  { src: 'public/wp-content/uploads/2024/08/PILATES.mp4', rimux: true, ricodifica: '−9%' },

  /* --- già passate da qui prima di queste misure ------------------------- */
  /* Baby Nuoto (720p, tetto 1400k) e Reformer (720p, tetto 1800k) sono scese di
     risoluzione quando le misure erano solo a densità 1×: sul totem e sulla
     televisione sono ingrandite. Da rifare col sorgente, che sta nel montaggio.
     solo-sala-pesi è a posto. */

  /* --- intoccabile ------------------------------------------------------- */
  /* 2026/08/Athlon-Hero-2026.mp4: la hero della home, per decisione del club. */
];

await mkdir(OUT, { recursive: true });

for (const c of CLIP) {
  const out = join(OUT, c.src.replace('public/', ''));
  await mkdir(dirname(out), { recursive: true });

  const args = c.rimux
    ? ['-y', '-i', c.src, '-c', 'copy', '-an', '-movflags', '+faststart', out]
    : [
        '-y',
        '-i', c.src,
        '-c:v', 'libx264',
        '-profile:v', 'high',
        '-preset', 'slow',
        '-crf', String(c.crf),
        '-maxrate', c.maxrate,
        '-bufsize', `${parseInt(c.maxrate) * 2}k`,
        '-pix_fmt', 'yuv420p',
        ...(c.audio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
        '-movflags', '+faststart',
        out,
      ];

  const t0 = Date.now();
  await run(ffmpeg, args, { maxBuffer: 1 << 26 });
  const prima = (await stat(c.src)).size;
  const dopo = (await stat(out)).size;
  console.log(
    `${c.src.split('/').pop()}: ${(prima / 1048576).toFixed(1)} → ${(dopo / 1048576).toFixed(1)} MB ` +
      `(${dopo <= prima ? '−' : '+'}${Math.abs(Math.round((1 - dopo / prima) * 100))}%) · ` +
      (c.rimux
        ? `rimux, stessi pixel (la ricodifica dava ${c.ricodifica})`
        : `crf ${c.crf} tetto ${c.maxrate} · VMAF ${c.vmaf}`) +
      ` · ${Math.round((Date.now() - t0) / 1000)}s`
  );
}
