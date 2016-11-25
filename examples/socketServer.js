'use strict';

var Server = require('../index').Server;

var server = new Server();
server.on('connection', function (socket) {
  // Simple event
  socket.emit('welcome', 'Hi there');

  // Using callbacks (avoid mixing events)
  socket.on('sum', function (numbers, cb) {
    cb(numbers.n1 + numbers.n2);
  });
});

server.listen(5000);

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

// Providing a thrid param will send a callback to server
socket.emit('sum', { n1: 5, n2: 3 }, function (result) {
  console.log('Result:', result);
});

socket.on('welcome', function (message) {
  console.log('Server says: ' + message);
});
