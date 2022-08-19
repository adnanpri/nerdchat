// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, Menu, MenuItem, session, shell, webContents} = require('electron')
const path = require('path')
const { contextIsolated } = require('process')
const contextMenu = require('electron-context-menu');

const fs = require('fs')
var https = require('https');

const appMenu = require('./menu.js');
const { url } = require('inspector');

/// Helpers

let devlog = (...args) => (process.env.DEBUG)? console.log(...args):null

let pDownload = async function(url, dest) {
  try {
    if (fs.existsSync(dest)) {
      return dest
    }
  } catch(err) {
    console.error(err)
  }

  var file = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    var responseSent = false; // flag to make sure that response is sent only once.
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () =>{
        file.close(() => {
          if(responseSent)  return;
          responseSent = true;
          resolve(dest);
        });
      });
    }).on('error', err => {
        if(responseSent)  return;
        responseSent = true;
        reject(err);
    });
  });
}

let nerdDir = (dest) => {
  return app.getPath('home') + '/.config/NerdChat/' + dest
}

// App

let window = {}

let menuTpl = appMenu.getTemplate()

function createWindow () {

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer/preload.js'),
      webviewTag: true,
      nodeIntegration: true,
      enableRemoteModule: true,
      autoHideMenuBar: true,
      spellcheck: true,
    },
    icon: path.join(__dirname, 'renderer/res/nerdchat.png')
  })

  mainWindow.setMenuBarVisibility(false)

  // and load the index.html of the app.
  mainWindow.loadFile('renderer/index.html')

  // Open the DevTools.
  if (process.env.DEBUG) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.setAutoHideMenuBar(true)

  mainWindow.webContents.on('will-navigate', function(e, reqUrl) {
    let hostGoing = new URL(reqUrl).hostname
    let hostCurrent = new URL(mainWindow.webContents.getURL()).hostname
    devlog(hostGoing, hostCurrent)

    if (hostGoing != hostCurrent) {
      e.preventDefault();
      shell.openExternal(reqUrl);
    }
  })

  return mainWindow
}

app.on("web-contents-created", (e, contents) => {

  devlog(contents)
  contents.on('new-window', (e, url) => {
    shell.openExternal(url)
    e.preventDefault()
  })

  if (contents.getType() == "webview") {
      contextMenu({
          // @TODO: fix potential problems here
          // hack to make electron-dl work as it expects window.webContents !== undefined
          // potential issues with electron-context-menu listeners
          window: { webContents: contents },
          // prepend: (defaultActions, params, mainWindow) => [
          //     // Can add custom right click actions here
          // ], 
          showInspectElement: false,
          showSaveImageAs: true,
        },
      );
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  window = createWindow()

  window.maximize()

  // devlog(window.getBounds(), Menu.getApplicationMenu())

  console.log(menuTpl)

  menuTpl[appMenu.getViewIndex()].submenu.push({
    role: 'zoom',
    label: 'Zoom in',
    accelerator: 'CmdOrCtrl+Plus',
    click: () => {
      devlog('Pressed zoomie')
      window.webContents.send('zoomChanged', 1)
    },
  })

  menuTpl[appMenu.getViewIndex()].submenu.push({
    role: 'zoom',
    accelerator: 'CmdOrCtrl+-',
    label: 'Zoom out',
    click: () => {
      devlog('Pressed zoomie')
      window.webContents.send('zoomChanged', -1)
    },
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTpl))
  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      window = createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let ipcHandlers = {
  addShortcuts: (msg) => {

    let svcSubs = []

    for (let i = 1; i <= msg.length; i++) {
      svcSubs.push({
        role: 'shortcut',
        label: msg[i-1].title,
        accelerator: 'CmdOrCtrl+' + i,
        click: () => {
          devlog('Pressed shortcut ' + i)
          window.webContents.send('shortcutHit', i)
        }
      })
    }

    menuTpl[appMenu.getServicesIndex()].submenu = svcSubs

    let viewSubs = [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: async () => {
          devlog('Pressed shortcut CmdOrCtrl+R')
          window.webContents.send('shortcutHit', 'reload')
        }
      },
      ...menuTpl[appMenu.getViewIndex()].submenu
    ]
    // viewSubs.prepend()

    menuTpl[appMenu.getViewIndex()].submenu = viewSubs

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTpl))

    return true
  },
  getFaviconSync: async(msg) => {

    try {
      let iconUrl = 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://' + msg.url + '&size=32'

      let res = await pDownload(iconUrl, nerdDir('favicon/') + msg.url + '.png')

      devlog(res)

      return res
    } catch (e) {
      console.error(e)
    }
  },
}

ipcMain.on('ipcMsgSend', (_event, msg) => {

  devlog(_event, msg)

  if (msg.msgId == undefined
    || msg.handler == undefined
    || msg.payload == undefined) {
      devlog('bad ipc message')
      return
    }

  if (ipcHandlers[msg.handler] == undefined) {
    devlog('no ipc handler found for ' + msg.handler)
    return
  }

  let r = ipcHandlers[msg.handler](msg.payload)

  // check if handler returns promise
  if (typeof r == 'object'
  && typeof r.then == 'function') {
    r.then(res => {
      _event.sender.send('ipcMsgResp', {
        msgId: msg.msgId,
        results: res,
      })
    })
  } else {
    _event.sender.send('ipcMsgResp', {
      msgId: msg.msgId,
      results: r,
    })
  }
})