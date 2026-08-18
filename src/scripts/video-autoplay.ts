/**
 * Project rule: every <video> on the site is a silent looping clip that starts
 * by itself, as soon as the page loads.
 *
 * The markup carries `autoplay muted loop playsinline`, so the common case
 * needs no JavaScript at all. This is the safety net for what the attributes
 * alone do not cover:
 *
 *  - a first play() the browser refuses (Low Power Mode on iOS, a data saver,
 *    a tab restored in the background) — retried when the tab comes back and
 *    on the visitor's first interaction, which is the gesture those policies
 *    are waiting for;
 *  - a clip whose src arrives later, from script (the lesson modal), or a
 *    <video> added to the page after this ran;
 *  - a clip a mobile browser paused on its own — scrolled out of view, or a
 *    stalled network — which otherwise stays frozen for the rest of the visit;
 *  - a clip left paused by its own controls on the way out of fullscreen.
 *
 * Three things are deliberately left alone: a video the visitor is driving
 * (`controls` on, or fullscreen — that is the hero expand button, the one
 * place sound is allowed), a video that is not rendered (a closed modal must
 * not play to nobody), and anything marked `data-no-autoplay`.
 */

const isManaged = (v: HTMLVideoElement) => !v.hasAttribute('data-no-autoplay');

/**
 * Something to play. currentSrc is no use on its own: Chromium leaves the old
 * URL there after a src is removed and load() called — the lesson modal's own
 * teardown — so the released state has to be read from networkState instead.
 */
const hasSource = (v: HTMLVideoElement) =>
  v.networkState !== v.NETWORK_EMPTY ||
  Boolean(v.getAttribute('src') || v.querySelector('source[src]'));

/** The visitor is in charge of this one: sound is on, or it fills the screen. */
const isVisitorDriven = (v: HTMLVideoElement) =>
  v.controls || document.fullscreenElement === v;

const isRendered = (v: HTMLVideoElement) =>
  typeof v.checkVisibility === 'function'
    ? v.checkVisibility()
    : Boolean(v.offsetWidth || v.offsetHeight);

/** Silent, looping, inline — set as properties, which is what Safari honours. */
function prime(v: HTMLVideoElement) {
  if (!isManaged(v)) return;
  v.muted = true;
  // Survives a load(), which the lesson modal does on every close.
  v.defaultMuted = true;
  v.loop = true;
  v.autoplay = true;
  v.playsInline = true;
  if (!v.dataset.autoplayBound) {
    v.dataset.autoplayBound = '1';
    // Whenever there are frames to show, and whenever something stopped it.
    v.addEventListener('loadeddata', () => kick(v));
    v.addEventListener('canplay', () => kick(v));
    v.addEventListener('pause', () => kick(v));
    v.addEventListener('stalled', () => kick(v));
  }
}

function kick(v: HTMLVideoElement) {
  // Nothing to start in a tab nobody is looking at; visibilitychange below is
  // where a backgrounded page picks its videos back up.
  if (document.hidden) return;
  if (!isManaged(v) || !hasSource(v) || isVisitorDriven(v) || !isRendered(v)) return;
  if (!v.paused && !v.ended) return;
  v.muted = true;
  void v.play().catch(() => {
    /* Refused for now; the retries below are the second chance. */
  });
}

const videos = () => document.querySelectorAll<HTMLVideoElement>('video');
const kickAll = () => videos().forEach(kick);

videos().forEach((v) => {
  prime(v);
  kick(v);
});

// A gesture is what an autoplay policy is holding out for, so retry on the
// first few. Capture phase and passive: this must never interfere with the
// click the visitor actually meant.
const gestures = ['pointerdown', 'touchstart', 'keydown'] as const;
gestures.forEach((type) =>
  document.addEventListener(type, kickAll, { capture: true, passive: true })
);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) kickAll();
});
// Coming back through the history cache, where nothing else fires.
window.addEventListener('pageshow', kickAll);

// Videos that appear later, and sources swapped in by script.
new MutationObserver((records) => {
  records.forEach((r) => {
    if (r.type === 'attributes' && r.target instanceof HTMLVideoElement) {
      prime(r.target);
      kick(r.target);
      return;
    }
    r.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      const found =
        node instanceof HTMLVideoElement
          ? [node]
          : Array.from(node.querySelectorAll<HTMLVideoElement>('video'));
      found.forEach((v) => {
        prime(v);
        kick(v);
      });
    });
  });
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributeFilter: ['src'],
});
