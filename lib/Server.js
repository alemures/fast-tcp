'use strict';

var net = require('net');
var util = require('util');
var ut = require('utjs');
var EventEmitter = require('events');

var SocketServ = require('./SocketServ');
var Serializer = require('./Serializer');

function Server(opts) {
  opts = ut.isObject(opts) ? opts : {};
  Server.super_.call(this);

  this.sockets = {};
  this.rooms = {};

  this._server = net.createServer(opts);
  this._bindEvents();
}

util.inherits(Server, EventEmitter);

Server.prototype._superEmit = Server.prototype.emit;
Server.prototype.emit = function(event, data, opts) {
  opts = ut.isObject(opts) ? opts : {};
  this._emit(event, data, opts);
};

Server.prototype._emit = function(event, data, opts) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var except = ut.isArray(opts.except)  ? opts.except : [];

  var socketId;
  var sockets;
  var socket;
  var i;
  var j;

  // Send to list of sockets
  if (socketIds.length > 0) {
    for (i = 0; i < socketIds.length; i++) {
      socket = this.sockets[socketIds[i]];
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        socket.emit(event, data);
      }
    }
  }

  // Send to list of rooms
  if (rooms.length > 0) {
    for (i = 0; i < rooms.length; i++) {
      sockets = this.rooms[rooms[i]];
      if (sockets !== undefined) {
        for (j = 0; j < sockets.length; j++) {
          socket = sockets[j];
          if (except.indexOf(socket.id) === -1) {
            socket.emit(event, data);
          }
        }
      }
    }
  }

  // Broadcast if no socketIds or rooms are provided
  if (socketIds.length + rooms.length === 0) {
    for (socketId in this.sockets) {
      if (except.indexOf(socketId) === -1) {
        this.sockets[socketId].emit(event, data);
      }
    }
  }
};

Server.prototype.join = function(room, socketId) {
  var socket = this.sockets[socketId];
  var sockets;

  if (socket === undefined) {
    return;
  }

  if (this.rooms[room] === undefined) {
    this.rooms[room] = [];
  }

  sockets = this.rooms[room];
  if (sockets.indexOf(socket) === -1) {
    sockets.push(socket);
    socket._rooms[room] = true;
  }
};

Server.prototype.leave = function(room, socketId) {
  var socket = this.sockets[socketId];
  var sockets = this.rooms[room];

  if (socket !== undefined && sockets !== undefined) {
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

Server.prototype.leaveAll = function(socketId) {
  var socket = this.sockets[socketId];
  var room;

  if (socket !== undefined) {
    for (room in socket._rooms) {
      this.leave(room, socketId);
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
  var socket = new SocketServ(this._generateSocketId(), sock, this);
  var _this = this;

  socket.on('close', function() {
    _this.leaveAll(socket.id);
    delete _this.sockets[socket.id];
  });

  this.sockets[socket.id] = socket;
  this._superEmit('connection', socket);

  // Sends the id to socket client
  socket._send('', socket.id, Serializer.MT_REGISTER);
};

Server.prototype._generateSocketId = function() {
  var socketId;

  do {
    socketId = ut.randomString(5);
  } while (this.sockets[socketId] !== undefined);

  return socketId;
};

module.exports = Server;
