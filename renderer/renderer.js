// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


// Helpers

let $ = (selector) => document.querySelector(selector)
let $$ = (selector) => document.querySelectorAll(selector)
let devlog = (...args) => (mainApp.isDebug())? console.log(...args):null

// https://stackoverflow.com/a/8809472
function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function msg(handler, payload) {
	return {
		msgId: generateUUID(),
		handler: handler,
		payload: payload,
	}
}

// https://stackoverflow.com/a/57763036
function debounce(callback, wait) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout)
		timeout = setTimeout(function () { callback.apply(this, args); }, wait)
	}
}

// App logic

// @TODO: clean this up, state leakage everywhere :S

let tabs = mainApp.getServices()

let settingsModal = $('#settingsModal')

let settingsEditModal = $('#settingsEditModal')
let settingsText = $('#settingsText')

let selectorsContainer = $('.tabsSelectors')

let webviewContainer = $('#webviewContainer')

let currentTabIndex = undefined

// @TODO fix naming jeez
let showEditSettingsModal = () => {
	let json = 'error parsing services'

	try {
		json = JSON.stringify(tabs, null, 2)
	} catch (error) {
		console.log('error parsing services on edit', error)
	}

	settingsText.value = json

	settingsEditModal.style.display = 'block'
}

let showSettingsModalAdd = () => {
	$('#tabSettingsId').value = generateUUID()
	$('#tabSettingsUrl').value = ''
	$('#tabSettingsFavicon').value = ''
	$('#tabSettingsTitle').value = ''
	$('#tabSettingsNotifications').checked = true
	$('#tabSettingsPreloadScript').checked = false

	$('#tabSettingsFaviconPlaceholder').src = ''

	$('#btnDeleteTabSettings').style.display = 'none'

	settingsModal.mode = 'add'

	settingsModal.style.display = 'block'
}

let showSettingsModalEdit = (tabSettings, index) => {
	$('#tabSettingsId').value = tabSettings.id
	$('#tabSettingsUrl').value = tabSettings.url
	$('#tabSettingsFavicon').value = tabSettings.icon
	$('#tabSettingsTitle').value = tabSettings.title
	$('#tabSettingsNotifications').checked = tabSettings.notifications
	$('#tabSettingsPreloadScript').checked = tabSettings.runPreloadScript,

	$('#btnDeleteTabSettings').style.display = 'inline-block'


	settingsModal.mode = 'edit'
	settingsModal.currentIndex = index

	settingsModal.style.display = 'block'
}

let saveService = () => {
	let svc = {
		id: $('#tabSettingsId').value,
		url: $('#tabSettingsUrl').value,
		icon: $('#tabSettingsFavicon').value,
		title: $('#tabSettingsTitle').value,
		notifications: $('#tabSettingsNotifications').checked,
		runPreloadScript: $('#tabSettingsPreloadScript').checked,
	}

	if (settingsModal.mode == 'edit') {
		tabs = mainApp.updateService(svc, settingsModal.currentIndex)
	} else {
		tabs = mainApp.addService(svc)
	}
	makeTabs(tabs)

	if (!currentTabIndex && tabs.length) {
		currentTabIndex = 0

		setActiveTab(
			$$('.tabSelector')[currentTabIndex]
		)
	}

	settingsModal.style.display = 'none'
}

let deleteService = () => {
	tabs = mainApp.deleteService(settingsModal.currentIndex)

	devlog('ci', settingsModal.currentIndex)

	makeTabs(tabs)

	if (tabs.length == 0) {
		currentTabIndex = undefined
		settingsModal.currentIndex = undefined
		settingsModal.style.display = 'none'
		return
	}

	if (currentTabIndex == settingsModal.currentIndex) {
		currentTabIndex = settingsModal.currentIndex - 1
	} 
	
	if (currentTabIndex >= tabs.length - 1) {
		currentTabIndex = tabs.length - 1
	}

	if (tabs.length == 1) {
		currentTabIndex = 0
	}

	setActiveTab(
		$$('.tabSelector')[currentTabIndex]
	)

	settingsModal.style.display = 'none'
}

