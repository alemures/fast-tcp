var Parser = require('../lib/Parser');
var utils = require('./utils');

var TIMES = 100000;
var string = utils.randomString(10000);
var buffer = Parser.writeBuffer(string, string);


//testReadBuffer(TIMES);
testWriteBuffer(TIMES, string);


function testReadBuffer(times) {
	var start = Date.now(),
		i;
	for(i = 0; i < times; i++) {
		Parser.readBuffer(buffer);
	}
	console.log(Date.now() - start);
}

function testWriteBuffer(times, string) {
	var start = Date.now(),
		i;
	for(i = 0; i < times; i++) {
		Parser.writeBuffer(string, string);
	}
	console.log(Date.now() - start);
}