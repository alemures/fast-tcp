'use strict';

var ut = require('utjs');

function Serializer(opts) {
  opts = ut.isObject(opts) ? opts : {};

  this._objectSerializer = ut.isFunction(opts.objectSerializer) ? opts.objectSerializer :
      this._defaultObjectSerializer;

  this._objectDeserializer = ut.isFunction(opts.objectDeserializer) ? opts.objectDeserializer :
      this._defaultObjectDeserializer;
}

Serializer.VERSION = 1;

Serializer.DT_STRING = 1;
Serializer.DT_BINARY = 2;
Serializer.DT_INTEGER = 3;
Serializer.DT_DECIMAL = 4;
Serializer.DT_OBJECT = 5;

Serializer.MT_REGISTER = 1;
Serializer.MT_DATA = 2;
Serializer.MT_DATA_TO_SOCKET = 3;
Serializer.MT_DATA_TO_ROOM = 4;
Serializer.MT_DATA_BROADCAST = 5;
Serializer.MT_DATA_WITH_ACK = 6;
Serializer.MT_ACK = 7;
Serializer.MT_JOIN_ROOM = 8;
Serializer.MT_LEAVE_ROOM = 9;
Serializer.MT_LEAVE_ALL_ROOMS = 10;

Serializer.prototype.serialize = function (event, data, mt, messageId) {
  if (typeof data === 'string') {
    return this._serialize(event, data, mt, messageId, Serializer.DT_STRING);
  }

  if (data instanceof Buffer) {
    return this._serialize(event, data, mt, messageId, Serializer.DT_BINARY);
  }

  if (typeof data === 'number') {
    if (data % 1 === 0) {
      return this._serialize(event, data, mt, messageId, Serializer.DT_INTEGER);
    }

    return this._serialize(event, data, mt, messageId, Serializer.DT_DECIMAL);
  }

  if (typeof data === 'object') {
    return this._serialize(event, this._objectSerializer(data), mt, messageId,
        Serializer.DT_OBJECT);
  }

  // Undefined is sent as string
  return this._serialize(event, 'undefined', mt, messageId, Serializer.DT_STRING);
};

Serializer.prototype.deserialize = function (buff) {
  var offset = 0;

  // Message length (unused)
  // var messageLength = buff.readUInt32LE(offset);
  offset += 4;

  // Version (unused)
  var version = buff[offset++];

  if (version !== Serializer.VERSION) {
    throw new Error('Message version ' + version + ' and Serializer version ' +
        Serializer.VERSION + ' doesn\'t match');
  }

  // Flags (unused)
  //var flags = buff[offset];
  offset++;

  // Data type
  var dt = buff[offset++];

  // Message type
  var mt = buff[offset++];

  // Message id
  var messageId = buff.readUInt32LE(offset);
  offset += 4;

  // Event
  var eventLength = buff.readUInt16LE(offset);
  offset += 2;

  var event = buff.toString(undefined, offset, offset + eventLength);
  offset += eventLength;

  // Data
  var dataLength = buff.readUInt32LE(offset);
  offset += 4;

  var data;
  if (dt === Serializer.DT_STRING) {
    data = buff.toString(undefined, offset, offset + dataLength);
  } else if (dt === Serializer.DT_OBJECT) {
    data = this._objectDeserializer(buff.slice(offset, offset + dataLength));
  } else if (dt === Serializer.DT_BINARY) {
    data = buff.slice(offset, offset + dataLength);
  } else if (dt === Serializer.DT_INTEGER) {
    data = buff.readIntLE(offset, dataLength);
  } else if (dt === Serializer.DT_DECIMAL) {
    data = buff.readDoubleLE(offset);
  }

  return { event: event, data: data, messageId: messageId, mt: mt };
};

Serializer.prototype._serialize = function (event, data, mt, messageId, dt) {
  var eventLength = Buffer.byteLength(event);
  var dataLength = dt === Serializer.DT_STRING ? Buffer.byteLength(data) :
      dt === Serializer.DT_BINARY || dt === Serializer.DT_OBJECT ? data.length :
      dt === Serializer.DT_INTEGER ? 6 :
      dt === Serializer.DT_DECIMAL ? 8 :
      0;

  // version(1), flags(1), dt,(1) mt,(1), messageId(4),
  // eventLength(2), event(), dataLength(4), data()
  var messageLength =  8 + 2 + eventLength + 4 + dataLength;

  var buff = new Buffer(4 + messageLength);
  var offset = 0;

  // Message length
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  // Version
  buff[offset] = Serializer.VERSION;
  offset++;

  // Flags (unused so far)
  // buff[offset] = 0;
  offset++;

  // Data type
  buff[offset] = dt;
  offset++;

  // Message type
  buff[offset] = mt;
  offset++;

  // Message id
  buff.writeUInt32LE(messageId, offset);
  offset += 4;

  // Event
  buff.writeUInt16LE(eventLength, offset);
  offset += 2;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Data
  buff.writeUInt32LE(dataLength, offset);
  offset += 4;

  if (dt === Serializer.DT_STRING) {
    buff.write(data, offset, dataLength);
  } else if (dt === Serializer.DT_BINARY || dt === Serializer.DT_OBJECT) {
    data.copy(buff, offset, 0, dataLength);
  } else if (dt === Serializer.DT_INTEGER) {
    buff.writeIntLE(data, offset, dataLength);
  } else if (dt === Serializer.DT_DECIMAL) {
    buff.writeDoubleLE(data, offset);
  }

  return buff;
};

Serializer.prototype._defaultObjectSerializer = function (data) {
  return new Buffer(JSON.stringify(data));
};

Serializer.prototype._defaultObjectDeserializer = function (data) {
  return JSON.parse(data.toString());
};

module.exports = Serializer;
