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
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, stat, readFile } from 'node:fs/promises';
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

const CLIP = [
  'wp-content/uploads/2025/06/Baby-Nuoto-60.mp4',
  'wp-content/uploads/2025/03/Video-Reformer-Compresso-per-Sito.mp4',
  'wp-content/uploads/2025/12/Athlon-Tour-2025-COMPRESSED.mp4',
  'wp-content/uploads/2025/12/solo-sala-pesi_H3BXNqoj.mp4',
];

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
