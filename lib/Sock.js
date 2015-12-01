'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Constants = require('./Constants');

/**
 * Super class of Socket and SocketServ.
 *
 * @param {Options} options The net.Socket options plus the following
 *                          Sock options: {Boolean} reconnect, {Number}
 *                          reconnectInterval, {Boolean} autoConnect,
 *                          {Function} messageListener
 */
function Sock(options) {
  options = options !== undefined ? options : {};
  Sock.super_.call(this);

  this._reader = new Reader();
  this._options = options;

  this._shouldReconnect = options.reconnect !== undefined ?
      options.reconnect : Constants.RECONNECT;

  this._reconnectInterval = options.reconnectInterval !== undefined ?
    options.reconnectInterval : Constants.RECONNECT_INTERVAL;

  this._autoConnect = options.autoConnect !== undefined ?
      options.autoConnect : Constants.AUTO_CONNECT;

  this._messageListener = options.messageListener !== undefined ?
      options.messageListener : null;

  this.id = null;

  this._ackId = 0;
  this._acks = {};

  this._socket = null;
  this._connected = false;

  if (this._autoConnect) {
    this.connect();
  }
}

util.inherits(Sock, EventEmitter);

Sock.prototype._superEmit = Sock.prototype.emit;
Sock.prototype.emit = function(event, message, cb) {
  if (this._connected) {
    if (cb !== undefined) {
      this._acks[++this._ackId] = cb;
    }

    this._emit(event, message, this._ackId, Serializer.MT_EVENT);
  }
};

Sock.prototype.end = function() {
  if (this._connected) {
    this._shouldReconnect = false;
    this._socket.end();
  }
};

Sock.prototype.destroy = function() {
  if (this._connected) {
    this._shouldReconnect = false;
    this._socket.destroy();
  }
};

Sock.prototype.connect = function() {
  if (!this._connected) {
    this._socket = net.createConnection(this._options);
    this._bindEvents();
  }
};

Sock.prototype._reconnect = function() {
  var _this = this;
  setTimeout(function() {
    _this._superEmit('reconnecting');
    _this.connect();
  }, this._reconnectInterval);
};

Sock.prototype._emit = function(event, message, ackId, mt) {
  this._socket.write(Serializer.serialize(event, message, ackId, mt));
};

Sock.prototype._bindEvents = function() {
  var _this = this;

  this._socket.on('connect', function() {
    // Connected socket but waiting register
    _this._superEmit('socket_connect');
  });

  this._socket.on('data', function(data) {
    var buffers = _this._reader.read(data);
    var buffersLength = buffers.length;
    var i;

    for (i = 0; i < buffersLength; i++) {
      _this._onMessage(Serializer.deserialize(buffers[i]));
    }
  });

  this._socket.on('end', function() {
    _this._superEmit('end');
  });

  this._socket.on('close', function(isError) {
    _this._connected = false;
    if (_this._shouldReconnect) {
      _this._reconnect();
    }

    _this._superEmit('close');
  });

  this._socket.on('error', function(err) {
    if (!_this._shouldReconnect) {
      _this._superEmit('error', err);
    }
  });
};

Sock.prototype._onMessage = function(msg) {
  switch (msg.mt) {
    case Serializer.MT_EVENT:
      this._superEmit(msg.event, msg.message, this._ackCallback(msg.ackId));
      break;
    case Serializer.MT_ACK:
      this._acks[msg.ackId](msg.message);
      delete this._acks[msg.ackId];
      break;
    default:
      if (this._messageListener) {
        this._messageListener(msg);
      }
  }
};

Sock.prototype._ackCallback = function(ackId) {
  var _this = this;

  if (ackId === 0) {
    return this._noop;
  }

  return function(message) {
    _this._emit('', message, ackId, Serializer.MT_ACK);
  };
};

Sock.prototype._noop = function() {
};

module.exports = Sock;
