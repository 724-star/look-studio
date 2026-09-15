/* LOOK STUDIO 桌面版外壳（Electron）
   只做一件事：把本地界面装进一个干净的窗口。所有逻辑仍在本地运行。 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow(){
  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: 'Look Studio · 穿搭摄影棚',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  // 站外链接交给系统浏览器，应用内只跑本地页面
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file://')) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
