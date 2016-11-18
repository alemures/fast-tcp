'use strict';

var Server = require('../index').Server;
var Readable = require('stream').Readable;
var Writable = require('stream').Writable;

var server = new Server();
server.on('connection', function (socket) {
  socket.on('numbers', function (stream) {
    var myWritable = new Writable({
      write: function (chunk, encoding, callback) {
        console.log(chunk.toString());
        setTimeout(()=>callback(),10)
      }
    });

    stream.pipe(myWritable);
  });
});

server.listen(5000);

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

var c = 0;
var myReadable = new Readable({
  read: function (size) {
    if (c++ < 100000) {
      this.push('Data ' + c);
    } else {
      this.push(null);
    }
  }
});

socket.on('connect', function () {
  myReadable.pipe(socket.stream('numbers'));
});
