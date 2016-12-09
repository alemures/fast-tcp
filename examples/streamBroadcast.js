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

fs.createReadStream('img.jpg').pipe(socket.stream('image', { name: 'img-copy.jpg' },
    { broadcast: true }));

var socket2 = new Socket({
  host: 'localhost',
  port: 5000
});

socket2.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream('socket2-' + info.name));
});

var socket3 = new Socket({
  host: 'localhost',
  port: 5000
});

socket3.on('image', function (readStream, info) {
  readStream.pipe(fs.createWriteStream('socket3-' + info.name));
});
