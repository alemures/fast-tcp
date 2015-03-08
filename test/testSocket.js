var Socket = require('../index').Socket;

var socket = new Socket({
	host: 'localhost',
	port: 5000
});

socket.on('data', function(data) {
	console.log(data);
});