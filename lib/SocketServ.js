const Serializer = require('./Serializer');
const Sock = require('./Sock');
const Util = require('./Util');

/**
 * @private
 */
class SocketServ extends Sock {
  constructor(nodeSocket, server) {
    super(server._serializer, {
      autoConnect: false,
      reconnect: false,
      useQueue: false
    });

    this._server = server;

    // Sock fields
    this.id = this._generateSocketId();
    this._nodeSocket = nodeSocket;
    this._connected = true;
    this._messageListener = this._msgListener;

    this._bindEvents();
  }

  emit(event, data, opts, ack) {
    return this._emit(event, data, Util.checkEmitOpts(opts, ack));
  }

  stream(event, data, opts, ack) {
    return this._stream(event, data, Util.checkEmitOpts(opts, ack));
  }

  join(room) {
    this._server.join(room, this.id);
  }

  leave(room) {
    this._server.leave(room, this.id);
  }

  leaveAll() {
    this._server.leaveAll(this.id);
  }

  _emit(event, data, opts) {
    if (opts.sockets !== undefined) {
      this._server._emitToSockets(event, data, opts.sockets);
      return true;
    }

    if (opts.rooms !== undefined) {
      // Always excludes itself
      const except = opts.except !== undefined ? opts.except.concat(this.id) : [this.id];
      this._server._emitToRooms(event, data, opts.rooms, except);
      return true;
    }

    if (opts.broadcast) {
      // Always excludes itself
      const except = opts.except !== undefined ? opts.except.concat(this.id) : [this.id];
      this._server._emitBroadcast(event, data, except);
      return true;
    }

    if (opts.ack !== undefined) {
      return this._send(event, data, Serializer.MT_DATA_WITH_ACK, {
        ack: opts.ack,
        timeout: opts.timeout
      });
    }

    return this._send(event, data, Serializer.MT_DATA);
  }

  _stream(event, data, opts) {
    if (opts.sockets !== undefined) {
      return this._server._streamToSockets(event, data, opts.sockets);
    }

    if (opts.rooms !== undefined) {
      // Always excludes itself
      const except = opts.except !== undefined ? opts.except.concat(this.id) : [this.id];
      return this._server._streamToRooms(event, data, opts.rooms, except);
    }

    if (opts.broadcast) {
      // Always excludes itself
      const except = opts.except !== undefined ? opts.except.concat(this.id) : [this.id];
      return this._server._streamBroadcast(event, data, except);
    }

    if (opts.ack !== undefined) {
      return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN_WITH_ACK, {
        ack: opts.ack,
        timeout: opts.timeout
      });
    }

    return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN);
  }

  _msgListener(msg) {
    let eventObj;
    let readStream;
    let writableStream;

    switch (msg.mt) {
      case Serializer.MT_JOIN_ROOM:
        this.join(msg.data.split(Sock.LIST_SEPARATOR));
        break;
      case Serializer.MT_LEAVE_ROOM:
        this.leave(msg.data.split(Sock.LIST_SEPARATOR));
        break;
      case Serializer.MT_LEAVE_ALL_ROOMS:
        this.leaveAll();
        break;
      case Serializer.MT_DATA_BROADCAST:
        eventObj = Util.deserializeEvent(msg.event);
        this._emit(eventObj.event, msg.data, { broadcast: true, except: eventObj.except });
        break;
      case Serializer.MT_DATA_TO_ROOM:
        eventObj = Util.deserializeEvent(msg.event);
        this._emit(eventObj.event, msg.data, { rooms: eventObj.target, except: eventObj.except });
        break;
      case Serializer.MT_DATA_TO_SOCKET:
        eventObj = Util.deserializeEvent(msg.event);
        this._emit(eventObj.event, msg.data, { sockets: eventObj.target });
        break;
      case Serializer.MT_DATA_STREAM_OPEN_BROADCAST:
        readStream = this._openDataStream(msg);
        writableStream = this._stream(
          msg.event, msg.data,
          { broadcast: true, except: eventObj.except }
        );
        readStream.pipe(writableStream);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_TO_ROOM:
        eventObj = Util.deserializeEvent(msg.event);
        readStream = this._openDataStream(msg);
        writableStream = this._stream(
          eventObj.event, msg.data,
          { rooms: eventObj.target, except: eventObj.except }
        );
        readStream.pipe(writableStream);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET:
        eventObj = Util.deserializeEvent(msg.event);
        readStream = this._openDataStream(msg);
        writableStream = this._stream(eventObj.event, msg.data, { sockets: eventObj.target });
        readStream.pipe(writableStream);
        break;
      default:
    }
  }

  _generateSocketId() {
    let socketId;

    do {
      socketId = Util.randomString(5);
    } while (this._server.sockets.has(socketId));

    return socketId;
  }
}

module.exports = SocketServ;
