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

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
