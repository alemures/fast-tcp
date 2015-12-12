'use strict';

var Server = require('../index').Server;

var server = new Server();
server.on('connection', function(socket) {
  // Simple event
  socket.emit('welcome', 'Hi there');

  // Using callbacks (avoid mixing events)
  socket.on('sum', function(numbers, cb) {
    cb(numbers.n1 + numbers.n2);
  });
});

setInterval(function() {
  // Emitting to room 'My room'
  server.emit('room event', 'Hi socket!', { rooms: ['my room'] });
}, 1500);

server.listen(5000);

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

socket.on('connect', function() {
  // Providing a thrid param will send a callback to server
  socket.emit('sum', { n1: 5, n2: 3 }, function(result) {
    console.log('Result:', result);
  });

  // Join to room 'My room'
  socket.join('my room');
});

socket.on('welcome', function(message) {
  console.log('Server says: ' + message);
});

// Event sent to room 'my room'
socket.on('room event', function(message) {
  console.log('Server says through room: ' + message);
});
