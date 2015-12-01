'use strict';

var Server = require('../index').Server;

var server = new Server();
server.listen(5000);

setInterval(function() {
  server.emitRoom('ping', 'You are in My room', 'My room');
}, 1000);


var Socket = require('../index').Socket;
var socket1 = new Socket({
  host: 'localhost',
  port: 5000
});

socket1.on('connect', function() {
  console.log('socket1 connected: ' + this.id);
  socket1.join('My room');
});

socket1.on('ping', function(message) {
  console.log('socket1 server says: ' + message);
});

socket1.on('Bye', function(message) {
  console.log('socket2 says:', message);
});

var socket2 = new Socket({
  host: 'localhost',
  port: 5000
});

socket2.on('connect', function() {
  console.log('socket2 connected: ' + this.id);
  socket2.join('My room');
});

socket2.on('ping', function(message) {
  console.log('socket2 Server says: ' + message);
});

setTimeout(function() {
  socket2.leave('My room');
  socket2.emitTo('Bye', 'I have to leave the room', socket1.id);
}, 3000);
