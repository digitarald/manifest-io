
'use strict';

var url = require('url');
var http = require('http');
var path = require('path');
var fs = require('fs');
var util = require('util');
var exec = require('child_process').exec;


// class App

function App(manifestUrl, manifestData) {
  
  var parsed = url.parse(manifestUrl);

  if (!parsed || !parsed.host) {
    throw new Error('Invalid URL: ' + manifestUrl);
  }

  this.origin = parsed.protocol + '://' + parsed.host;

  this.manifestUrl = manifestUrl;
  this.manifestUrlParsed = parsed;

  this.folder = encodeURIComponent(this.origin);
  this.path = path.join(__dirname, 'dist', this.folder);

};

App.prototype.toString = function() {
  return this.origin;
};

App.prototype.prepare = function(callback) {

  var parsed = this.manifestUrlParsed;

  // Download manifest

  var client = http.createClient(parsed.port || 80, parsed.hostname);
  var request = client.request('GET', parsed.path);
  request.end();

  var app = this;

  // Request manifest
  request.on('response', function(response) {

    // Validate status code
    var status = response.statusCode;
    if (status < 200 || status >= 300) {
      callback(new Error('Unexpected status-code ' + status));
      return;
    }

    // Validate content-type
    // var ctype = response.headers['content-type'] || null;
    // if (ctype != 'application/x-web-app-manifest+json') {
    //   callback(new Error('Wrong content-type', ctype));
    // }

    var body = [];

    response.on('data', function(chunk) {

      body.push(chunk);

    });

    response.on('end', function() {

      app.setManifest(body.join(''), callback);

    });

  });

  request.on('error', function(e) {

    callback(e);

  });

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

  this.launchPath = this.origin + (this.manifest.launch_path || '/');

  callback(null);

  // fs.writeFileSync('manifest.webapp', body, 'binary');
};

App.prototype.getBuild = function(callback) {

  var cmd = util.format('cd %s && ant release', this.path);

  child = exec(cmd, function(error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }
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

    console.log(app);
    res.send(app);
  })
  

};

function init(config) {

  var app = config.app;
  if (!app) {
    throw new Error("Missing config option: app");
  }

  app.get('/build/*', build);
  
}

exports.init = init;
