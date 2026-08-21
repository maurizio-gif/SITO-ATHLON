/**
 * La verifica della ricodifica: metadati e fotogrammi, non fede.
 *
 * Chromium headless in questo ambiente non ha il decoder H.264, quindi non si
 * può guardare una clip in pagina per sapere se è venuta bene. Si può però fare
 * di meglio che fidarsi: si estrae lo stesso istante dall'originale e dalla
 * versione nuova e si guardano affiancati. Se il fotogramma si estrae, il file
 * decodifica; se i due si somigliano, la qualità tiene.
 *
 * Richiede `ffmpeg-static` e `ffprobe-static`, installabili con `--no-save`:
 * non servono al sito, solo a chi ricodifica.
 *
 * Controlla anche le tre cose che un video di sfondo deve avere:
 * codec H.264, pixel format yuv420p, e l'indice all'inizio del file
 * (`faststart`), senza cui il browser scarica tutto prima del primo fotogramma.
 *
 * E misura il **VMAF** fra sorgente e ricodifica, che è la differenza fra «a me
 * sembra uguale» e un numero: sotto 95 su una sorgente H.264 la ricodifica non
 * si scambia. La misura ha una trappola sola e morde in silenzio — i due file
 * vanno confrontati **selezionando per numero di fotogramma**, non per secondo:
 * su una clip di acqua che schizza un fotogramma di scarto vale cinquanta punti
 * (41 invece di 91), e sembra un disastro di qualità invece che un errore di
 * allineamento.
 *
 * Il modello di VMAF non è nel pacchetto di ffmpeg-static: si prende da
 * `Netflix/vmaf` (`model/vmaf_v0.6.1.pkl` e `.pkl.model`, ramo `v1.5.3`) e si
 * passa il percorso in `VMAF_MODEL`. Senza, lo script fa tutto il resto e scrive
 * «modello assente» invece del punteggio.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, stat, readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const run = promisify(execFile);
const OUT = '.video-out/confronto';
await mkdir(OUT, { recursive: true });

/** L'atomo `moov` sta prima di `mdat`? È quello che fa partire la riproduzione. */
async function faststart(file) {
  const buf = await readFile(file, { encoding: null });
  const head = buf.subarray(0, Math.min(buf.length, 4 << 20));
  const moov = head.indexOf(Buffer.from('moov'));
  const mdat = head.indexOf(Buffer.from('mdat'));
  if (moov === -1) return 'moov non trovato nei primi 4 MB';
  if (mdat === -1) return 'sì (moov nei primi 4 MB, mdat più avanti)';
  return moov < mdat ? 'sì' : 'NO ⚠';
}

/**
 * Il VMAF fra sorgente e ricodifica, su tre finestre da 90 fotogrammi prese al
 * 20, 50 e 80% della clip. Le finestre si scelgono per **numero di fotogramma**
 * su entrambi i file, così sono lo stesso istante per costruzione.
 */
async function vmaf(sorgente, nuovo, info) {
  const modello = process.env.VMAF_MODEL;
  if (!modello) return 'modello assente (VMAF_MODEL non impostata)';
  const nf = Math.floor(info.dur * info.fps);
  const sel = [0.2, 0.5, 0.8]
    .map((q) => {
      const a = Math.max(0, Math.min(Math.floor(nf * q), nf - 91));
      return `between(n\\,${a}\\,${a + 89})`;
    })
    .join('+');
  const { stdout, stderr } = await run(ffmpeg, [
    '-hide_banner', '-nostats', '-i', nuovo, '-i', sorgente,
    '-lavfi',
    `[0:v]select='${sel}',setpts=N/TB[d];[1:v]select='${sel}',setpts=N/TB[r];` +
      `[d][r]libvmaf=model_path=${modello}:n_threads=4`,
    '-f', 'null', '-',
  ], { maxBuffer: 1 << 28 });
  const m = [...(stdout + stderr).matchAll(/VMAF score[ =:]+([\d.]+)/g)];
  return m.length ? Number(m[m.length - 1][1]).toFixed(2) : 'non misurato';
}

