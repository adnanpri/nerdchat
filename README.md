# NerdChat

NerdChat is a lightweight special-purpose browser for aggregating your messaging apps and other tools.

It's built with web technologies using Electron.

It's inspired by projects like Ferdi/Franz. It has no bells and whistles, just the bare minimum to allow you to run your favorite chat apps.

## Supported platforms

Currently it only supports Linux (x86_64). But you can package it as you need using `electron-packager` which is a dev dependency.

## Installation

Clone this repository.

```bash
git clone https://github.com/adnanpri/nerdchat
cd nerdchat
./install.sh
```

It creates the necessary desktop entries so you should be able to launch it using any of the popular launchers (on Ubuntu and derivatives, find it under Applications).

## How to use

### Add a service

After the app runs, click on the `(+)` icon on the top-left to add a "service" (app). Provide the URL to the service you want to add (the same URL you would open on a browser), along with a title. e.g. for WhatsApp, enter

URL: https://web.whatsapp.com
Title: WhatsApp

The URL has to start with `https://`. The title can be anything.

Alternatively, pick from one of the presets listed under the form.

### Shortcuts

You can press `Ctrl + <number>` to access the service at index `<number>`. E.g. `Ctrl + 1` for the first service on your list.

## Run using npm

```bash
npm install
npm run start # to run without installing
```

```bash
npm install
npm run debug # to see debug output on inspector/terminal -- for development purposes
```

## Todos

- [ ] code cleanup
- [ ] explore BrowserView in place of `webview`
- [ ] allow service reordering
- [ ] load service at last known location (URL)
- [ ] aggregate notifications in separate page

## License

[GPL v2](LICENSE.md)
