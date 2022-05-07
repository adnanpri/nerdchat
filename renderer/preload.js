const {contextBridge, net, ipcRenderer} = require('electron')
const { webFrame } = require('electron')

let devlog = (...args) => (process.env.DEBUG)? console.log(...args):null

let ipcCallbackTable = {}

let services = []

let shortcutHandler = (key) => { devlog('handler unassigned for key: ' + key) }
let zoomHandler = (zoomLevel) => { devlog('handler unassigned for zoom: ' + zoomLevel) }

contextBridge.exposeInMainWorld('mainApp', {
  isDebug: () => {
    return process.env.DEBUG 
  },
  getServiceSuggestions: () => {
    return [
        {
          title: 'WhatsApp',
          url: 'https://web.whatsapp.com',
          runPreloadScript: true,
        },
        {
          title: 'Messenger',
          url: 'https://messenger.com',
        },
        {
          title: 'Gmail',
          url: 'https://mail.google.com',
        },
        {
          title: 'Discord',
          url: 'https://discord.com',
        },
        {
          title: 'Trello',
          url: 'https://trello.com',
        },
      ]
    },
    getServices: () => {
    try {
      services = JSON.parse(localStorage.getItem('services'))
    } catch (e) {
      devlog(e)
    }

    if (services == null
      || services == undefined) {
        services = []
        return []
      }
  
    return services
  },

  addService: (svc) => {
    devlog(services, svc)
    services.push(svc)

    try {
      localStorage.setItem('services', JSON.stringify(services)) 
    } catch (e) {
      devlog(e)
      return []
    }

    return services
  },

  deleteService: (i) => {
    devlog('beforeDel', services, i)
    services.splice(i, 1)
    devlog('afterDel', services, i)

    try {
      localStorage.setItem('services', JSON.stringify(services)) 
    } catch (e) {
      devlog(e)
      return []
    }

    return services
  },

  updateService: (svc, index) => {
    if (services[index] == null
      || services[index] == undefined) {
        devlog('bad service index')
        return services
      }

      services[index].id = svc.id
      services[index].icon = svc.icon
      services[index].url = svc.url
      services[index].title = svc.title
      services[index].notifications = svc.notifications
      services[index].runPreloadScript = svc.runPreloadScript

      try {
        localStorage.setItem('services', JSON.stringify(services)) 
      } catch (e) {
        devlog(e)
        return []
      }
  
      return services  
  },
  // generic interface for calling main
  ipcCall: (msg, handler) => {
    devlog('ipc called with ', msg)
    ipcCallbackTable[msg.msgId] = handler
    ipcRenderer.send('ipcMsgSend', msg)
  },
  registerShortcutsHandler: (fn) => {
    shortcutHandler = fn
  },
  registerZoomHandler: (fn) => {
    zoomHandler = fn
  },
})

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {

  // handle ipc response from main
  ipcRenderer.on('ipcMsgResp', (_event, response) => {
    devlog(ipcCallbackTable)

    ipcCallbackTable[response.msgId](response)

    delete ipcCallbackTable[response.msgId]
  })

  // for messages that don't come through the broker
  // as a response. i.e. main -> renderer only
  ipcRenderer.on('shortcutHit', (_event, key) => {
    devlog(_event, key)
    shortcutHandler(key)
  })

  ipcRenderer.on('zoomChanged', (_event, zoomLevel) => {
    devlog(_event, zoomLevel)
    zoomHandler(zoomLevel)
  })
})