async function info(file) {
  const { stdout } = await run(ffprobe.path, [
    '-v', 'error',
    '-show_entries', 'stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt:format=duration,bit_rate',
    '-of', 'json',
    file,
  ]);
  const d = JSON.parse(stdout);
  const v = d.streams.find((s) => s.codec_type === 'video');
  const a = d.streams.find((s) => s.codec_type === 'audio');
  return {
    codec: v.codec_name,
    size: `${v.width}×${v.height}`,
    fps: eval(v.r_frame_rate),
    pix: v.pix_fmt,
    audio: a ? a.codec_name : 'nessuno',
    dur: Number(d.format.duration),
    mbit: (Number(d.format.bit_rate) / 1e6).toFixed(2),
    bytes: (await stat(file)).size,
  };
}

/**
 * Le clip da confrontare: quelle che `comprimi-video.mjs` ha scritto in
 * `.video-out/`. L'elenco si legge da lì invece di tenerne una copia a mano, che
 * era la ragione per cui questo script ne controllava quattro su ventidue.
 */
async function clipDaConfrontare(dir = '.video-out/wp-content/uploads', base = 'wp-content/uploads') {
  const out = [];
  for (const voce of await readdir(dir, { withFileTypes: true })) {
    if (voce.isDirectory()) out.push(...(await clipDaConfrontare(join(dir, voce.name), join(base, voce.name))));
    else if (voce.name.endsWith('.mp4')) out.push(join(base, voce.name));
  }
  return out.sort();
}

const CLIP = await clipDaConfrontare();

let prima = 0, dopo = 0;
for (const rel of CLIP) {
  const a = join('public', rel);
  const b = join('.video-out', rel);
  const ia = await info(a);
  const ib = await info(b);
  prima += ia.bytes;
  dopo += ib.bytes;

  const nome = basename(rel, '.mp4');
  console.log(`\n── ${nome}`);
  console.log(`   prima  ${ia.codec.padEnd(5)} ${ia.size.padEnd(11)} ${String(ia.fps).padEnd(3)}fps ${ia.pix} audio:${ia.audio.padEnd(8)} ${ia.mbit} Mbps  ${(ia.bytes/1048576).toFixed(1)} MB`);
  console.log(`   dopo   ${ib.codec.padEnd(5)} ${ib.size.padEnd(11)} ${String(ib.fps).padEnd(3)}fps ${ib.pix} audio:${ib.audio.padEnd(8)} ${ib.mbit} Mbps  ${(ib.bytes/1048576).toFixed(1)} MB  −${Math.round((1 - ib.bytes/ia.bytes)*100)}%`);
  console.log(`   durata ${ia.dur.toFixed(2)}s → ${ib.dur.toFixed(2)}s ${Math.abs(ia.dur - ib.dur) < 0.2 ? '✓' : '⚠ diversa'}`);
  console.log(`   faststart: ${await faststart(b)}`);
  console.log(`   VMAF: ${await vmaf(a, b, ia)}`);

  // lo stesso istante, dai due file, affiancati
  const t = (ia.dur / 2).toFixed(2);
  await run(ffmpeg, ['-y', '-ss', t, '-i', a, '-frames:v', '1', '-q:v', '3', join(OUT, `${nome}-prima.jpg`)]);
  await run(ffmpeg, ['-y', '-ss', t, '-i', b, '-frames:v', '1', '-q:v', '3', join(OUT, `${nome}-dopo.jpg`)]);
  await run(ffmpeg, [
    '-y',
    '-i', join(OUT, `${nome}-prima.jpg`),
    '-i', join(OUT, `${nome}-dopo.jpg`),
    '-filter_complex', '[0:v]scale=640:-1[a];[1:v]scale=640:-1[b];[a][b]hstack',
    join(OUT, `${nome}-confronto.jpg`),
  ]);
}

console.log(
  `\n   TOTALE  ${(prima / 1048576).toFixed(1)} MB → ${(dopo / 1048576).toFixed(1)} MB ` +
    `(−${Math.round((1 - dopo / prima) * 100)}%, ${((prima - dopo) / 1048576).toFixed(1)} MB risparmiati)`
);
