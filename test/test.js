var Server = require('../index').Server;
var port = 5000;
var server = new Server();
server.listen(port);
server.on('connection', function(socket) {
	socket.emit('data', new Buffer('Hello, Clients!'));
});

var Socket = require('../index').Socket;
var socket = new Socket({
	host: 'localhost',
	port: 5000
});
socket.on('data', function(data) {
	console.log(data.toString());
});