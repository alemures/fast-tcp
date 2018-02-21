const EventEmitter = require('events');
const debug = require('debug')('fast-tcp:Server');
const net = require('net');
const { PassThrough } = require('stream');
const ut = require('utjs');

const Serializer = require('./Serializer');
const SocketServ = require('./SocketServ');
const Util = require('./Util');

/**
 * The server class.
 *
 * @extends EventEmitter
 * @fires Server#listening
 * @fires Server#close
 * @fires Server#connection
 * @fires Server#error
 */
class Server extends EventEmitter {
  /**
   * @param {Object} [opts] The Server and net.Server options.
   * @param {Function} [opts.objectSerializer=JSON.stringify] Serializes an object into a binary
   *        buffer. This functions allows you to implement custom serialization protocols for
   *        the data or even use other known protocols like "Protocol Buffers" or  "MessagePack".
   * @param {Function} [opts.objectDeserializer=JSON.parse] Deserializes a binary buffer into an
   *        object. This functions allows you to implement custom serialization protocols for
   *        the data or even use other known protocols like "Protocol Buffers" or  "MessagePack".
   */
  constructor(opts) {
    super();

    opts = ut.isObject(opts) ? opts : {};

    /**
     * The connected sockets. The key is the Socket.id and the value a Socket instance.
     * @type {Map<String, Socket>}
     */
    this.sockets = new Map();

    /**
     * The rooms with at least one socket or more. The key is the room name and
     * the value an array of sockets.
     * @type {Map<String, Set<Socket>>}
     */
    this.rooms = new Map();

    this._serializer = new Serializer(opts);
    this._nodeServer = net.createServer(opts);
    this._bindEvents();
  }

  /**
   * Emit an event, if no sockets or rooms are provided, the event
   * will be broadcasted to all connected sockets.
   *
   * @param {String} event The event name.
   * @param {String|Number|Object|Buffer|Boolean} data The data to send.
   * @param {Object} [opts] The options.
   * @param {String[]} [opts.sockets=[]] The list of socket ids to send.
   * @param {String[]} [opts.rooms=[]] The list of rooms to send.
   * @param {String[]} [opts.except=[]] The list of socket ids to exclude.
   */
  emit(event, data, opts) {
    this._emit(event, data, Util.checkEmitOpts(opts));
  }

  /**
   * Creates and returns a stream.Writable instance that can be used to stream
   * binary data. If no opts.sockets or opts.rooms are provided, the stream
   * will be broadcasted to all connected sockets.
   *
   * @param {String} event The event name.
   * @param {String|Number|Object|Buffer|Boolean} data The data to send.
   * @param {Object} [opts] The options.
   * @param {String[]} [opts.sockets=[]] The list of socket ids to send.
   * @param {String[]} [opts.rooms=[]] The list of rooms to send.
   * @param {String[]} [opts.except=[]] The list of socket ids to exclude.
   */
  stream(event, data, opts) {
    return this._stream(event, data, Util.checkEmitOpts(opts));
  }

  /**
   * Join to a room.
   *
   * @param {String} room The room name.
   * @param {String} socketId The socket id.
   */
  join(room, socketId) {
    const socket = this.sockets.get(socketId);

    if (socket === undefined) {
      return;
    }

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    const sockets = this.rooms.get(room);
    if (!sockets.has(socket)) {
      sockets.add(socket);
    }
  }

  /**
   * Leave a room.
   *
   * @param {String} room The room name.
   * @param {String} socketId The socket id.
   */
  leave(room, socketId) {
    const socket = this.sockets.get(socketId);
    const sockets = this.rooms.get(room);

    if (socket !== undefined && sockets !== undefined) {
      if (sockets.delete(socket)) {
        if (sockets.size === 0) {
          this.rooms.delete(room);
        }
      }
    }
  }

  /**
   * Leave all rooms.
   *
   * @param {String} socketId The socket id.
   */
  leaveAll(socketId) {
    this.rooms.forEach((sockets, room) => this.leave(room, socketId));
  }

