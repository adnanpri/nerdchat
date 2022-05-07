#/bin/sh

echo "Installing dependencies"
npm install

echo "Building app"
npm run package

echo "Creating folders in ~/.config and /opt"
mkdir -p ~/.config/NerdChat/favicon
sudo mkdir -p /opt/NerdChat

echo "Copying files"
sudo cp -r dist/NerdChat-linux-x64/* /opt/NerdChat

echo "Creating desktop entry"
sudo cp nerdchat.desktop /usr/share/applications

echo "Done."