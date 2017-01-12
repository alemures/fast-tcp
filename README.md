fast-tcp
===

fast-tcp is an extremely fast TCP client and server that allows to emit and listen to events. It also provides more features like binary streaming, acknowledgements, broadcasts, rooms, etc.

In order to get the maximum performance, every data type is sent using the fastest way to write it into the underline Buffer. Integer numbers are sent as signed integers of 48 bits, decimal numbers as double of 64 bits, boolean as byte, strings as utf8 string, buffers as binary, objects are serialized as binary and streams are transmitted in binary over the fast-tcp protocol.

To be flexible sending objects, by default, they are serialized/deserialized using JSON.stringify/JSON.parse so, sending a Javascript object is possible out of the box. It is also possible to override the objects serialization so, you can use third-party libraries like Protocol Buffer, avro, MessagePack or even your own implementation.

## Install
npm install fast-tcp

## Features
* All primitive data types are supported (boolean, string, number, object, buffer)
* Configurable client reconnection
* Callbacks in message and stream reception (acknowledgements)
* Broadcasts, rooms and client to client messages and streams
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

#### Configurable client reconnection
```javascript
var socket = new Socket({
  ...
  reconnect: true, // (true by default)
  reconnectInterval: 2000 // (1000ms by default)
});
```

#### Callbacks in message and stream reception (acknowledgements)
For messages:
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
For streams:
```javascript
server.on('connection', function (socket) {
  socket.on('image', function (readStream, info, callback) {
    var writeStream = fs.createWriteStream(info.name);
    readStream.pipe(writeStream);

    writeStream.on('finish', function () {
      callback('Image "' + info.name + '" stored!');
    });
  });
});

// Client
var writeStream = socket.stream('image', { name: 'img-copy.jpg' }, function (response) {
  console.log('Response: ' + response);
});
fs.createReadStream('img.jpg').pipe(writeStream);
```

#### Broadcasts, rooms and client to client messages and streams
From client:
```javascript
// Join room
socket.join('room_name');

// Leave room
socket.leave('room_name');

// Leave all rooms
socket.leaveAll();

// Broadcast event to everyone, exclude sender
socket.emit('hello', 'Hello, World!', { broadcast: true });

// Broadcast stream to everyone, exclude sender
var writeStream = socket.stream('hello', 'Hello, World!', { broadcast: true });

// Broadcast event to everyone, include sender
socket.emit('hello', 'Hello, World!', { broadcast: true, sockets: [socket.id] });

// Broadcast event to everyone in room "room_name", exclude sender
socket.emit('hello', 'Hello, Room!', { rooms: ['room_name'] });

// Broadcast stream to everyone in room "room_name", exclude sender
var writeStream = socket.stream('hello', 'Hello, World!', { rooms: ['room_name'] });

// Broadcast event to everyone in room "room_name", include sender
socket.emit('hello', 'Hello, Room!', { rooms: ['room_name'], sockets: [socket.id] });

// Send event to individual "socket_id"
socket.emit('hello', 'Hello, Socket!', { sockets: ['socket_id'] });

// Open stream to individual "socket_id"
var writeStream = socket.stream('hello', 'Hello, World!', { sockets: ['socket_id'] });
```
> To use the *socket#id* attribute you must wait for the event 'connect'.

From server:
```javascript
// Join room
server.join('room_name', 'socket_id');

// Leave room
server.leave('room_name', 'socket_id');

// Leave all rooms
server.leaveAll('socket_id');

// Broadcast event to everyone
server.emit('hello', 'Hello, World!');

// Broadcast stream to everyone
var writeStream = server.stream('hello', 'Hello, World!');

// Broadcast event to everyone, with exceptions
server.emit('hello', 'Hello, World!', { except: ['socket_id'] });

// Broadcast stream to everyone, with exceptions
var writeStream = server.stream('hello', 'Hello, World!', { except: ['socket_id'] });

// Broadcast event to everyone in room "room_name"
server.emit('hello', 'Hello, Room!', { rooms: ['room_name'] });

// Broadcast stream to everyone in room "room_name"
var writeStream = server.stream('hello', 'Hello, Room!', { rooms: ['room_name'] });

// Broadcast event to everyone in room "room_name", with exceptions
server.emit('hello', 'Hello, Room!', { rooms: ['room_name'], except: ['socket_id'] });

// Broadcast stream to everyone in room "room_name", with exceptions
var writeStream = server.stream('hello', 'Hello, Room!', { rooms: ['room_name'], except: ['socket_id'] });

// Send event to individual "socket_id"
server.emit('hello', 'Hello, Socket!', { sockets: ['socket_id'] });

// Open stream to individual "socket_id"
var writeStream = server.stream('hello', 'Hello, Socket!', { sockets: ['socket_id'] });
```

#### Configurable object serializer/deserializer
```javascript
var server = new Server({
  objectDeserializer: function (buffer, event) {
    return User.fromBuffer(buffer);
  }
});

server.on('connection', function (socket) {
  socket.on('login', function (user) {
    console.log(user.getUsername() + '->' + user.getPassword());
  });
});

// Client
var socket = new Socket({
  ...
  objectSerializer: function (user, event) {
    return user.toBuffer();
  }
});

socket.emit('login', new User('alex', '1234'));
```

#### High performance binary streams
```javascript
server.on('connection', function (socket) {
  socket.on('image', function (readStream, info) {
    readStream.pipe(fs.createWriteStream(info.name));
  });
});

// Client
var writeStream = socket.stream('image', { name: 'img-copy.jpg' });
fs.createReadStream('img.jpg').pipe(writeStream);
```

Check out the folder `examples/` for more samples.

## jsdoc
http://alemures.github.io/fast-tcp/
