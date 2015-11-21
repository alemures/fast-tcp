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
  // Simple event
  socket.emit('welcome', 'Hi there');

  // Using callbacks (avoid mixing events)
  socket.on('sum', function(numbers, cb) {
    cb(numbers.n1 + numbers.n2);
  });
});
server.listen(5000);
```

Client:
```
var Socket = require('fast-tcp').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

socket.on('connect', function() {
  socket.emit('sum', { n1: 5, n2: 3 }, function(result) {
    console.log('Result:', result);
  });
});

socket.on('welcome', function(message) {
  console.log('Server says: ' + message);
});
```