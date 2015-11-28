'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Constants = require('./Constants');

function Sock(options, messageListener) {
  options = options !== undefined ? options : {};
  Sock.super_.call(this);

  this._reader = new Reader();

  this._options = options;
  this._reconnect = options.reconnect !== undefined ?
      options.reconnect : Constants.RECONNECT;
  this._reconnectInterval = options.reconnectInterval == undefined ?
    options.reconnectInterval : Constants.RECONNECT_INTERVAL;

  this.id;

  this._ackId = 0;
  this._acks = {};

  this._socket;
  this._connected = false;

  this._messageListener = messageListener;
}

util.inherits(Sock, EventEmitter);

Sock.prototype._superEmit = Sock.prototype.emit;

/**
 * @param {string} event The event
 * @paramn {buffer|string|number|msject} message The message to send
 */
Sock.prototype.emit = function(event, message, cb) {
  var ackId = 0;

  if (this._connected) {
    if (cb !== undefined) {
      ackId = ++this._ackId;
      this._acks[ackId] = cb;
    }

    this._emit(event, message, ackId, Serializer.MT_EVENT);
  }
};

Sock.prototype.end = function() {
  if (this._connected) {
    this._reconnect = false;
    this._socket.end();
  }
};

Sock.prototype.destroy = function() {
  if (this._connected) {
    this._reconnect = false;
    this._socket.destroy();
  }
};

Sock.prototype._connect = function() {
  if (!this._connected) {
    this._socket = net.createConnection(this._options);
    this._bindEvents();
  }
};

Sock.prototype._reconnect = function() {
  var _this = this;
  setTimeout(function() {
    _this._connect();
  }, this._reconnectInterval);
};

Sock.prototype._emit = function(event, message, ackId, mt) {
  this._socket.write(Serializer.serialize(event, message, ackId, mt));
};

Sock.prototype._bindEvents = function() {
  var _this = this;

  this._socket.on('connect', function() {
    // Sockected socket but waiting register
    _this._superEmit('socket_connect');
  });

  this._socket.on('data', function(data) {
    console.log("Received",data)
    var buffers = _this._reader.read(data);
    var buffersLength = buffers.length;
    var msj;
    var i;

    for (i = 0; i < buffersLength; i++) {
      msj = Serializer.deserialize(buffers[i]);
      _this._onMessage(msj);
    }
  });

  this._socket.on('end', function() {
    _this._superEmit('end');
  });

  this._socket.on('close', function(isError) {
    _this._connected = false;
    if (_this._reconnect) {
      _this._reconnect();
    }

    _this._superEmit('close', isError);
  });

  this._socket.on('error', function(err) {
    _this._superEmit('error', err);
  });
};

Sock.prototype._onMessage = function(msj) {
  var event;

  switch (msj.mt) {
    case Serializer.MT_EVENT:
      this._superEmit(msj.event, msj.message, this._ackCallback(msj.ackId));
      break;
    case Serializer.MT_ACK:
      this._acks[msj.ackId](msj.message);
      delete this._acks[msj.ackId];
      break;
    case Serializer.MT_REGISTER:
      this.id = msj.message;
      this._connected = true;

      // Sock connected and registered
      this._superEmit('connect');
      break;
    default:
      if (this._messageListener) {
        this._messageListener(msj);
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
