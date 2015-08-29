'use strict';

function serialize(event, message) {
  if (typeof message === 'string') {
    return serializeString(event, message);
  } else if (message instanceof Buffer) {
    return serializeBuffer(event, message);
  } else if (typeof message === 'number') {
    if (message % 1 === 0) {
      return serializeInt(event, message);
    } else {
      return serializeDouble(event, message);
    }
  } else if (typeof message === 'object') {
    return serializeObject(event, message);
  } else {
    throw new Error('Invalid message type');
  }
}

/**
 * @param {string} event The event name
 * @param {number} message The string
 */
function serializeString(event, message) {
  var eventLength = Buffer.byteLength(event);
  var messageLength = Buffer.byteLength(message);
  var payloadLength =  1 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset] = 1; // String data
  offset++;

  // Event
  buff.writeUInt32LE(eventLength, offset);
  offset += 4;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Message
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  buff.write(message, offset, messageLength);

  return buff;
}

/**
 * @param {string} event The event name
 * @param {number} message The buffer
 */
function serializeBuffer(event, message) {
  var eventLength = Buffer.byteLength(event);
  var messageLength = message.length;
  var payloadLength =  1 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset++] = 2; // Buffer data

  // Event
  buff.writeUInt32LE(eventLength, offset);
  offset += 4;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Message
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  message.copy(buff, offset, 0, messageLength);

  return buff;
}

/**
 * @param {string} event The event name
 * @param {number} message Integer number between -2^47, 2^47-1
 */
function serializeInt(event, message) {
  var eventLength = Buffer.byteLength(event);
  var messageLength = 6;
  var payloadLength =  1 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset++] = 3; // Integer data

  // Event
  buff.writeUInt32LE(eventLength, offset);
  offset += 4;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Message
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  buff.writeIntLE(message, offset, messageLength);

  return buff;
}

/**
 * @param {string} event The event name
 * @param {number} message A 64 bits double number
 */
function serializeDouble(event, message) {
  var eventLength = Buffer.byteLength(event);
  var messageLength = 8;
  var payloadLength =  1 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset++] = 4; // Double data

  // Event
  buff.writeUInt32LE(eventLength, offset);
  offset += 4;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Message
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  buff.writeDoubleLE(message, offset);

  return buff;
}

/**
 * @param {string} event The event name
 * @param {object} message A javascript object
 */
function serializeObject(event, message) {
  message = JSON.stringify(message);

  var eventLength = Buffer.byteLength(event);
  var messageLength = Buffer.byteLength(message);
  var payloadLength =  1 + 4 + eventLength + 4 + messageLength;

  var buff = new Buffer(4 + payloadLength);
  var offset = 0;

  // Payload length
  buff.writeUInt32LE(payloadLength, offset);
  offset += 4;

  // Flags
  buff[offset] = 5; // Object data
  offset++;

  // Event
  buff.writeUInt32LE(eventLength, offset);
  offset += 4;

  buff.write(event, offset, eventLength);
  offset += eventLength;

  // Message
  buff.writeUInt32LE(messageLength, offset);
  offset += 4;

  buff.write(message, offset, messageLength);

  return buff;
}

function deserialize(buff) {
  var offset = 0;
  var event;
  var message;
  var eventLength;
  var messageLength;
  var flags;

  // Payload length
  // var payloadLength = buff.readUInt32LE(offset);
  offset += 4;

  // Flags
  flags = buff[offset++];

  // Event
  eventLength = buff.readUInt32LE(offset);
  offset += 4;

  event = buff.toString(undefined, offset, offset + eventLength);
  offset += eventLength;

  // Message
  messageLength = buff.readUInt32LE(offset);
  offset += 4;

  if (flags === 1) {
    message = buff.toString(undefined, offset, offset + messageLength);
  } else if (flags === 2) {
    message = buff.slice(offset, offset + messageLength);
  } else if (flags === 3) {
    message = buff.readIntLE(offset, messageLength);
  } else if (flags === 4) {
    message = buff.readDoubleLE(offset);
  } else if (flags === 5) {
    message = JSON.parse(buff.toString(undefined, offset, offset + messageLength));
  }

  return { event: event, message: message };
}

module.exports.serialize = serialize;
module.exports.deserialize = deserialize;
