'use strict';

var VERSION = 1;

var DT_STRING = 1;
var DT_BUFFER = 2;
var DT_INT = 3;
var DT_DOUBLE = 4;
var DT_OBJECT = 5;

var MT_REGISTER = 1;
var MT_MESSAGE = 2;
var MT_MESSAGE_TO_SOCKET = 3;
var MT_MESSAGE_TO_ROOM = 4;
var MT_MESSAGE_TO_ALL = 5;
var MT_MESSAGE_WITH_ACK = 6;
var MT_ACK = 7;
var MT_JOIN_ROOM = 8;
var MT_LEAVE_ROOM = 9;
var MT_LEAVE_ALL_ROOMS = 10;

function serialize(event, data, mt, messageId) {
  if (typeof data === 'string') {
    return _serialize(event, data, mt, messageId, DT_STRING);
  }

  if (data instanceof Buffer) {
    return _serialize(event, data, mt, messageId, DT_BUFFER);
  }

  if (typeof data === 'number') {
    if (data % 1 === 0) {
      return _serialize(event, data, mt, messageId, DT_INT);
    }

    return _serialize(event, data, mt, messageId, DT_DOUBLE);
  }

  if (typeof data === 'object') {
    return _serialize(event, JSON.stringify(data), mt, messageId, DT_OBJECT);
  }

  // Undefined is sent as string
  return _serialize(event, 'undefined', mt, messageId, DT_STRING);
}

function _serialize(event, data, mt, messageId, dt) {
  var eventLength = Buffer.byteLength(event);
  var dataLength = dt === DT_STRING || dt === DT_OBJECT ? Buffer.byteLength(data) :
      dt === DT_BUFFER ? data.length :
      dt === DT_INT ? 6 :
      dt === DT_DOUBLE ? 8 :
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
  buff[offset] = VERSION;
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

  if (dt === DT_STRING || dt === DT_OBJECT) {
    buff.write(data, offset, dataLength);
  } else if (dt === DT_BUFFER) {
    data.copy(buff, offset, 0, dataLength);
  } else if (dt === DT_INT) {
    buff.writeIntLE(data, offset, dataLength);
  } else if (dt === DT_DOUBLE) {
    buff.writeDoubleLE(data, offset);
  }

  return buff;
}

function deserialize(buff) {
  var offset = 0;

  // Message length (unused)
  // var messageLength = buff.readUInt32LE(offset);
  offset += 4;

  // Version (unused)
  var version = buff[offset++];

  if (version !== VERSION) {
    throw new Error('Message version ' + version + ' and Serializer version ' +
        VERSION + ' doesn\'t match')
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
  if (dt === DT_STRING) {
    data = buff.toString(undefined, offset, offset + dataLength);
  } else if (dt === DT_OBJECT) {
    data = JSON.parse(buff.toString(undefined, offset, offset + dataLength));
  } else if (dt === DT_BUFFER) {
    data = buff.slice(offset, offset + dataLength);
  } else if (dt === DT_INT) {
    data = buff.readIntLE(offset, dataLength);
  } else if (dt === DT_DOUBLE) {
    data = buff.readDoubleLE(offset);
  }

  return { event: event, data: data, messageId: messageId, mt: mt };
}

module.exports.serialize = serialize;
module.exports.deserialize = deserialize;

module.exports.VERSION = VERSION;

module.exports.MT_REGISTER = MT_REGISTER;
module.exports.MT_MESSAGE = MT_MESSAGE;
module.exports.MT_MESSAGE_TO_SOCKET = MT_MESSAGE_TO_SOCKET;
module.exports.MT_MESSAGE_TO_ROOM = MT_MESSAGE_TO_ROOM;
module.exports.MT_MESSAGE_TO_ALL = MT_MESSAGE_TO_ALL;
module.exports.MT_MESSAGE_WITH_ACK = MT_MESSAGE_WITH_ACK;
module.exports.MT_ACK = MT_ACK;
module.exports.MT_JOIN_ROOM = MT_JOIN_ROOM;
module.exports.MT_LEAVE_ROOM = MT_LEAVE_ROOM;
module.exports.MT_LEAVE_ALL_ROOMS = MT_LEAVE_ALL_ROOMS;
