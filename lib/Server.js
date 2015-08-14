'use strict';

var net = require('net');
var util = require('util');

var Emitter = require('./Emitter');
var Socket = require('./Socket');

function Server(config) {
  config = config !== undefined ? config : {};
  Server.super_.call(this);

  this.sockets = {};

  this._server = net.createServer(config);
  this._bindEvents();
}

util.inherits(Server, Emitter);

Server.prototype._superEmit = Server.prototype.emit;
Server.prototype.emit = function(event, message) {
  var socketId;

  for (socketId in this.sockets) {
    this.sockets[socketId].emit(event, message);
  }
};

Server.prototype.listen = function(port) {
  this._server.listen(port);
};

Server.prototype.close = function() {
  var socketId;

  for (socketId in this.sockets) {
    this.sockets[socketId].end();
  }

  this._server.close();
};

Server.prototype._bindEvents = function() {
  var _this = this;

  this._server.on('listening', function() {
    _this._superEmit('listening');
  });

  this._server.on('connection', function(socket) {
    _this._bindEventsSocket(socket);
  });

  this._server.on('close', function() {
    _this._superEmit('close');
  });

  this._server.on('error', function(error) {
    _this._superEmit('error', error);
  });
};

Server.prototype._bindEventsSocket = function(sock) {
  var socket = new Socket(sock);
  var _this = this;

  socket.on('close', function() {
    delete _this.sockets[socket.id];
  });

  this.sockets[socket.id] = socket;
  this._superEmit('connection', socket);
};

module.exports = Server;
