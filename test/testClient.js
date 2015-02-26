var Client = require('../index').Client;

var client = new Client({
	host: 'localhost',
	port: 5000
});

client.on('connect', function() {
	console.log('Connected to server');
	client.send('data', 'Hello, Server!');
});

client.on('close', function() {
	console.log('Disconnected from server');
});

client.on('error', function(err) {
	console.log(err.code + ': ' + err.message);
});

// Custom events
client.on('welcome', function(data) {
	console.log('welcome: ' + data);
});

client.on('actual', function(data) {
	console.log('actual: ' + data);
});

client.on('new', function(data) {
	console.log('new: ' + data);

	setInterval(function() {
		client.send('message', JSON.stringify({text: 'Hello, World!', to: 'asdf'}));
	}, 2000);
});

client.on('old', function(data) {
	console.log('old: ' + data);
});
