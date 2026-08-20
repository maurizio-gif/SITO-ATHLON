## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Typography: the display face needs headroom

Titles are set in Tusker Grotesk, which draws accented caps (À, È, Ù, É) up to
1.047em above the baseline — taller than the leading this design uses. Without
headroom the ink lands above its line box: it collides with the eyebrow above
and gets shaved off wherever an ancestor clips (rounded cards, the app splash,
any `overflow: hidden` row). Italian headings are full of accents, so this bites
constantly — `MODALITÀ`, `ATTIVITÀ`, `PIÙ`, `PERCHÉ`.

`global.css` solves it once, for every page. Two things make it work together:
`ascent-override: 105%` on the three `@font-face` rules, and the
`Display-face headroom` rule that derives the padding from the leading.

When writing a page:

- **`h1`–`h4` are already covered.** Nothing to do.
- **To tighten the leading, set `--lh`, never `line-height`.** The headroom is
  computed from `--lh`; setting `line-height` directly leaves the padding at
  the default and the caps get clipped again.
  ```css
  .my-title { font-size: var(--text-3xl); --lh: 0.9; }
  ```
- **Display text that is not `h1`–`h4` needs `class="u-display"`** to opt in —
  spans, `strong`, price paragraphs, anything set in `var(--font-heading)`.
- **Never add `padding-top` by hand to stop clipping.** That is what the rule
  is for, and a fixed value goes stale the moment the leading or the copy
  changes. Every such patch has been removed; don't reintroduce one.
- **Positioning a decoration against a display box** (an accent rule, a bar):
  offset it by `var(--display-headroom)` so it keeps its place if `--lh` is
  retuned later. `.head-word::before` in `ActivityGrid.astro` is the example.

To verify: for every element in the display face, the ink must start at or
below its own padding-box top. Measure with canvas `TextMetrics` —
`padding-top + (line-height - (fontBoundingBoxAscent + fontBoundingBoxDescent)) / 2
+ fontBoundingBoxAscent - actualBoundingBoxAscent` must be `>= 0`.

## Fonts are served from this repo, and stay that way

Both faces are ours: Tusker in `public/wp-content/uploads/2024/07/`, Inter — the
variable file, latin and latin-ext subsets — in `public/fonts/`. Inter used to
come from Google Fonts through an `@import` in `global.css`, and that one line
was the longest network chain on the site: download the stylesheet, parse it,
discover the import, open a connection to a third-party host, fetch a second
stylesheet, and only then discover the woff2 to fetch. 1930 ms of blocked
rendering, per PageSpeed.

- **Never add an `@import` for a font, or any other render-blocking cross-origin
  request.** Add the file to `public/`, declare it with `@font-face`, done. The
  refresh recipe for Inter is written above its declarations in `global.css`.
- **`Layout.astro` preloads exactly two files** — Tusker 3700 and Inter latin,
  the faces that draw the first screen. Adding a third takes bandwidth from
  those two; measured, dropping to one costs 0.3 s of FCP.
- **`unicode-range` is what keeps Inter at 48 kB.** An Italian page never fetches
  latin-ext. Before adding a subset, check whether any page needs it — the check
  is a character sweep over `dist`, and today nothing outside `latin` is used
  except emoji and arrows, which come from the system font either way.

## A hidden overlay must be hidden from the keyboard too

`opacity: 0` and `pointer-events: none` hide an overlay from the eyes and the
mouse, not from the tab key: a closed panel with `aria-hidden="true"` and
reachable links is what makes Lighthouse report a malformed accessibility tree,
and what makes a phone visitor tab through 33 invisible menu links before
reaching the page. Every closed overlay on the site is `visibility: hidden`.

Two details the form requires, and both have bitten:

- **`visibility` does not fade, it switches.** Zero duration, and a delay equal
  to the fade only when closing:
  ```css
  .panel      { visibility: hidden;  transition: opacity .2s ease, visibility 0s .2s; }
  .panel.open { visibility: visible; transition: opacity .2s ease, visibility 0s; }
  ```
  Give it a duration instead and the computed value stays `hidden` for the
  instant the script moves focus into the panel — `focus()` refuses an invisible
  element, and focus silently stays on the button that opened it.
