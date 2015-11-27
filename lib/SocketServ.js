'use strict';

var net = require('net');
var util = require('util');

var Sock = require('./Sock');

function SocketServ(socket, server) {
  SocketServ.super_.call(this, {}, _processMessage);

  // Sock fields
  this._socket = socket;
  this._connected = true;

  this._server = server;
  this._rooms = {};
}

util.inherits(SocketServ, Sock);

SocketServ.prototype.emitAll = function(event, message) {
  if (this._connected) {
    this._server.emitExclude(event, message, this.id);
  }
};

SocketServ.prototype.emitRoom = function(event, message, room) {
  if (this._connected) {
    var room = event.substring(0, event.indexOf(':'));
    event = event.substring(event.indexOf(':') + 1);
    this._server.emitRoom(event, message, room);
  }
};

SocketServ.prototype.emitTo = function(event, message, socketId) {
  if (this._connected) {
    var socketIdDest = event.substring(0, event.indexOf(':'));
    event = event.substring(event.indexOf(':') + 1);
    this._server.emitTo(event, message, socketIdDest);
  }
};

SocketServ.prototype.join = function(room) {
  if (this._connected) {
    this._server.join(this, room);
  }
};

SocketServ.prototype.leave = function(room) {
  if (this._connected) {
    this._server.leave(this, room);
  }
};

SocketServ.prototype._processMessage = function(msg) {
  var event;

  switch (msg.mt) {
    case Serializer.MT_JOIN:
      this._server.join(this, msg.message);
      break;
    case Serializer.MT_LEAVE:
      this._server.leave(this, msg.message);
      break;
    case Serializer.MT_EVENT_BROADCAST:
      this._server.emitExclude(msg.event, msg.message, this.id);
      break;
    case Serializer.MT_EVENT_ROOM:
      var room = msg.event.substring(0, msg.event.indexOf(':'));
      event = msg.event.substring(msg.event.indexOf(':') + 1);
      this._server.emitRoom(event, msg.message, room);
      break;
    case Serializer.MT_EVENT_TO:
      var socketIdDest = msg.event.substring(0, msg.event.indexOf(':'));
      event = msg.event.substring(msg.event.indexOf(':') + 1);
      this._server.emitTo(event, msg.message, socketIdDest);
  }
};

module.exports = SocketServ;
