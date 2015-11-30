'use strict';

var util = require('util');

var Serializer = require('./Serializer');
var Sock = require('./Sock');

function Socket(options) {
  Socket.super_.call(this, options);
}

util.inherits(Socket, Sock);

Socket.prototype.emitAll = function(event, message) {
  if (this._connected) {
    this._emit(event, message, 0, Serializer.MT_EVENT_BROADCAST);
  }
};

Socket.prototype.emitTo = function(event, message, socketId) {
  if (this._connected) {
    this._emit(socketId + ':' + event, message, 0, Serializer.MT_EVENT_TO);
  }
};

Socket.prototype.emitRoom = function(event, message, room) {
  if (this._connected) {
    this._emit(room + ':' + event, message, 0, Serializer.MT_EVENT_ROOM);
  }
};

Socket.prototype.join = function(room) {
  if (this._connected) {
    this._emit('', room, 0, Serializer.MT_JOIN);
  }
};

Socket.prototype.leave = function(room) {
  if (this._connected) {
    this._emit('', room, 0, Serializer.MT_LEAVE);
  }
};

module.exports = Socket;
