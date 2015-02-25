var net = require('net');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Parser = require('./Parser');
var Accumulator = require('./Accumulator');

function Server(port, config) {
	port = port !== undefined ? port : 5000;
	config = config !== undefined ? config : {};
	Server.super_.call(this);

	this._server = net.createServer(config);
	this._server.listen(port);

	this._acc = new Accumulator();

	this._clientIdSeed = 0;

	this._clients = {};
	this._bindEvents();
}
util.inherits(Server, EventEmitter);

Server.prototype.sendTo = function(clientId, name, data) {
	var client = this._clients[clientId];
	if(client !== undefined) {
		client.write(Parser.writeBuffer(name, data));
	}
};

Server.prototype.sendAll = function(name, data) {
	var clientId;
	var buff = Parser.writeBuffer(name, data);

	for(clientId in this._clients) {
		this._clients[clientId].write(buff);
	}
};

Server.prototype._bindEvents = function() {
	var self = this;

	this._server.on('listening', function() {
		self.emit('listening');
	});

	this._server.on('connection', function(socket) {
		self._bindEventsSocket(socket);
	});

	this._server.on('close', function() {
		self.emit('close');
	});

	this._server.on('error', function(error) {
		self.emit('error', error);
	});
};

Server.prototype._bindEventsSocket = function(socket) {
	var clientId = ++this._clientIdSeed;
	var self = this;

	socket.on('data', function(data) {
		var i,
			buffers = self._acc.add(data),
			buffersLength = buffers.length,
			obj;
		
		for(i = 0; i < buffersLength; i++) {
			obj = Parser.readBuffer(buffers[i]);
			self.emit(obj.name, clientId ,obj.data);
		}
	});

	socket.on('close', function() {
		delete self._clients[clientId];
		self.emit('disconnection', clientId);
	});

	this._clients[clientId] = socket;
	this.emit('connection', clientId);
};

module.exports = Server;