- **Flush the style before asking for focus.** The class has just been added, so
  the style is dirty; read `offsetWidth` first (`Header.astro` and
  `abbonamenti.astro` both do).

Overlays that use `display: none` when closed — the lightbox, the lesson modal —
already behave; nothing to change there.

And the same trap one level down, for the parts a script switches with the
`hidden` attribute: `hidden` hides through a rule in the *browser's* stylesheet,
so any `display` of ours beats it — author origin wins over user-agent origin at
any specificity. A class carrying `display: flex` or `inline-flex` stays on the
page with `hidden` on it, and the script that thinks it turned the thing off has
turned nothing off. Three places had fallen into it: the assistant's chat step
(its email box and an empty conversation area with its own text field, both on
screen at once), the activity card's link, the Help Desk's suggestion row.
`global.css` now declares `[hidden] { display: none !important }` once, for the
whole site — `!important` because it has to beat classes written after it. An
element that must stay visible does not carry `hidden`; it carries a class. To
check a page: every element with the `hidden` attribute must compute to
`display: none`.

## Photos: the box decides the file

Photos live in `public/` and are referenced as strings, so Astro's image
optimiser never sees them. `scripts/varianti-foto.mjs` writes the variants and
`src/data/foto.ts` offers them:

- **A photo in a small box** gets `{...fotoPiccola(src)}`, or `urlPiccola(src)`
  for a CSS background, where `srcset` cannot reach.
- **A full-bleed hero photo** gets `{...fotoHero(src)}` — it is the LCP element
  of the page, and the original is half a megabyte.
- **Add new photos to the script's source list and re-run it.** It is not in the
  build pipeline on purpose: on Vercel it would pull sharp on every deploy to
  regenerate files that never change.

## Whitespace around inline tags

Astro trims the line break on **both** sides of an inline tag, so a wrapped
`<strong>` or `<a>` loses the space next to it and renders as
`incluso ancheAthlon TV` or `Sospensioni:illimitate`. Keep the tag on the same
line as the word it touches. To audit a build:

```
grep -oE '[a-zà-ù,;:·)]<(strong|a |em)[^>]*>|</(strong|a|em)>[a-zà-ùA-Z]' dist/**/index.html
```

## Video: silent, looping, self-starting — everywhere

Every `<video>` on the site is a background clip: it starts on load, loops, and
never makes a sound. Write the attributes in the markup so it works before any
script runs and without JavaScript at all:

```html
<video autoplay muted loop playsinline poster="…">
  <source src="…" type="video/mp4" />
</video>
```

`src/scripts/video-autoplay.ts` (loaded once by `Layout.astro`, so every page
has it) is the safety net for what those attributes cannot do:

- a first `play()` the browser **refuses** — Low Power Mode on iOS, a data
  saver, a tab restored in the background — retried when the tab comes back and
  on the visitor's first interaction, the gesture those policies wait for;
- a clip whose **src arrives from script**, or a `<video>` added to the page
  later: both are picked up and primed;
- a clip a mobile browser **paused on its own** (scrolled away, stalled
  network), which otherwise stays frozen for the rest of the visit.

It deliberately leaves three cases alone: a clip the visitor stopped or took
fullscreen, a clip that is not rendered (a closed modal must not play to
nobody), and anything marked `data-no-autoplay`.

A pause within a second of touching the video counts as the visitor's and
sticks. Presence of `controls` is **not** the signal; code that takes a video
over for a while says so with `v.dataset.videoHandsOff = '1'` and clears it when
done, because iOS fullscreen is the system player and `document.fullscreenElement`
stays null there.

Embedded players are the same rule with the provider's own switches. Vimeo:

```html
<iframe src="…?autoplay=1&muted=1&loop=1" loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
```

`allow="autoplay"` is required as well as the parameter — the parameter alone is
refused. Keep `loading="lazy"` on a page with several: each starts as its card
comes into view instead of all of them pulling a stream at once.

- **Never write `preload="none"` on a clip that autoplays.** It says "fetch
  nothing", and on a phone that wins: the visitor gets the poster with a play
  button on it. Leave `preload` off entirely — the clip starts as it reaches the
  screen, so a heavy file costs nothing until then. `poster` covers the wait.
