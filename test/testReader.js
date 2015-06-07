var Reader = require('../lib/Reader');
var Serializer = require('../lib/Serializer');
var utils = require('./utils');

var reader = new Reader();

// Without fragmentation
/*var TIMES = 100000;
var string = utils.randomString(10000);
var buffer = Serializer.serialize(string, string);
var start;

start = Date.now();
testAdd(TIMES, buffer);
console.log(Date.now() - start);

function testAdd(times, buffer) {
    var i;
    for(i = 0; i < times; i++) {
        reader.read(buffer);
    }
}*/

// With fragmentation
/*var TIMES = 1024;
var string = utils.randomString(1008);
var chunk = Serializer.serialize('asdf', string); // 1024 Bytes
var buffer = new Buffer(1024*1024);
var start;

for(var i = 0; i < 1024; i++) {
	chunk.copy(buffer, i * 1024, 0, chunk.length);
}

start = Date.now();
testAdd(TIMES, buffer);
console.log(Date.now() - start);

function testAdd(times, buffer) {
    var i;
    for(i = 0; i < times; i++) {
        reader.read(buffer);
    }
}*/