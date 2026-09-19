import { App } from './ui/app.js';

const root = document.getElementById('app');
window.__ashgrave = new App(root);

// Voices only warm up after a user gesture in most browsers.
window.addEventListener('pointerdown', function warm() {
  window.removeEventListener('pointerdown', warm);
  try { window.speechSynthesis?.getVoices(); } catch { /* ignore */ }
}, { once: true });
