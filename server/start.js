#!/usr/bin/env node

'use strict';

var express = require('express');

var MemoryStore = express.session.MemoryStore;
var sessionStore = new MemoryStore();

var app = express.createServer();

var wsapi = require('./wsapi');

var IP_ADDRESS = process.env['IP_ADDRESS'] || 'localhost';
var PORT = process.env['PORT'] || 8124;

var URL = 'localhost';
if (IP_ADDRESS) {
  URL = IP_ADDRESS + ':' + PORT;
}

app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.session({
    store: sessionStore,
    secret: 'ed.odtset',
    key: 'express.sid'
  }));
  app.use(express.bodyParser());

  var root = __dirname + '/../client/';
  app.use(express.static(root + 'static/'));
  app.set('views', root + 'templates/');
});

wsapi.init({app: app});


console.info('Launch!', 'http://' + URL);


app.listen(PORT, IP_ADDRESS);
