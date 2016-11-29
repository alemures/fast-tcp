fast-tcp
===

fast-tcp is an extremely fast TCP client and server that allows to emit and listen to events. It also provides more features like streaming, message acknowledgements, broadcast messages, rooms, etc.

In order to get the maximum performance, every data type is sent using the fastest way to write it into the underline Buffer. Integer numbers are sent as signed integers of 48 bits, decimal numbers as double of 64 bits, boolean as byte, strings as utf8 string, buffers as binary, objects are serialized as binary and streams are transmitted in binary over the fast-tcp protocol.

To be flexible sending objects, by default, they are serialized/deserialized using JSON.stringify/JSON.parse so, sending a Javascript object is possible out of the box. It is also possible to override the objects serialization so, you can use existing ones like Protocol Buffer, avro, MessagePack or even you own implementation.

## Install
npm install fast-tcp

## Features
* All primitive data types are supported (boolean, string, number, object, buffer)
* Configurable automatic reconnection
* Callbacks in message reception (acknowledgements)
* Broadcast messages and rooms
* Configurable object serializer/deserializer (Protocol Buffer, avro, MessagePack, etc)
* High performance binary streams over fast-tcp protocol
* AS FAST AS LIGHT!

## Client Libraries
* [fast-tcp-java](https://github.com/alemures/fast-tcp-java)
* [fast-tcp-c](https://github.com/alemures/fast-tcp-c) - In development

## Samples

#### Simple socket-server
```javascript
var Server = require('fast-tcp').Server;
var Socket = require('fast-tcp').Socket;

var server = new Server();
server.on('connection', function (socket) {
    socket.on('login', function (username) {
      console.log('Trying to login: ' + username);
    });
});
server.listen(5000);

var socket = new Socket({
  host: 'localhost',
  port: 5000
});
socket.emit('login', 'alejandro');
```

#### Configurable automatic reconnection
```javascript
var socket = new Socket({
    host: 'localhost',
    port: 5000,
    reconnect: true, // (true by default)
    reconnectInterval: 2000 // (1000ms by default)
});

// It's required, otherwise node.js will throw an "Unhandled 'error' event"
socket.on('error', function (err) {
    console.error(err);
});
```

#### Callbacks in message reception (acknowledgements)
```javascript
server.on('connection', function (socket) {
    socket.on('login', function (username, callback) {
        callback(username === 'alejandro' ? true : false);
    });
});

// Client
socket.emit('login', 'alejandro', function (response) {
    console.log('Response: ' + response);
});
```

#### Broadcast messages and rooms
```javascript
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
```

Check out the folder `examples/` for more samples.

## jsdoc
http://alemures.github.io/fast-tcp/
