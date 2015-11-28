'use strict';

var net = require('net');
var util = require('util');
var ut = require('utjs');
var EventEmitter = require('events');

var SocketServ = require('./SocketServ');
var Serializer = require('./Serializer');

function Server(config) {
  config = config !== undefined ? config : {};
  Server.super_.call(this);

  this.sockets = {};
  this.rooms = {};

  this._server = net.createServer(config);
  this._bindEvents();
}

util.inherits(Server, EventEmitter);

Server.prototype._superEmit = Server.prototype.emit;
Server.prototype.emit = function(event, message) {
  var socketId;
  for (socketId in this.sockets) {
    this.sockets[socketId].emit(event, message);
  }
};

Server.prototype.emitExcept = function(event, message, exceptSocketId) {
  var socketId;
  for (socketId in this.sockets) {
    if (socketId !== excludedSocketId) {
      this.sockets[socketId].emit(event, message);
    }
  }
};

Server.prototype.emitTo = function(event, message, socketId) {
  var socket = this.sockets[socketId];
  if (socket !== undefined) {
    socket.emit(event, message);
  }
};

Server.prototype.emitRoom = function(event, message, room) {
  var sockets = this.rooms[room];
  var socketsLength;
  var i;

  if (sockets !== undefined) {
    socketsLength = sockets.length;
    for (i = 0; i < socketsLength; i++) {
      sockets[i].emit(event, message);
    }
  }
};

Server.prototype._join = function(socket, room) {
  var sockets;
  if (this.rooms[room] === undefined) {
    this.rooms[room] = [];
  }

  sockets = this.rooms[room];
  if (sockets.indexOf(socket) === -1) {
    sockets.push(socket);
    socket._rooms[room] = true;
  }
};

Server.prototype._leave = function(socket, room) {
  var sockets = this.rooms[room];
  if (sockets !== undefined) {
    var index = sockets.indexOf(socket);
    if (index > -1) {
      sockets.splice(index, 1);
      if (sockets.length === 0) {
        delete this.rooms[room];
      }

      delete socket._rooms[room];
    }
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
  var socket = new SocketServ(sock, this);
  socket.id = this._generateSocketId();
  var _this = this;

  socket.on('close', function() {
    delete _this.sockets[socket.id];
    _this._removeFromRooms(socket);
  });

  this.sockets[socket.id] = socket;
  this._superEmit('connection', socket);

  // Sends the id to the client
  socket._emit('', socket.id, 0, Serializer.MT_REGISTER);
};

Server.prototype._generateSocketId = function() {
  var socketId;

  do {
    socketId = ut.randomString(5);
  } while (this.sockets[socketId] !== undefined);

  return socketId;
};

Server.prototype._removeFromRooms = function(socket) {
  var room;
  var i;

  for (room in socket._rooms) {
    i = this.rooms[room].indexOf(socket);
    if (i > -1) {
      this.rooms[room].splice(i, 1);
    }
  }
};

module.exports = Server;