let saveEditService = () => {
	let servicesObj

	try {
		devlog(settingsText.value)
		servicesObj = JSON.parse(settingsText.value)
	} catch (error) {
		return console.log('error saving services from edit', error)
	}

	tabs = mainApp.saveServicesWithObject(servicesObj)

	makeTabs(tabs)

	if (!currentTabIndex && tabs.length) {
		currentTabIndex = 0

		setActiveTab(
			$$('.tabSelector')[currentTabIndex]
		)
	}

	alert('Saved successfully.')

	settingsEditModal.style.display = 'none'
}

let hideSettingsModal = () => {
	settingsModal.style.display = 'none'
}

let hideSettingsEditModal = () => {
	settingsEditModal.style.display = 'none'
}

devlog(document.querySelector('.tabSelectors'))

let setActiveTab = (elem) => {
	$('.tabSelector.active')?.classList.remove('active')
	elem.classList.add('active')

	$$('.mainWebview').forEach((e, i) => {
		devlog('' + i, elem.dataset.tabIndex, e)
		if (i == elem.dataset.tabIndex) {
			e.style['z-index'] = '100'
			currentTabIndex = i
			return
		}

		e.style['z-index'] = '0'
	})
}

let handleTabClick = (evt, elem) => {
	devlog(evt, evt.target, elem)
	devlog(evt.target.dataset.tabId, tabs[evt.target.dataset.tabId])

	let srcElement = evt.target

	if (evt.target.dataset.tabId == undefined) {
		srcElement = evt.target.closest('.tabSelector')
	}

	devlog(srcElement, srcElement.dataset.tabId)

	if (evt.target.classList.contains('tabSelectorSettings')) {
		devlog('omg was edit buttom')
		showSettingsModalEdit(tabs[srcElement.dataset.tabIndex], srcElement.dataset.tabIndex)
		return
	}

	if (srcElement.dataset.tabId == 'add') {
		showSettingsModalAdd()
		return
	}

	if (srcElement.dataset.tabId == 'edit') {
		showEditSettingsModal()
		return
	}

	setActiveTab(srcElement)
}

let makeTabElement = (tab, index) => {
	let tabElem = document.createElement('li')
	// selector.appendChild(document.createTextNode(tab.title))
	let img = document.createElement('img')
	img.src = tab.icon
	img.classList.add('tabSelectorImage')
	tabElem.appendChild(img)

	let settingsButton = document.createElement('button');
	settingsButton.appendChild(document.createTextNode('EDIT'))
	settingsButton.classList.add('tabSelectorSettings')
	tabElem.appendChild(settingsButton)

	tabElem.dataset.tabId = tab.id
	tabElem.dataset.tabIndex = index
	tabElem.classList.add('tabSelector')
	tabElem.classList.add('svcTab')

	tabElem.id = 'tab-svc-' + tab.id

	return tabElem
}

let makeTabs = (tabs) => {

	let renderedTabIds = [...$$('.tabSelector.svcTab')].map(e => e.id)
	let tabIds = tabs.map(t => t.id)

	renderedTabIds.forEach((e) => {
		let id = e.replace('tab-svc-', '')

		if (!tabIds.includes(id)) {
			devlog('found the baddie, removing', id)
			selectorsContainer.removeChild($('#' + e))
			webviewContainer.removeChild($('#webview-svc-' + id))
		}
	})

	let addSelector = $('.addTab')

	if (!addSelector) {
		addSelector = document.createElement('li')
		// addSelector.appendChild(document.createTextNode('Add'))
		let img = document.createElement('img')
		img.src = './res/add_white.png'
		img.classList.add('tabSelectorImage')
		addSelector.appendChild(img)
		addSelector.dataset.tabId = 'add'
		addSelector.dataset.tabIndex = tabs.length
		addSelector.classList.add('tabSelector')
		addSelector.classList.add('addTab')

		selectorsContainer.appendChild(addSelector);

		addSelector.addEventListener('click', handleTabClick)
	}

	let editSelector = $('.editTab')

	if (!editSelector) {
		editSelector = document.createElement('li')
		let img = document.createElement('img')
		img.src = './res/edit_white.png'
		img.classList.add('tabSelectorImage')
		editSelector.appendChild(img)
		editSelector.dataset.tabId = 'edit'
		editSelector.dataset.tabIndex = tabs.length
		editSelector.classList.add('tabSelector')
		editSelector.classList.add('editTab')

		selectorsContainer.appendChild(editSelector);

		editSelector.addEventListener('click', handleTabClick)
	}

	tabs.forEach((tab, i) => {

		if ($('#tab-svc-' + tab.id)) {
			devlog('tab already rendered', tab)
			return
		}

		let tabElem = makeTabElement(tab, i)

		selectorsContainer.insertBefore(tabElem, addSelector);

		tabElem.addEventListener('click', handleTabClick)

		// maybe use createElement
		let wv = document.createElement('webview')
		wv.classList.add('mainWebview')
		wv.id = 'webview-svc-' + tab.id
		wv.src = tab.url
		// wv.partition = 'persist:svc-' + tab.id
		wv.style['z-index'] = 0
		// wv.setAttribute('useragent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36')
		wv.setAttribute('useragent', 'Mozilla/5.0 (Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0')
		// wv.setAttribute('partition', 'persist:svc-' + tab.id)
		wv.setAttribute('partition', 'persist:svc-nerdchat-global-session')
		wv.setAttribute('allowpopups', 'true')
		if (tab.runPreloadScript) {
			wv.setAttribute('preload', './sw.js')
		}

		webviewContainer.appendChild(wv)
	})

	if (tabs.length < 1) {
		$('#noService').style.display = 'block'
	} else {
		$('#noService').style.display = 'none'
	}

	mainApp.ipcCall(msg('addShortcuts', tabs.map(t => ({ title: t.title }))), () => devlog('shortcuts added'))
}

