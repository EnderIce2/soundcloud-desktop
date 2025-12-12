// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { ipcRenderer } = require('electron');

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
