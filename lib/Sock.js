'use strict';

var Writable = require('stream').Writable;
var Readable = require('stream').Readable;
var net = require('net');
var util = require('util');
var EventEmitter = require('events');
var ut = require('utjs');

var Serializer = require('./Serializer');
var Reader = require('./Reader');
var Constants = require('./Constants');

var MAX_MESSAGE_ID = Math.pow(2, 32) - 1;

/**
 * The super class of Socket.
 *
 * @constructor
 * @abstract
 * @fires Sock#reconnecting
 * @fires Sock#socket_connect
 * @fires Sock#socket_drain
 * @fires Sock#end
 * @fires Sock#close
 * @fires Sock#error
 */
function Sock(serializer, opts) {
  opts = opts || {};
  Sock.super_.call(this);

  this._serializer = serializer;
  this._reader = new Reader();
  this._opts = opts;

  this._shouldReconnect = ut.isBoolean(opts.reconnect) ? opts.reconnect : Constants.RECONNECT;

  this._reconnectInterval = ut.isNumber(opts.reconnectInterval) ? opts.reconnectInterval :
      Constants.RECONNECT_INTERVAL;

  this._autoConnect = ut.isBoolean(opts.autoConnect) ? opts.autoConnect : Constants.AUTO_CONNECT;

  this._useQueue = ut.isBoolean(opts.useQueue) ? opts.useQueue : Constants.USE_QUEUE;

  this._queueSize = ut.isNumber(opts.queueSize) ? opts.queueSize : Constants.QUEUE_SIZE;

  this._messageListener = ut.isFunction(opts.messageListener) ? opts.messageListener : null;

  /**
   * A unique identifier. It will be set up asynchronously from the server in the event 'connect'.
   * @type {String}
   */
  this.id = null;

  this._messageId = 1;
  this._acks = {};

  this._socket = null;
  this._socketConfig = {};
  this._connected = false;
  this._manuallyClosed = false;

  this._queue = [];

  this._streams = {};

  if (this._autoConnect) {
    this.connect();
  }
}

util.inherits(Sock, EventEmitter);

Sock.prototype._superEmit = Sock.prototype.emit;

/**
 * Send a FIN packet.
 */
Sock.prototype.end = function () {
  if (this._connected) {
    this._manuallyClosed = true;
    this._socket.end();
  }
};

/**
 * Close the socket.
 */
Sock.prototype.destroy = function () {
  if (this._connected) {
    this._manuallyClosed = true;
    this._socket.destroy();
  }
};

/**
 * Connect the socket. The socket will be connected automatically by default
 * so this method is only useful when you use otps.autoConnect: false,
 * in the constructor.
 */
Sock.prototype.connect = function () {
  if (!this._connected) {
    this._manuallyClosed = false;
    this._socket = net.createConnection(this._opts);
    this._bindEvents();
  }
};

/**
 * Sets the socket to timeout after 'timeout' milliseconds of inactivity on the socket.
 *
 * @param {Number} timeout The timeout in milliseconds or 0 to disable it.
 */
Sock.prototype.setTimeout = function (timeout) {
  this._socketConfig.timeout = timeout;

  if (this._connected) {
    this._socket.setTimeout(timeout);
  }

  return this;
};

/**
 * Disables the Nagle algorithm.
 *
 * @param {Boolean} [noDelay=true] True to disable de Nagle algorithm, false to enable it again.
 */
Sock.prototype.setNoDelay = function (noDelay) {
  this._socketConfig.noDelay = noDelay;

  if (this._connected) {
    this._socket.setNoDelay(noDelay);
  }

  return this;
};

/**
 * Enable/disable keep-alive functionality, and optionally set the initial delay before the first
 * keepalive probe is sent on an idle socket.
 *
 * @param {Boolean} [enable=false] True to enable the TCP keep-alive, false to disable it.
 * @param {Number} [initialDelay=0] Set the delay in milliseconds between the last data packet
 *                                  received and the first keepalive probe.
 */
Sock.prototype.setKeepAlive = function (enable, initialDelay) {
  this._socketConfig.keepAliveEnable = enable;
  this._socketConfig.keepAliveInitialDelay = initialDelay;

  if (this._connected) {
    this._socket.setKeepAlive(enable, initialDelay);
  }

  return this;
};

/**
 * Get the version of the underlying serializer.
 *
 * @return {Number} The serializer version.
 */
Sock.prototype.getSerializerVersion = function () {
  return Serializer.VERSION;
};

Sock.prototype._send = function (event, data, mt, opts) {
  opts = opts || {};
  var messageId = opts.messageId || this._nextMessageId();

  if (opts.cb !== undefined) {
    this._acks[messageId] = opts.cb;
  }

  var buff = this._serializer.serialize(event, data, mt, messageId);

  if (this._connected) {
    return this._socket.write(buff);
  } else if (this._useQueue) {
    if (this._queue.length + 1 > this._queueSize) {
      this._queue.shift();
    }

    this._queue.push(buff);
    return false;
  }
};

