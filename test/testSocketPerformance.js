var Socket = require('../index').Socket;
var utils = require('./utils');

var TIMES = 100000;
var string = utils.randomString(10000);
var socket = new Socket({
	host: 'localhost',
	port: 5000
});

socket.on('connect', function() {
	var i;
	for(i = 0; i < TIMES; i++) {
		socket.emit('data', string);
	}
});