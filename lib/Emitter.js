function Emitter() {
	this.events = {};
}

Emitter.prototype.on = function(event, fn) {
	this.events[event] = fn;
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
	var fn = this.events[event];
	if(fn !== undefined) {
		fn(message);
	}
};

module.exports = Emitter;