fast-tcp
===

fast-tcp is a extremely fast TCP server and client that allows to send and receive messages. The messages are sent in binary format using Buffer and TCP, standard modules of Node.JS.

Server example:
```
var Server = require('fast-tcp').Server;
var server = new Server(5000);
server.on('message', function(clientId, data) {
	console.log('Client #' + clientId + ' says: ' + data);
})
```

Client example:
```
var Client = require('fast-tcp').Client;
var client = new Client({
	host: 'localhost',
	port: 5000
});
client.on('connect', function() {
	client.send('message', 'Hello, Server!');
});
```
