'use strict';

var PassThrough = require('stream').PassThrough;
var net = require('net');
var util = require('util');
var ut = require('utjs');
var EventEmitter = require('events');

var SocketServ = require('./SocketServ');
var Serializer = require('./Serializer');

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
function Server(opts) {
  opts = ut.isObject(opts) ? opts : {};
  Server.super_.call(this);

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

util.inherits(Server, EventEmitter);

Server.prototype._superEmit = Server.prototype.emit;

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
Server.prototype.emit = function (event, data, opts) {
  opts = ut.isObject(opts) ? opts : {};
  this._emit(event, data, opts);
};

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
Server.prototype.stream = function (event, data, opts) {
  opts = ut.isObject(opts) ? opts : {};
  return this._stream(event, data, opts);
};

/**
 * Join to a room.
 *
 * @param {String} room The room name.
 * @param {String} socketId The socket id.
 */
Server.prototype.join = function (room, socketId) {
  var socket = this.sockets[socketId];

  if (socket === undefined) {
    return;
  }

  if (this.rooms[room] === undefined) {
    this.rooms[room] = [];
  }

  var sockets = this.rooms[room];
  if (sockets.indexOf(socket) === -1) {
    sockets.push(socket);
    socket._rooms[room] = true;
  }
};

/**
 * Leave a room.
 *
 * @param {String} room The room name.
 * @param {String} socketId The socket id.
 */
Server.prototype.leave = function (room, socketId) {
  var socket = this.sockets[socketId];
  var sockets = this.rooms[room];

  if (socket !== undefined && sockets !== undefined) {
    var index = sockets.indexOf(socket);
    if (index > -1) {
      sockets.splice(index, 1);
      if (sockets.length === 0) {
        delete this.rooms[room];
      }

      delete socket._rooms[room];
    }
  }
};

/**
 * Leave all rooms.
 *
 * @param {String} socketId The socket id.
 */
Server.prototype.leaveAll = function (socketId) {
  var socket = this.sockets[socketId];

  if (socket !== undefined) {
    for (var room in socket._rooms) {
      this.leave(room, socketId);
    }
  }
};

/**
 * Start the server. It calls the underline net.Server#listen with the given arguments so
 * multiple optional arguments can be used.
 *
 * @see {@link https://nodejs.org/dist/latest-v6.x/docs/api/net.html#net_server_listen_port_hostname_backlog_callback}
 * @param {Number} [port] The port to listen to, this is the most basic usage, check the link
 *                        for more advanced usages.
 */
Server.prototype.listen = function () {
  this._server.listen.apply(this._server, arguments);
};

/**
 * Disconnect all the clients and close the server.
 */
Server.prototype.close = function () {
  for (var socketId in this.sockets) {
    this.sockets[socketId].end();
  }

  this._server.close();
};

Server.prototype._emit = function (event, data, opts) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var except = ut.isArray(opts.except)  ? opts.except : [];

  if (socketIds.length > 0) {
    this._emitToSockets(event, data, socketIds, except);
  }

  if (rooms.length > 0) {
    this._emitToRooms(event, data, rooms, except);
  }

  if (socketIds.length + rooms.length === 0) {
    this._emitBroadcast(event, data, except);
  }
};

Server.prototype._emitToSockets = function (event, data, socketIds, except) {
  for (var i = 0; i < socketIds.length; i++) {
    var socket = this.sockets[socketIds[i]];
    if (socket !== undefined && except.indexOf(socket.id) === -1) {
      socket.emit(event, data);
    }
  }
};

Server.prototype._emitToRooms = function (event, data, rooms, except) {
  for (var i = 0; i < rooms.length; i++) {
    var sockets = this.rooms[rooms[i]];
    if (sockets !== undefined) {
      for (var j = 0; j < sockets.length; j++) {
        var socket = sockets[j];
        if (except.indexOf(socket.id) === -1) {
          socket.emit(event, data);
        }
      }
    }
  }
};

Server.prototype._emitBroadcast = function (event, data, except) {
  for (var socketId in this.sockets) {
    if (except.indexOf(socketId) === -1) {
      this.sockets[socketId].emit(event, data);
    }
  }
};

Server.prototype._stream = function (event, data, opts) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var except = ut.isArray(opts.except)  ? opts.except : [];

  if (socketIds.length > 0) {
    return this._streamToSockets(event, data, socketIds, except);
  }

  if (rooms.length > 0) {
    return this._streamToRooms(event, data, rooms, except);
  }

  return this._streamBroadcast(event, data, except);
};

Server.prototype._streamToSockets = function (event, data, socketIds, except) {
  var writableStream = new PassThrough();

  for (var i = 0; i < socketIds.length; i++) {
    var socket = this.sockets[socketIds[i]];
    if (socket !== undefined && except.indexOf(socket.id) === -1) {
      writableStream.pipe(socket.stream(event, data));
    }
  }

  return writableStream;
};

Server.prototype._streamToRooms = function (event, data, rooms, except) {
  var writableStream = new PassThrough();

  for (var i = 0; i < rooms.length; i++) {
    var sockets = this.rooms[rooms[i]];
    if (sockets !== undefined) {
      for (var j = 0; j < sockets.length; j++) {
        var socket = sockets[j];
        if (except.indexOf(socket.id) === -1) {
          writableStream.pipe(socket.stream(event, data));
        }
      }
    }
  }

  return writableStream;
};

Server.prototype._streamBroadcast = function (event, data, except) {
  var writableStream = new PassThrough();

  for (var socketId in this.sockets) {
    if (except.indexOf(socketId) === -1) {
      writableStream.pipe(this.sockets[socketId].stream(event, data));
    }
  }

  return writableStream;
};

Server.prototype._bindEvents = function () {
  var _this = this;

  this._server.on('listening', function () {
    /**
     * Listening event from net.Server.
     *
     * @event Server#listening
     */
    _this._superEmit('listening');
  });

  this._server.on('connection', function (socket) {
    _this._bindEventsSocket(socket);
  });

  this._server.on('close', function () {
    /**
     * Close event from net.Server.
     *
     * @event Server#close
     */
    _this._superEmit('close');
  });

  this._server.on('error', function (err) {
    _this._onError(err);
  });
};

Server.prototype._bindEventsSocket = function (sock) {
  var socket = new SocketServ(sock, this);
  var _this = this;

  socket.on('close', function () {
    _this.leaveAll(socket.id);
    delete _this.sockets[socket.id];
  });

  this.sockets[socket.id] = socket;

  // Sends the id to socket client
  socket._send('', socket.id, Serializer.MT_REGISTER);

  /**
   * A new Socket was connected.
   *
   * @event Server#connection
   */
  this._superEmit('connection', socket);
};

Server.prototype._onError = function (err) {
  if (this.listenerCount('error') > 0) {
    /**
     * Error event from net.Server.
     *
     * @event Server#error
     */
    this._superEmit('error', err);
  } else {
    console.error('Missing error handler on `Server`.');
    console.error(err.stack);
  }
};

module.exports = Server;
