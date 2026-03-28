import { app, BrowserWindow, shell, session, ipcMain } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as si from 'systeminformation';

const BACKEND = 'https://get-order-stack-restaurant-backend.onrender.com';

const CSP = [
  "default-src 'self' file:",
  "script-src 'self' file: 'unsafe-inline'",
  `connect-src 'self' ${BACKEND} ${BACKEND.replace('https://', 'wss://')}`,
  "img-src 'self' file: data: blob:",
  "font-src 'self' file: data:",
  "style-src 'self' file: 'unsafe-inline'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const isDev = process.env['NODE_ENV'] === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'OrderStack Back Office',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(
      __dirname,
      '../../dist/orderstack-back-office/browser/index.html'
    );
    mainWindow.loadURL(pathToFileURL(indexPath).toString());
  }

  // Open anchor-tag navigations to external URLs in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('get-device-info', async () => {
  const [system, nics, os] = await Promise.all([
    si.system(),
    si.networkInterfaces(),
    si.osInfo(),
  ]);
  const primaryNic = (Array.isArray(nics) ? nics : [nics])
    .find((n) => !n.virtual && n.mac !== '00:00:00:00:00:00');
  return {
    biosUuid: system.uuid,
    macAddress: primaryNic?.mac ?? null,
    hostname: os.hostname,
    platform: process.platform,
  };
});

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
      },
    });
  });

  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit on all windows closed (except macOS — standard behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
