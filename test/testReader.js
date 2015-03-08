var Reader = require('../lib/Reader');
var Serializer = require('../lib/Serializer');
var utils = require('./utils');

var reader = new Reader();

var TIMES = 100000;
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
}