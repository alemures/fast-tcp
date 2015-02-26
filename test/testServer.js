var Server = require('../index').Server;

var port = 5000;
var server = new Server(port);

var clients = [];

server.on('listening', function() {
	console.log('TCP server listening at port ' + port);
});

server.on('connection', function(clientId) {
	server.sendAllExcept('new', '' + clientId, clientId);

	server.sendTo(clientId, 'welcome', 'Welcome new client');
	server.sendTo(clientId, 'actual', '' + clients);

	clients.push(clientId);

	console.log('Connected client #' + clientId);
});

server.on('disconnection', function(clientId) {
	clients.splice(clients.indexOf(clientId), 1);

	server.sendAll('old', '' + clientId);

	console.log('Disconnected client #' + clientId);
});

server.on('close', function() {
	console.log('TCP server closed');
});

server.on('error', function(err) {
	console.log(err.code);
});

// Custom events

server.on('message', function(message) {
	console.log(message);
	console.log(JSON.parse(message));
});