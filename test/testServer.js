var Server = require('../index').Server;

var port = 5000;
var server = new Server();
server.listen(port);
var id;
server.on('connection', function(socket) {
	l2('connect');
	id = socket.id;

	socket.on('data', function(data) {
		console.log(data);
	});

	socket.on('end', function() {
		l2('end');
	});

	socket.on('close', function(isError) {
		l2(isError ? 'close due to error' : 'close');
	});

	socket.on('error', function(err) {
		l2(err.message);
	});
});

server.on('listening', function() {
	l('listening');
});

server.on('close', function() {
	l('close');
});

server.on('error', function(err) {
	l(err.message);
});

function l(str) {
	console.log('Server: ' + str);
}

function l2(str) {
	console.log('Socket: ' + str);
}

process.stdin.resume();
process.stdin.on('data', function() {
	server.sockets[id].emit('data', 'You are the last');
	//server.emit('data', 'Hi!');
	//server.close();
});