'use strict';

var Server = require('../index').Server;

var counter = 0;
var lastCounterValue = 0;
var messageSize = 1;
var port = 5000;
var server = new Server();
server.listen(port);

server.on('connection', function(socket) {
  socket.on('data', function(data) {
    messageSize = data.length;
    counter++;
  });
});

setInterval(function() {
  var delta = counter - lastCounterValue;
  console.log(delta + ' msg/s, ' + Math.floor(delta * messageSize / 1024 / 1024) + ' MB/s');
  lastCounterValue = counter;
}, 1000);
