'use strict';

var Readable = require('stream').Readable;
var Writable = require('stream').Writable;

var Server = require('../index').Server;

var server = new Server();
server.on('connection', function (socket) {
  socket.on('streaming_dashes', function (info, readStream) {
    console.log('Starting streaming info: ', info);

    var writeStream = new Writable({
      write: function (chunk, encoding, cb) {
        setTimeout(function () {
          console.log('Chunk received of', chunk.length, 'bytes');
          cb();
        }, 100);
      }
    });

    writeStream.on('finish', function () {
      console.log('Streaming finished');
    });

    readStream.pipe(writeStream);
  });
});

server.listen(5000);

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

var longString = new Array(100001).join('-');

var counter = 0;
var max = 25;
var readStream = new Readable({
  read: function (size) {
    var _this = this;

    if (counter++ < max) {
      setTimeout(function () {
        _this.push(longString);
      }, 50);
    } else {
      this.push(null);
    }
  }
});

socket.on('connect', function () {
  readStream.pipe(socket.stream('streaming_dashes',
      { size: (longString.length * max) + ' bytes' }));
});
