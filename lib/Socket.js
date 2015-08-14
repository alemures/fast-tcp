'use strict';

var net = require('net');
var util = require('util');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Emitter = require('./Emitter');
var Constants = require('./Constants');

function Socket(arg) {
  Socket.super_.call(this);
  this._reader = new Reader();

  this.id = ++Socket.nSockets;

  if (arg instanceof net.Socket) {
    // Server
    this._options = {};
    this._reconnection = false;
    this._reconnectionInterval = 0;

    this._connected = true;
    this._socket = arg;

    this._bindEvents();
  } else {
    // Client
    var options = arg !== undefined ? arg : {};

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

util.inherits(Socket, Emitter);

Socket.nSockets = 0;

Socket.prototype._superEmit = Socket.prototype.emit;
Socket.prototype.emit = function(event, message) {
  if (this._connected) {
    this._socket.write(Serializer.serialize(event, message));
  }
};

Socket.prototype.end = function() {
  if (this._connected) {
    this._socket.end();
  }
};

Socket.prototype.destroy = function() {
  if (this._connected) {
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

Socket.prototype._bindEvents = function() {
  var _this = this;

  this._socket.on('connect', function() {
    _this._connected = true;
    _this._superEmit('connect');
  });

  this._socket.on('data', function(data) {
    var buffers = _this._reader.read(data);
    var buffersLength = buffers.length;
    var obj;
    var i;

    for (i = 0; i < buffersLength; i++) {
      obj = Serializer.deserialize(buffers[i]);
      _this._superEmit(obj.event, obj.message);
    }
  });

  this._socket.on('end', function() {
    _this._superEmit('end');
  });

  this._socket.on('close', function(isError) {
    _this._connected = false;
    if (_this._reconnection) {
      _this._reconnect();
    }

    _this._superEmit('close', isError);
  });

  this._socket.on('error', function(err) {
    _this._superEmit('error', err);
  });
};

module.exports = Socket;