- **Never turn a video's sound on at load.** Autoplay with audio is refused by
  every browser, and the whole clip stays black.
- **Turning sound on for a deliberate act is fine** — put it back on the way
  out, and resume playback there too, or a pause from the fullscreen controls
  leaves the background frozen (`restoreHeroVideo` in `Hero.astro`).
- **A clip that must not start on its own opts out with `data-no-autoplay`.**
  Nothing on the site does today.
- **No `controls` on a background clip, and no clicking one either.** They are
  scenery: `global.css` gives every `video:not([controls])` `pointer-events:
  none`, so a click passes through to the page instead of pausing the clip or
  opening the player's menu. The selector is the whole mechanism — the home hero
  sets `controls` on the element before going fullscreen, which takes it out of
  the rule and hands the native controls back, and clears it on the way out. To
  make a clip controllable, give it `controls`; nothing else to change.

Two things make a clip below the fold behave. Mobile Safari grants an autoplay
only once the element is on screen, so the script retries at several
intersection thresholds — one early trigger fires while the clip is still out of
view, is refused for that reason, and never comes back on its own. And
`global.css` hides `::-webkit-media-controls-start-playback-button`, the big play
glyph iOS paints over any video that has not started, controls or not: when
autoplay is refused anyway (Low Power Mode, a data saver) the clip reads as a
still frame of the site rather than a stalled player, and the first tap anywhere
starts it.

To verify: for every `<video>` on the page, `paused` is `false` and `muted`,
`loop`, `playsInline` are all `true` — and `currentTime` keeps rising. Check it
with a clip below the fold too, and with `play()` patched to reject while the
element is off screen, which is how mobile Safari behaves. Note
that headless Chromium here has **no H.264 decoder**
(`canPlayType('video/mp4; codecs="avc1.42E01E"')` is `''`), so the site's own
MP4s never advance in it; measure frames with a VP8/WebM clip instead.

## The club's kiosk is a form factor of its own, and it is not a phone

A 27" portrait panel (9:16, Windows, Edge or Chrome) stands in the club's
entrance and is read from about a metre and a half away. It broke both of the
site's assumptions at once: it is 1080 px wide, so it got the hover-only desktop
menu no finger can open, and its text was sized for a phone held at arm's
length, so from the doorway it was unreadable.

**Detect it by the shape of the screen, never by the pointer.** Windows presents
the touch panel to browsers as a machine with a mouse — `pointer: fine`,
`hover: hover` — so `pointer: coarse` never fires there. Three conditions
together, and all three are needed:

```css
@media (min-width: 900px) and (min-height: 1200px) and (max-aspect-ratio: 7/10)
```

`min-width` rules out a phone, `min-height` rules out a short desktop window,
and `max-aspect-ratio` lets a 9:16 panel (0.5625) through while a 3:4 tablet
(0.75) stays out. The ratio is **7/10 and not 5/8**, which is the panel's own
shape, because the browser on it is not fullscreen: measured on the real kiosk,
tabs plus address bar plus the Windows taskbar leave a 1064×1725 viewport, ratio
0.617 — inside a 0.625 limit by eight thousandths. An open bookmarks bar would
have switched the whole mode off. The three measures appear in `global.css`, in
`Header.astro`, in the components with sizes of their own, and in ~32 media
queries marked `/* + totem */`. **Keep them identical**, and check
`/diagnostica-schermo` if they ever change — that page reads them back from
`data-test` and says on the panel itself which condition is failing.

**The root is in `vw`, not px, and that is the whole trick.** The panel is
physical and fixed; what changes is how many CSS pixels Windows declares — 1080
at 100 % scaling, 1440 at 150 %. `font-size: 2.5vw` gives 27 px on 1080 and
36 px on 1440, and in both cases body text measures about 8 mm on the glass.
Spacing does **not** scale with it — the three `--space-section-*` variables are
retuned inside the block, or the home page becomes a kilometre of scrolling.

