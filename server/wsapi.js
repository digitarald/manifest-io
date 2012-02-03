
"use strict";

var url = require('url');
var http = require('http');
var path = require('path');
var fs = require('fs');
var util = require('util');
var exec = require('child_process').exec;
var ejs = require('ejs');
var async = require('async');
var request = require('request');


var queue = {};


// class App

function App(manifestUrl, manifestData) {

	var parsed = url.parse(manifestUrl);

	if (!parsed || !parsed.host) {
		throw new Error('Invalid URL: ' + manifestUrl);
	}

	this.origin = parsed.protocol.replace(/[^\w]/g, '') + '://' + parsed.host;

	this.packageName = this.origin
		.toLowerCase()
		.replace(/[^a-z0-9]+\D/gi, function(match){
			return match.charAt(match.length - 1).toUpperCase();
		});

	this.manifestUrl = manifestUrl;
	this.manifestUrlParsed = parsed;

	// safe folder name
	this.folder = encodeURIComponent(this.origin);
	this.path = path.join(__dirname, '../dist', this.folder);

};

App.prototype.toString = function() {
	return this.origin;
};

App.prototype.prepare = function(callback) {

	var app = this;

	// Download manifest
	request(this.manifestUrl, function (error, response, body) {

    if (error || response.statusCode != 200) {
			callback(new Error('Unexpected status-code ' + response.statusCode));
			return;
		}

		// Validate content-type
		// var ctype = response.headers['content-type'] || null;
		// if (ctype != 'application/x-web-app-manifest+json') {
		//   callback(new Error('Wrong content-type', ctype));
		// }

		app.setManifest(body, callback);

	}).pipe(fs.createWriteStream(path.join(this.path + '.manifest')));

};

App.prototype.setManifest = function(body, callback) {

	try {
		this.manifest = JSON.parse(body);

		if (!this.manifest) {
			throw new Error('Empty manifest after JSON.parse. ' + body);
		}
	} catch(e) {
		callback(e);
		return;
	}

	// Validate manifest

	if (!this.manifest.name) {
		callback(new Error('Missing required manifest element: name. ' + body));
		return;
	}

	// Extract values

	this.name = this.manifest.name;
	this.description = this.manifest.description || '';

	var launchPath = this.manifest.launch_path || '/';
	if (!url.parse(launchPath).host) {
		launchPath = this.origin + launchPath;
	}

	this.url = launchPath;

	callback(null);

	// fs.writeFileSync('manifest.webapp', body, 'binary');
};

App.prototype.getIconUrl = function(target) {

	var icons = this.manifest.icons || {};

	var sizes = Object.keys(icons);
	sizes.sort(function(a, b) {
		return a - b;
	});

	var found = null;
	sizes.some(function(size) {
		found = size;
		return (size >= target);
	});

	if (!found) {
		return null;
	}

	var icon = icons[found];
	if (!url.parse(icon).host) {
		icon = this.origin + icon;
	}

	return icon;
};

App.prototype.getBuild = function(callback) {

	var app = this;

	// TODO: Concurrency
	// if (queue[this.origin]) {
	//   setTimeout(function() {
	//     app.getBuild(this);
	//   }, 100);
	//   return;
	// }
	// queue[this.origin] = true;

	this.setupBuild(function(err) {

		var cmd = util.format('cd %s && ant release', app.path);

		exec(cmd, function(err, stdout, stderr) {
				console.log('Build app', stdout, stderr);

				if (err) {
					callback(err);
					return;
				}

				var file = path.join(app.path, 'bin', app.packageName + '-release.apk');

				console.log('Build served via ' + file);

				callback(null, file);

		});

	});

};

