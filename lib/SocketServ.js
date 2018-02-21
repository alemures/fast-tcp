const ut = require('utjs');

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

  emit(event, data, opts, cb) {
    return this._emit(event, data, Util.checkEmitOpts(opts, cb));
  }

  stream(event, data, opts, cb) {
    return this._stream(event, data, Util.checkEmitOpts(opts, cb));
  }

  join(room) {
    const roomArr = ut.isString(room) ? [room] : room;
    roomArr.forEach(roomName => this._server.join(roomName, this.id));
  }

  leave(room) {
    const roomArr = ut.isString(room) ? [room] : room;
    roomArr.forEach(roomName => this._server.leave(roomName, this.id));
  }

  leaveAll() {
    this._server.leaveAll(this.id);
  }

  _emit(event, data, opts) {
    if (opts.sockets.length > 0) {
      this._server.emit(event, data, { sockets: opts.sockets });
      return true;
    }

    if (opts.rooms.length > 0) {
      // Always excludes itself
      opts.except.push(this.id);
      this._server.emit(event, data, { rooms: opts.rooms, except: opts.except });
      return true;
    }

    if (opts.broadcast) {
      // Always excludes itself
      opts.except.push(this.id);
      this._server.emit(event, data, { except: opts.except });
      return true;
    }

    if (opts.cb !== null) {
      return this._send(event, data, Serializer.MT_DATA_WITH_ACK, { cb: opts.cb });
    }

    return this._send(event, data, Serializer.MT_DATA);
  }

  _stream(event, data, opts) {
    if (opts.sockets.length > 0) {
      return this._server.stream(event, data, { sockets: opts.sockets });
    }

    if (opts.rooms.length > 0) {
      // Always excludes itself
      opts.except.push(this.id);
      return this._server.stream(event, data, { rooms: opts.rooms, except: opts.except });
    }

    if (opts.broadcast) {
      // Always excludes itself
      opts.except.push(this.id);
      return this._server.stream(event, data, { except: opts.except });
    }

    if (opts.cb !== null) {
      return this._sendStream(event, data, Serializer.MT_DATA_STREAM_OPEN_WITH_ACK, opts.cb);
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
        eventObj = Util.deserializeEvent(msg.event);
        this.emit(eventObj.event, msg.data, { rooms: eventObj.target, except: eventObj.except });
        break;
      case Serializer.MT_DATA_TO_SOCKET:
        eventObj = Util.deserializeEvent(msg.event);
        this.emit(eventObj.event, msg.data, { sockets: eventObj.target });
        break;
      case Serializer.MT_DATA_STREAM_OPEN_BROADCAST:
        readStream = this._openDataStream(msg);
        writableStream = this.stream(
          msg.event, msg.data,
          { broadcast: true, except: eventObj.except }
        );
        readStream.pipe(writableStream);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_TO_ROOM:
        eventObj = Util.deserializeEvent(msg.event);
        readStream = this._openDataStream(msg);
        writableStream = this.stream(
          eventObj.event, msg.data,
          { rooms: eventObj.target, except: eventObj.except }
        );
        readStream.pipe(writableStream);
        break;
      case Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET:
        eventObj = Util.deserializeEvent(msg.event);
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
