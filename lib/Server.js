const EventEmitter = require('events');
const debug = require('debug')('fast-tcp:Server');
const net = require('net');
const { PassThrough } = require('stream');
const ut = require('utjs');

const Serializer = require('./Serializer');
const SocketServ = require('./SocketServ');

/**
 * The server class.
 *
 * @param {Object} [opts] The Server and net.Server options.
 * @param {Function} [opts.objectSerializer=JSON.stringify] Serializes an object into a binary
 *        buffer. This functions allows you to implement custom serialization protocols for
 *        the data or even use other known protocols like "Protocol Buffers" or  "MessagePack".
 * @param {Function} [opts.objectDeserializer=JSON.parse] Deserializes a binary buffer into an
 *        object. This functions allows you to implement custom serialization protocols for
 *        the data or even use other known protocols like "Protocol Buffers" or  "MessagePack".
 * @constructor
 * @fires Server#listening
 * @fires Server#close
 * @fires Server#connection
 * @fires Server#error
 */
module.exports = class Server extends EventEmitter {
  constructor(opts) {
    super();

    opts = ut.isObject(opts) ? opts : {};

    /**
     * The connected sockets. The key is the Socket.id and the value a Socket instance.
     * @type {Object}
     */
    this.sockets = {};

    /**
     * The rooms with at least one socket or more. The key is the room name and
     * the value an array of sockets.
     * @type {Object}
     */
    this.rooms = {};

    this._serializer = new Serializer(opts);
    this._server = net.createServer(opts);
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
    opts = ut.isObject(opts) ? opts : {};
    this._emit(event, data, opts);
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
    opts = ut.isObject(opts) ? opts : {};
    return this._stream(event, data, opts);
  }

  /**
   * Join to a room.
   *
   * @param {String} room The room name.
   * @param {String} socketId The socket id.
   */
  join(room, socketId) {
    const socket = this.sockets[socketId];

    if (socket === undefined) {
      return;
    }

    if (this.rooms[room] === undefined) {
      this.rooms[room] = [];
    }

    const sockets = this.rooms[room];
    if (sockets.indexOf(socket) === -1) {
      sockets.push(socket);
      socket._rooms[room] = true;
    }
  }

  /**
   * Leave a room.
   *
   * @param {String} room The room name.
   * @param {String} socketId The socket id.
   */
  leave(room, socketId) {
    const socket = this.sockets[socketId];
    const sockets = this.rooms[room];

    if (socket !== undefined && sockets !== undefined) {
      const index = sockets.indexOf(socket);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          delete this.rooms[room];
        }

        delete socket._rooms[room];
      }
    }
  }

  /**
   * Leave all rooms.
   *
   * @param {String} socketId The socket id.
   */
  leaveAll(socketId) {
    const socket = this.sockets[socketId];

    if (socket !== undefined) {
      Object.keys(socket._rooms).forEach(room => this.leave(room, socketId));
    }
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
    this._server.listen(...args);
  }

  /**
   * Disconnect all the clients and close the server.
   */
  close() {
    Object.keys(this.sockets).forEach(socketId => this.sockets[socketId].end());
    this._server.close();
  }

  _emit(event, data, opts) {
    const socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
    const rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
    const except = ut.isArray(opts.except) ? opts.except : [];

    if (socketIds.length > 0) {
      this._emitToSockets(event, data, socketIds, except);
    }

    if (rooms.length > 0) {
      this._emitToRooms(event, data, rooms, except);
    }

    if (socketIds.length + rooms.length === 0) {
      this._emitBroadcast(event, data, except);
    }
  }

  _emitToSockets(event, data, socketIds, except) {
    for (let i = 0; i < socketIds.length; i++) {
      const socket = this.sockets[socketIds[i]];
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        socket.emit(event, data);
      }
    }
  }

  _emitToRooms(event, data, rooms, except) {
    for (let i = 0; i < rooms.length; i++) {
      const sockets = this.rooms[rooms[i]];
      if (sockets !== undefined) {
        for (let j = 0; j < sockets.length; j++) {
          const socket = sockets[j];
          if (except.indexOf(socket.id) === -1) {
            socket.emit(event, data);
          }
        }
      }
    }
  }

  _emitBroadcast(event, data, except) {
    Object.keys(this.sockets).forEach((socketId) => {
      if (except.indexOf(socketId) === -1) {
        this.sockets[socketId].emit(event, data);
      }
    });
  }

  _stream(event, data, opts) {
    const socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
    const rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
    const except = ut.isArray(opts.except) ? opts.except : [];

    if (socketIds.length > 0) {
      return this._streamToSockets(event, data, socketIds, except);
    }

    if (rooms.length > 0) {
      return this._streamToRooms(event, data, rooms, except);
    }

    return this._streamBroadcast(event, data, except);
  }

  _streamToSockets(event, data, socketIds, except) {
    const writableStream = new PassThrough();

    for (let i = 0; i < socketIds.length; i++) {
      const socket = this.sockets[socketIds[i]];
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        writableStream.pipe(socket.stream(event, data));
      }
    }

    return writableStream;
  }

  _streamToRooms(event, data, rooms, except) {
    const writableStream = new PassThrough();

    for (let i = 0; i < rooms.length; i++) {
      const sockets = this.rooms[rooms[i]];
      if (sockets !== undefined) {
        for (let j = 0; j < sockets.length; j++) {
          const socket = sockets[j];
          if (except.indexOf(socket.id) === -1) {
            writableStream.pipe(socket.stream(event, data));
          }
        }
      }
    }

    return writableStream;
  }

  _streamBroadcast(event, data, except) {
    const writableStream = new PassThrough();

    Object.keys(this.sockets).forEach((socketId) => {
      if (except.indexOf(socketId) === -1) {
        writableStream.pipe(this.sockets[socketId].stream(event, data));
      }
    });

    return writableStream;
  }

  _bindEvents() {
    this._server.on('listening', () => {
      /**
       * Listening event from net.Server.
       *
       * @event Server#listening
       */
      super.emit('listening');
    });

    this._server.on('connection', (socket) => {
      this._bindEventsSocket(socket);
    });

    this._server.on('close', () => {
      /**
       * Close event from net.Server.
       *
       * @event Server#close
       */
      super.emit('close');
    });

    this._server.on('error', (err) => {
      this._onError(err);
    });
  }

  _bindEventsSocket(sock) {
    const socket = new SocketServ(sock, this);

    socket.on('close', () => {
      this.leaveAll(socket.id);
      delete this.sockets[socket.id];
    });

    this.sockets[socket.id] = socket;

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
};
