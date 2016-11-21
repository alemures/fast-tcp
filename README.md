fast-tcp
===

fast-tcp is an extremely fast TCP client and server that allows to emit and listen to events. It also provides more features like streaming, message acknowledgements, broadcast messages, rooms, etc.

In order to get the maximum performance, every data type is sent using the fastest way to write it into the underline Buffer. Integer numbers are sent as signed integers of 48 bits, decimal numbers as double of 64 bits, strings as utf8 string, buffers as binary, objects are serialized as binary and streams are transmitted in binary over the fast-tcp protocol.

In order to be flexible sending objects, by default, they are serialized/deserialized using JSON.stringify/JSON.parse so, sending a Javascript object is possible out of the box. It is also possible to override the objects serialization so, you can use existing ones like Protocol Buffer, avro, MessagePack or even you own implementation.

## Install
npm install fast-tcp

## Features
* All primitive data types are supported (string, number, object, buffer)
* Configurable automatic reconnection
* Callbacks in message reception (acknowledgements)
* Broadcast messages and rooms
* Configurable object serializer/deserializer (Protocol Buffer, avro, MessagePack, etc)
* High performance binary streams over fast-tcp protocol
* AS FAST AS LIGHT!

## Client Libraries
* [fast-tcp-java](https://github.com/alemures/fast-tcp-java)

## Samples
Server:
```javascript
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
```javascript
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
