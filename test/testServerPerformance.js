var Server = require('../index').Server;

var c = 0, last = 0;
var port = 5000;
var server = new Server();
server.listen(port);

server.on('connection', function(socket) {
	socket.on('data', function(data) {
		c++;
	});
});

setInterval(function() {
  console.log(c - last + ' msg/s');
  last = c;
}, 1000);