const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const RPC = require('discord-rpc');

const DISCORD_CLIENT_ID = '1449083750217416734';
RPC.register(DISCORD_CLIENT_ID);
const rpc = new RPC.Client({ transport: 'ipc' });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.resolve(__dirname, 'logo.png'),
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      userAgent: 'soundcloud-desktop/1.0.0',
      contextIsolation: false,
    },
  });

  // Load SoundCloud as the main page
  mainWindow.loadURL('https://soundcloud.com');

  // Hide menu bar by default
  mainWindow.autoHideMenuBar = true;
  mainWindow.menuBarVisible = false;

  // Show menu bar when ALT is pressed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'alt') { mainWindow.menuBarVisible = !mainWindow.menuBarVisible; }
  });

  // I hate these banners
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
    const removeElements = () => {
      const selectors = [ '.l-product-banners.l-inner-fullwidth' ];
      selectors.forEach(sel => { document.querySelectorAll(sel).forEach(el => el.remove()); });
    };

    removeElements();
    const observer = new MutationObserver(() => { removeElements(); });
    observer.observe(document.body, { childList: true, subtree: true });

    // const header = document.querySelector('.header__inner.l-container.l-fullwidth');
    // if (header && !document.getElementById('window-controls')) {
    //   const controls = document.createElement('div');
    //   controls.id = 'window-controls';
    //   controls.style.cssText = 'display: flex; gap: 0; margin-left: auto; align-items: center;';
      
    //   // Minimize button
    //   const minBtn = document.createElement('div');
    //   minBtn.style.cssText = 'width: 36px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #999;';
    //   minBtn.innerHTML = '<svg aria-hidden="true" role="img" width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" width="10" height="1" x="1" y="6"></rect></svg>';
    //   minBtn.onclick = () => window.electronAPI.minimize();
      
    //   // Maximize button
    //   const maxBtn = document.createElement('div');
    //   maxBtn.style.cssText = 'width: 36px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #999;';
    //   maxBtn.innerHTML = '<svg aria-hidden="true" role="img" width="12" height="12" viewBox="0 0 12 12"><rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor"></rect></svg>';
    //   maxBtn.onclick = () => window.electronAPI.maximize();
      
    //   // Close button
    //   const closeBtn = document.createElement('div');
    //   closeBtn.style.cssText = 'width: 36px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #999;';
    //   closeBtn.innerHTML = '<svg aria-hidden="true" role="img" width="12" height="12" viewBox="0 0 12 12"><polygon fill="currentColor" fill-rule="evenodd" points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"></polygon></svg>';
    //   closeBtn.onclick = () => window.electronAPI.close();
      
    //   controls.appendChild(minBtn);
    //   controls.appendChild(maxBtn);
    //   controls.appendChild(closeBtn);
    //   header.appendChild(controls);
    // }
  `);
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.minimize();
});

ipcMain.on('window-maximize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.close();
});
