import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Missing #game-canvas element.');

const game = new Game(canvas);
if (navigator.webdriver || location.search.includes('debug')) (window as unknown as { __GAME__: Game }).__GAME__ = game;
game.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose());
}
