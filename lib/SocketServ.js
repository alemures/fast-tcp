'use strict';

var util = require('util');

var Serializer = require('./Serializer');
var Sock = require('./Sock');

function SocketServ(id, socket, server) {
  SocketServ.super_.call(this, {
    autoConnect: false,
    reconnect: false,
    messageListener: this._msgListener
  });

  // Sock fields
  this.id = id;
  this._socket = socket;
  this._connected = true;

  this._server = server;
  this._rooms = {};

  this._bindEvents();
}

util.inherits(SocketServ, Sock);

SocketServ.prototype.emitAll = function(event, data) {
  if (this._connected) {
    this._server.emitExcept(event, data, this.id);
  }
};

SocketServ.prototype.emitSocket = function(event, data, socketId) {
  if (this._connected) {
    this._server.emitSocket(event, data, socketId);
  }
};

SocketServ.prototype.emitRoom = function(event, data, room) {
  if (this._connected) {
    this._server.emitRoom(event, data, room);
  }
};

SocketServ.prototype.join = function(room) {
  if (this._connected) {
    this._server.join(room, this.id);
  }
};

SocketServ.prototype.leave = function(room) {
  if (this._connected) {
    this._server.leave(room, this.id);
  }
};

SocketServ.prototype.leaveAll = function() {
  if (this._connected) {
    this._server.leaveAll(this.id);
  }
};

SocketServ.prototype._msgListener = function(msg) {
  var arr;

  switch (msg.mt) {
    case Serializer.MT_JOIN_ROOM:
      this.join(msg.data);
      break;
    case Serializer.MT_LEAVE_ROOM:
      this.leave(msg.data);
      break;
    case Serializer.MT_LEAVE_ALL_ROOMS:
      this.leaveAll();
      break;
    case Serializer.MT_MESSAGE_TO_ALL:
      this.emitAll(msg.event, msg.data);
      break;
    case Serializer.MT_MESSAGE_TO_ROOM:

      // [0] = room, [1] = event
      arr = msg.event.split(':');
      this.emitRoom(arr[1], msg.data, arr[0]);
      break;
    case Serializer.MT_MESSAGE_TO_SOCKET:

      // [0] = socketId, [1] = event
      arr = msg.event.split(':');
      this.emitSocket(arr[1], msg.data, arr[0]);
  }
};

module.exports = SocketServ;
