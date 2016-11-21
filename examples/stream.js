'use strict';

var fs = require('fs');

var Server = require('../index').Server;

var server = new Server();
server.on('connection', function (socket) {
  socket.on('image', function (info, readStream) {
    readStream.pipe(fs.createWriteStream(info.name));
  });
});

server.listen(5000);

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

fs.createReadStream('img.jpg').pipe(socket.stream('image', { name: 'img.jpg' }));
