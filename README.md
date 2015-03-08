fast-tcp
===

fast-tcp is a extremely fast TCP server and client that allows to send and receive messages. The messages are sent in binary format using Buffer and TCP, standard modules of Node.JS.

Server example:
```
var Server = require('../index').Server;
var port = 5000;
var server = new Server();
server.listen(port);
server.on('connection', function(socket) {
	socket.emit('data', 'Hello, Clients!');
});
```

Client example:
```
var Socket = require('../index').Socket;
var socket = new Socket({
	host: 'localhost',
	port: 5000
});
socket.on('data', function(data) {
	console.log(data);
});
```
