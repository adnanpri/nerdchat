console.log('webview preload script running')

// FROM: https://github.com/kenxjy/whatsapp-electron/blob/master/src/preload.js

window.navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length) {
        for (const registration of registrations) {
            registration.unregister();
        }

        window.location.reload()
    }
})


// https://github.com/getferdi/ferdi/blob/develop/src/models/UserAgent.js

