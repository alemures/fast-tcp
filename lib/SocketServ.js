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

SocketServ.prototype.emitAll = function(event, message) {
  if (this._connected) {
    this._server.emitExcept(event, message, this.id);
  }
};

SocketServ.prototype.emitTo = function(event, message, socketId) {
  if (this._connected) {
    this._server.emitTo(event, message, socketId);
  }
};

SocketServ.prototype.emitRoom = function(event, message, room) {
  if (this._connected) {
    this._server.emitRoom(event, message, room);
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
    case Serializer.MT_JOIN:
      this.join(msg.message);
      break;
    case Serializer.MT_LEAVE:
      this.leave(msg.message);
      break;
    case Serializer.MT_LEAVE_ALL:
      this.leaveAll();
      break;
    case Serializer.MT_EVENT_BROADCAST:
      this.emitAll(msg.event, msg.message);
      break;
    case Serializer.MT_EVENT_ROOM:

      // [0] = room, [1] = event
      arr = msg.event.split(':');
      this.emitRoom(arr[1], msg.message, arr[0]);
      break;
    case Serializer.MT_EVENT_TO:

      // [0] = socketId, [1] = event
      arr = msg.event.split(':');
      this.emitTo(arr[1], msg.message, arr[0]);
  }
};

module.exports = SocketServ;
