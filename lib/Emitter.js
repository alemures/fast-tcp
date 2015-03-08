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

Emitter.prototype.once = function(event, fn) {
	var self = this;
	this.on(event, function(message) {
		fn(message);
		self.removeListener(event);
	});
};

Emitter.prototype.removeListener = function(event) {
	delete this.events[event];
};

Emitter.prototype.removeAllListeners = function() {
	this.events = {};
};

Emitter.prototype.emit = function(event, message) {
	var fns = this.events[event];
	if(fns !== undefined) {
		var fnsLength = fns.length;
		var i;

		for(i = 0; i < fnsLength; i++) {
			fns[i](message);
		}
	}
};

module.exports = Emitter;