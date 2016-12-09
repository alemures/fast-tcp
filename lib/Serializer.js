'use strict';

var ut = require('utjs');

function Serializer(opts) {
  opts = opts || {};

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
Serializer.DT_BOOLEAN = 6;
Serializer.DT_EMPTY = 7;

Serializer.MT_ERROR = 0;
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
Serializer.MT_DATA_STREAM_OPEN = 11;
Serializer.MT_DATA_STREAM = 12;
Serializer.MT_DATA_STREAM_CLOSE = 13;
Serializer.MT_DATA_STREAM_OPEN_WITH_ACK = 14;
Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET = 15;
Serializer.MT_DATA_STREAM_OPEN_TO_ROOM = 16;
Serializer.MT_DATA_STREAM_OPEN_BROADCAST = 17;

Serializer.prototype.serialize = function (event, data, mt, messageId) {
  var dt;

  switch (typeof data) {
    case 'string':
      dt = Serializer.DT_STRING;
      break;
    case 'number':
      dt = data % 1 === 0 ? Serializer.DT_INTEGER : Serializer.DT_DECIMAL;
      break;
    case 'object':
      if (data === null) {
        dt = Serializer.DT_EMPTY;
      } else if (data instanceof Buffer) {
        dt = Serializer.DT_BINARY;
      } else {
        data = this._objectSerializer(data, event);
        dt = Serializer.DT_OBJECT;
      }

      break;
    case 'boolean':
      data = data ? 1 : 0;
      dt = Serializer.DT_BOOLEAN;
      break;
    default:
      data = null;
      dt = Serializer.DT_EMPTY;
  }

  return this._serialize(event, data, mt, messageId, dt);
};

Serializer.prototype.deserialize = function (buff) {
  var offset = 0;

  // Message length (unused)
  // var messageLength = buff.readUInt32LE(offset);
  offset += 4;

  // Version (unused)
  var version = buff[offset++];

  if (version !== Serializer.VERSION) {
    return { mt: Serializer.MT_ERROR, data: 'Serializer version mismatch. Remote ' + version +
        ' Local ' + Serializer.VERSION };
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
  switch (dt) {
    case Serializer.DT_STRING:
      data = buff.toString(undefined, offset, offset + dataLength);
      break;
    case Serializer.DT_OBJECT:
      data = this._objectDeserializer(buff.slice(offset, offset + dataLength), event);
      break;
    case Serializer.DT_BINARY:
      data = buff.slice(offset, offset + dataLength);
      break;
    case Serializer.DT_INTEGER:
      data = buff.readIntLE(offset, dataLength);
      break;
    case Serializer.DT_DECIMAL:
      data = buff.readDoubleLE(offset);
      break;
    case Serializer.DT_BOOLEAN:
      data = buff[offset] ? true : false;
  }

  return { event: event, data: data, messageId: messageId, mt: mt };
};

Serializer.prototype._serialize = function (event, data, mt, messageId, dt) {
  var eventLength = Buffer.byteLength(event);
  var dataLength = this._getDataLength(data, dt);

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
  buff[offset] = 0;
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

  switch (dt) {
    case Serializer.DT_STRING:
      buff.write(data, offset, dataLength);
      break;
    case Serializer.DT_BINARY:
    case Serializer.DT_OBJECT:
      data.copy(buff, offset, 0, dataLength);
      break;
    case Serializer.DT_INTEGER:
      buff.writeIntLE(data, offset, dataLength);
      break;
    case Serializer.DT_DECIMAL:
      buff.writeDoubleLE(data, offset);
      break;
    case Serializer.DT_BOOLEAN:
      buff[offset] = data;
  }

  return buff;
};

Serializer.prototype._getDataLength = function (data, dt) {
  switch (dt) {
    case Serializer.DT_STRING:
      return Buffer.byteLength(data);
    case Serializer.DT_BINARY:
    case Serializer.DT_OBJECT:
      return data.length;
    case Serializer.DT_INTEGER:
      return 6;
    case Serializer.DT_DECIMAL:
      return 8;
    case Serializer.DT_BOOLEAN:
      return 1;
    default:
      return 0;
  }
};

Serializer.prototype._defaultObjectSerializer = function (data, event) {
  return new Buffer(JSON.stringify(data));
};

Serializer.prototype._defaultObjectDeserializer = function (data, event) {
  return JSON.parse(data.toString());
};

module.exports = Serializer;
