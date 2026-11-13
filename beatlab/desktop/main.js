// BeatLab for Mac — Electron shell: native window, menu bar, Save dialogs and .beatlab file opening.
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const isMac = process.platform === 'darwin';
let win = null;
let pendingOpen = [];
let pageReady = false;

function send(cmd) {
  if (win) win.webContents.send('menu', cmd);
}

function buildMenu() {
  const item = (label, cmd, accelerator) => ({ label, accelerator, click: () => send(cmd) });
  const template = [
    ...(isMac ? [{
      label: 'BeatLab',
      submenu: [
        { role: 'about' }, { type: 'separator' },
        { role: 'services' }, { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        item('New Project…', 'new', 'CmdOrCtrl+N'),
        item('Open…', 'open', 'CmdOrCtrl+O'),
        item('Open File…', 'importProject', 'CmdOrCtrl+Shift+O'),
        { type: 'separator' },
        item('Save', 'save', 'CmdOrCtrl+S'),
        item('Save As…', 'saveAs', 'CmdOrCtrl+Shift+S'),
        item('Save Project File…', 'exportProject'),
        { type: 'separator' },
        item('Import Audio…', 'importAudio', 'CmdOrCtrl+I'),
        item('Import Sound Pack…', 'importPack', 'CmdOrCtrl+Shift+I'),
        { type: 'separator' },
        item('Export Mixdown…', 'export', 'CmdOrCtrl+E'),
        item('Export Stems…', 'exportStems', 'CmdOrCtrl+Shift+E'),
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        item('Undo', 'undo', 'CmdOrCtrl+Z'),
        item('Redo', 'redo', 'CmdOrCtrl+Shift+Z'),
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'Transport',
      submenu: [
        item('Play / Stop        Space', 'play'),
        item('Go to Start        Return', 'start'),
        { type: 'separator' },
        item('Pattern Mode', 'patternMode'),
        item('Song Mode', 'songMode'),
      ],
    },
    {
      label: 'View',
      submenu: [
        item('Show / Hide Browser', 'browser', 'CmdOrCtrl+Alt+B'),
        { type: 'separator' },
        item('Channel Rack', 'rack', 'F6'),
        item('Piano Roll', 'roll', 'F7'),
        item('Sample Lab', 'lab', 'F8'),
        item('Mixer', 'mix', 'F9'),
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [item('How BeatLab Works', 'help')],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 620,
    title: 'BeatLab',
    backgroundColor: '#1b1b1d',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 20 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('did-finish-load', () => { pageReady = true; const list = pendingOpen; pendingOpen = []; list.forEach(openFile); });
  win.on('closed', () => { win = null; pageReady = false; });
}

async function openFile(filePath) {
  if (!win || !pageReady) { pendingOpen.push(filePath); return; }
  try {
    const data = await fs.readFile(filePath);
    win.webContents.send('open-file', { name: path.basename(filePath), data: new Uint8Array(data) });
  } catch (e) {
    dialog.showErrorBox('Could not open file', String(e.message || e));
  }
}

ipcMain.handle('save-file', async (_e, { name, bytes }) => {
  const ext = path.extname(name).slice(1);
  const kinds = { wav: 'WAV Audio', zip: 'Zip Archive', beatlab: 'BeatLab Project', json: 'JSON' };
  const res = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath(ext === 'beatlab' ? 'documents' : 'music'), name),
    filters: kinds[ext] ? [{ name: kinds[ext], extensions: [ext] }] : [],
  });
  if (res.canceled || !res.filePath) return { saved: false };
  await fs.writeFile(res.filePath, Buffer.from(bytes));
  return { saved: true, name: path.basename(res.filePath) };
});

ipcMain.on('set-title', (_e, title) => {
  if (!win) return;
  win.setTitle(title);
  if (isMac) win.setDocumentEdited(/ — Edited$/.test(title));
});

app.on('open-file', (e, filePath) => { e.preventDefault(); openFile(filePath); });

app.whenReady().then(async () => {
  app.setName('BeatLab');
  buildMenu();
  createWindow();
  const arg = process.argv.slice(1).find((a) => /\.beatlab$/i.test(a));
  if (arg) openFile(arg);
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (!isMac) app.quit(); });
