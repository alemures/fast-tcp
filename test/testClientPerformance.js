var Client = require('../index').Client;
var utils = require('./utils');

var TIMES = 100000;
var string = utils.randomString(10000);
var client = new Client({
	host: 'localhost',
	port: 5000
});

client.on('connect', function() {
	var i;
	for(i = 0; i < TIMES; i++) {
		client.send('data', string);
	}
});