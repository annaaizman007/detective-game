// The opening: a dark office, rain on the window, footsteps in the corridor,
// the desk lamp clicks on, the telephone rings, a hand lifts the receiver.
// Then the station is on the line and the briefing cards begin.
//
// All picture is one inline SVG driven by classes on the wrapper; all sound
// is Foley through the room's master gain. Anything can skip it.

import type { Foley } from '../systems/foley';
import { reduceMotion } from './fx';

/** The painted film, cut by tools/make-intro.py. The SVG scene below is the fallback. */
export const VIDEO_BASE = 'assets/video/';

export function introHtml(caseId = ''): string {
  const streaks = Array.from({ length: 26 }, (_, i) => {
    const x = 44 + ((i * 37) % 300);
    const len = 30 + ((i * 53) % 70);
    const delay = ((i * 0.37) % 1.6).toFixed(2);
    const dur = (1.1 + ((i * 0.13) % 0.7)).toFixed(2);
    return `<line class="rain-streak" x1="${x}" y1="0" x2="${x - 6}" y2="${len}" style="animation-delay:-${delay}s;animation-duration:${dur}s"/>`;
  }).join('');
  const blinds = Array.from({ length: 11 }, (_, i) => `<rect x="40" y="${58 + i * 22}" width="310" height="7" fill="#05060a" opacity=".85"/>`).join('');
  return `
  <div class="intro" data-act="skip-intro" role="button" aria-label="Skip the opening">
    <video class="intro-video" src="${VIDEO_BASE}intro${caseId ? `-${caseId}` : ''}.mp4" playsinline preload="auto"></video>
    <svg class="intro-svg" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="lampCone" cx="0.5" cy="0" r="0.9">
          <stop offset="0" stop-color="#ffd58a" stop-opacity=".95"/>
          <stop offset=".45" stop-color="#e2a84f" stop-opacity=".35"/>
          <stop offset="1" stop-color="#e2a84f" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="deskPool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffd58a" stop-opacity=".55"/>
          <stop offset="1" stop-color="#ffd58a" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="cityGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a2233"/>
          <stop offset="1" stop-color="#2d2a3a"/>
        </linearGradient>
        <linearGradient id="deskWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a1c12"/>
          <stop offset="1" stop-color="#120c08"/>
        </linearGradient>
        <clipPath id="winClip"><rect x="40" y="50" width="310" height="250"/></clipPath>
      </defs>

      <!-- wall -->
      <rect width="960" height="540" fill="#07090f"/>
      <rect width="960" height="540" fill="#0e1119" opacity=".6"/>

      <!-- window: the city, the rain, the blinds -->
      <g clip-path="url(#winClip)">
        <rect x="40" y="50" width="310" height="250" fill="url(#cityGlow)"/>
        <g class="intro-city" fill="#0a0d16">
          <rect x="40" y="170" width="60" height="130"/><rect x="110" y="140" width="40" height="160"/>
          <rect x="160" y="190" width="70" height="110"/><rect x="240" y="120" width="30" height="180"/>
          <rect x="280" y="160" width="70" height="140"/>
        </g>
        <g class="intro-lights" fill="#f2c979" opacity=".7">
          <rect x="118" y="150" width="4" height="6"/><rect x="128" y="170" width="4" height="6"/><rect x="248" y="130" width="3" height="5"/>
          <rect x="254" y="150" width="3" height="5"/><rect x="300" y="180" width="4" height="6"/><rect x="320" y="210" width="4" height="6"/>
          <rect x="60" y="200" width="4" height="6"/><rect x="180" y="210" width="4" height="6"/>
        </g>
        <g class="intro-rain" stroke="#9fb3c8" stroke-opacity=".35" stroke-width="1.2" transform="translate(0 40)">${streaks}</g>
        ${blinds}
      </g>
      <rect x="36" y="46" width="318" height="258" fill="none" stroke="#1b1f2a" stroke-width="8"/>
      <rect x="192" y="46" width="6" height="258" fill="#1b1f2a"/>

      <!-- desk -->
      <rect x="0" y="380" width="960" height="160" fill="url(#deskWood)"/>
      <rect x="0" y="378" width="960" height="4" fill="#3a2a1c"/>
      <ellipse class="intro-pool" cx="600" cy="420" rx="330" ry="90" fill="url(#deskPool)"/>

      <!-- papers, a glass, a hat -->
      <g class="intro-props">
        <rect x="300" y="405" width="150" height="90" fill="#cfc6b0" transform="rotate(-6 375 450)"/>
        <rect x="320" y="415" width="150" height="90" fill="#e2dac6" transform="rotate(3 395 460)"/>
        <g stroke="#6a6250" stroke-width="1.4" opacity=".6"><line x1="335" y1="440" x2="440" y2="437"/><line x1="337" y1="452" x2="430" y2="449"/><line x1="339" y1="464" x2="445" y2="461"/></g>
        <path d="M770 395 l6 70 h44 l6 -70z" fill="#3b3a44" opacity=".9"/><ellipse cx="796" cy="395" rx="28" ry="6" fill="#4a4955"/>
        <ellipse cx="796" cy="430" rx="20" ry="4" fill="#b98a3c" opacity=".55"/>
        <path d="M130 470 q60 -40 130 -10 q-20 40 -60 44 q-50 4 -70 -34z" fill="#1a1a1f"/><ellipse cx="180" cy="462" rx="46" ry="14" fill="#101014"/>
      </g>

      <!-- telephone -->
      <g class="intro-phone" transform="translate(560 356)">
        <rect x="-70" y="30" width="140" height="44" rx="10" fill="#15151a" stroke="#2c2c34" stroke-width="2"/>
        <circle cx="0" cy="52" r="20" fill="#0d0d11" stroke="#3a3a44" stroke-width="2"/>
        <circle cx="0" cy="52" r="12" fill="#1c1c22"/>
        <g class="intro-handset">
          <rect x="-84" y="0" width="168" height="18" rx="9" fill="#1e1e25" stroke="#35353f" stroke-width="2"/>
          <rect class="intro-gleam" x="-70" y="3" width="140" height="4" rx="2" fill="#d9b25a" opacity="0"/>
          <ellipse cx="-78" cy="10" rx="20" ry="13" fill="#1e1e25" stroke="#35353f" stroke-width="2"/>
          <ellipse cx="78" cy="10" rx="20" ry="13" fill="#1e1e25" stroke="#35353f" stroke-width="2"/>
          <path class="intro-cord" d="M-60 20 q-10 30 0 60 q10 30 0 60" fill="none" stroke="#2c2c34" stroke-width="3"/>
        </g>
      </g>

      <!-- the lamp and its light -->
      <g class="intro-lamp" transform="translate(700 300)">
        <rect x="-4" y="-40" width="8" height="120" fill="#2a2a33"/>
        <path d="M-4 -40 q30 -60 90 -50 l0 8 q-55 -6 -82 46z" fill="#2a2a33"/>
        <path class="intro-shade" d="M40 -100 l-60 60 h150 l-40 -60z" fill="#3a3320" stroke="#4a4230" stroke-width="2"/>
        <path class="intro-cone" d="M-30 -40 l-250 380 h520 l-150 -380z" fill="url(#lampCone)"/>
        <rect x="-6" y="80" width="80" height="6" rx="3" fill="#2a2a33"/>
      </g>

      <!-- a hand, for the answer -->
      <g class="intro-hand" transform="translate(700 720)">
        <path d="M0 0 q-40 -60 -30 -110 q10 -30 30 -10 l10 30 q10 -30 30 -10 l4 32 q12 -22 26 -4 l0 40 q10 -18 22 -2 l-10 80z" fill="#0b0b0e"/>
      </g>

      <!-- vignette -->
      <rect width="960" height="540" fill="url(#deskPool)" opacity="0"/>
    </svg>
    <div class="intro-caption">
      <span class="intro-time"></span>
      <span class="intro-skip">Click to skip</span>
    </div>
  </div>`;
}

