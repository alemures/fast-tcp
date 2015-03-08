var Server = require('../index').Server;

var port = 5000;
var server = new Server();
server.listen(port);

server.on('connection', function(socket) {
	socket.emit('data', 'Hello, Clients!');
});