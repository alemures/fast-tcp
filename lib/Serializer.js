'use strict';

var STRING = 1;
var BUFFER = 2;
var INT = 3;
var DOUBLE = 4;
var OBJECT = 5;

function serialize(event, message, ackId, isAck) {
  if (typeof message === 'string') {
    return _serialize(event, message, ackId, isAck, STRING);
  } else if (message instanceof Buffer) {
    return _serialize(event, message, ackId, isAck, BUFFER);
  } else if (typeof message === 'number') {
    if (message % 1 === 0) {
      return _serialize(event, message, ackId, isAck, INT);
    } else {
      return _serialize(event, message, ackId, isAck, DOUBLE);
    }
  } else if (typeof message === 'object') {
    return _serialize(event, JSON.stringify(message), ackId, isAck, OBJECT);
  } else {
    // Undefined is sent as string
    return _serialize(event, message + '', ackId, isAck, STRING);
  }
}

/**
 * @param {string} event The event name
 * @param {string|buffer|number|object} message If integer number [-2^47, 2^47-1], if decimal it could be
 *                                              a 64 bits decimal number, otherwise any string, buffer or
 *                                              object will be allowed.
 */
function _serialize(event, message, ackId, isAck, messageType) {
  var eventLength = Buffer.byteLength(event);
  var messageLength = messageType === STRING || messageType === OBJECT ? Buffer.byteLength(message) :
      messageType === BUFFER ? message.length :
      messageType === INT ? 6 :
      8;
  var payloadLength =  1 + 4 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset] = isAck ? 8 | messageType : messageType;
  offset++;

  // Ack id
  buff.writeUInt32LE(ackId, offset);
  offset += 4;

  // Event
  buff.writeUInt32LE(eventLength, offset);
  offset += 4;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Message
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  if (messageType === STRING || messageType === OBJECT) {
    buff.write(message, offset, messageLength);
  } else if (messageType === BUFFER) {
    message.copy(buff, offset, 0, messageLength);
  } else if (messageType === INT) {
    buff.writeIntLE(message, offset, messageLength);
  } else {
    buff.writeDoubleLE(message, offset);
  }

  return buff;
}

function deserialize(buff) {
  var offset = 0;
  var event;
  var message;
  var eventLength;
  var messageLength;
  var messageType;
  var flags;
  var ackId;
  var isAck;

  // Payload length
  // var payloadLength = buff.readUInt32LE(offset);
  offset += 4;

  // Flags
  flags = buff[offset++];
  messageType = 7 & flags;
  isAck = (8 & flags) > 0;

  // Ack id
  ackId = buff.readUInt32LE(offset);
  offset += 4;

  // Event
  eventLength = buff.readUInt32LE(offset);
  offset += 4;

  event = buff.toString(undefined, offset, offset + eventLength);
  offset += eventLength;

  // Message
  messageLength = buff.readUInt32LE(offset);
  offset += 4;

  if (messageType === STRING) {
    message = buff.toString(undefined, offset, offset + messageLength);
  } else if (messageType === BUFFER) {
    message = buff.slice(offset, offset + messageLength);
  } else if (messageType === INT) {
    message = buff.readIntLE(offset, messageLength);
  } else if (messageType === DOUBLE) {
    message = buff.readDoubleLE(offset);
  } else if (messageType === OBJECT) {
    message = JSON.parse(buff.toString(undefined, offset, offset + messageLength));
  }

  return { event: event, message: message, ackId: ackId, isAck: isAck};
}

module.exports.serialize = serialize;
module.exports.deserialize = deserialize;
