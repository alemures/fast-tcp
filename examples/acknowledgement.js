'use strict';

var Server = require('../index').Server;
var Socket = require('../index').Socket;

var server = new Server();
server.on('connection', function (socket) {
  socket.on('login', function (username, callback) {
    callback(username === 'alex' ? true : false);
  });
});

server.listen(5000);

var socket = new Socket({
  host: 'localhost',
  port: 5000
});
socket.emit('login', 'alex', function (response) {
  console.log('Response: ' + response);
});
