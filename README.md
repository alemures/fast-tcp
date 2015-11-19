fast-tcp
===

fast-tcp is a extremely fast TCP server and client that allows to transmit messages as number, string, buffer or object. The messages are sent in binary format using Buffer and TCP, standard modules of Node.JS.

Integer numbers are sent as a signed integer of 48 bits, decimal numbers as double of 64 bits, strings as utf8 string, buffers as raw bytes and objects as utf8 string using JSON.stringify() / JSON.parse() javascript functions. In this way, sending a string is faster than an object, buffers are faster than strings and numbers are the fastest.

## Install
npm install fast-tcp

## Samples
Server:
```
var Server = require('fast-tcp').Server;
var server = new Server();
server.on('connection', function(socket) {
  socket.emit('integer', 512);
  socket.emit('double', 512.215);
  socket.emit('buffer', new Buffer('fast-tcp'));
  socket.emit('string', 'fast-tcp');
  socket.emit('object', {name: 'fast-tcp'});
});
server.listen(5000);
```

Client:
```
var Socket = require('fast-tcp').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000,
  
  // New parameters not in standard net.Socket
  reconnection: true,
  reconnectionInterval: 2500
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
```