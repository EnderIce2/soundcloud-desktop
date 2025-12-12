// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scBridge', {
  requestScan: () => ipcRenderer.send('sc-request-scan')
});

(() => {
  const logLocal = (...args) => {
    try { console.debug('[sc-preload]', ...args); } catch { }
    try { ipcRenderer.send('sc-debug', { ts: Date.now(), args: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))) }); } catch { }
  };

  function safeText(el) { try { return el?.innerText?.trim() || el?.textContent?.trim() || null; } catch (e) { return null; } }

  function parseJSONLDForAlbum() {
    try {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          console.log(s.textContent);
          const data = JSON.parse(s.textContent);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item?.inAlbum) {
              const a = item.inAlbum;
              if (typeof a === 'string') return a;
              if (a?.name) return a.name;
              if (a?.title) return a.title;
            }
            if (item?.album) {
              const a = item.album;
              if (typeof a === 'string') return a;
              if (a?.name) return a.name;
              if (a?.title) return a.title;
            }
            if (item?.name && item['@type'] === 'MusicAlbum') {
              return item.name;
            }
          }
        } catch (e) {
        }
      }
    } catch (e) { }
    return null;
  }

  function buildFromMediaSession() {
    try {
      const m = navigator.mediaSession && navigator.mediaSession.metadata;
      if (!m)
        return null;

      const artwork = (m.artwork && m.artwork[0] && m.artwork[0].src) || null;
      const album = m.album || m.albumTitle || null;

      return {
        source: 'mediaSession',
        title: m.title || null,
        artist: m.artist || null,
        album: album,
        artwork,
        isPlaying: !!(document && document.querySelector('audio') ? !document.querySelector('audio').paused : true)
      };
    } catch (e) {
      return null;
    }
  }

  function buildFromMetaTags() {
    try {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content || null;
      const ogImage = document.querySelector('meta[property="og:image"]')?.content || null;
      const ogDesc = document.querySelector('meta[property="og:description"]')?.content || null;
      const musicAlbum = document.querySelector('meta[property="music:album"]')?.content || null;
      if (!ogTitle && !ogImage)
        return null;

      let title = ogTitle, artist = null;
      if (ogDesc)
        artist = ogDesc.split('•')[0]?.trim() || null;

      if (musicAlbum) album = musicAlbum;

      return { source: 'og', title, artist, artwork: ogImage, isPlaying: true };

    } catch (e) { return null; }
  }

  function buildFromSoundCloudDOM() {
    try {
      const titleEl = document.querySelector('.playbackSoundBadge__titleLink, .playbackSoundBadge__title a, .listenTitle__title');
      const artistEl = document.querySelector('.playbackSoundBadge__lightLink, .listenTitle__username, .soundTitle__username a');
      const artEl = document.querySelector('.image__full img, .sound__coverArt img, .playbackSoundBadge__image img') || document.querySelector('.image__full, .sound__coverArt, .playbackSoundBadge__image');
      const albumEl = document.querySelector('.soundTitle__secondary .sc-link-collection, .sc-link-collection, .soundTitle__playlistTitle, .playbackSoundBadge__secondLine');
      const title = safeText(titleEl) || null;
      const artist = safeText(artistEl) || null;
      const album = safeText(albumEl) || null;
      let artwork = null;

      if (artEl) {
        artwork = artEl.src || artEl.getAttribute && artEl.getAttribute('src') || null;
      }

      if (!title && !artist && !artwork && !album)
        return null;

      const audio = document.querySelector('audio');
      const isPlaying = audio ? !audio.paused : !!document.querySelector('.playing, .playControl.playing');
      return { source: 'dom', title, artist, album, artwork, isPlaying };

    } catch (e) { return null; }
  }

  function scanTrack() {
    const candidates = [
      parseJSONLDForAlbum(),
      buildFromMediaSession(),
      buildFromSoundCloudDOM(),
      buildFromMetaTags()
    ];
    for (const c of candidates) if (c && (c.title || c.artist || c.album || c.artwork)) return c;
    return null;
  }

  let lastKey = null;
  function maybeSend(payload) {
    if (!payload) {
      logLocal('scan -> no payload');
      return;
    }

    const key = `${payload.title || ''}::${payload.artist || ''}::${payload.artwork || ''}::${payload.isPlaying ? 1 : 0}`;

    if (key === lastKey) {
      return;
    }

    lastKey = key;
    logLocal('TRACK_UPDATE', payload);

    try {
      ipcRenderer.send('sc-track-update', payload);
    } catch (e) {
      logLocal('ipc send error', e);
    }
  }

  function doScan() {
    try {
      const payload = scanTrack();
      maybeSend(payload);
    } catch (e) {
      logLocal('scan error', e && (e.stack || e.message || e));
    }
  }

  doScan();
  const interval = setInterval(doScan, 2000);

  try {
    const mo = new MutationObserver(() => doScan());
    mo.observe(document, { childList: true, subtree: true });
  } catch (e) {
    logLocal('MutationObserver not allowed', e && e.message);
  }

  ipcRenderer.on('sc-request-scan', () => {
    logLocal('manual scan requested');
    doScan();
  });
})();

// Expose window control methods to the renderer process
window.electronAPI = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
};

// Inject dark mode scrollbar CSS into the page
const style = document.createElement('style');
style.textContent = `
  * {
    scrollbar-color: #444 #1a1a1a;
    scrollbar-width: thin;
  }

  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  ::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 6px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

document.addEventListener('DOMContentLoaded', () => { document.head.appendChild(style); });
if (document.head) { document.head.appendChild(style); }
