var Accumulator = require('../lib/Accumulator');
var Parser = require('../lib/Parser');

var acc = new Accumulator();

var buffers = [];
var i, SIZE = 1;
var start = Date.now();
for(i = 0; i < SIZE; i++) {
	buffers.push(Parser.writeBuffer('asdf', 'asdfñ'));
}
console.log(Date.now() - start);

for(i = 0; i < SIZE; i++) {
	console.log(Parser.readBuffer(buffers[i]));
}


function randomString(size) {
    var string = '',
        start = 97,
        alphabetLength = 26,
        end = start + alphabetLength,
        i;

    for (i = 0; i < size; i++) {
        string += String.fromCharCode(
            randomNumber(start, end));
    }
    return string;
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}