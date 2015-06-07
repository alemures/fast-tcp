'use strict';

function serialize(event, message) {
	var eventLength = Buffer.byteLength(event);
	var messageLength = Buffer.byteLength(message);
	var payloadLength =  4 + eventLength + 4 + messageLength;
	
	var buff = new Buffer(4 + payloadLength);
	var offset = 0;

	// Payload length
	buff.writeUInt32LE(payloadLength, offset);
	offset += 4;

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
	var event, message;
	var eventLength, messageLength;

	// Payload length
	var payloadLength = buff.readUInt32LE(offset);
	offset += 4;

	eventLength = buff.readUInt32LE(offset);
	offset += 4;

	// Event
	event = buff.toString(undefined, offset, offset + eventLength);
	offset += eventLength;

	messageLength = buff.readUInt32LE(offset);
	offset += 4;

	// Message
	message = buff.toString(undefined, offset, offset + messageLength);

	return { event: event, message: message };
}

module.exports.serialize = serialize;
module.exports.deserialize = deserialize;