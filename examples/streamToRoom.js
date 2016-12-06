'use strict';

var fs = require('fs');

var Server = require('../index').Server;
var Socket = require('../index').Socket;

var server = new Server();
server.listen(5000);

var socket = new Socket({
  host: 'localhost',
  port: 5000
});

socket.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream('socket1-' + info.name));
});

setTimeout(function () {
  fs.createReadStream('img.jpg').pipe(socket.stream('image', { name: 'img-copy.jpg' },
      { rooms: ['images'] }));
}, 50);

var socket2 = new Socket({
  host: 'localhost',
  port: 5000
});

socket2.join('images');

socket2.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream('socket2-' + info.name));
});

var socket3 = new Socket({
  host: 'localhost',
  port: 5000
});

// socket3.join('images');

socket3.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream('socket3-' + info.name));
});

var socket4 = new Socket({
  host: 'localhost',
  port: 5000
});

socket4.join('images');

socket4.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream('socket4-' + info.name));
});

