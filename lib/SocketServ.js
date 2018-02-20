const ut = require('utjs');

const Serializer = require('./Serializer');
const Sock = require('./Sock');

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

  emit(event, data, opts, cb) {
    cb = ut.isFunction(opts) ? opts : ut.isFunction(cb) ? cb : null;
    opts = ut.isObject(opts) ? opts : {};

    return this._emit(event, data, opts, cb);
  }

  stream(event, data, opts, cb) {
    cb = ut.isFunction(opts) ? opts : ut.isFunction(cb) ? cb : null;
    opts = ut.isObject(opts) ? opts : {};

    return this._stream(event, data, opts, cb);
  }

  join(room) {
    const roomArr = ut.isString(room) ? [room] : room;

    for (let i = 0; i < roomArr.length; i++) {
      this._server.join(roomArr[i], this.id);
    }
  }

  leave(room) {
    const roomArr = ut.isString(room) ? [room] : room;

    for (let i = 0; i < roomArr.length; i++) {
      this._server.leave(roomArr[i], this.id);
    }
  }

  leaveAll() {
    this._server.leaveAll(this.id);
  }

  _emit(event, data, opts, cb) {
    const socketIds = ut.isArray(opts.sockets) ? opts.sockets :
      ut.isString(opts.sockets) ? [opts.sockets] : [];
    const rooms = ut.isArray(opts.rooms) ? opts.rooms :
      ut.isString(opts.rooms) ? [opts.rooms] : [];
    const except = ut.isArray(opts.except) ? opts.except :
      ut.isString(opts.except) ? [opts.except] : [];
    const broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

    // Always excludes itself
    except.push(this.id);

    if (socketIds.length + rooms.length === 0 && !broadcast) {
      if (cb !== null) {
        return this._send(event, data, Serializer.MT_DATA_WITH_ACK, { cb });
      }

      return this._send(event, data, Serializer.MT_DATA);
    }

    if (broadcast) {
      this._server.emit(event, data, { except });
    }

    if (socketIds.length > 0) {
      this._server.emit(event, data, { sockets: socketIds });
    }

    if (rooms.length > 0) {
      this._server.emit(event, data, { rooms, except });
    }

    return true;
  }

  _stream(event, data, opts, cb) {
    const socketIds = ut.isArray(opts.sockets) ? opts.sockets :
      ut.isString(opts.sockets) ? [opts.sockets] : [];
    const rooms = ut.isArray(opts.rooms) ? opts.rooms :
      ut.isString(opts.rooms) ? [opts.rooms] : [];
    const except = ut.isArray(opts.except) ? opts.except :
      ut.isString(opts.except) ? [opts.except] : [];
    const broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

    // Always excludes itself
    except.push(this.id);

    if (broadcast) {
      return this._server.stream(event, data, { except });
    }

    if (socketIds.length > 0) {
      return this._server.stream(event, data, { sockets: socketIds });
    }

    if (rooms.length > 0) {
      return this._server.stream(event, data, { rooms, except });
    }

    if (cb !== null) {
      return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN_WITH_ACK, cb);
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
        this.emit(msg.event, msg.data, { broadcast: true, except: eventObj.except });
        break;
      case Serializer.MT_DATA_TO_ROOM:
        eventObj = Sock._deserializeEvent(msg.event);
        this.emit(eventObj.event, msg.data, { rooms: eventObj.target, except: eventObj.except });
        break;
      case Serializer.MT_DATA_TO_SOCKET:
        eventObj = Sock._deserializeEvent(msg.event);
        this.emit(eventObj.event, msg.data, { sockets: eventObj.target });
        break;
      case Serializer.MT_DATA_STREAM_OPEN_BROADCAST:
        readStream = this._openDataStream(msg);
        writableStream = this.stream(
          msg.event,
          msg.data,
          { broadcast: true, except: eventObj.except }
        );
        readStream.pipe(writableStream);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_TO_ROOM:
        eventObj = Sock._deserializeEvent(msg.event);
        readStream = this._openDataStream(msg);
        writableStream = this.stream(
          eventObj.event,
          msg.data,
          { rooms: eventObj.target, except: eventObj.except }
        );
        readStream.pipe(writableStream);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET:
        eventObj = Sock._deserializeEvent(msg.event);
        readStream = this._openDataStream(msg);
        writableStream = this.stream(eventObj.event, msg.data, { sockets: eventObj.target });
        readStream.pipe(writableStream);
        break;
      default:
    }
  }

  _generateSocketId() {
    let socketId;

    do {
      socketId = ut.randomString(5);
    } while (this._server.sockets.has(socketId));

    return socketId;
  }
}

module.exports = SocketServ;
