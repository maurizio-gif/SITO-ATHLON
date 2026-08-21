/**
 * Genera le immagini d'anteprima dei link condivisi — 1200×630, sotto i 300 kB.
 *
 * Il problema, misurato: il sito passava al `<meta og:image>` la foto originale
 * della pagina, cioè un file da 2560×1707 e fino a 864 kB, mentre
 * `Layout.astro` dichiara per **tutti** `og:image:width=1200` e
 * `og:image:height=630`. Due guai in uno:
 *
 *  - le dimensioni dichiarate erano false, e un crawler che si fida di quelle
 *    e poi riceve un'altra proporzione non disegna la card;
 *  - WhatsApp scarica l'immagine dentro un tempo breve e la scarta se è troppo
 *    grossa: 864 kB sono oltre il limite pratico, che sta attorno ai 300 kB.
 *
 * Il risultato era l'anteprima che parte, mostra titolo e descrizione e poi
 * resta vuota — che è esattamente il sintomo segnalato.
 *
 * Qui ogni foto usata come anteprima diventa un `1200×630` in `public/og/`, e
 * il ritaglio è `attention` (sharp sceglie la regione con più dettaglio) perché
 * un ritaglio centrato su una foto verticale taglia via le teste.
 *
 * Le sorgenti non si elencano a mano: si leggono dagli stessi posti da cui le
 * legge il sito — `corsi.ts` per le hero dei corsi, il frontmatter di news ed
 * eventi, più l'elenco `PAGINE` qui sotto per le pagine che passano una foto
 * letterale. Una foto aggiunta in uno di quei posti entra da sola al prossimo
 * lancio.
 *
 * Si lancia a mano quando si aggiungono foto:
 *
 *     node scripts/og-immagini.mjs
 *
 * Scrive anche `src/data/og-immagini.json`, la mappa sorgente → variante che
 * `data/foto.ts` legge al build: serve perché Astro non può interrogare il
 * filesystem per sapere se la variante esiste.
 *
 * Non è nella pipeline di build, per la stessa ragione di `varianti-foto.mjs`:
 * su Vercel farebbe scaricare sharp a ogni deploy per rigenerare file identici.
 */
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import sharp from 'sharp';

const LARGHEZZA = 1200;
const ALTEZZA = 630;
/** 82 sta sotto i 300 kB su tutte le foto del sito — verificato al lancio. */
const QUALITA = 82;

const PUBLIC = 'public';
const USCITA = 'public/og';
const MAPPA = 'src/data/og-immagini.json';

/**
 * Le foto passate come `image=` da una pagina, e non lette da un file di dati.
 * L'anteprima della home è la prima: non è la hero (che è un video) ma la sala,
 * che è la fotografia che racconta il club in un colpo d'occhio.
 */
const PAGINE = [
  '/wp-content/uploads/2025/11/ATHLON85-scaled.jpg', // default del sito
  '/wp-content/uploads/2025/11/ATHLON79-scaled.jpg', // /lavora
  '/wp-content/uploads/2025/11/ATHLON88-scaled.jpg', // /club-life
  '/wp-content/uploads/2025/11/ATHLON81-scaled.jpg', // /gym-floor
  '/wp-content/uploads/2024/01/IMG_0351-1-1024x683.jpg', // /corsi-fitness
  '/wp-content/uploads/2025/03/Athlon130-scaled.jpg', // /reformer
];

/**
 * Il nome della variante porta dentro la cartella dell'originale.
 *
 * Senza, `2025/03/Athlon88-scaled.jpg` e `2025/11/ATHLON88-scaled.jpg` — due
 * foto diverse — finirebbero sullo stesso file: sono lo stesso nome a meno
 * delle maiuscole, e il filesystem di questo Mac non le distingue.
 */
function nomeVariante(src) {
  const parti = src.split('/').filter(Boolean);
  const file = basename(src, extname(src));
  const anno = parti.at(-3) ?? '';
  const mese = parti.at(-2) ?? '';
  return `${anno}-${mese}-${file}.jpg`;
}

