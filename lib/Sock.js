'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Constants = require('./Constants');

var MAX_MESSAGE_ID = Math.pow(2, 32) - 1;

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

  this._messageId = 1;
  this._acks = {};

  this._socket = null;
  this._connected = false;

  if (this._autoConnect) {
    this.connect();
  }
}

util.inherits(Sock, EventEmitter);

Sock.prototype._superEmit = Sock.prototype.emit;
Sock.prototype.emit = function(event, data, cb) {
  if (this._connected) {
    var mt = Serializer.MT_MESSAGE;

    if (cb !== undefined) {
      this._acks[this._messageId] = cb;
      mt = Serializer.MT_MESSAGE_WITH_ACK;
    }

    this._emit(event, data, mt);
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

Sock.prototype.getVersion = function() {
  return Serializer.VERSION;
};

Sock.prototype._emit = function(event, data, mt, messageId) {
  messageId = messageId !== undefined ? messageId : this._messageId;
  this._nextMessageId();

  var buff = Serializer.serialize(event, data, mt, messageId);
  this._socket.write(buff);
}

Sock.prototype._reconnect = function() {
  var _this = this;
  setTimeout(function() {
    _this._superEmit('reconnecting');
    _this.connect();
  }, this._reconnectInterval);
};

Sock.prototype._bindEvents = function() {
  var _this = this;

  this._socket.on('connect', function() {
    // Connected socket but waiting register
    _this._superEmit('socket_connect');
  });

  this._socket.on('data', function(chunk) {
    var buffers = _this._reader.read(chunk);
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
    case Serializer.MT_MESSAGE:
      this._superEmit(msg.event, msg.data);
      break;
    case Serializer.MT_MESSAGE_WITH_ACK:
      this._superEmit(msg.event, msg.data, this._ackCallback(msg.messageId));
      break;
    case Serializer.MT_ACK:
      this._acks[msg.messageId](msg.data);
      delete this._acks[msg.messageId];
      break;
    default:
      if (this._messageListener) {
        this._messageListener(msg);
      }
  }
};

Sock.prototype._ackCallback = function(messageId) {
  var _this = this;

  return function(data) {
    _this._emit('', data, Serializer.MT_ACK, messageId);
  };
};

Sock.prototype._nextMessageId = function() {
  if (++this._messageId > MAX_MESSAGE_ID) {
    this._messageId = 1;
  }
};

module.exports = Sock;
