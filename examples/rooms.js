'use strict';

var Server = require('../index').Server;

var server = new Server();
server.listen(5000);

setInterval(function() {
  console.log(JSON.stringify(Object.keys(server.sockets[socket2.id]._rooms)));
  server.emitRoom('ping', 'You are in My room', 'My room 0');
}, 1000);


var Socket = require('../index').Socket;
var socket1 = new Socket({
  host: 'localhost',
  port: 5000
});

socket1.on('connect', function() {
  console.log('socket1 connected: ' + this.id);

  for (var i = 0; i < 100; i++)
    socket1.join('My room ' + i);
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
  for (var i = 0; i < 100; i++)
    socket2.join('My room ' + i);
});

socket2.on('ping', function(message) {
  console.log('socket2 Server says: ' + message);
});

setTimeout(function() {
  socket2.leaveAll();
  socket2.emitSocket('Bye', 'I have to leave the room', socket1.id);
}, 3000);
