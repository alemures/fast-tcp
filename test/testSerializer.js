var Serializer = require('../lib/Serializer');
var utils = require('./utils');

var TIMES = 100000;
var string = utils.randomString(10000);
var buffer = Serializer.serialize(string, string);

//testReadBuffer(TIMES);
//testWriteBuffer(TIMES, string);

function testReadBuffer(times) {
	var start = Date.now();
	var i;
	for(i = 0; i < times; i++) {
		Serializer.deserialize(buffer);
	}
	console.log(Date.now() - start);
}

function testWriteBuffer(times, string) {
	var start = Date.now();
	var i;
	for(i = 0; i < times; i++) {
		Serializer.serialize(string, string);
	}
	console.log(Date.now() - start);
}