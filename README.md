# Manifest.io - WebRT Stub Executable Builder for Android

Builds APKs from [App manifests](https://developer.mozilla.org/en/Apps/Manifest). These apps are stubs for launching the app in Firefox *(if installed)* or default browser.

## Getting started

Server dependencies: [node.js](http://nodejs.org/) (>= 0.6.2), [Android SDK](http://developer.android.com/sdk/index.html) (platform *r8+*), imagemagick


1. Do the node dance (`npm install`).

2. Change the SDK path in `template/local.properties` to your local installation

3. `node server/start.js`

4. Go to `http://127.0.0.1:8124/build/{manifest-uri}`. Examples:
	- [/build/http://soundcloud.com/manifest.webapp](http://127.0.0.1:8124/build/http://soundcloud.com/manifest.webapp)
	- [/build/http://birdwalker.com/manifest.webapp](http://127.0.0.1:8124/build/http://birdwalker.com/manifest.webapp)
	- [/build/http://www.forcesofwargame.com/manifest.webapp](http://127.0.0.1:8124/build/http://www.forcesofwargame.com/manifest.webapp)

## Options

- `/share/{manifest-uri}`: QR code for build URL
- `debug=true`: Build the debuggable APK, signed with debug key
- `refresh=true`: For development, flush local copies of APK content

## LICENSE

All source code here is available under the [MPL 2](https://mozilla.org/MPL/) license, unless otherwise indicated.