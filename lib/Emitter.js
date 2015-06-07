'use strict';

function Emitter() {
	this.events = {};
}

Emitter.prototype.on = function(event, fn) {
	if(this.events[event] === undefined) {
		this.events[event] = [fn];
	} else {
		this.events[event].push(fn);
	}
};

Emitter.prototype.removeListener = function(event, fn) {
	var fns = this.events[event];
	if(fns !== undefined) {
		var index = fns.indexOf(fn);
		if(index > -1) {
			fns.splice(index, 1);
		}
	}
};

Emitter.prototype.removeAllListeners = function(event) {
	delete this.events[event];
};

Emitter.prototype.emit = function(event, message) {
	var fns = this.events[event];
	if(fns !== undefined) {
		var i = fns.length;
		while(i > 0) {
			fns[--i](message);
		}
	}
};

module.exports = Emitter;