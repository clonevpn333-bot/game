import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Missing #game-canvas element.');

const lab = new URLSearchParams(location.search).get('lab');
if (lab) {
  document.body.classList.add('lab');
  void import('./lab/Lab').then((m) => m.runLab(canvas, lab));
} else {
  void import('./game/Game').then(({ Game }) => {
    const game = new Game(canvas);
    if (navigator.webdriver || location.search.includes('debug')) (window as unknown as { __GAME__: unknown }).__GAME__ = game;
    game.start();
    if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());
  });
}
