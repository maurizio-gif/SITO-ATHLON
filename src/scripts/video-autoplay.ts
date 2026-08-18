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
 * Three things are deliberately left alone: a clip the visitor paused or took
 * fullscreen (some carry `controls`, and a pause of their own must stick), a
 * clip that is not rendered (a closed modal must not play to nobody), and
 * anything marked `data-no-autoplay`.
 */

/** How long after touching a video its pause still counts as the visitor's. */
const GESTURE_WINDOW = 1000;

const isManaged = (v: HTMLVideoElement) => !v.hasAttribute('data-no-autoplay');

/**
 * Something to play. currentSrc is no use on its own: Chromium leaves the old
 * URL there after a src is removed and load() called — the lesson modal's own
 * teardown — so the released state has to be read from networkState instead.
 */
const hasSource = (v: HTMLVideoElement) =>
  v.networkState !== v.NETWORK_EMPTY ||
  Boolean(v.getAttribute('src') || v.querySelector('source[src]'));

/**
 * The visitor is in charge of this one — it fills the screen, or they stopped
 * it themselves. Note this is not inferred from `controls`: a clip can ship
 * with controls and still be a background loop (the Reformer carousel).
 */
const isVisitorDriven = (v: HTMLVideoElement) =>
  document.fullscreenElement === v || v.dataset.videoHandsOff === '1';

const justTouched = (v: HTMLVideoElement) =>
  performance.now() - Number(v.dataset.videoTouchedAt || 0) < GESTURE_WINDOW;

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
  if (v.dataset.autoplayBound) return;
  v.dataset.autoplayBound = '1';

  // A pause moments after touching this clip is the visitor's own, and sticks
  // until they start it again.
  const touch = () => {
    v.dataset.videoTouchedAt = String(performance.now());
  };
  v.addEventListener('pointerdown', touch, { passive: true });
  v.addEventListener('keydown', touch);
  // A play they asked for hands it back; one from the system player during
  // iOS fullscreen (no gesture on the element) does not, which is why the hero
  // sets the flag itself while it owns the video.
  v.addEventListener('play', () => {
    if (justTouched(v)) delete v.dataset.videoHandsOff;
  });
  v.addEventListener('pause', () => {
    if (justTouched(v)) {
      v.dataset.videoHandsOff = '1';
      return;
    }
    kick(v);
  });
  // Whenever there are frames to show, and whenever the network gives up.
  v.addEventListener('loadeddata', () => kick(v));
  v.addEventListener('canplay', () => kick(v));
  v.addEventListener('stalled', () => kick(v));
}

function kick(v: HTMLVideoElement) {
  // Nothing to start in a tab nobody is looking at; visibilitychange below is
  // where a backgrounded page picks its videos back up.
  if (document.hidden) return;
  if (!isManaged(v) || !hasSource(v) || isVisitorDriven(v) || !isRendered(v)) return;
  if (!v.paused && !v.ended) return;
  void v.play().catch(() => {
    /* Refused for now; the retries below are the second chance. */
  });
}

const videos = () => document.querySelectorAll<HTMLVideoElement>('video');
const kickAll = () => videos().forEach(kick);

/**
 * A clip below the fold is the case the attributes handle worst: mobile Safari
 * grants an autoplay only once the element is actually on screen, and if the
 * attempt made before that is refused, nothing asks again — the visitor scrolls
 * down to a poster with a play button on it.
 *
 * Hence several thresholds rather than one generous margin: a single early
 * trigger fires while the clip is still out of view, gets refused for exactly
 * that reason, and never comes back. Firing again at a quarter and at half
 * visible means one of the attempts lands when the browser is ready to say yes.
 */
const arriving = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && kick(e.target as HTMLVideoElement)),
  { rootMargin: '100px 0px', threshold: [0, 0.25, 0.5] }
);

const adopt = (v: HTMLVideoElement) => {
  prime(v);
  kick(v);
  arriving.observe(v);
};

videos().forEach(adopt);

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
      adopt(r.target);
      return;
    }
    r.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      const found =
        node instanceof HTMLVideoElement
          ? [node]
          : Array.from(node.querySelectorAll<HTMLVideoElement>('video'));
      found.forEach(adopt);
    });
  });
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributeFilter: ['src'],
});
