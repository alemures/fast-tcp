fast-tcp
===

fast-tcp is an extremely fast TCP client and server that allows to emit and listen to events. The messages are sent in binary format using Buffer and TCP, standard modules of Node.JS.

In order to get the maximum performance, every data type is sent using the fastest way to write it into the underline Buffer. Integer numbers are sent as a signed integer of 48 bits, decimal numbers as double of 64 bits, strings as utf8 string, buffers as raw bytes and objects as utf8 string using JSON.stringify() / JSON.parse() javascript functions. In this way, sending a string is faster than an object, numbers are faster than strings and buffers are the fastest because they are just copied without any transformation.

## Install
npm install fast-tcp

## Features
* All primitive data types are supported (string, number, object, buffer)
* Configurable automatic reconnection
* Callbacks for particular emits
* Rooms
* AS FAST AS LIGHT!

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

socket.emit('sum', { n1: 5, n2: 3 }, function(result) {
  console.log('Result:', result);
});

socket.on('welcome', function(message) {
  console.log('Server says: ' + message);
});
```

Check out the folder `examples/` for more samples.

## jsdoc
http://alemures.github.io/fast-tcp/