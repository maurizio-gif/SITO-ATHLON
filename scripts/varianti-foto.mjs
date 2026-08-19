/**
 * Genera le versioni piccole delle foto che il sito mostra in caselle piccole.
 *
 * Il problema, misurato: la home scaricava 8,4 MB di immagini perché le foto
 * delle strisce sono file da 2560px mostrati in riquadri da 331px. Otto volte i
 * pixel per lato, sessanta volte i byte, per una foto che poi viene comunque
 * scalata dal browser.
 *
 * Le foto stanno in `public/`, referenziate come stringhe dai file di dati,
 * quindi non passano dall'ottimizzatore di Astro — che lavora su import statici.
 * La strada praticabile è questa: un `-640.jpg` accanto all'originale, e uno
 * `srcset` che lo offre a chi ha una casella piccola. L'originale resta e resta
 * il `src`, così la lightbox continua ad aprire la foto grande.
 *
 * Si lancia a mano quando si aggiungono foto:
 *
 *     node scripts/varianti-foto.mjs
 *
 * È idempotente: salta le varianti già presenti e più recenti dell'originale.
 * Non è nella pipeline di build di proposito — su Vercel farebbe scaricare sharp
 * a ogni deploy per rigenerare file che non cambiano.
 */
import { readdir, stat } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import sharp from 'sharp';

/** La larghezza che serve alle caselle: 340px di CSS a schermi 2×. */
const LARGHEZZA = 640;
const SUFFISSO = `-${LARGHEZZA}`;
const RADICE = 'public/wp-content/uploads';

/** Le foto usate nelle strisce e nelle card: quelle che valgono la variante. */
async function fotoDaiDati() {
  const fonti = [
    'src/components/home/SpacesGallery.astro',
    'src/pages/gym-floor.astro',
    'src/data/junior.ts',
    'src/data/corsi.ts',
    'src/pages/corsi-fitness.astro',
    'src/pages/index.astro',
    'src/components/home/InfoCards.astro',
    'src/components/home/ActivityGrid.astro',
  ];
  const { readFile } = await import('node:fs/promises');
  const trovate = new Set();
  for (const f of fonti) {
    const s = await readFile(f, 'utf8');
    // sia i percorsi interi sia quelli scritti con ${U}
    for (const m of s.matchAll(/\/wp-content\/uploads\/[\w./-]+\.(?:jpe?g|png|webp)/gi)) trovate.add(m[0]);
    for (const m of s.matchAll(/\$\{U\}(\/[\w./-]+\.(?:jpe?g|png|webp))/gi))
      trovate.add('/wp-content/uploads' + m[1]);
  }
  return [...trovate].filter((p) => !p.includes(SUFFISSO));
}

const foto = await fotoDaiDati();
let fatte = 0,
  saltate = 0,
  assenti = 0,
  piccole = 0;
let risparmio = 0;

for (const rel of foto) {
  const src = 'public' + rel;
  let info;
  try {
    info = await stat(src);
  } catch {
    assenti++;
    continue;
  }
  const ext = extname(src);
  const out = join(dirname(src), basename(src, ext) + SUFFISSO + '.jpg');

  try {
    const o = await stat(out);
    if (o.mtimeMs >= info.mtimeMs) {
      saltate++;
      continue;
    }
  } catch {
    /* non esiste: si genera */
  }

  const img = sharp(src);
  const meta = await img.metadata();
  if ((meta.width ?? 0) <= LARGHEZZA) {
    // Già piccola: una variante non servirebbe a niente.
    piccole++;
    continue;
  }

  await img.resize({ width: LARGHEZZA, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(out);
  const dopo = await stat(out);
  risparmio += info.size - dopo.size;
  fatte++;
}

console.log(
  `varianti ${SUFFISSO}: ${fatte} generate, ${saltate} già presenti, ${piccole} già piccole, ${assenti} non trovate`
);
console.log(`peso risparmiato per foto servita: ${Math.round(risparmio / 1024 / Math.max(fatte, 1))} kB in media`);
