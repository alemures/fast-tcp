'use strict';

var Socket = require('../index').Socket;

var socket = new Socket({
  host: 'localhost',
  port: 5000,
  reconnect: true, // (true by default)
  reconnectInterval: 2000 // (1000ms by default)
});

// It's required, otherwise node.js will throw an "Unhandled 'error' event"
socket.on('error', function (err) {
  console.error(err);
});
