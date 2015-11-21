'use strict';

var Server = require('../index').Server;

var port = 5000;
var server = new Server();

server.on('connection', function(socket) {
  var label = 'Socket#' + socket.id;

  console.log(label, 'connected');

  socket.on('event1', function(data) {
    console.log(label, data);
  });

  socket.on('event2', function(data, cb) {
    cb(data + ' -> Fine, thanks');
  });

  socket.on('end', function() {
    console.log(label, 'end');
  });

  socket.on('close', function(isError) {
    console.log(label, isError ? 'close due to an error' : 'close');
  });

  socket.on('error', function(err) {
    console.log(label, err.message);
  });
});

server.on('listening', function() {
  console.log('listening');
});

server.on('close', function() {
  console.log('close');
});

server.on('error', function(err) {
  console.log(err.message);
});

server.listen(port);
