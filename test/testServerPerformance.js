var Server = require('../index').Server;

var c = 0, last = 0;
var port = 5000;
var server = new Server(port);

server.on('data', function(clientId, data) {
	c++;
})

setInterval(function() {
  console.log(c - last + ' msg/s');
  last = c;
}, 1000);