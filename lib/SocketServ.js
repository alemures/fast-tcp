'use strict';

var net = require('net');
var util = require('util');

var Sock = require('./Sock');

function SocketServ(socket, server) {
  SocketServ.super_.call(this, {}, this._processMessage);

  // Sock fields
  this._socket = socket;
  this._connected = true;

  this._server = server;
  this._rooms = {};
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
    this._server._join(this, room);
  }
};

SocketServ.prototype.leave = function(room) {
  if (this._connected) {
    this._server._leave(this, room);
  }
};

SocketServ.prototype._processMessage = function(msg) {
  var event;

  switch (msg.mt) {
    case Serializer.MT_JOIN:
      this.join(msg.message);
      break;
    case Serializer.MT_LEAVE:
      this.leave(msg.message);
      break;
    case Serializer.MT_EVENT_BROADCAST:
      this.emitAll(msg.event, msg.message);
      break;
    case Serializer.MT_EVENT_ROOM:
      // [0] = room, [1] = event
      var arr = msg.event.split(':');
      this.emitRoom(arr[1], msg.message, arr[0]);
      break;
    case Serializer.MT_EVENT_TO:
      // [0] = socketId, [1] = event
      var arr = msg.event.split(':');
      this.emitTo(arr[1], msg.message, arr[0]);
  }
};

module.exports = SocketServ;
