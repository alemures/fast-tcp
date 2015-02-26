var Accumulator = require('../lib/Accumulator');
var Parser = require('../lib/Parser');
var utils = require('./utils');

var acc = new Accumulator();

var TIMES = 100000;
var string = utils.randomString(10000);
var buffer = Parser.writeBuffer(string, string);
var start;

start = Date.now();
testAdd(TIMES, buffer);
console.log(Date.now() - start);

function testAdd(times, buffer) {
    var i;
    for(i = 0; i < times; i++) {
        acc.add(buffer)
    }
}
