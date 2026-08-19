/**
 * Ricodifica le clip di sfondo del sito.
 *
 * Sono tutte video di sfondo: partono da sole, in loop, mute, dietro un testo o
 * dentro una scheda. Erano esportate con impostazioni da montaggio, non da web —
 * e si vedeva nel peso: 28 MB per una clip da 57 secondi che nessuno guarda a
 * schermo pieno, 6,2 Mbps a 60 fps per una che sta in un quadrato da 662 px.
 *
 * ## Due misure prima di scegliere
 *
 * **Quanto è grande in pagina.** Misurato in browser a 390, 1280 e 2560 px:
 *
 * | clip | resa massima | sorgente |
 * | --- | --- | --- |
 * | hero della home | 2560×900, a tutta pagina | 1920×1080 |
 * | Baby Nuoto | **563×563**, in una scheda | 1920×1080 |
 * | Reformer | **662×662**, in una scheda | 1080×1920 |
 * | Gym Floor | 2560×750, a tutta pagina | 1920×1080 |
 *
 * Le due dentro una scheda scendono a 720p: coprono il doppio della densità su
 * un telefono e restano nitide su desktop. Le due a tutta pagina restano a
 * 1080p, che è già la risoluzione del sorgente.
 *
 * **Quanto è difficile da codificare.** Il primo tentativo usava solo il CRF, e
 * sul Baby Nuoto — acqua che schizza, dettaglio alto su tutto il fotogramma —
 * ha prodotto un file **più grande dell'originale**. Il CRF inseguiva una
 * qualità, e quella qualità su quel contenuto costa più di 4 Mbps. Per un video
 * di sfondo la scelta giusta è l'opposto: un tetto al bitrate, e la qualità che
 * scende dove il contenuto è difficile. `-maxrate` con `-bufsize` fa questo.
 *
 * ## Il resto
 *
 *  - **H.264 per tutte.** La clip della home era in **HEVC**: efficiente, ma
 *    Firefox non lo decodifica affatto e Chrome solo con supporto hardware. Su
 *    quei browser lo sfondo della home era un rettangolo nero.
 *  - **30 fps al massimo.** Il Reformer era a 60: per uno sfondo sono il doppio
 *    dei fotogrammi da codificare e da decodificare sul telefono di chi guarda.
 *  - **`-movflags +faststart`**: sposta l'indice all'inizio del file. Senza, il
 *    browser scarica fino in fondo prima del primo fotogramma.
 *  - **`yuv420p`**: l'unico formato che tutti i decoder accettano.
 *  - **Nessuna traccia audio, su nessuna clip.** Non c'è più un video con i
 *    controlli — sono tutte scenografia, mute, e il puntatore non le raggiunge
 *    nemmeno — quindi non esiste il gesto con cui alzare il volume: una traccia
 *    che nessuno può sentire è solo peso. Sul Reformer erano 362 kB su 4,2 MB.
 *    L'unica clip che il visitatore può portare a schermo intero, la hero della
 *    home, non ha audio nel sorgente.
 *
 * Le clip in `public/` sono già il risultato di questo script: rilanciarlo così
 * com'è ricomprime del già compresso. Per rifare il lavoro servono i sorgenti
 * originali, che stanno nel montaggio, non nel repository.
 *
 * Si lancia a mano, con i binari presi al volo — non sono dipendenze del sito:
 *
 *     npm i --no-save ffmpeg-static ffprobe-static && node scripts/comprimi-video.mjs
 * Scrive in `.video-out/` e non tocca gli originali: lo scambio si fa dopo aver
 * guardato i fotogrammi di confronto con `scripts/confronta-video.mjs`.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const run = promisify(execFile);
const OUT = '.video-out';

const CLIP = [
  {
    src: 'public/wp-content/uploads/2025/06/Baby-Nuoto-60.mp4',
    /* In una scheda da 563 px: 720p copre il doppio della densità. Acqua che
       schizza, quindi il tetto conta più del CRF. */
    scala: '1280:-2',
    crf: 30,
    maxrate: '1400k',
    audio: false,
  },
  {
    src: 'public/wp-content/uploads/2025/03/Video-Reformer-Compresso-per-Sito.mp4',
    /* Verticale, in una scheda da 662 px, e con il movimento più lento e
       leggibile delle quattro: un po' più di bitrate e un CRF più severo. */
    scala: '-2:1280',
    crf: 28,
    maxrate: '1800k',
    fps: 30,
    audio: false,
  },
  {
    src: 'public/wp-content/uploads/2025/12/Athlon-Tour-2025-COMPRESSED.mp4',
    /* A tutta pagina, ma sotto uno scrim che va dal 50 al 92% di nero: il
       dettaglio fine non si vede, e il bitrate può stare basso. */
    crf: 30,
    maxrate: '1300k',
    audio: false,
  },
  {
    src: 'public/wp-content/uploads/2025/12/solo-sala-pesi_H3BXNqoj.mp4',
    crf: 30,
    maxrate: '1500k',
    audio: false,
  },
];

await mkdir(OUT, { recursive: true });

for (const c of CLIP) {
  const out = join(OUT, c.src.replace('public/', ''));
  await mkdir(dirname(out), { recursive: true });

  const bufsize = `${parseInt(c.maxrate) * 2}k`;
  const args = [
    '-y',
    '-i',
    c.src,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-preset',
    'slow',
    '-crf',
    String(c.crf),
    '-maxrate',
    c.maxrate,
    '-bufsize',
    bufsize,
    '-pix_fmt',
    'yuv420p',
    ...(c.scala ? ['-vf', `scale=${c.scala}`] : []),
    ...(c.fps ? ['-r', String(c.fps)] : []),
    ...(c.audio ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']),
    '-movflags',
    '+faststart',
    out,
  ];

  const t0 = Date.now();
  await run(ffmpeg, args, { maxBuffer: 1 << 26 });
  const prima = (await stat(c.src)).size;
  const dopo = (await stat(out)).size;
  console.log(
    `${c.src.split('/').pop()}: ${(prima / 1048576).toFixed(1)} → ${(dopo / 1048576).toFixed(1)} MB ` +
      `(−${Math.round((1 - dopo / prima) * 100)}%) · crf ${c.crf} tetto ${c.maxrate} · ${Math.round((Date.now() - t0) / 1000)}s`
  );
}
