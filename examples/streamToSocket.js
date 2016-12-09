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

socket.on('my-socket-id', function (socketId) {
  fs.createReadStream('img.jpg').pipe(socket.stream('image', { name: 'img-copy.jpg' },
    { sockets: [socketId] }));
});

var socket2 = new Socket({
  host: 'localhost',
  port: 5000
});

socket2.on('connect', function () {
  socket2.emit('my-socket-id', socket2.id, { broadcast: true });
});

socket2.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream(info.name));
});