Sock.prototype._sendStream = function (event, data, mt, cb) {
  var opts = { messageId: this._nextMessageId() };
  var _this = this;

  if (cb !== undefined) {
    opts.cb = cb;
  }

  this._send(event, data, mt, opts);

  var writeStream = new Writable({
    write: function (chunk, encoding, cb) {
      if (_this._send(event, chunk, Serializer.MT_DATA_STREAM, opts)) {
        cb();
      } else {
        _this._socket.once('drain', cb);
      }
    }
  });

  writeStream.on('finish', function () {
    _this._send(event, '', Serializer.MT_DATA_STREAM_CLOSE, opts);
  });

  return writeStream;
};

Sock.prototype._reconnect = function () {
  var _this = this;
  setTimeout(function () {
    /**
     * The socket is trying to reconnect.
     *
     * @event Sock#reconnecting
     */
    _this._superEmit('reconnecting');
    _this.connect();
  }, this._reconnectInterval);
};

Sock.prototype._configure = function () {
  var config = this._socketConfig;

  if (config.timeout !== undefined) {
    this.setTimeout(config.timeout);
  }

  if (config.noDelay !== undefined) {
    this.setNoDelay(config.noDelay);
  }

  if (config.keepAliveEnable !== undefined || config.keepAliveInitialDelay !== undefined) {
    this.setKeepAlive(config.keepAliveEnable, config.keepAliveInitialDelay);
  }
};

Sock.prototype._bindEvents = function () {
  var _this = this;

  this._socket.on('connect', function () {
    _this._connected = true;
    _this._configure();

    // Send all queued events
    _this._flushQueue();

    // Resume all waiting streams
    _this._socket.emit('drain');

    /**
     * Connected underlying net.Socket, all messages in queue will
     * be sent and new messages will be sent directly.
     *
     * @event Sock#socket_connect
     */
    _this._superEmit('socket_connect');
  });

  this._socket.on('data', function (chunk) {
    var buffers = _this._reader.read(chunk);

    for (var i = 0; i < buffers.length; i++) {
      _this._onMessage(_this._serializer.deserialize(buffers[i]));
    }
  });

  this._socket.on('end', function () {
    /**
     * End event from net.Socket.
     *
     * @event Sock#end
     */
    _this._superEmit('end');
  });

  this._socket.on('close', function (isError) {
    _this._connected = false;
    _this._socket = null;

    if (_this._shouldReconnect && !_this._manuallyClosed) {
      _this._reconnect();
    }

    /**
     * Close event from net.Socket.
     *
     * @event Sock#close
     */
    _this._superEmit('close');
  });

  this._socket.on('error', function (err) {
    _this._onError(err);
  });

  this._socket.on('timeout', function () {
    _this._socket.destroy();
    _this._onError(ut.error('connect TIMEOUT'));
  });

  this._socket.on('drain', function () {
    /**
     * Emitted when the write buffer of the internal socket becomes empty.
     * Can be used to throttle uploads.
     *
     * @event Sock#socket_drain
     */
    _this._superEmit('socket_drain');
  });
};

Sock.prototype._onMessage = function (msg) {
  var readStream;

  switch (msg.mt) {
    case Serializer.MT_DATA:
      this._superEmit(msg.event, msg.data);
      break;
    case Serializer.MT_DATA_STREAM_OPEN:
      readStream = this._openDataStream(msg);
      this._superEmit(msg.event, readStream, msg.data);
      break;
    case Serializer.MT_DATA_STREAM_OPEN_WITH_ACK:
      readStream = this._openDataStream(msg);
      this._superEmit(msg.event, readStream, msg.data, this._ackCallback(msg.messageId));
      break;
    case Serializer.MT_DATA_STREAM:
      this._transmitDataStream(msg);
      break;
    case Serializer.MT_DATA_STREAM_CLOSE:
      this._closeDataStream(msg);
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

Sock.prototype._openDataStream = function (msg) {
  var _this = this;
  var readStream = new Readable({
    read: function (size) {
      if (_this._socket.isPaused()) {
        _this._socket.resume();
      }
    }
  });

  this._streams[msg.messageId] = readStream;
  return readStream;
};

Sock.prototype._transmitDataStream = function (msg) {
  var readStream = this._streams[msg.messageId];

  if (!readStream.push(msg.data)) {
    this._socket.pause();
  }
};

Sock.prototype._closeDataStream = function (msg) {
  var readStream = this._streams[msg.messageId];

  readStream.push(null);
  delete this._streams[msg.messageId];
};

Sock.prototype._ackCallback = function (messageId) {
  var _this = this;

  return function ackCallback(data) {
    _this._send('', data, Serializer.MT_ACK, { messageId: messageId });
  };
};

Sock.prototype._nextMessageId = function () {
  if (++this._messageId > MAX_MESSAGE_ID) {
    this._messageId = 1;
  }

  return this._messageId;
};

Sock.prototype._flushQueue = function () {
  if (this._queue.length > 0) {
    for (var i = 0; i < this._queue.length; i++) {
      this._socket.write(this._queue[i]);
    }

    this._queue.length = 0;
  }
};

Sock.prototype._onError = function (err) {
  if (this.listenerCount('error') > 0) {
    /**
     * Error event from net.Socket or Socket.
     *
     * @event Sock#error
     */
    this._superEmit('error', err);
  } else {
    console.error('Missing error handler on `Socket`.');
    console.error(err.stack);
  }
};

module.exports = Sock;
