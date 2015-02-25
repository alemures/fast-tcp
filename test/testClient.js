var Client = require('../index').Client;

var client = new Client({
	host: 'localhost',
	port: 5000
});
var string = s(10000);

client.on('connect', function() {
	console.log('Connected to server');
	//client.send('data', 'Hello, Server!');
	send(100000);
});

client.on('data', function(data) {
	console.log('Received from server: ' + data);
});

function send(times) {
	var i;

	for(i = 0; i < times; i++) {
		//socket.emit('data', string);
		client.send('data', string);
	}
}

function s(size) {
    var string = '';
    var n = 26;
    var charA = 65;
    for (var i = 0; i < size; i++) {
        string += String.fromCharCode(Math.floor(Math.random() * 26) + charA);
    }
    return string;
}