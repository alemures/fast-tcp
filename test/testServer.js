var Server = require('../index').Server;
var server = new Server(5000);
var c = 0;

server.on('connection', function(clientId) {
	console.log('Connected client #' + clientId);
});

server.on('disconnection', function(clientId) {
	console.log('Disconnected client #' + clientId);
});

server.on('data', function(clientId, data) {
	c++;
	//console.log('Client #' + clientId + ' says: ' + data);
});

/*setInterval(function() {
	server.sendAll('data', 'Hi Clients!');
}, 3000);*/

var last = 0;
setInterval(function() {
	console.log(c - last + ' msg/s');
	last = c;
}, 1000);