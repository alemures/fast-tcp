'use strict';

var DT_STRING = 1;
var DT_BUFFER = 2;
var DT_INT = 3;
var DT_DOUBLE = 4;
var DT_OBJECT = 5;

var MT_EVENT = 8;
var MT_ACK = 16;
var MT_JOIN = 24;
var MT_LEAVE = 32;
var MT_EVENT_BROADCAST = 40;
var MT_EVENT_ROOM = 48;
var MT_EVENT_TO = 56;
var MT_REGISTER = 64;
var MT_LEAVE_ALL = 72;

function serialize(event, message, ackId, mt) {
  if (typeof message === 'string') {
    return _serialize(event, message, ackId, mt | DT_STRING);
  } else if (message instanceof Buffer) {
    return _serialize(event, message, ackId, mt | DT_BUFFER);
  } else if (typeof message === 'number') {
    if (message % 1 === 0) {
      return _serialize(event, message, ackId, mt | DT_INT);
    } else {
      return _serialize(event, message, ackId, mt | DT_DOUBLE);
    }
  } else if (typeof message === 'object') {
    return _serialize(event, JSON.stringify(message), ackId, mt | DT_OBJECT);
  } else {
    // Undefined is sent as string
    return _serialize(event, message + '', ackId, mt | DT_STRING);
  }
}

/**
 * @param {String} event The event name
 * @param {String|Buffer|Number|Object} message The message content can be an integer 
 *                                              number [-2^47, 2^47-1], a decimal number 
 *                                              of 64 bits, a string or buffer.
 * @param {number} ackId The ack id
 * @param {boolean} flags The flags
 * @return {Buffer} The buffer to send
 */
function _serialize(event, message, ackId, flags) {
  var eventLength = Buffer.byteLength(event);
  var dt = flags & 7;
  var messageLength = dt === DT_STRING || dt === DT_OBJECT ? Buffer.byteLength(message) :
      dt === DT_BUFFER ? message.length :
      dt === DT_INT ? 6 :
      dt === DT_DOUBLE ? 8 :
      0;
  var payloadLength =  1 + 4 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset] = flags;
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

  if (dt === DT_STRING || dt === DT_OBJECT) {
    buff.write(message, offset, messageLength);
  } else if (dt === DT_BUFFER) {
    message.copy(buff, offset, 0, messageLength);
  } else if (dt === DT_INT) {
    buff.writeIntLE(message, offset, messageLength);
  } else if (dt === DT_DOUBLE) {
    buff.writeDoubleLE(message, offset);
  }

  return buff;
}

/**
 * @param {Buffer} buffer The received buffer
 * @return {Object} An object which contains the event, message, ackId and message type.
 */
function deserialize(buff) {
  var offset = 0;
  var event;
  var message;
  var eventLength;
  var messageLength;
  var flags;
  var dt;
  var mt;
  var ackId;

  // Payload length (Skipped)
  // var payloadLength = buff.readUInt32LE(offset);
  offset += 4;

  // Flags
  flags = buff[offset++];
  dt = flags & 7;
  mt = flags & 120;

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

  if (dt === DT_STRING) {
    message = buff.toString(undefined, offset, offset + messageLength);
  } else if (dt === DT_OBJECT) {
    message = JSON.parse(buff.toString(undefined, offset, offset + messageLength));
  } else if (dt === DT_BUFFER) {
    message = buff.slice(offset, offset + messageLength);
  } else if (dt === DT_INT) {
    message = buff.readIntLE(offset, messageLength);
  } else if (dt === DT_DOUBLE) {
    message = buff.readDoubleLE(offset);
  } 

  return { event: event, message: message, ackId: ackId, mt: mt };
}

module.exports.serialize = serialize;
module.exports.deserialize = deserialize;

module.exports.MT_EVENT = MT_EVENT;
module.exports.MT_ACK = MT_ACK;
module.exports.MT_JOIN = MT_JOIN;
module.exports.MT_LEAVE = MT_LEAVE;
module.exports.MT_EVENT_BROADCAST = MT_EVENT_BROADCAST;
module.exports.MT_EVENT_ROOM = MT_EVENT_ROOM;
module.exports.MT_EVENT_TO = MT_EVENT_TO;
module.exports.MT_REGISTER = MT_REGISTER;
module.exports.MT_LEAVE_ALL = MT_LEAVE_ALL;
