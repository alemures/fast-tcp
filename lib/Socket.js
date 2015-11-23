'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Constants = require('./Constants');

function Socket(args, socket, server) {
  Socket.super_.call(this);
  this._reader = new Reader();

  this.id = null;

  this._ackId = 0;
  this._acks = {};

  this._skipReconnection = false;

  if (socket !== undefined && socket instanceof net.Socket) {
    // Server
    this._options = {};
    this._reconnection = false;
    this._reconnectionInterval = 0;

    this._connected = true;
    this._socket = socket;
    this._server = server;

    this._rooms = {};

    this._bindEvents();
  } else {
    // Client
    var options = args !== undefined ? args : {};

    this._options = options;
    this._reconnection = typeof options.reconnection === 'boolean' ?
        options.reconnection : Constants.RECONNECTION;
    this._reconnectionInterval = typeof options.reconnectionInterval === 'number' ?
        options.reconnectionInterval : Constants.RECONNECTION_INTERVAL;

    this._connected = false;
    this._socket = null;

    this._connect();
  }
}

util.inherits(Socket, EventEmitter);

Socket.prototype._superEmit = Socket.prototype.emit;

/**
 * @param {string} event The event
 * @paramn {buffer|string|number|object} message The message to send
 */
Socket.prototype.emit = function(event, message, cb) {
  var ackId = 0;

  if (this._connected) {
    if (cb !== undefined) {
      ackId = ++this._ackId;
      this._acks[ackId] = cb;
    }

    this._socket.write(Serializer.serialize(event, message, ackId, Serializer.MT_EVENT));
  }
};

Socket.prototype.emitAll = function(event, message) {
  if (this._connected) {
    this._socket.write(Serializer.serialize(event, message, 0, Serializer.MT_EVENT_BROADCAST));
  }
};

Socket.prototype.emitRoom = function(event, message, room) {
  if (this._connected) {
    this._socket.write(Serializer.serialize(room + ':' + event, message, 0, Serializer.MT_EVENT_ROOM));
  }
};

Socket.prototype.emitTo = function(event, message, socketId) {
  if (this._connected) {
    this._socket.write(Serializer.serialize(socketId + ':' + event, message, 0, Serializer.MT_EVENT_TO));
  }
};

Socket.prototype.join = function(room) {
  if (this._connected) {
    this._socket.write(Serializer.serialize('', room, 0, Serializer.MT_JOIN));
  }
};

Socket.prototype.leave = function(room) {
  if (this._connected) {
    this._socket.write(Serializer.serialize('', room, 0, Serializer.MT_LEAVE));
  }
};

Socket.prototype.end = function() {
  if (this._connected) {
    this._skipReconnection = true;
    this._socket.end();
  }
};

Socket.prototype.destroy = function() {
  if (this._connected) {
    this._skipReconnection = true;
    this._socket.destroy();
  }
};

Socket.prototype._connect = function() {
  if (!this._connected) {
    this._socket = net.createConnection(this._options);
    this._bindEvents();
  }
};

Socket.prototype._reconnect = function() {
  var _this = this;
  setTimeout(function() {
    _this._connect();
  }, this._reconnectionInterval);
};

Socket.prototype._internalEmit = function(event, message, mt) {
  if (this._connected) {
    this._socket.write(Serializer.serialize(event, message, 0, mt));
  }
};

Socket.prototype._emitAck = function(message, ackId) {
  if (this._connected) {
    this._socket.write(Serializer.serialize('', message, ackId, Serializer.MT_ACK));
  }
};

Socket.prototype._bindEvents = function() {
  var _this = this;

  this._socket.on('connect', function() {
    // Connected socket but waiting register
    _this._superEmit('socket_connect');
  });

  this._socket.on('data', function(data) {
    var buffers = _this._reader.read(data);
    var buffersLength = buffers.length;
    var obj;
    var i;

    for (i = 0; i < buffersLength; i++) {
      obj = Serializer.deserialize(buffers[i]);
      _this._processIncomingObj(obj);
    }
  });

  this._socket.on('end', function() {
    _this._superEmit('end');
  });

  this._socket.on('close', function(isError) {
    _this._connected = false;
    if (_this._reconnection && !_this._skipReconnection) {
      _this._reconnect();
    }

    _this.id = null;
    _this._skipReconnection = false;
    _this._superEmit('close', isError);
  });

  this._socket.on('error', function(err) {
    _this._superEmit('error', err);
  });
};

Socket.prototype._processIncomingObj = function(obj) {
  var event;

  switch (obj.mt) {
    case Serializer.MT_EVENT:
      this._superEmit(obj.event, obj.message, this._ackCallback(obj.ackId));
      break;
    case Serializer.MT_ACK:
      this._acks[obj.ackId](obj.message);
      delete this._acks[obj.ackId];
      break;
    case Serializer.MT_JOIN:
      this._server.join(this, obj.message);
      break;
    case Serializer.MT_LEAVE:
      this._server.leave(this, obj.message);
      break;
    case Serializer.MT_EVENT_BROADCAST:
      this._server.emitExclude(obj.event, obj.message, this.id);
      break;
    case Serializer.MT_EVENT_ROOM:
      var room = obj.event.substring(0, obj.event.indexOf(':'));
      event = obj.event.substring(obj.event.indexOf(':') + 1);
      this._server.emitRoom(event, obj.message, room);
      break;
    case Serializer.MT_EVENT_TO:
      var socketIdDest = obj.event.substring(0, obj.event.indexOf(':'));
      event = obj.event.substring(obj.event.indexOf(':') + 1);
      this._server.emitTo(event, obj.message, socketIdDest);
      break;
    case Serializer.MT_REGISTER:
      this.id = obj.message;
      this._connected = true;

      // Socket connected and registered
      this._superEmit('connect');
  }
};

Socket.prototype._ackCallback = function(ackId) {
  var _this = this;

  if (ackId === 0) {
    return this._noop;
  }

  return function(message) {
    _this._emitAck(message, ackId);
  };
};

Socket.prototype._noop = function() {
};

module.exports = Socket;