export interface IntroRun { cancel: () => void }

/**
 * Plays the sequence on the mounted `.intro` element and resolves when the
 * receiver is up. Returns a cancel that jumps straight to the end.
 */
export function runIntro(root: HTMLElement, foley: Foley | null, caption: string, onDone: () => void): IntroRun {
  const el = root.querySelector<HTMLElement>('.intro');
  if (!el || reduceMotion()) { el?.remove(); onDone(); return { cancel: () => {} }; }
  const timers: ReturnType<typeof setTimeout>[] = [];
  let done = false;
  const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const time = el.querySelector<HTMLElement>('.intro-time');
  if (time) time.textContent = caption;

  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    foley?.stop();
    const v = el.querySelector<HTMLVideoElement>('.intro-video');
    if (v) { try { v.pause(); } catch { /* ignore */ } }
    el.classList.add('is-over');
    setTimeout(() => el.remove(), 1300);
    onDone();
  };

  // The film, when it is there and the browser will play it. Its own foley
  // is on the soundtrack, so the synthesised one stays quiet.
  const video = el.querySelector<HTMLVideoElement>('.intro-video');
  const drawn = () => { video?.remove(); el.classList.add('is-drawn'); drawnTimeline(); };
  const drawnTimeline = () => {
    at(200, () => { el.classList.add('is-walking'); foley?.footsteps(9, 320); });
    at(3400, () => { el.classList.add('is-lit'); foley?.lampClick(); });
    at(4200, () => { el.classList.add('is-answered'); foley?.answer(); });
    at(5200, finish);
  };
  if (video) {
    let started = false;
    video.addEventListener('ended', finish);
    video.addEventListener('error', () => { if (!done && !started) drawn(); });
    video.addEventListener('playing', () => { started = true; el.classList.add('is-film', 'is-walking'); });
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => { if (!done) drawn(); });
    // A browser that will not run the soundtrack sits at frame zero with
    // 'playing' fired. Mute it and let the room's foley stand in.
    at(1800, () => {
      if (done || !started || video.currentTime > 0.15) return;
      video.muted = true;
      void video.play().catch(() => {});
      foley?.footsteps(9, 300);
      timers.push(setTimeout(() => foley?.lampClick(), 3600));
    });
    // If nothing has started in a few seconds (slow network), fall back.
    // The film is nine megabytes now; give a slow line time to reach the
    // first frames before giving up on it.
    at(8000, () => { if (!started && !done) drawn(); });
    return { cancel: finish };
  }

  // No film: the drawn scene.
  drawnTimeline();

  return { cancel: finish };
}
