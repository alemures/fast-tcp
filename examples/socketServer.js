'use strict';

var Server = require('../index').Server;
var port = 5000;
var server = new Server();
server.listen(port);
server.on('connection', function(socket) {
  socket.emit('string', 'fast-tcp');
  socket.emit('buffer', new Buffer('fast-tcp'));
});

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});
socket.on('string', function(data) {
  console.log('string:', data);
});

socket.on('buffer', function(data) {
  console.log('buffer:', data);
});

