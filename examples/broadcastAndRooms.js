'use strict';

var Server = require('../index').Server;
var Socket = require('../index').Socket;

var server = new Server();
server.on('connection', function (socket) {
});

// Wait for socket to be connected
setTimeout(function () {
  // Broadcast event to everyone
  server.emit('hello', 'Hello, World!');

  // Broadcast event to everyone, with exceptions
  server.emit('hello', 'Hello, World!', { except: ['socket_id'] });

  // Broadcast event to everyone in room "room_name"
  server.emit('hello', 'Hello, Room!', { rooms: ['room_name'] });

  // Broadcast event to everyone in room "room_name", with exceptions
  server.emit('hello', 'Hello, Room!', { rooms: ['room_name'], except: ['socket_id'] });

  // Send event to individual "socket_id"
  server.emit('hello', 'Hello, Socket!', { sockets: ['socket_id'] });
}, 500);

server.listen(5000);

var socket = new Socket({
  host: 'localhost',
  port: 5000
});

socket.on('connect', function () {
  // Broadcast event to everyone, exclude sender
  socket.emit('hello', 'Hello, World!', { broadcast: true });

  // Broadcast event to everyone, include sender
  socket.emit('hello', 'Hello, World!', { broadcast: true, sockets: [socket.id] });

  // Broadcast event to everyone in room "room_name", exclude sender
  socket.emit('hello', 'Hello, Room!', { rooms: ['room_name'] });

  // Broadcast event to everyone in room "room_name", include sender
  socket.emit('hello', 'Hello, Room!', { rooms: ['room_name'], sockets: [socket.id] });

  // Send event to individual "socket_id"
  socket.emit('hello', 'Hello, Socket!', { sockets: ['socket_id'] });
});
