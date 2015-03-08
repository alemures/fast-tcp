var net = require('net');
var util = require('util');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Emitter = require('./Emitter');

function Socket(arg) {
	Socket.super_.call(this);
	this._reader = new Reader();

	this.id = ++Socket.nSockets;

	if(arg instanceof net.Socket) {
		// Server
		this._options = {};
		this._reconnection = false;
		this._reconnectionInterval = 0;

		this._connected = true;
		this._socket = arg;

		this._bindEvents();
	} else {
		// Client
		var options = arg !== undefined ? arg : {};

		this._options = options;
		this._reconnection = typeof options.reconnection === 'boolean' ? options.reconnection : true;
		this._reconnectionInterval = typeof options.reconnectionInterval === 'number' ? options.reconnectionInterval : 1000;

		this._connected = false;
		this._socket = null;

		this.connect();
	}
}
util.inherits(Socket, Emitter);

Socket.nSockets = 0;

Socket.prototype.connect = function() {
	if(!this._connected) {
		this._socket = net.createConnection(this._options);
		this._bindEvents();
	}
};

Socket.prototype.superEmit = Socket.prototype.emit;
Socket.prototype.emit = function(event, message) {
	if(this._connected) {
		this._socket.write(Serializer.serialize(event, message));
	}
};

Socket.prototype.end = function() {
	if(this._connected) {
		this._socket.end();
	}
};

Socket.prototype.destroy = function() {
	if(this._connected) {
		this._socket.destroy();
	}
};

Socket.prototype._reconnect = function() {
	var self = this;
	setTimeout(function(){
		self.connect();
	}, this._reconnectionInterval);
};

Socket.prototype._bindEvents = function() {
	var self = this;

	this._socket.on('connect', function() {
		self._connected = true;
		self.superEmit('connect');
	});

	this._socket.on('data', function(data) {
		var i;
		var obj;
		var buffers = self._reader.read(data);
		var buffersLength = buffers.length;
		
		for(i = 0; i < buffersLength; i++) {
			obj = Serializer.deserialize(buffers[i]);
			self.superEmit(obj.event ,obj.message);
		}
	});

	this._socket.on('close', function() {
		self._connected = false;
		if(self._reconnection) {
			self._reconnect();
		}
		self.superEmit('close');
	});

	this._socket.on('error', function(err) {
		self.superEmit('error', err);
	});
};

module.exports = Socket;