'use strict';

var fs = require('fs');

var Server = require('../index').Server;
var Socket = require('../index').Socket;

var server = new Server();
server.on('connection', function (socket) {
  socket.on('image', function (readStream, info, cb) {
    var writeStream = fs.createWriteStream(info.name);
    readStream.pipe(writeStream);

    writeStream.on('close', function () {
      cb('Image "' + info.name + '" stored!');
    });
  });
});

server.listen(5000);

var socket = new Socket({
  host: 'localhost',
  port: 5000
});
fs.createReadStream('img.jpg').pipe(socket.stream('image', { name: 'img-copy.jpg' },
    function (response) {
  console.log('Response: ' + response);
}));
