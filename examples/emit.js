'use strict';

var Server = require('../index').Server;
var Socket = require('../index').Socket;

var server = new Server();
var socket1 = new Socket({
  host: 'localhost',
  port: 5000
});
var socket2 = new Socket({
  host: 'localhost',
  port: 5000
});

server.on('connection', function(socket) {
  socket.on('emit', function(data) {
    console.log(data);
  });

  socket.on('emit-with-callback', function(numbers, cb) {
    cb(numbers.n1 + numbers.n2);
  });
});

setTimeout(function() {
  server.emit('server-emit-to-everyone', 'server-emit-to-everyone');

  server.emit('server-emit-to-room', 'server-emit-to-room', { rooms: ['my room'] });

  server.emit('server-emit-to-socket', 'server-emit-to-socket', { sockets: [socket1.id] });

  server.emit('server-emit-to-room-except', 'server-emit-to-room-except', { rooms: 'my room', except: [socket1.id] });

  server.emit('server-emit-to-everyone-except', 'server-emit-to-everyone-except', { except: [socket1.id] });
}, 1000);

server.listen(5000);


socket1.on('connect', function() {
  this.join('my room');

  this.emit('emit', 'Hi server');

  this.emit('emit-with-callback', { n1: 5, n2: 3 }, function(result) {
    console.log('Result:', result);
  });

  var _this = this;
  setTimeout(function() {
    _this.emit('emit-to-socket', 'emit-to-socket', { sockets: [socket2.id] });

    _this.emit('emit-to-room', 'emit-to-room', { rooms: ['my room'] });

    _this.emit('emit-to-everyone', 'emit-to-everyone', { broadcast: true });
  }, 1000);
});

socket1.on('emit-to-socket', log);
socket1.on('emit-to-room', log);
socket1.on('emit-to-everyone', log);
socket1.on('server-emit-to-everyone', log);
socket1.on('server-emit-to-room', log);
socket1.on('server-emit-to-socket', log);
socket1.on('server-emit-to-room-except', log);
socket1.on('server-emit-to-everyone-except', log);


socket2.on('connect', function() {
  this.join('my room');

  this.emit('emit', 'Hi server');

  this.emit('emit-with-callback', { n1: 5, n2: 3 }, function(result) {
    console.log('Result:', result);
  });

  var _this = this;
  setTimeout(function() {
    _this.emit('emit-to-socket', 'emit-to-socket', { sockets: [socket1.id] });

    _this.emit('emit-to-room', 'emit-to-room', { rooms: ['my room'] });

    _this.emit('emit-to-everyone', 'emit-to-everyone', { broadcast: true });
  }, 1000);
});

socket2.on('emit-to-socket', log);
socket2.on('emit-to-room', log);
socket2.on('emit-to-everyone', log);
socket2.on('server-emit-to-everyone', log);
socket2.on('server-emit-to-room', log);
socket2.on('server-emit-to-socket', log);
socket2.on('server-emit-to-room-except', log);
socket2.on('server-emit-to-everyone-except', log);

function log(data) {
  console.log(this.id, data);
}
