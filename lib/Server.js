'use strict';

var net = require('net');
var util = require('util');
var ut = require('utjs');
var EventEmitter = require('events');

var SocketServ = require('./SocketServ');
var Serializer = require('./Serializer');

/**
 * The server class.
 *
 * @param {Object} opts The net.Server options.
 * @param {Function} [opts.objectSerializer=JSON.stringify] Serializes an object into a binary
 *                                  buffer. This functions allows you to implement custom
 *                                  serialization protocols for the data or even use other known
 *                                  protocols like "Protocol Buffers" or  "MessagePack".
 * @param {Function} [opts.objectDeserializer=JSON.parse] Deserializes a binary buffer into an
 *                                  object. This functions allows you to implement custom
 *                                  serialization protocols for the data or even use other known
 *                                  protocols like "Protocol Buffers" or  "MessagePack".
 * @constructor
 */
function Server(opts) {
  opts = ut.isObject(opts) ? opts : {};
  Server.super_.call(this);

  /**
   * The connected sockets. The key is the Socket.id and the value a socket.
   * @type {Object}
   */
  this.sockets = {};

  /**
   * The rooms with at least one socket or more. The key is the room name and
   * the value an array of sockets.
   * @type {Object}
   */
  this.rooms = {};

  this._opts = opts;
  this._server = net.createServer(opts);
  this._bindEvents();
}

util.inherits(Server, EventEmitter);

Server.prototype._superEmit = Server.prototype.emit;

/**
 * Emit an event, if no sockets or rooms are provided, the event
 * will be broadcasted to all connected sockets.
 *
 * @param  {String} event The event name.
 * @param  {String|Number|Object|Buffer} data The data to send.
 * @param  {Object} [opts] The options.
 * @param  {String[]} [opts.sockets=[]] The list of socket ids to send.
 * @param  {String[]} [opts.rooms=[]] The list of rooms to send.
 * @param  {String[]} [opts.except=[]] The list of socket ids to exclude.
 */
Server.prototype.emit = function (event, data, opts) {
  opts = ut.isObject(opts) ? opts : {};
  this._emit(event, data, opts);
};

/**
 * Join to a room.
 *
 * @param  {String} room The room name.
 * @param  {String} socketId The socket id.
 */
Server.prototype.join = function (room, socketId) {
  var socket = this.sockets[socketId];
  var sockets;

  if (socket === undefined) {
    return;
  }

  if (this.rooms[room] === undefined) {
    this.rooms[room] = [];
  }

  sockets = this.rooms[room];
  if (sockets.indexOf(socket) === -1) {
    sockets.push(socket);
    socket._rooms[room] = true;
  }
};

/**
 * Leave a room.
 *
 * @param  {String} room The room name.
 * @param  {String} socketId The socket id.
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
 * @param  {String} socketId The socket id.
 */
Server.prototype.leaveAll = function (socketId) {
  var socket = this.sockets[socketId];
  var room;

  if (socket !== undefined) {
    for (room in socket._rooms) {
      this.leave(room, socketId);
    }
  }
};

/**
 * Start the server.
 *
 * @param  {Number} port The port to listen to.
 */
Server.prototype.listen = function (port) {
  this._server.listen(port);
};

/**
 * Disconnect all the clients and close the server.
 */
Server.prototype.close = function () {
  var socketId;

  for (socketId in this.sockets) {
    this.sockets[socketId].end();
  }

  this._server.close();
};

Server.prototype._emit = function (event, data, opts) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var except = ut.isArray(opts.except)  ? opts.except : [];

  var socketId;
  var sockets;
  var socket;
  var i;
  var j;

  // Send to list of sockets
  if (socketIds.length > 0) {
    for (i = 0; i < socketIds.length; i++) {
      socket = this.sockets[socketIds[i]];
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        socket.emit(event, data);
      }
    }
  }

  // Send to list of rooms
  if (rooms.length > 0) {
    for (i = 0; i < rooms.length; i++) {
      sockets = this.rooms[rooms[i]];
      if (sockets !== undefined) {
        for (j = 0; j < sockets.length; j++) {
          socket = sockets[j];
          if (except.indexOf(socket.id) === -1) {
            socket.emit(event, data);
          }
        }
      }
    }
  }

  // Broadcast if no socketIds or rooms are provided
  if (socketIds.length + rooms.length === 0) {
    for (socketId in this.sockets) {
      if (except.indexOf(socketId) === -1) {
        this.sockets[socketId].emit(event, data);
      }
    }
  }
};

Server.prototype._bindEvents = function () {
  var _this = this;

  this._server.on('listening', function () {
    _this._superEmit('listening');
  });

  this._server.on('connection', function (socket) {
    _this._bindEventsSocket(socket);
  });

  this._server.on('close', function () {
    _this._superEmit('close');
  });

  this._server.on('error', function (error) {
    _this._superEmit('error', error);
  });
};

Server.prototype._bindEventsSocket = function (sock) {
  var socket = new SocketServ(this._generateSocketId(), sock, this, this._opts);
  var _this = this;

  socket.on('close', function () {
    _this.leaveAll(socket.id);
    delete _this.sockets[socket.id];
  });

  this.sockets[socket.id] = socket;

  // Sends the id to socket client
  socket._send('', socket.id, Serializer.MT_REGISTER);

  this._superEmit('connection', socket);
};

Server.prototype._generateSocketId = function () {
  var socketId;

  do {
    socketId = ut.randomString(5);
  } while (this.sockets[socketId] !== undefined);

  return socketId;
};

module.exports = Server;