  /**
   * Start the server. It calls the underline net.Server#listen with the given arguments so
   * multiple optional arguments can be used.
   *
   * @see {@link https://nodejs.org/dist/latest-v6.x/docs/api/net.html#net_server_listen_port_hostname_backlog_callback}
   * @param {Number} [port] The port to listen to, this is the most basic usage, check the link
   *                        for more advanced usages.
   */
  listen(...args) {
    this._nodeServer.listen(...args);
  }

  /**
   * Disconnect all the clients and close the server.
   */
  close() {
    this.sockets.forEach(socket => socket.end());
    this._nodeServer.close();
  }

  _emit(event, data, opts) {
    if (opts.sockets.length > 0) {
      this._emitToSockets(event, data, opts.sockets, opts.except);
    } else if (opts.rooms.length > 0) {
      this._emitToRooms(event, data, opts.rooms, opts.except);
    } else {
      this._emitBroadcast(event, data, opts.except);
    }
  }

  _emitToSockets(event, data, socketIds, except) {
    socketIds.forEach((socketId) => {
      const socket = this.sockets.get(socketId);
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        socket.emit(event, data);
      }
    });
  }

  _emitToRooms(event, data, rooms, except) {
    rooms.forEach((room) => {
      const sockets = this.rooms.get(room);
      if (sockets !== undefined) {
        sockets.forEach((socket) => {
          if (except.indexOf(socket.id) === -1) {
            socket.emit(event, data);
          }
        });
      }
    });
  }

  _emitBroadcast(event, data, except) {
    this.sockets.forEach((socket) => {
      if (except.indexOf(socket.id) === -1) {
        socket.emit(event, data);
      }
    });
  }

  _stream(event, data, opts) {
    if (opts.sockets.length > 0) {
      return this._streamToSockets(event, data, opts.sockets, opts.except);
    }

    if (opts.rooms.length > 0) {
      return this._streamToRooms(event, data, opts.rooms, opts.except);
    }

    return this._streamBroadcast(event, data, opts.except);
  }

  _streamToSockets(event, data, socketIds, except) {
    const writableStream = new PassThrough();

    socketIds.forEach((socketId) => {
      const socket = this.sockets.get(socketId);
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        writableStream.pipe(socket.stream(event, data));
      }
    });

    return writableStream;
  }

  _streamToRooms(event, data, rooms, except) {
    const writableStream = new PassThrough();

    rooms.forEach((room) => {
      const sockets = this.rooms.get(room);
      if (sockets !== undefined) {
        sockets.forEach((socket) => {
          if (except.indexOf(socket.id) === -1) {
            writableStream.pipe(socket.stream(event, data));
          }
        });
      }
    });

    return writableStream;
  }

  _streamBroadcast(event, data, except) {
    const writableStream = new PassThrough();

    this.sockets.forEach((socket) => {
      if (except.indexOf(socket.id) === -1) {
        writableStream.pipe(socket.stream(event, data));
      }
    });

    return writableStream;
  }

  _bindEvents() {
    this._nodeServer.on('listening', () => {
      /**
       * Listening event from net.Server.
       *
       * @event Server#listening
       */
      super.emit('listening');
    });

    this._nodeServer.on('connection', (socket) => {
      this._bindEventsSocket(socket);
    });

    this._nodeServer.on('close', () => {
      /**
       * Close event from net.Server.
       *
       * @event Server#close
       */
      super.emit('close');
    });

    this._nodeServer.on('error', (err) => {
      this._onError(err);
    });
  }

  _bindEventsSocket(nodeSocket) {
    const socket = new SocketServ(nodeSocket, this);

    socket.on('close', () => {
      this.leaveAll(socket.id);
      this.sockets.delete(socket.id);
    });

    this.sockets.set(socket.id, socket);

    // Sends the id to socket client
    socket._send('', socket.id, Serializer.MT_REGISTER);

    /**
     * A new Socket was connected.
     *
     * @event Server#connection
     */
    super.emit('connection', socket);
  }

  _onError(err) {
    if (this.listenerCount('error') > 0) {
      /**
       * Error event from net.Server.
       *
       * @event Server#error
       */
      super.emit('error', err);
    } else {
      debug('Missing error handler on `Server`.');
      debug(err);
    }
  }
}

module.exports = Server;
