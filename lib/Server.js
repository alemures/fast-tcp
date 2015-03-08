var net = require('net');
var util = require('util');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Emitter = require('./Emitter');
var Socket = require('./Socket');

function Server(config) {
	config = config !== undefined ? config : {};
	Server.super_.call(this);

	this.sockets = {};

	this._server = net.createServer(config);
	this._reader = new Reader();
	this._bindEvents();
}
util.inherits(Server, Emitter);

Server.prototype.superEmit = Server.prototype.emit;
Server.prototype.emit = function(event, message) {
	var socketId;

	for(socketId in this.sockets) {
		this.sockets[socketId].emit(event, message);
	}
};

Server.prototype.listen = function(port) {
	this._server.listen(port);
};

Server.prototype.close = function() {
	this._server.close();
};

Server.prototype._bindEvents = function() {
	var self = this;

	this._server.on('listening', function() {
		self.superEmit('listening');
	});

	this._server.on('connection', function(socket) {
		self._bindEventsSocket(socket);
	});

	this._server.on('close', function() {
		self.superEmit('close');
	});

	this._server.on('error', function(error) {
		self.superEmit('error', error);
	});
};

Server.prototype._bindEventsSocket = function(sock) {
	var socket = new Socket(sock);
	var self = this;

	socket.on('close', function() {
		delete self.sockets[socket.id];
		console.log('delete');
	});

	this.sockets[socket.id] = socket;
	this.superEmit('connection', socket);
};

module.exports = Server;