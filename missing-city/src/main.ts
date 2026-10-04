import '@fontsource/barlow-condensed/300.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow/300.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const ui = document.querySelector<HTMLElement>('#ui')!;
const game = new Game(canvas, ui);
void game.boot();