$('#btnCloseTabSettings').addEventListener('click', hideSettingsModal)
$('#btnSaveTabSettings').addEventListener('click', saveService)
$('#btnDeleteTabSettings').addEventListener('click', deleteService)

$('#btnEditCloseSettings').addEventListener('click', hideSettingsEditModal)
$('#btnEditSaveSettings').addEventListener('click', saveEditService)

$('#tabSettingsUrl').addEventListener('keyup', debounce(() => {

	const url = $('#tabSettingsUrl').value
	const { hostname } = new URL(url);
	devlog('changing', url)

	mainApp.ipcCall(msg('getFaviconSync', {
		url: hostname
	}), (resp) => {
		devlog('response iso', resp)
		$('#tabSettingsFaviconPlaceholder').src = resp.results
		$('#tabSettingsFavicon').value = resp.results
	})
}, 1000))

mainApp.registerShortcutsHandler((key) => {
	devlog('from renderer shortcut handler, key: ' + key)

	if (key == 'reload') {
		if (currentTabIndex == undefined) return

		$$('.mainWebview')[currentTabIndex].reload()
		return
	}

	if (key - 1 < 0
		|| key - 1 > tabs.length) {
			devlog('shortcut out of bounds')
			return
		}

	setActiveTab(
		$$('.tabSelector')[key -1]
	)
})

mainApp.registerZoomHandler((dir) => {

	if (currentTabIndex == undefined) return

	let zoomLevel = $$('.mainWebview')[currentTabIndex].getZoomLevel()

	if (dir > 0) {
		$$('.mainWebview')[currentTabIndex].setZoomLevel(zoomLevel+1)
	} else {
		$$('.mainWebview')[currentTabIndex].setZoomLevel(zoomLevel-1)
	}
})

let makePresets = (suggestions) => {
	let container = $('.suggestionsContainer')

	suggestions.forEach((e, i) => {
		container.innerHTML += '<span class="suggestion" data-suggestion-index=' + i + '>' + e.title + '</span>'
	})
}

makePresets(mainApp.getServiceSuggestions())

let handleSuggestionClick = (e) => {
	let i = e.target.dataset.suggestionIndex

	$('#tabSettingsUrl').value = mainApp.getServiceSuggestions()[i].url
	$('#tabSettingsTitle').value = mainApp.getServiceSuggestions()[i].title
	$('#tabSettingsPreloadScript').checked = mainApp.getServiceSuggestions()[i].runPreloadScript

	$('#tabSettingsUrl').dispatchEvent(new Event('keyup'))
}

$$('.suggestion').forEach((elem) => elem.addEventListener('click', handleSuggestionClick))

makeTabs(tabs)

let firstSvcTab = $('.tabSelector.svcTab')

if (firstSvcTab) {
	setActiveTab(firstSvcTab)
}
