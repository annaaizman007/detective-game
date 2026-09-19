// Atmosphere. Rain, grain, flicker, typewriter. All cheap, all cancellable,
// and all disabled in one place when the player asks for less motion.

export const reduceMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  || localStorage.getItem('ashgrave.motion') === 'off';

export function startRain(canvas) {
  const ctx = canvas.getContext('2d');
  let drops = [];
  let raf = null;
  let w = 0, h = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((w * h) / 9000);
    drops = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      len: 8 + Math.random() * 18,
      v: 380 + Math.random() * 520,
      a: 0.06 + Math.random() * 0.2,
    }));
  };

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (const d of drops) {
      d.y += d.v * dt;
      d.x += d.v * dt * 0.12;
      if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
      if (d.x > w) d.x = -2;
      ctx.strokeStyle = `rgba(173,196,214,${d.a})`;
      ctx.lineWidth = d.a > 0.17 ? 1.3 : 0.8;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.12, d.y + d.len);
      ctx.stroke();
    }
    raf = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize);
  if (!reduceMotion()) raf = requestAnimationFrame(frame);

  return {
    stop() { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
  };
}

/** Types text out character by character; returns a cancel function. */
export function typewriter(el, text, { speed = 18, onDone } = {}) {
  if (reduceMotion()) { el.textContent = text; onDone?.(); return () => {}; }
  el.textContent = '';
  let i = 0;
  let stopped = false;
  const step = () => {
    if (stopped) return;
    // Bursty, like a real machine.
    const take = text[i] === ' ' ? 2 : 1;
    el.textContent = text.slice(0, (i += take));
    if (i < text.length) setTimeout(step, speed + (Math.random() * speed * 0.8));
    else onDone?.();
  };
  setTimeout(step, 90);
  return () => {
    stopped = true;
    el.textContent = text;
  };
}

/** Briefly flashes an element -- used when a clue lands. */
export function pulse(el, cls = 'is-pulsing', ms = 900) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/** A one-shot full-screen wash of colour for big beats. */
export function flash(kind = 'clue') {
  if (reduceMotion()) return;
  const el = document.createElement('div');
  el.className = `screen-flash flash-${kind}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}
