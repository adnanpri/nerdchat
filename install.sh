#/bin/sh

npm install
npm run package
mkdir -p ~/.config/NerdChat/favicon
sudo mkdir -p /opt/NerdChat
sudo cp -r dist/NerdChat-linux-x64/* /opt/NerdChat
sudo cp nerdchat.desktop /usr/share/applications