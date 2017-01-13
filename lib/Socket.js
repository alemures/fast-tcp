'use strict';

var util = require('util');
var ut = require('utjs');

var Serializer = require('./Serializer');
var Sock = require('./Sock');

/**
 * The client socket.
 *
 * @param {Object} opts The Socket and net.Socket options.
 * @param {Boolean} [opts.reconnect=true] Enable or disable the reconnection.
 * @param {Number} [opts.reconnectInterval=1000] The reconnection interval.
 * @param {Boolean} [opts.autoConnect=true] Enable or disable the
 *        auto connection after instance the class.
 * @param {Boolean} [opts.useQueue=true] Enable or disable the usage of an internal
 *        queue that will containt the emitted messages while the socket isn't
 *        connected. The enqueued messages will be sent as soon as the socket
 *        is connected.
 * @param {Number} [opts.queueSize=Infinity] The max size of the queue. If the queue is
 *        full, new messages will replace old ones.
 * @param {Function} [opts.objectSerializer=JSON.stringify] Serializes an object into a binary
 *        buffer. This functions allows you to implement custom serialization protocols for
 *        the data or even use other known protocols like "Protocol Buffers" or  "MessagePack".
 * @param {Function} [opts.objectDeserializer=JSON.parse] Deserializes a binary buffer into an
 *        object. This functions allows you to implement custom serialization protocols for the
 *        data type "object" or even use other known protocols like "Protocol Buffers" or
 *        "MessagePack".
 * @constructor
 * @augments Sock
 * @fires Socket#connect
 * @fires Socket#reconnecting
 * @fires Socket#socket_connect
 * @fires Socket#socket_drain
 * @fires Socket#end
 * @fires Socket#close
 * @fires Socket#error
 */
function Socket(opts) {
  opts.messageListener = this._msgListener;
  Socket.super_.call(this, new Serializer(opts), opts);
}

util.inherits(Socket, Sock);

/**
 * Emit an event.
 *
 * @param {String} event The event name.
 * @param {String|Number|Object|Buffer|Boolean} data The data to send.
 * @param {Object|Function} [param] The options or callback.
 * @param {String[]} [param.sockets=[]] The list of socket ids to send.
 * @param {String[]} [param.rooms=[]] The list of rooms to send.
 * @param {Boolean} [param.broadcast=false] Send to all connected sockets.
 * @return {Boolean} true if the entire data was flushed successfully. false if all or part of
 *         the data was queued in user memory. 'socket_drain' will be emitted when the buffer
 *         is again free.
 */
Socket.prototype.emit = function (event, data, param) {
  var opts = ut.isObject(param) ? param : {};
  var cb = ut.isFunction(param) ? param : null;

  return this._emit(event, data, opts, cb);
};

/**
 * Creates and returns a stream.Writable instance that can be used to stream
 * binary data.
 *
 * @param {String} event The event name.
 * @param {String|Number|Object|Buffer|Boolean} data The data to send along with the stream.
 * @param {Object|Function} [param] The options or callback.
 * @param {String[]} [param.sockets=[]] The list of socket ids to send.
 * @param {String[]} [param.rooms=[]] The list of rooms to send.
 * @param {Boolean} [param.broadcast=false] Send to all connected sockets.
 * @return {stream.Writable} A stream.Writable instance.
 */
Socket.prototype.stream = function (event, data, param) {
  var opts = ut.isObject(param) ? param : {};
  var cb = ut.isFunction(param) ? param : null;

  return this._stream(event, data, opts, cb);
};

/**
 * Join to a room.
 *
 * @param {String|String[]} room The room name.
 */
Socket.prototype.join = function (room) {
  room = ut.isString(room) ? room : room.join(',');
  this._send('', room, Serializer.MT_JOIN_ROOM);
};

/**
 * Leave a room.
 *
 * @param {String|String[]} room The room name.
 */
Socket.prototype.leave = function (room) {
  room = ut.isString(room) ? room : room.join(',');
  this._send('', room, Serializer.MT_LEAVE_ROOM);
};

/**
 * Leave all rooms.
 */
Socket.prototype.leaveAll = function () {
  this._send('', null, Serializer.MT_LEAVE_ALL_ROOMS);
};

Socket.prototype._emit = function (event, data, opts, cb) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

  if (socketIds.length + rooms.length === 0 && !broadcast) {
    if (cb !== null) {
      return this._send(event, data, Serializer.MT_DATA_WITH_ACK, { cb: cb });
    }

    return this._send(event, data, Serializer.MT_DATA);
  }

  var flushedData = true;

  if (broadcast) {
    flushedData = this._send(event, data, Serializer.MT_DATA_BROADCAST);
  }

  if (socketIds.length > 0) {
    flushedData = this._send(socketIds.join(',') + '|' + event, data, Serializer.MT_DATA_TO_SOCKET);
  }

  if (rooms.length > 0) {
    flushedData = this._send(rooms.join(',') + '|' + event, data, Serializer.MT_DATA_TO_ROOM);
  }

  return flushedData;
};

Socket.prototype._stream = function (event, data, opts, cb) {
  var socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
  var rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
  var broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

  if (broadcast) {
    return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN_BROADCAST);
  }

  if (socketIds.length > 0) {
    return this._sendStream(socketIds.join(',') + '|' + event, data,
        Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET);
  }

  if (rooms.length > 0) {
    return this._sendStream(rooms.join(',') + '|' + event, data,
        Serializer.MT_DATA_STREAM_OPEN_TO_ROOM);
  }

  if (cb !== null) {
    return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN_WITH_ACK, cb);
  }

  return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN);
};

Socket.prototype._msgListener = function (msg) {
  switch (msg.mt) {
    case Serializer.MT_REGISTER:
      this.id = msg.data;

      /**
       * The socket is connected and registered so {@link Socket#id}
       * now contains the socket identification.
       *
       * @event Socket#connect
       */
      this._superEmit('connect');
      break;
    case Serializer.MT_ERROR:
      this._onError(ut.error(msg.data));
  }
};

module.exports = Socket;
