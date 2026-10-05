import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Missing #game-canvas element.');

// Let the loading card paint before the (synchronous) world generation runs.
requestAnimationFrame(() => {
  setTimeout(() => {
    const game = new Game(canvas);
    game.start();
    if (import.meta.env.DEV) (window as unknown as { __GAME__: Game }).__GAME__ = game;
    if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
  }, 30);
});
