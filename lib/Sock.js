const EventEmitter = require('events');
const debug = require('debug')('fast-tcp:Sock');
const Denque = require('denque');
const net = require('net');
const { Readable, Writable } = require('stream');
const ut = require('utjs');

const Reader = require('./Reader');
const Serializer = require('./Serializer');

const MAX_MESSAGE_ID = (2 ** 32) - 1;

/**
 * The super class of Socket.
 *
 * @private
 * @extends EventEmitter
 * @abstract
 * @fires Sock#reconnecting
 * @fires Sock#socket_connect
 * @fires Sock#socket_drain
 * @fires Sock#queue_full
 * @fires Sock#drain
 * @fires Sock#end
 * @fires Sock#close
 * @fires Sock#error
 */
class Sock extends EventEmitter {
  /**
   * @param {Serializer} serializer
   * @param {Object} opts
   */
  constructor(serializer, opts) {
    super();

    this._serializer = serializer;
    this._opts = opts;

    this._opts.reconnect = ut.isBoolean(opts.reconnect) ? opts.reconnect : Sock.RECONNECT;
    this._opts.reconnectInterval = ut.isNumber(opts.reconnectInterval) ? opts.reconnectInterval :
      Sock.RECONNECT_INTERVAL;
    this._opts.autoConnect = ut.isBoolean(opts.autoConnect) ? opts.autoConnect : Sock.AUTO_CONNECT;
    this._opts.useQueue = ut.isBoolean(opts.useQueue) ? opts.useQueue : Sock.USE_QUEUE;
    this._opts.queueSize = ut.isNumber(opts.queueSize) ? opts.queueSize : Sock.QUEUE_SIZE;

    /**
     * A unique identifier. It will be set up asynchronously from the server in the event 'connect'.
     * @type {String}
     */
    this.id = null;

    this._connected = false;
    this._manuallyClosed = false;
    this._messageId = 1;
    this._messageListener = null;
    this._nodeSocket = null;
    this._reader = new Reader();
    this._socketConfig = {};

    this._acks = new Map();
    this._queue = new Denque();
    this._streams = new Map();

    if (this._opts.autoConnect) {
      this.connect();
    }
  }

  static get RECONNECT() {
    return true;
  }

  static get RECONNECT_INTERVAL() {
    return 1000;
  }

  static get AUTO_CONNECT() {
    return true;
  }

  static get USE_QUEUE() {
    return true;
  }

  static get QUEUE_SIZE() {
    return Infinity;
  }

  /**
   * Send a FIN packet.
   */
  end() {
    if (this._connected) {
      this._manuallyClosed = true;
      this._nodeSocket.end();
    }
  }

  /**
   * Close the socket.
   */
  destroy() {
    if (this._connected) {
      this._manuallyClosed = true;
      this._nodeSocket.destroy();
    }
  }

  /**
   * Connect the socket. The socket will be connected automatically by default
   * so this method is only useful when you use opts.autoConnect: false,
   * in the constructor.
   */
  connect() {
    if (!this._connected) {
      this._manuallyClosed = false;
      this._nodeSocket = net.createConnection(this._opts);
      this._bindEvents();
    }
  }

  /**
   * Sets the socket to timeout after 'timeout' milliseconds of inactivity on the socket.
   *
   * @param {Number} timeout The timeout in milliseconds or 0 to disable it.
   */
  setTimeout(timeout) {
    this._socketConfig.timeout = timeout;

    if (this._connected) {
      this._nodeSocket.setTimeout(timeout);
    }

    return this;
  }

  /**
   * Disables the Nagle algorithm.
   *
   * @param {Boolean} [noDelay=true] True to disable de Nagle algorithm, false to enable it again.
   */
  setNoDelay(noDelay) {
    this._socketConfig.noDelay = noDelay;

    if (this._connected) {
      this._nodeSocket.setNoDelay(noDelay);
    }

    return this;
  }

  /**
   * Enable/disable keep-alive functionality, and optionally set the initial delay before the first
   * keepalive probe is sent on an idle socket.
   *
   * @param {Boolean} [enable=false] True to enable the TCP keep-alive, false to disable it.
   * @param {Number} [initialDelay=0] Set the delay in milliseconds between the last data packet
   *                                  received and the first keepalive probe.
   */
  setKeepAlive(enable, initialDelay) {
    this._socketConfig.keepAliveEnable = enable;
    this._socketConfig.keepAliveInitialDelay = initialDelay;

    if (this._connected) {
      this._nodeSocket.setKeepAlive(enable, initialDelay);
    }

    return this;
  }

  /**
   * Get the version of the underlying serializer.
   *
   * @return {Number} The serializer version.
   */
  getSerializerVersion() {
    return Serializer.VERSION;
  }

  _send(event, data, mt, opts) {
    opts = opts !== undefined ? opts : {};
    opts.messageId = opts.messageId !== undefined ? opts.messageId : this._nextMessageId();

    if (opts.cb !== undefined) {
      this._acks.set(opts.messageId, opts.cb);
    }

    const buff = this._serializer.serialize(event, data, mt, opts.messageId);

    if (this._connected) {
      return this._nodeSocket.write(buff);
    } else if (this._opts.useQueue) {
      if (this._queue.length < this._opts.queueSize) {
        this._queue.push(buff);
      } else {
        /**
         * The message queue is full, the message is rejected.
         *
         * @event Sock#queue_full
         */
        super.emit('queue_full', buff);
      }

      return false;
    }

    return false;
  }

