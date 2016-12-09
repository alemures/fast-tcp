'use strict';

var util = require('util');
var ut = require('utjs');

var Serializer = require('./Serializer');
var Sock = require('./Sock');

function SocketServ(socket, server) {
  SocketServ.super_.call(this, server._serializer, {
    autoConnect: false,
    reconnect: false,
    useQueue: false,
    messageListener: this._msgListener
  });

  this._server = server;
  this._rooms = {};

  // Sock fields
  this.id = this._generateSocketId();
  this._socket = socket;
  this._connected = true;

  this._bindEvents();
}

util.inherits(SocketServ, Sock);

SocketServ.prototype.emit = function (event, data, param) {
  var opts = ut.isObject(param) ? param : {};
  var cb = ut.isFunction(param) ? param : null;

  return this._emit(event, data, opts, cb);
};

SocketServ.prototype.stream = function (event, data, param) {
  var opts = ut.isObject(param) ? param : {};
  var cb = ut.isFunction(param) ? param : null;

  return this._stream(event, data, opts, cb);
};

SocketServ.prototype.join = function (room) {
  var roomArr = ut.isString(room) ? [room] : room;

  for (var i = 0; i < roomArr.length; i++) {
    this._server.join(roomArr[i], this.id);
  }
};

SocketServ.prototype.leave = function (room) {
  var roomArr = ut.isString(room) ? [room] : room;

  for (var i = 0; i < roomArr.length; i++) {
    this._server.leave(roomArr[i], this.id);
  }
};

SocketServ.prototype.leaveAll = function () {
  this._server.leaveAll(this.id);
};

SocketServ.prototype._emit = function (event, data, opts, cb) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

  if (socketIds.length + rooms.length === 0 && !broadcast) {
    if (cb !== null) {
      return this._send(event, data, Serializer.MT_DATA_WITH_ACK, { cb: cb });
    }

    return this._send(event, data, Serializer.MT_DATA);
  }

  if (broadcast) {
    this._server.emit(event, data, { except: [this.id] });
  }

  if (socketIds.length > 0) {
    this._server.emit(event, data, { sockets: socketIds });
  }

  if (rooms.length > 0) {
    this._server.emit(event, data, { rooms: rooms, except: [this.id] });
  }

  return true;
};

SocketServ.prototype._stream = function (event, data, opts, cb) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

  if (broadcast) {
    return this._server.stream(event, data, { except: [this.id] });
  }

  if (socketIds.length > 0) {
    return this._server.stream(event, data, { sockets: socketIds });
  }

  if (rooms.length > 0) {
    return this._server.stream(event, data, { rooms: rooms, except: [this.id] });
  }

  if (cb !== null) {
    return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN_WITH_ACK, cb);
  }

  return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN);
};

SocketServ.prototype._msgListener = function (msg) {
  var arr;
  var readStream;
  var writableStream;

  switch (msg.mt) {
    case Serializer.MT_JOIN_ROOM:
      this.join(msg.data.split(','));
      break;
    case Serializer.MT_LEAVE_ROOM:
      this.leave(msg.data.split(','));
      break;
    case Serializer.MT_LEAVE_ALL_ROOMS:
      this.leaveAll();
      break;
    case Serializer.MT_DATA_BROADCAST:
      this.emit(msg.event, msg.data, { broadcast: true });
      break;
    case Serializer.MT_DATA_TO_ROOM:
      arr = msg.event.split('|'); // [0] = rooms, [1] = event
      this.emit(arr[1], msg.data, { rooms: arr[0].split(',') });
      break;
    case Serializer.MT_DATA_TO_SOCKET:
      arr = msg.event.split('|'); // [0] = socketIds, [1] = event
      this.emit(arr[1], msg.data, { sockets: arr[0].split(',') });
      break;
    case Serializer.MT_DATA_STREAM_OPEN_BROADCAST:
      readStream = this._openDataStream(msg);
      writableStream = this.stream(msg.event, msg.data, { broadcast: true });
      readStream.pipe(writableStream);
      break;
    case Serializer.MT_DATA_STREAM_OPEN_TO_ROOM:
      arr = msg.event.split('|'); // [0] = rooms, [1] = event
      readStream = this._openDataStream(msg);
      writableStream = this.stream(arr[1], msg.data, { rooms: arr[0].split(',') });
      readStream.pipe(writableStream);
      break;
    case Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET:
      arr = msg.event.split('|'); // [0] = socketIds, [1] = event
      readStream = this._openDataStream(msg);
      writableStream = this.stream(arr[1], msg.data, { sockets: arr[0].split(',') });
      readStream.pipe(writableStream);
  }
};

SocketServ.prototype._generateSocketId = function () {
  var socketId;

  do {
    socketId = ut.randomString(5);
  } while (this._server.sockets[socketId] !== undefined);

  return socketId;
};

module.exports = SocketServ;
