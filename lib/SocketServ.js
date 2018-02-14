const ut = require('utjs');

const Serializer = require('./Serializer');
const Sock = require('./Sock');

module.exports = class SocketServ extends Sock {
  constructor(socket, server) {
    super(server._serializer, {
      autoConnect: false,
      reconnect: false,
      useQueue: false
    });

    // Set Sock attribute
    this._messageListener = this._msgListener;

    this._server = server;
    this._rooms = {};

    // Sock fields
    this.id = this._generateSocketId();
    this._socket = socket;
    this._connected = true;

    this._bindEvents();
  }

  emit(event, data, param) {
    const opts = ut.isObject(param) ? param : {};
    const cb = ut.isFunction(param) ? param : null;

    return this._emit(event, data, opts, cb);
  }

  stream(event, data, param) {
    const opts = ut.isObject(param) ? param : {};
    const cb = ut.isFunction(param) ? param : null;

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
    const socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
    const rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
    const broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

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
  }

  _stream(event, data, opts, cb) {
    const socketIds = ut.isArray(opts.sockets) ? opts.sockets : [];
    const rooms = ut.isArray(opts.rooms) ? opts.rooms : [];
    const broadcast = ut.isBoolean(opts.broadcast) ? opts.broadcast : false;

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
  }

  _msgListener(msg) {
    let arr;
    let readStream;
    let writableStream;

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
  }

  _generateSocketId() {
    let socketId;

    do {
      socketId = ut.randomString(5);
    } while (this._server.sockets[socketId] !== undefined);

    return socketId;
  }
};
