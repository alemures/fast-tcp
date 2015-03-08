var Socket = require('../index').Socket;

var socket = new Socket({
	host: 'localhost',
	port: 5000
});

socket.on('data', function(data) {
	console.log(data);
});

socket.on('connect', function() {
	l('connect');
});

socket.on('end', function() {
	l('end');
});

socket.on('close', function(isError) {
	l(isError ? 'close due to error' : 'close');
});

socket.on('error', function(err) {
	l(err.message);
});

function l(str) {
	console.log('Socket: ' + str);
}

process.stdin.resume();
process.stdin.on('data', function() {
	//socket.emit('data', 'Hi!');
	socket.end();
	//socket.destroy();
});