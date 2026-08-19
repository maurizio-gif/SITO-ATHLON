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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
