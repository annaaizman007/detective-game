import './styles/core.css';
import './styles/game.css';
import './styles/documents.css';
import './styles/dialogue.css';
import './styles/journal.css';
import { App } from './ui/app';

const root = document.getElementById('app');
const stage = document.getElementById('stage');
if (root && stage) {
  const app = new App(root, stage);
  // For poking at from the console.
  (window as unknown as { __ashgrave: App }).__ashgrave = app;
  // eslint-disable-next-line no-console
  if (import.meta.env.DEV) window.addEventListener('error', (e) => console.log('ERR', String((e.error as Error)?.stack).split('\n').slice(0, 7).join(' | ')));
}

// Offline after the first visit. Registration is best-effort: a dev server
// or a file:// open simply has no worker.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  // A new build took over from an old one: reload once so the page and its
  // chunks match. (Not on the very first visit, when there was no old one.)
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloaded) return; reloaded = true; window.location.reload(); });
}
