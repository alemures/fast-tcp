'use strict';

var PassThrough = require('stream').PassThrough;
var util = require('util');
var ut = require('utjs');
var EventEmitter = require('events');

/**
 * The router class.
 *
 * @constructor
 * @fires Router#listening
 * @fires Router#close
 * @fires Router#connection
 * @fires Router#error
 */
function Router() {
  Router.super_.call(this);

  this.rooms = {};
  this.servers = [];
}

util.inherits(Router, EventEmitter);

Router.prototype._superEmit = Router.prototype.emit;

/**
 * Add Server interface into the router pool
 *
 * @param {Server} server Server to add in the pool
 * @param {Server} prefix Server address prefix
 */
 Router.prototype.addServer = function (server, prefix) {
   prefix = prefix || 'sys';

  server._superEmit = Router.prototype._superEmit.bind(this);

  server._emit = Router.prototype._emit.bind(this);
  server._emitToSockets = Router.prototype._emitToSockets.bind(this);
  server._emitToRooms = Router.prototype._emitToRooms.bind(this);
  server._emitBroadcast = Router.prototype._emitBroadcast.bind(this);

  server._stream = Router.prototype._stream.bind(this);
  server._streamToSockets = Router.prototype._streamToSockets.bind(this);
  server._streamToRooms = Router.prototype._streamToRooms.bind(this);
  server._streamBroadcast = Router.prototype._streamBroadcast.bind(this);

  server.id = prefix+"/"+this._generateServerId();
  this.servers[server.id] = server;
 };

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
Router.prototype.emit = function (event, data, opts) {
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
Router.prototype.stream = function (event, data, opts) {
  opts = ut.isObject(opts) ? opts : {};
  return this._stream(event, data, opts);
};

/**
 * Join to a room.
 *
 * @param {String} room The room name.
 * @param {String} socketId The socket id.
 */
Router.prototype.join = function (room, socketId) {
  for(var a in this.servers) {
    var server = this.servers[a];
    var socket = server.sockets[socketId];

    if(socket === undefined) {
      return;
    }

    if (server.rooms[room] === undefined) {
      server.rooms[room] = [];
    }

    var sockets = server.rooms[room];
    if (sockets.indexOf(socket) === -1) {
      sockets.push(socket);
      socket._rooms[room] = true;
    }
  }
};

/**
 * Leave a room.
 *
 * @param {String} room The room name.
 * @param {String} socketId The socket id.
 */
Router.prototype.leave = function (room, socketId) {
  for(var a in this.servers) {
    var server = this.servers[a];
    var socket = server.sockets[socketId];
    var sockets = server.rooms[room];

    if (socket !== undefined && sockets !== undefined) {
      var index = sockets.indexOf(socket);
      if (index > -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          delete server.rooms[room];
        }
        delete socket._rooms[room];
      }
    }
  }
};

/**
 * Leave all rooms.
 *
 * @param {String} socketId The socket id.
 */
Router.prototype.leaveAll = function (socketId) {
  for(var a in this.servers) {
    var server = this.servers[a];
    var socket = server.sockets[socketId];

    if (socket !== undefined) {
      for (var room in socket._rooms) {
        this.leave(room, socketId);
      }
    }
  }
};

/**
 * Disconnect all the clients and close all servers.
 */
Router.prototype.close = function () {
    for(var a in this.servers) {
      this.servers[a].close();
    }
};

Router.prototype._emit = function (event, data, opts) {
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

Router.prototype._emitToSockets = function (event, data, socketIds, except) {
  for(var a in this.servers) {
    var server = this.servers[a];

    for (var i = 0; i < socketIds.length; i++) {
      var socket = server.sockets[socketIds[i]];
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        socket.emit(event, data);
      }
    }
  }
};

Router.prototype._emitToRooms = function (event, data, rooms, except) {
  for(var a in this.servers) {
    var server = this.servers[a];

    for (var i = 0; i < rooms.length; i++) {
      var sockets = server.rooms[rooms[i]];
      if (sockets !== undefined) {
        for (var j = 0; j < sockets.length; j++) {
          var socket = sockets[j];
          if (except.indexOf(socket.id) === -1) {
            socket.emit(event, data);
          }
        }
      }
    }
  }
};

Router.prototype._emitBroadcast = function (event, data, except) {
  for(var a in this.servers) {
    var server = this.servers[a];
    for (var socketId in server.sockets) {
      if (except.indexOf(socketId) === -1) {
        server.sockets[socketId].emit(event, data);
      }
    }
  }
};

Router.prototype._stream = function (event, data, opts) {
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

Router.prototype._streamToSockets = function (event, data, socketIds, except) {
  var writableStream = new PassThrough();

  for(var a in this.servers) {
    var server = this.servers[a];
    for (var i = 0; i < socketIds.length; i++) {
      var socket = server.sockets[socketIds[i]];
      if (socket !== undefined && except.indexOf(socket.id) === -1) {
        writableStream.pipe(socket.stream(event, data));
      }
    }
  }

  return writableStream;
};

Router.prototype._streamToRooms = function (event, data, rooms, except) {
  var writableStream = new PassThrough();

  for(var a in this.servers) {
    var server = this.servers[a];
    for (var i = 0; i < rooms.length; i++) {
      var sockets = server.rooms[rooms[i]];
      if (sockets !== undefined) {
        for (var j = 0; j < sockets.length; j++) {
          var socket = sockets[j];
          if (except.indexOf(socket.id) === -1) {
            writableStream.pipe(socket.stream(event, data));
          }
        }
      }
    }
  }

  return writableStream;
};

Router.prototype._streamBroadcast = function (event, data, except) {
  var writableStream = new PassThrough();

  for(var a in this.servers) {
    var server = this.servers[a];

    for (var socketId in server.sockets) {
      if (except.indexOf(socketId) === -1) {
        writableStream.pipe(server.sockets[socketId].stream(event, data));
      }
    }
  }

  return writableStream;
};

Router.prototype._generateServerId = function () {
  var serverId;
  var from = 2;

  do {
    serverId = ut.randomString(from);
    from++;
  } while (this.servers[serverId] !== undefined);

  return serverId;
};

module.exports = Router;
