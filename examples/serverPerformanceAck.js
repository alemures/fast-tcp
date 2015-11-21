'use strict';

var Server = require('../index').Server;

var server = new Server();
server.on('connection', function(socket) {
  socket.on('data', function(message, cb) {
    cb(message);
  });
});

server.listen(5000);