'use strict';

var util = require('util');
var ut = require('utjs');

var Serializer = require('./Serializer');
var Sock = require('./Sock');

function Socket(opts) {
  opts.messageListener = this._msgListener;
  Socket.super_.call(this, opts);
}

util.inherits(Socket, Sock);

Socket.prototype.emit = function(event, data, param) {
  var opts = ut.isObject(param) ? param : {};
  var cb = ut.isFunction(param) ? param : null;

  if (this._connected) {
    this._emit(event, data, opts, cb);
  }
};

Socket.prototype._emit = function(event, data, opts, cb) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;
  var i;

  if (broadcast) {
    this._send(event, data, Serializer.MT_DATA_BROADCAST);
  }

  if (socketIds.length > 0) {
    this._send(socketIds.join(',') + ':' + event, data, Serializer.MT_DATA_TO_SOCKET);
  }

  if (rooms.length > 0) {
    this._send(rooms.join(',') + ':' + event, data, Serializer.MT_DATA_TO_ROOM);
  }

  if (socketIds.length + rooms.length === 0 && !broadcast) {
    var opts = {};
    var mt = Serializer.MT_DATA;

    if (cb !== null) {
      opts.cb = cb;
      mt = Serializer.MT_DATA_WITH_ACK;
    }

    this._send(event, data, mt, opts);
  }
};

Socket.prototype.join = function(room) {
  if (this._connected) {
    this._send('', room, Serializer.MT_JOIN_ROOM);
  }
};

Socket.prototype.leave = function(room) {
  if (this._connected) {
    this._send('', room, Serializer.MT_LEAVE_ROOM);
  }
};

Socket.prototype.leaveAll = function() {
  if (this._connected) {
    this._send('', '', Serializer.MT_LEAVE_ALL_ROOMS);
  }
};

Socket.prototype._msgListener = function(msg) {
  switch (msg.mt) {
    case Serializer.MT_REGISTER:
      this.id = msg.data;
      this._connected = true;

      // Sock connected and registered
      this._superEmit('connect');
  }
};

module.exports = Socket;
