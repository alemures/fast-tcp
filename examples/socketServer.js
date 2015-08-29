'use strict';

var Server = require('../index').Server;

var server = new Server();
server.on('connection', function(socket) {
  socket.emit('string', 'fast-tcp');
  socket.emit('buffer', new Buffer('fast-tcp'));
  socket.emit('integer', 512);
  socket.emit('double', 512.215);
  socket.emit('object', {name: 'fast-tcp'});
});

server.listen(5000);

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

socket.on('integer', function(data) {
  console.log('int:', data);
});

socket.on('double', function(data) {
  console.log('double:', data);
});

socket.on('object', function(data) {
  console.log('object:', data);
});