/**
 * Le hero dei corsi, dagli stessi file da cui le legge il sito.
 *
 * Sono **due** file e non uno: `corsi.ts` ha i corsi fitness e le attività in
 * acqua per adulti, `junior.ts` i corsi dei bambini. Leggerne uno solo lasciava
 * fuori baby nuoto, scuola nuoto bambini, nuoto agonistico e pallanuoto —
 * quattro pagine che tornavano a servire l'originale, fino a 1,2 MB.
 */
async function daCorsi() {
  const fuori = [];
  for (const file of ['src/data/corsi.ts', 'src/data/junior.ts']) {
    const s = await readFile(file, 'utf8');
    for (const m of s.matchAll(/hero:\s*`\$\{U\}([^`]+)`/g)) {
      fuori.push('/wp-content/uploads' + m[1]);
    }
    for (const m of s.matchAll(/hero:\s*'([^']+)'/g)) fuori.push(m[1]);
  }
  return fuori;
}

/**
 * Le foto di news, eventi e della landing della promo, dal loro frontmatter.
 *
 * `promo` è una collezione da un documento solo, e la sua chiave è `foto` e non
 * `image`: senza il secondo nome la sua anteprima restava l'originale — non
 * enorme (175 kB), ma comunque 1024×683 sotto una dichiarazione di 1200×630.
 */
async function daContenuti() {
  const fuori = [];
  for (const cartella of ['src/content/news', 'src/content/eventi', 'src/content/promo']) {
    let voci = [];
    try {
      voci = await readdir(cartella);
    } catch {
      continue;
    }
    for (const v of voci) {
      // I sidecar `._*` di exFAT non sono markdown.
      if (!v.endsWith('.md') || v.startsWith('._')) continue;
      const t = await readFile(join(cartella, v), 'utf8');
      const m = t.match(/^(?:image|foto):\s*["']?([^"'\n]+)/m);
      if (m) fuori.push(m[1].trim());
    }
  }
  return fuori;
}

const sorgenti = [...new Set([...PAGINE, ...(await daCorsi()), ...(await daContenuti())])].sort();

await mkdir(USCITA, { recursive: true });

const mappa = {};
let fatte = 0;
let saltate = 0;
let assenti = 0;
let piuGrande = 0;

for (const src of sorgenti) {
  const originale = join(PUBLIC, src);
  let statOrig;
  try {
    statOrig = await stat(originale);
  } catch {
    console.warn(`  assente, salto: ${src}`);
    assenti++;
    continue;
  }

  const nome = nomeVariante(src);
  const uscita = join(USCITA, nome);
  mappa[src] = `/og/${nome}`;

  // Idempotente: rifà solo se la variante manca o è più vecchia dell'originale.
  try {
    const statVar = await stat(uscita);
    if (statVar.mtimeMs >= statOrig.mtimeMs) {
      saltate++;
      piuGrande = Math.max(piuGrande, statVar.size);
      continue;
    }
  } catch {
    /* non c'è: si genera */
  }

  const info = await sharp(originale)
    .resize(LARGHEZZA, ALTEZZA, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: QUALITA, mozjpeg: true })
    .toFile(uscita);

  piuGrande = Math.max(piuGrande, info.size);
  fatte++;
  console.log(`  ${(info.size / 1024).toFixed(0).padStart(4)} kB  ${nome}`);
}

await writeFile(MAPPA, JSON.stringify(mappa, null, 2) + '\n', 'utf8');

console.log(
  `\n${fatte} generate, ${saltate} già presenti, ${assenti} sorgenti assenti.` +
    `\nLa più grande: ${(piuGrande / 1024).toFixed(0)} kB (il limite pratico di WhatsApp è ~300 kB).` +
    `\nMappa scritta in ${MAPPA}.`
);