**8 mm, not the 10 mm the signage rule asks for at 1.5 m.** The first tuning did
follow that rule — `3.15vw`, body at 32 px — and on the real panel it failed, for
a reason that is about width, not height: 1080 px less the margins is 1048, so a
three-column grid gives 322 px columns, and 32 px text in 322 px is twenty
characters a line. Two words. The column stretches like an accordion and the
title breaks out of its card. Measured over six pages, the median was 23
characters per line against the 45–75 that read comfortably. 8 mm is the same
10 mm moved to 1.2 m — where a person actually stops in front of the totem,
while 1.5 m is where they *notice* it, and at that distance the headings speak.

**Type has two tiers on the panel, not one.** Body copy ~26 px (8 mm, comfortable
at 1.2 m); the smallest supporting label `--text-2xs` at 19 px (6 mm, readable at
arm's length, which is where captions get read). A single 24 px floor for
everything is what produced the accordion.

**Half the fix is not typographic: the kiosk inherits the layout the site already
uses below 1000 px** — three columns becoming two. Every media query from 820 px
up carries the three conditions as a second, OR'd term, with a one-line
`/* + totem */` comment above it. The phone breakpoints (700 px and under) do
**not**: one 1048 px column would give 65-character lines, which read fine, but
the page would become a ribbon. Grids that size themselves — `repeat(auto-fit,
minmax(…, 1fr))` — need no media query at all once the floor is in rem: it rises
with the root and the grid drops a column by itself.

What follows from all this, when writing a page:

- **Sizes in rem, not px, for anything a finger touches or an eye reads.** At a
  16 px root a rem *is* a px, so phones and desktops are unchanged to the pixel;
  on the kiosk the same declaration scales. This is how the header bar, the
  gallery arrows and the club-life anchor strip were fixed — none of them needed
  a kiosk rule, only the right unit. A control still measured in px is a control
  that stays phone-sized on the panel.
- **A magic number that stands for another element's height is a bug waiting for
  the kiosk.** `calc(100svh - 72px)` in the hero and `--cl-menu-h: 58px` in
  club-life were both correct at a 16 px root and both wrong on the panel, by
  81 px and 63 px — enough to push the CTA and the only navigation the page has
  below the bottom edge. Express it in the same unit as the thing it tracks.
- **A table that does not fit scrolls inside itself**, like the planning week:
  `display: block; overflow-x: auto`. The page must never scroll sideways.
- **A grid column is `minmax(0, 1fr)`, not `auto`.** At double scale one long
  cited URL in the terms and conditions widened its column past its own
  container and the whole page scrolled. Pair it with `overflow-wrap: anywhere`
  on the prose so the string breaks instead of the layout.
- **Secondary link-CTAs get their tap height from the shared list** in
  `global.css` — `.co-link`, `.wa__back`, `.sched__link` and the rest. It is an
  explicit list on purpose: `a:not(p a)` would also catch the cards that are one
  big link, and `display: inline-flex` on those breaks the grids. A new
  link-shaped command goes in that list.

To verify, sweep every built page at 1080×1920 with `hasTouch: false` — that is
what the panel reports — and check four things per page: no text under 19 px, no
control whose smaller side is under 48 px, no horizontal overflow, and at least
one finger-sized command inside the first screen. Links inside running text
(`p`, `li`, `td`, `th`) are text, not targets, and don't count. Then measure
**characters per line**, which is the check that caught what the pixel sweep
could not: text length divided by line count, per paragraph. Under 30 means a
column too narrow to read; the target median is 38 or better.

Measure a control with `offsetWidth`/`offsetHeight`, never
`getBoundingClientRect()` — the rect is the *transformed* box, and a card
carrying a `scale(0.978)` entrance animation reported 47.5 px for a control that
measures 49. Three "findings" were that artifact and nothing else.

The sweep is what turned "the characters are a bit small" into a bounded list;
the last run was 77 pages, nothing to fix.

## The 16:9 television is the kiosk's landscape twin

The site is also shown on an ordinary Full HD television — a consumer set, not a
professional panel — and desktop mode is wrong there for one reason: distance.
At a 16 px root, body copy on a 55" set measures 10 mm of glass, which reads at
1.5 m. That is a desk, not a sofa.

**The trap is that 1920×1080 is both a television and the most common desktop
monitor there is.** Width distinguishes nothing. What distinguishes is the
**usable height**, because on a television the browser fills the screen and on a
desk it does not: a maximised window on a 1080p monitor leaves ~937 px (tabs,
address bar and taskbar take 143), and the most that was measured with the
taskbar hidden is 993. A television gives the full 1080.

```css
@media (min-width: 1700px) and (min-height: 1020px) and (max-aspect-ratio: 37/20)
```

`min-width` rules out a laptop, `min-height` is the condition that does the work,
and `max-aspect-ratio` rules out a maximised window on a large monitor — those
sit between 1.90 and 2.05, while 16:9 is 1.778. **37/20 (1.85) and not `16/9`,**
which is the true ratio: `max-aspect-ratio: 16/9` is a pixel-exact comparison,
and a 1920×1079 viewport — one pixel of chrome, a thin bar the set draws — makes
1.7794 and falls out. 1.85 leaves room for forty pixels of frame and still
excludes a maximised 1440p window.

**The price, measured: a fullscreen 16:9 screen is indistinguishable from a
television, because it genuinely is.** 2560×1440 in F11 on a desk and a 1440p
signal on a television declare the same numbers, and no media query can know how
far away the person is sitting. Someone browsing fullscreen on a large monitor
gets television-sized text — that is this rule, not a bug. The common case, a
maximised window, is untouched.

**A television is watched from two to four metres.** That is the input the whole
block is derived from. `1.64vw` gives 31.5 px on 1920, which on a 55" set is
20 mm of glass — the 3 m at the centre of that range, by the same signage rule
the totem uses (height ≈ distance / 150). The root is in `vw`, so the other sizes
follow on their own, because viewing distance grows with the diagonal: 15.6 mm on
a 43" (2.3 m) and 23.6 mm on a 65" (3.5 m). A 4K set declares 3840 CSS px and
raises the root instead of halving the characters.

**The centre of the range and not the far end, deliberately.** At 4 m that rule
wants 27 mm, which is a 42 px root, and at that point the screen holds 42 rem of
content: columns fall to twenty characters a line and the page becomes unreadable
in order to be large. On 1920 px you cannot have both poster-grade text for 4 m
and human line lengths — it is arithmetic. The same argument the totem settles
with (8 mm beating 10) applies here: at 4 m the headings speak, since they are
three to four times body size; the copy is read from 3 m or closer, which is
where people stand when they actually read. Below that, at 2 m, 20 mm is generous
— and that is the right direction to be wrong in.

**Characters per line depend only on how wide the container is measured in
`rem`** — not on the scale. This is the one thing that is easy to get wrong:
raising the root alone narrows nothing, but leaving `--container-width` at
1320 px while the root grows does, because 1320 px falls from 82 rem to 41. It is
set to `58 rem` — 1827 px on 1920, the most the screen allows while keeping the
overscan margin. This is also where the tuning bites its own tail: raising the
root for distance leaves the screen holding fewer rem, so every millimetre gained
in character height is paid for in line length. At 3 m the trade still works; past
it, it does not — which is why the root stops where it stops.

What follows when writing a page:

- **Layout changes far less than on the totem, but it does change.** There every
  grid had to lose a column; here only what **measured** under 30 characters per
  line does — the readable floor. That is the four- and five-column grids (22–26)
  and the course pages' three cards (26–28), which alone were 23 of the 42
  paragraphs out of bounds. Five places (the footer's two grids, the five Classes
  columns, the four junior method columns, the three course cards), each carrying
  this condition next to the totem's with a `/* + tv */` comment. The other
  three-column grids stay, and that is not laziness: every column dropped is a
  row added to scroll, and on a television scrolling is the worst fault there is.
  Drop a grid where the line is unreadable, not where it is narrow.
- **A size outside the type scale is what breaks first.** Both offenders the
  sweep found were exactly that: the footer credit at `0.6875rem` and the
  header's trial CTA at `0.75rem`. Anything written outside `--text-*` stays
  behind wherever the root grows, on the totem and here alike.
- **The bottom of the scale rises, and this is where the television parts from
  the totem.** On the totem the smallest labels could stay at 6 mm because a
  caption is read by stepping closer. Nobody steps closer to a television:
  labels, eyebrows and fine print are read from the same armchair as everything
  else, so `--text-2xs` and `--text-xs` are raised to 0.82 and 0.88 rem (26 and
  28 px, 16 and 18 mm on a 55") — compressing the scale at the bottom instead of
  widening it, while staying under body copy so the hierarchy survives.
- **Give the page a margin: consumer sets still overscan**, historically up to
  5%. Between the 46 px the container leaves outside and its `1.25rem` (39 px)
  gutter, copy starts 85 px from the edge — 4.4% a side — so it stays inside on a
  set that crops, while full-bleed sections stay full-bleed.

To verify, sweep every built page at 1920×1080 — the full height is what turns
the mode on, so a widened desktop window will not reproduce it — and check: no
horizontal overflow, no text under 19 px, and characters per line per paragraph.
The last run was 80 pages: no overflow anywhere, nothing under 19 px, and 19
paragraphs below 30 characters a line, several of which are artefacts of the
counter (a paragraph broken by hand with `<br>`, a flex row read as one string).
Expect the line-length figures to be **worse** than the smaller tuning that came
before, and that is the trade being made on purpose: text readable at 3 m costs
line length, and a beautifully set line nobody can read from the sofa is worth
nothing. Two elements report as bleeding — `.nav-item`, which holds the
absolutely-positioned mega-menu, and `.splash__mark` by 3 px — and both do the
same at 1400×900, so they are pre-existing and not this mode's doing.

`/diagnostica-schermo` reads back both modes' conditions from `data-test` and
says on the screen itself which one is failing and how many millimetres the body
copy measures. Keep the three numbers identical between `global.css`, that page,
and every `/* + tv */` query.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## I contenuti si scrivono da Tina, e il build lo sa

News, eventi, schede dell'Help Desk, servizi e la landing della promo sono
markdown in `src/content/`; il planning è il JSON in `src/data/`. Chi li scrive
non apre GitHub: apre `/admin`, che è il pannello di
[TinaCMS](https://tina.io). Tina è git-backed — salva scrivendo sul repository
— quindi il contenuto resta versionato e il sito resta statico: nessun database
da interrogare a ogni visita.

Lo schema del pannello sta in `tina/config.ts` e **deve seguire** quello delle
collezioni in `src/content.config.ts`. Sono due file perché fanno due cose
diverse — uno valida al build, l'altro disegna i campi da riempire — ma una
divergenza si paga due volte: un campo che Tina scrive e Zod rifiuta rompe il
build, e un campo che Zod pretende e Tina non mostra è un campo che nessuno
compilerà mai. Quando aggiungi un campo a una collezione, aggiungilo in tutti e
due.

- **Le attività** non si elencano a mano da nessuna delle due parti: escono da
  `ACTIVITY_TAGS` in `src/data/activities.ts`, che popola la tendina di Tina, la
  validazione e il primo passo del box dell'Help Desk. Aggiungerne una lì la fa
  comparire nei tre posti.
- **I prezzi non entrano nel CMS.** Vivono in `src/data/abbonamenti.ts` e le
  pagine li leggono da lì: metterli anche in un documento di Tina vorrebbe dire
  poterli cambiare in un posto solo dei due, e scoprirlo dal listino sbagliato
  in vetrina. Vale per gli abbonamenti, per gli accessi singoli e per il
  personal training.
- **La cartella decide l'indirizzo.** `src/content/articles/<area>/<file>.md`
  diventa `/wikiathlon/<area>/<file>`, `src/content/news/<file>.md` diventa
  `/news/<file>`. Spostare un articolo di cartella o rinominarlo ne cambia il
  link: se era pubblicato, serve un reindirizzo in `astro.config.mjs`.
- **Il planning è l'unica collezione che non è un contenuto**, ed è quella da
  cui si muove più sito: è `src/data/planning-corrente.json`, un documento solo
  — non si crea e non si cancella — che tutte le pagine con orari leggono
  attraverso `data/planning.ts`. Spostare una lezione cambia insieme
  `/planning`, `/corsi-fitness`, le quindici pagine dei corsi e quelle delle
  attività in acqua; e i numeri che il sito stampa («N lezioni a settimana»,
  «più di N ore», i `{n}` e `{ore}` dentro i testi delle fasce) sono contati dal
  palinsesto, non scritti. Misurato: sposta l'Antigravity e cambiano `/planning`,
  `/antigravity` e `/corsi-fitness`, mentre `/nuoto-libero` resta identico.

  Tre chiavi tengono in piedi quelle connessioni, e vanno trattate come tali.
  L'**`id` della fascia** è il nome con cui una pagina la chiede (`getBand`):
  cambiarlo fa fallire il build, ed è voluto. Il **nome della lezione** è come
  la pagina del corso trova i suoi orari — `corso.lezioni` in `data/corsi.ts` e
  l'elenco in `corsi-fitness.astro` — e rinominarlo non rompe niente ma svuota
  quella tabella: `LessonSchedule` scrive «questo mese non è in palinsesto»,
  che è il modo giusto di sbagliare ma resta uno sbaglio. La **sala** è la
  chiave del colore in legenda, e per quella non c'è da fidarsi di chi scrive:
  in Tina è una tendina, e le sue voci escono da `SALE` in `src/data/sale.ts`,
  la stessa lista che ordina le legende e che `planning.ts` controlla al build
  abbia un colore per ogni voce, in chiaro e in scuro.

**Il pannello non può mai fermare il sito.** `tinacms build` compila
`public/admin` e va prima di Astro, che copia `public/` nel `dist`. Ma quel
comando parla con TinaCloud, e TinaCloud conosce un ramo solo: quello che
indicizza. Su un deploy di anteprima si ferma in partenza — *Branch
'claude/...' is not on TinaCloud* — e prima che `scripts/build.mjs` prendesse
questa forma si fermava con lui tutto il deploy, sito compreso. Quindi:

- **il pannello si costruisce solo per la produzione** (`VERCEL_ENV`), e non è
  una rinuncia: quello di un'anteprima punterebbe a un ramo che TinaCloud non
  ha, e si aprirebbe su un errore;
- **se non compila, il sito si pubblica senza.** Token scaduto, lock fuori
  sincrono, TinaCloud giù: si scrive perché a schermo, si butta l'eventuale
  build a metà — mai spedire un `public/admin` incompleto — e si va avanti con
  Astro. Un CMS che non compila è un pannello da sistemare; un deploy bloccato
  è un sito che non si aggiorna più.

Il che vuol dire che `/admin` mancante non rompe niente e non si nota: **quando
si toccano lo schema o le credenziali, il log del deploy di produzione è la
verifica**, non il fatto che il sito sia salito.

Il **client id** invece sta in chiaro in `tina/config.ts`: è pubblico per
costruzione — finisce dentro il bundle di `/admin`, che gira nel browser di chi
scrive — quindi metterlo in una variabile darebbe l'illusione di un segreto
senza nasconderlo a nessuno, e costerebbe un deploy rotto ogni volta che
qualcuno dimentica di impostarla. Il **token** è un segreto vero, legge il
repository, e sta solo fra le variabili d'ambiente.

Per provare il pannello in locale non servono credenziali: `npm run dev:cms`
alza il server GraphQL di Tina attorno ad `astro dev` e le modifiche finiscono
nei file, non su un servizio. Per validare lo schema contro i contenuti senza
pubblicare niente:

```
npx tinacms build --local --skip-cloud-checks --skip-search-index
```

`public/admin/` e `tina/__generated__/` sono generati e stanno in `.gitignore`.

**`tina/tina-lock.json` invece si committa**, ed è l'unica eccezione: è il file
con cui TinaCloud indicizza il contenuto del repository, e senza di lui il
pannello si apre su un archivio vuoto. Lo genera `tinacms dev` (o un
`tinacms build` con il token), quindi **dopo ogni modifica a `tina/config.ts`**
va rigenerato e committato insieme al resto: un lock che descrive uno schema
diverso da quello vero è un pannello che mostra campi che non esistono.
