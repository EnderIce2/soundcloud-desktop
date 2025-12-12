const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const RPC = require('discord-rpc');

const DISCORD_CLIENT_ID = '1449083750217416734';
RPC.register(DISCORD_CLIENT_ID);
const rpc = new RPC.Client({ transport: 'ipc' });
let started = false;

async function connectRPC() {
  // console.log(started);
  if (started)
    return;

  try {
    await rpc.login({ clientId: DISCORD_CLIENT_ID });
    started = true;
    console.log('Discord RPC connected');
  } catch (err) {
    console.warn('RPC connect error:', err);
  }
}

const PID = process.pid;

// track = { title, artist, artwork, durationSec, startTimestampMs }
async function setListeningPresence(track) {
  await connectRPC();
  if (!started) return;

  const start = Math.floor((track.startTimestampMs || Date.now()) / 1000);
  const end = track.durationSec ? start + Math.floor(track.durationSec) : undefined;
  console.log('start:', start, ' end:', end, ' rpc:', end ? { start, end } : { start });

  const activity = {
    details: track.title || 'Unknown track',
    state: track.artist || '',
    timestamps: end ? { start, end } : { start },
    assets: {
      large_image: track.artwork || undefined,
      large_text: track.album
    },
    instance: false,
    type: 2 // 2 = LISTENING
  };

  const legacy = {
    details: activity.details,
    state: activity.state,
    startTimestamp: activity.timestamps.start,
    endTimestamp: activity.timestamps.end,
    largeImageKey: track.artwork || undefined,
    largeImageText: track.album,
    type: 2 // 2 = LISTENING
  };

  try {
    if (typeof rpc.request === 'function') {
      try {
        await rpc.request('SET_ACTIVITY', { pid: PID, activity });
        console.log('rpc.request SET_ACTIVITY sent (activity.type=2)');
        return;
      } catch (e) {
        console.warn('rpc.request SET_ACTIVITY failed, falling back:', e && e.message);
      }
    }

    if (typeof rpc.setActivity === 'function') {
      try {
        await rpc.setActivity(legacy);
        console.log('rpc.setActivity sent (legacy) with type=2');
        return;
      } catch (e) {
        console.warn('rpc.setActivity failed, trying updatePresence:', e && e.message);
      }
    }

    if (typeof rpc.updatePresence === 'function') {
      try {
        await rpc.updatePresence(activity);
        console.log('rpc.updatePresence sent (activity.type=2)');
        return;
      } catch (e) {
        console.warn('rpc.updatePresence failed:', e && e.message);
      }
    }

    console.warn('No RPC method succeeded to set activity');
  } catch (err) {
    console.warn('Failed to set presence:', err);
  }
}

async function clearPresence() {
  try {
    if (!started)
      return;

    if (typeof rpc.clearActivity === 'function') {
      await rpc.clearActivity();
    } else if (typeof rpc.setActivity === 'function') {
      await rpc.setActivity({});
    }

    console.log('Presence cleared');
  } catch (e) {
    console.warn('clearPresence error', e);
  }
}

module.exports = { setListeningPresence, clearPresence, connectRPC };

ipcMain.on('sc-debug', (ev, msg) => {
  try {
    console.log('[sc-debug]', new Date(msg.ts).toISOString(), ...(msg.args || []));
  } catch (e) {
    console.log('[sc-debug] malformed', msg);
  }
});

ipcMain.on('sc-track-update', (ev, track) => {
  console.log('[sc-track-update]', {
    title: track.title || null,
    artist: track.artist || null,
    album: track.album || null,
    artwork: track.artwork || null,
    isPlaying: !!track.isPlaying,
    source: track.source || null
  });
  setListeningPresence(track)
});

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
      contextIsolation: true,
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
