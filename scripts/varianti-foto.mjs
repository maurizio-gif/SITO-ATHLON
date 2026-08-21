/**
 * Genera le versioni piccole delle foto che il sito mostra in caselle piccole,
 * e le versioni medie di quelle che riempiono una hero.
 *
 * Il problema, misurato: la home scaricava 8,4 MB di immagini perché le foto
 * delle strisce sono file da 2560px mostrati in riquadri da 331px. Otto volte i
 * pixel per lato, sessanta volte i byte, per una foto che poi viene comunque
 * scalata dal browser. Lo stesso valeva per le hero delle pagine interne: la
 * foto di sfondo del Reformer pesa 465 kB ed è l'elemento su cui si misura
 * l'LCP, quindi su 4G lenta valeva più di due secondi da sola.
 *
 * Le foto stanno in `public/`, referenziate come stringhe dai file di dati,
 * quindi non passano dall'ottimizzatore di Astro — che lavora su import statici.
 * La strada praticabile è questa: un `-640.jpg` (e per le hero un `-1280.jpg`)
 * accanto all'originale, e uno `srcset` che li offre a chi ha la casella
 * giusta. L'originale resta e resta il `src`, così la lightbox continua ad
 * aprire la foto grande e gli schermi larghi la ricevono comunque.
 *
 * Si lancia a mano quando si aggiungono foto:
 *
 *     node scripts/varianti-foto.mjs
 *
 * È idempotente: salta le varianti già presenti e più recenti dell'originale.
 * Non è nella pipeline di build di proposito — su Vercel farebbe scaricare sharp
 * a ogni deploy per rigenerare file che non cambiano.
 */
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import sharp from 'sharp';

/**
 * Due misure, due usi:
 *
 *  - **640** per le caselle: 340px di CSS a schermi 2×;
 *  - **1280** per le hero a tutta pagina, che coprono un telefono a doppia
 *    densità. Qualità più bassa perché stanno tutte sotto uno scrim scuro, dove
 *    il dettaglio fine non si vede.
 */
const MISURE = {
  casella: { larghezza: 640, qualita: 78 },
  hero: { larghezza: 1280, qualita: 70 },
};

/** Da dove leggere i percorsi delle foto, per uso. */
const FONTI = {
  casella: [
    'src/components/home/SpacesGallery.astro',
    'src/pages/gym-floor.astro',
    'src/data/junior.ts',
    'src/data/corsi.ts',
    'src/pages/corsi-fitness.astro',
    'src/pages/index.astro',
    'src/components/home/InfoCards.astro',
    'src/components/home/ActivityGrid.astro',
    /* I poster dei video sono immagini come le altre, e stavano fuori da questa
       lista: quello del Reformer pesava 480 kB per una scheda da 662 px. */
    'src/pages/reformer.astro',
  ],
  /* Le hero: quelle delle schede corso e junior arrivano dal campo `hero:` dei
     dati, le altre tre sono scritte nelle pagine. */
  hero: [
    { file: 'src/data/corsi.ts', chiave: 'hero' },
    { file: 'src/data/junior.ts', chiave: 'hero' },
    { file: 'src/pages/reformer.astro', chiave: 'rf-hero' },
    { file: 'src/pages/club-life.astro', chiave: 'cl-hero' },
    { file: 'src/pages/corsi-fitness.astro', chiave: 'cf-hero' },
    { file: 'src/pages/lavora.astro', chiave: 'lv-hero' },
  ],
  /* Le foto di news ed eventi sono hero anche loro — le pagine di dettaglio le
     passano da `fotoHero` — ma non stanno in un file: sono il campo `image:` di
     ogni markdown della collezione, e chi scrive da Tina ne aggiunge una senza
     toccare il codice. Quindi la cartella, non l'elenco. */
  heroCartelle: ['src/content/news', 'src/content/eventi'],
};

const RE_FOTO = /\/wp-content\/uploads\/[\w./-]+\.(?:jpe?g|png|webp)/gi;
const RE_FOTO_U = /\$\{U\}(\/[\w./-]+\.(?:jpe?g|png|webp))/gi;

function daTesto(s) {
  const out = [];
  for (const m of s.matchAll(RE_FOTO)) out.push(m[0]);
  for (const m of s.matchAll(RE_FOTO_U)) out.push('/wp-content/uploads' + m[1]);
  return out;
}

