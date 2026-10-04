import '@fontsource/barlow-condensed/300.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow/300.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import './styles.css';
import { Abort, Game } from './game/Game';
import { reportError } from './core/Report';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const ui = document.querySelector<HTMLElement>('#ui')!;
// Abort is how a chapter cancels its own in-flight script steps; it is not an error
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason instanceof Abort) e.preventDefault();
  else if (!document.getElementById('boot-msg')) reportError('async', e.reason);
});
window.addEventListener('error', (e) => {
  if (!document.getElementById('boot-msg')) reportError('script', e.error ?? e.message);
});
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  reportError('graphics', new Error('The graphics card reset (WebGL context lost). Try Graphics: Low in Settings, close other heavy tabs, and reload.'));
});

const game = new Game(canvas, ui);
// a failed boot leaves the overlay up and its error handler explains why
void game.boot().then(() => document.getElementById('boot-msg')?.remove());
