'use strict';

var util = require('util');

var Serializer = require('./Serializer');
var Sock = require('./Sock');

function Socket(options) {
  options.messageListener = this._msgListener;
  Socket.super_.call(this, options);
}

util.inherits(Socket, Sock);

Socket.prototype.emitAll = function(event, data) {
  if (this._connected) {
    this._emit(event, data, Serializer.MT_MESSAGE_TO_ALL);
  }
};

Socket.prototype.emitSocket = function(event, data, socketId) {
  if (this._connected) {
    this._emit(socketId + ':' + event, data, Serializer.MT_MESSAGE_TO_SOCKET);
  }
};

Socket.prototype.emitRoom = function(event, data, room) {
  if (this._connected) {
    this._emit(room + ':' + event, data, Serializer.MT_MESSAGE_TO_ROOM);
  }
};

Socket.prototype.join = function(room) {
  if (this._connected) {
    this._emit('', room, Serializer.MT_JOIN_ROOM);
  }
};

Socket.prototype.leave = function(room) {
  if (this._connected) {
    this._emit('', room, Serializer.MT_LEAVE_ROOM);
  }
};

Socket.prototype.leaveAll = function() {
  if (this._connected) {
    this._emit('', '', Serializer.MT_LEAVE_ALL_ROOMS);
  }
};

Socket.prototype._msgListener = function(msg) {
  var arr;

  switch (msg.mt) {
    case Serializer.MT_REGISTER:
      this.id = msg.data;
      this._connected = true;

      // Sock connected and registered
      this._superEmit('connect');
  }
};

module.exports = Socket;