/** Tutte le foto di una lista di file. */
async function fotoDaiFile(files) {
  const trovate = new Set();
  for (const f of files) for (const p of daTesto(await readFile(f, 'utf8'))) trovate.add(p);
  return trovate;
}

/**
 * Le foto di sfondo delle hero. Nei dati sono il valore di `hero:`; nelle pagine
 * sono il `src` del tag con la classe `…-hero__bg`, e lì si prende la foto che
 * compare entro qualche riga dalla classe.
 */
async function fotoHero() {
  const trovate = new Set();
  for (const { file, chiave } of FONTI.hero) {
    const s = await readFile(file, 'utf8');
    if (chiave === 'hero') {
      for (const m of s.matchAll(/hero:\s*[`'"]([^`'"]+)[`'"]/g)) {
        const v = m[1].replace('${U}', '/wp-content/uploads');
        if (v.startsWith('/wp-content/')) trovate.add(v);
      }
    } else {
      const i = s.indexOf(`${chiave}__bg`);
      if (i === -1) continue;
      const [primo] = daTesto(s.slice(i, i + 400));
      if (primo) trovate.add(primo);
    }
  }
  for (const cartella of FONTI.heroCartelle) {
    for (const nome of await readdir(cartella)) {
      /* I `._*` sono i sidecar che exFAT semina accanto a ogni file: non sono
         markdown e leggerli non darebbe niente di utile. */
      if (!nome.endsWith('.md') || nome.startsWith('._')) continue;
      const s = await readFile(join(cartella, nome), 'utf8');
      const m = s.match(/^image:\s*["']?(\/wp-content\/[^"'\s]+)["']?/m);
      if (m) trovate.add(m[1]);
    }
  }
  return trovate;
}

/** Scrive la variante, o la butta se non risparmia abbastanza. Torna i byte risparmiati. */
async function genera(rel, { larghezza, qualita }) {
  const src = 'public' + rel;
  let info;
  try {
    info = await stat(src);
  } catch {
    return { esito: 'assente' };
  }
  const out = join(dirname(src), basename(src, extname(src)) + `-${larghezza}.jpg`);

  try {
    const o = await stat(out);
    if (o.mtimeMs >= info.mtimeMs) return { esito: 'presente' };
  } catch {
    /* non esiste: si genera */
  }

  const img = sharp(src);
  const meta = await img.metadata();

  /* Larga come la casella, o come l'originale se è già più stretto. Una foto
     dentro la misura non va ridimensionata, ma può valere la variante comunque:
     ce ne sono di esportate a qualità da stampa — 532×532 per 80 kB, mezzo byte
     per pixel — e ricomprimerle alla stessa dimensione ne toglie un quinto.
     Sotto il 15% di risparmio si butta la variante e si tiene l'originale: due
     file per lo stesso peso sono solo un file in più da tenere allineato. */
  const largheggia = (meta.width ?? 0) > larghezza;
  await img
    .resize({ width: largheggia ? larghezza : meta.width, withoutEnlargement: true })
    .jpeg({ quality: qualita, mozjpeg: true })
    .toFile(out);
  const dopo = await stat(out);

  if (dopo.size > info.size * 0.85) {
    await rm(out);
    return { esito: 'inutile' };
  }
  return { esito: 'fatta', risparmio: info.size - dopo.size };
}

const heroSet = await fotoHero();
const caselle = [...(await fotoDaiFile(FONTI.casella))].filter((p) => !/-\d+\.jpg$/i.test(p));

for (const [nome, elenco] of [
  ['caselle', { misura: MISURE.casella, foto: caselle }],
  ['hero', { misura: MISURE.hero, foto: [...heroSet] }],
]) {
  const conto = { fatta: 0, presente: 0, inutile: 0, assente: 0 };
  let risparmio = 0;
  for (const rel of elenco.foto) {
    const r = await genera(rel, elenco.misura);
    conto[r.esito]++;
    risparmio += r.risparmio ?? 0;
  }
  console.log(
    `${nome} (-${elenco.misura.larghezza}): ${conto.fatta} generate, ${conto.presente} già presenti, ` +
      `${conto.inutile} non convenienti, ${conto.assente} non trovate` +
      (conto.fatta ? ` · ${Math.round(risparmio / 1024 / conto.fatta)} kB risparmiati in media` : '')
  );
}
