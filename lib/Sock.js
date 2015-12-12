'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events');
var ut = require('utjs');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Constants = require('./Constants');

var MAX_MESSAGE_ID = Math.pow(2, 32) - 1;

/**
 * Super class of Socket and SocketServ.
 *
 * @param {opts} opts The net.Socket opts plus the following
 *                          Sock opts: {Boolean} reconnect, {Number}
 *                          reconnectInterval, {Boolean} autoConnect,
 *                          {Function} messageListener
 */
function Sock(opts) {
  opts = ut.isObject(opts) ? opts : {};
  Sock.super_.call(this);

  this._reader = new Reader();
  this._opts = opts;

  this._shouldReconnect = ut.isBoolean(opts.reconnect) ?
      opts.reconnect : Constants.RECONNECT;

  this._reconnectInterval = ut.isNumber(opts.reconnectInterval) ?
    opts.reconnectInterval : Constants.RECONNECT_INTERVAL;

  this._autoConnect = ut.isBoolean(opts.autoConnect) ?
      opts.autoConnect : Constants.AUTO_CONNECT;

  this._messageListener = ut.isFunction(opts.messageListener) ?
      opts.messageListener : null;

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
    this._socket = net.createConnection(this._opts);
    this._bindEvents();
  }
};

Sock.prototype.getVersion = function() {
  return Serializer.VERSION;
};

Sock.prototype._send = function(event, data, mt, opts) {
  opts = opts !== undefined ? opts : {};
  var messageId = opts.messageId !== undefined ? opts.messageId : this._nextMessageId();
  var cb = opts.cb !== undefined ? opts.cb : null;

  if (cb !== null) {
    this._acks[messageId] = cb;
  }

  var buff = Serializer.serialize(event, data, mt, messageId);
  this._socket.write(buff);
};

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
    case Serializer.MT_DATA:
      this._superEmit(msg.event, msg.data);
      break;
    case Serializer.MT_DATA_WITH_ACK:
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
    _this._send('', data, Serializer.MT_ACK, { messageId: messageId });
  };
};

Sock.prototype._nextMessageId = function() {
  if (++this._messageId > MAX_MESSAGE_ID) {
    this._messageId = 1;
  }

  return this._messageId;
};

module.exports = Sock;
