var EventEmitter = require('events').EventEmitter;
var ee = new EventEmitter();
var c = 0;

function a(data) {
	c++;
}

ee.on('asdf', a);

var f = new F();
function F() {
	this.cb = a;
}

var start = Date.now();
for(var i = 0; i < 1000000; i++) {
	//ee.emit('asdf', 1234);
	f.cb(1234);
}
console.log(Date.now() - start);