App.prototype.setupBuild = function(callback) {

	var exists = path.existsSync(path.join(this.path, 'ant.properties'));

	// Only continue if file does not exist

	console.log('Checking config', this.path, exists);

	if (exists) {
		callback();
		return;
	}

	var app = this;

	// Helpers

	function replaceTpl(file, vars, callback) {

		// TODO ejs.renderFile is not async
		ejs.renderFile(file, vars, function(err, output) {

			if (err) {
				console.warn('renderFile failed');

				callback(err);
				return;
			}

			fs.writeFile(file, output, 'utf8', function(err) {
				callback(err);
			});

		});
	}

	// Copy template folder to app path

	var templatePath = path.join(__dirname, '../template');
	var packagePath = path.join(this.path, 'src/org/mozilla/labs/soup',
		app.packageName);

	exec(util.format('cp -r %s %s', templatePath, this.path),
		function(err, stdout, stderr) {

		console.log('Created app folder', {stdout: stdout, stderr: stderr});

		if (err) {
			callback(err);
			return;
		}

		// Template vars

		var vars = {
			keystore: path.join(__dirname, '../keystore/keystore'),
			version: app.version || "1.0",
			version_num: (app.version || 1) + 0,
			packageName: app.packageName,
			name: app.name,
			description: app.description,
			url: app.url,
			origin: app.origin
		};


		async.waterfall([

			// Move package for src folder
			function(callback) {

				var from = path.join(packagePath, '../template');
				console.log('… Moving', from);

				exec(util.format('mv %s %s', from, packagePath), function(err) {
					callback(err);
				});

			},

			// Set up MainActivity.java
			function(callback) {

				console.log('… MainActivity.java');
				replaceTpl(path.join(packagePath, 'MainActivity.java'), vars, callback);

			},

			// Set up build.xml
			function(callback) {

				console.log('… build.xml');
				replaceTpl(path.join(app.path, 'build.xml'), vars, callback);

			},

			// Set up AndroidManifest.xml
			function(callback) {

				console.log('… AndroidManifest.xml');
				replaceTpl(path.join(app.path, 'AndroidManifest.xml'), vars, callback);

			},

			// Set up AndroidManifest.xml
			function(callback) {

				console.log('… strings.xml');
				replaceTpl(path.join(app.path, 'res/values/strings.xml'), vars, callback);

			},

			// Set up ant.properties
			function(callback) {

				console.log('… ant.properties');
				replaceTpl(path.join(app.path, 'ant.properties'), vars, callback);

			},

			// Set up ant.properties
			function(callback) {

				console.log('… fetching icons');

				var densities = {ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96};
				var fetchers = Object.keys(densities).map(function(density) {

					return function(callbackP) {
						var size = densities[density];
						var icon = app.getIconUrl(size);

						if (!icon) {
							callbackP();
							return;
						}

						var file = path.join(app.path, 'res/drawable-' + density,
							'ic_launcher.png');

						console.log('Loading ' + icon + ' to ' + file);

						var stream = fs.createWriteStream(file);
						stream.on('close', callbackP);
						stream.on('error', callbackP);

						request(icon).pipe(stream);

						/*
						request(icon, function(err, response, body) {

							if (err) {
								console.warn('Download failed ' + icon);
								callbackP();
								return;
							}

							console.log('Downloaded ' + icon, response.headers);

							fs.writeFile(file, body, 'binary', callbackP);
						});
						*/
					};

				});

				async.parallel(fetchers, function() {
					callback();
				});

			}

		], function(err) {

			console.log('Finished waterfall');

			if (err) {
				console.log('Waterfall failed, cleaning up', err);

				app.reset(callback, err);

				return;
			}

			callback();
		});


	});

};


App.prototype.reset = function(callback, err) {

	exec(util.format('rm -rf %s', this.path), function(errExec) {

		if (errExec) {
			console.error('reset failed', errExec);
		}

		callback(err);
	});

}


// GET /build/*

function build(req, res, next) {

	// Validate

	var manifestUrl = req.params[0];

	try {
		var app = new App(manifestUrl);
	} catch (e) {
		next(e);
		return;
	}

	app.prepare(function(err) {
		if (err) {
			next(err);
			return;
		}

		app.getBuild(function(err, file) {

			if (err) {
				res.send(500);
				return;
			}

			console.log('Streaming ' + file);

			res.contentType('application/vnd.android.package-archive');
			res.download(file, app.packageName + '.apk');
		});
	});

};

function share(req, res, next) {

	var url = encodeURIComponent(req.params[0]);
	var full = encodeURIComponent('http://' + req.headers.host + '/build/' + url);

	console.log('Share', full);

	request.
		get('http://chart.apis.google.com/chart?cht=qr&chs=500x500&chl=' + full).
		pipe(res);
}

function init(config) {

	var app = config.app;
	if (!app) {
		throw new Error("Missing config option: app");
	}

	app.get('/build/*', build);
	app.get('/share/*', share);

}

exports.init = init;
