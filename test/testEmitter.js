// Comparation between native EventEmitter and built in Emitter

var EventEmitter = require('events').EventEmitter;
var Emitter = require('../lib/Emitter');
var utils = require('./utils');
var ee = new EventEmitter();
var em = new Emitter();
var c = 0;

function a(data) {
	c++;
}

ee.on('asdf', a);
em.on('asdf', a);

var f = new F();
function F() {
	this.cb = a;
}

var start = Date.now();
for(var i = 0; i < 1e+6; i++) {
	//ee.emit('asdf', 1234);
	//f.cb(1234);
	//em.emit('asdf', 1234);
}
console.log(Date.now() - start);