  _sendStream(event, data, mt, cb) {
    const opts = { messageId: this._nextMessageId() };

    if (cb !== undefined) {
      opts.cb = cb;
    }

    this._send(event, data, mt, opts);

    const writeStream = new Writable({
      write: (chunk, encoding, streamCb) => {
        if (this._send(event, chunk, Serializer.MT_DATA_STREAM, opts)) {
          streamCb();
        } else {
          this._nodeSocket.once('drain', streamCb);
        }
      }
    });

    writeStream.on('finish', () => {
      this._send(event, '', Serializer.MT_DATA_STREAM_CLOSE, opts);
    });

    return writeStream;
  }

  _reconnect() {
    setTimeout(() => {
      /**
       * The socket is trying to reconnect.
       *
       * @event Sock#reconnecting
       */
      super.emit('reconnecting');
      this.connect();
    }, this._opts.reconnectInterval);
  }

  _configure() {
    const config = this._socketConfig;

    if (config.timeout !== undefined) {
      this.setTimeout(config.timeout);
    }

    if (config.noDelay !== undefined) {
      this.setNoDelay(config.noDelay);
    }

    if (config.keepAliveEnable !== undefined || config.keepAliveInitialDelay !== undefined) {
      this.setKeepAlive(config.keepAliveEnable, config.keepAliveInitialDelay);
    }
  }

  _bindEvents() {
    this._nodeSocket.on('connect', () => {
      this._connected = true;
      this._configure();

      // Send all queued events
      this._flushQueue();

      /**
       * The message queue has been flushed.
       *
       * @event Sock#drain
       */
      super.emit('drain');

      // Resume all waiting streams
      this._nodeSocket.emit('drain');

      /**
       * Connected underlying net.Socket, all messages in queue will
       * be sent and new messages will be sent directly.
       *
       * @event Sock#socket_connect
       */
      super.emit('socket_connect');
    });

    this._nodeSocket.on('data', (chunk) => {
      const buffers = this._reader.read(chunk);

      for (let i = 0; i < buffers.length; i++) {
        this._onMessage(this._serializer.deserialize(buffers[i]));
      }
    });

    this._nodeSocket.on('end', () => {
      /**
       * End event from net.Socket.
       *
       * @event Sock#end
       */
      super.emit('end');
    });

    this._nodeSocket.on('close', () => {
      this._connected = false;
      this._nodeSocket = null;

      if (this._opts.reconnect && !this._manuallyClosed) {
        this._reconnect();
      }

      /**
       * Close event from net.Socket.
       *
       * @event Sock#close
       */
      super.emit('close');
    });

    this._nodeSocket.on('error', (err) => {
      this._onError(err);
    });

    this._nodeSocket.on('timeout', () => {
      this._nodeSocket.destroy();
      this._onError(new Error('connect TIMEOUT'));
    });

    this._nodeSocket.on('drain', () => {
      /**
       * Emitted when the write buffer of the internal socket becomes empty.
       * Can be used to throttle uploads.
       *
       * @event Sock#socket_drain
       */
      super.emit('socket_drain');
    });
  }

  _onMessage(msg) {
    let readStream;

    switch (msg.mt) {
      case Serializer.MT_DATA:
        super.emit(msg.event, msg.data);
        break;
      case Serializer.MT_DATA_STREAM_OPEN:
        readStream = this._openDataStream(msg);
        super.emit(msg.event, readStream, msg.data);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_WITH_ACK:
        readStream = this._openDataStream(msg);
        super.emit(msg.event, readStream, msg.data, this._ackCallback(msg.messageId));
        break;
      case Serializer.MT_DATA_STREAM:
        this._transmitDataStream(msg);
        break;
      case Serializer.MT_DATA_STREAM_CLOSE:
        this._closeDataStream(msg);
        break;
      case Serializer.MT_DATA_WITH_ACK:
        super.emit(msg.event, msg.data, this._ackCallback(msg.messageId));
        break;
      case Serializer.MT_ACK:
        this._acks.get(msg.messageId)(msg.data);
        this._acks.delete(msg.messageId);
        break;
      default:
        if (this._messageListener) {
          this._messageListener(msg);
        }
    }
  }

  _openDataStream(msg) {
    const readStream = new Readable({
      read: () => {
        if (this._nodeSocket.isPaused()) {
          this._nodeSocket.resume();
        }
      }
    });

    this._streams.set(msg.messageId, readStream);
    return readStream;
  }

  _transmitDataStream(msg) {
    const readStream = this._streams.get(msg.messageId);

    if (!readStream.push(msg.data)) {
      this._nodeSocket.pause();
    }
  }

  _closeDataStream(msg) {
    const readStream = this._streams.get(msg.messageId);

    readStream.push(null);
    this._streams.delete(msg.messageId);
  }

  _ackCallback(messageId) {
    return (data) => {
      this._send('', data, Serializer.MT_ACK, { messageId });
    };
  }

  _nextMessageId() {
    if (++this._messageId > MAX_MESSAGE_ID) {
      this._messageId = 1;
    }

    return this._messageId;
  }

  _flushQueue() {
    let buff = this._queue.shift();
    while (buff !== undefined) {
      this._nodeSocket.write(buff);
      buff = this._queue.shift();
    }
  }

  _onError(err) {
    if (this.listenerCount('error') > 0) {
      /**
       * Error event from net.Socket or Socket.
       *
       * @event Sock#error
       */
      super.emit('error', err);
    } else {
      debug('Missing error handler on `Socket`.');
      debug(err);
    }
  }
}

module.exports = Sock;
