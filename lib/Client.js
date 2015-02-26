var net = require('net');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Parser = require('./Parser');
var Accumulator = require('./Accumulator');

function Client(config) {
	config = config !== undefined ? config : {};
	Client.super_.call(this);

	this._acc = new Accumulator();

	this._config = config;
	this._reconnectionTime = 1000;
	this._connected = false;
	this._conn = null;

	this._connect();
}
util.inherits(Client, EventEmitter);

Client.prototype.send = function(name, data) {
	if(this._connected) {
		this._conn.write(Parser.writeBuffer(name, data));
	}
};

Client.prototype._connect = function() {
	this._conn = net.createConnection(this._config);
	this._bindEvents();
};

Client.prototype._reconnect = function() {
	var self = this;

	setTimeout(function(){
		self._connect();
	}, this._reconnectionTime);
};

Client.prototype._onError = function(err) {
};

Client.prototype._bindEvents = function() {
	var self = this;

	this._conn.on('connect', function() {
		self._connected = true;
		
		self.emit('connect');
	});

	this._conn.on('data', function(data) {
		var i,
			buffers = self._acc.add(data),
			buffersLength = buffers.length,
			obj;
		
		for(i = 0; i < buffersLength; i++) {
			obj = Parser.readBuffer(buffers[i]);
			self.emit(obj.name ,obj.data);
		}
	});

	this._conn.on('close', function() {
		self._connected = false;
		self._reconnect();

		self.emit('close');
	});

	this._conn.on('error', function(err) {
		self._onError(err);

		self.emit('error', err);
	});
};

module.exports = Client;