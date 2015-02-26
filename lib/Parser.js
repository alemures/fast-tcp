
function writeBuffer(name, data) {
	var nameLength = Buffer.byteLength(name);
	var dataLength = Buffer.byteLength(data);
	var payloadLength =  4 + nameLength + 4 + dataLength;
	
	var buff = new Buffer(4 + payloadLength);
	var offset = 0;

	// Payload length
	buff.writeUInt32LE(payloadLength, offset);
	offset += 4;

	// Name
	buff.writeUInt32LE(nameLength, offset);
	offset += 4;

	buff.write(name, offset, nameLength);
	offset += nameLength;

	// Data
	buff.writeUInt32LE(dataLength, offset);
	offset += 4;

	buff.write(data, offset, dataLength);

	return buff;
}

function readBuffer(buff) {
	var offset = 0;
	var name, data;
	var nameLength, dataLength;

	// Payload length
	var payloadLength = buff.readUInt32LE(offset);
	offset += 4;

	nameLength = buff.readUInt32LE(offset);
	offset += 4;

	// Name
	name = buff.toString(undefined, offset, offset + nameLength);
	offset += nameLength;

	dataLength = buff.readUInt32LE(offset);
	offset += 4;

	// Data
	data = buff.toString(undefined, offset, offset + dataLength);

	return { name: name, data: data };
}

module.exports.writeBuffer = writeBuffer;
module.exports.readBuffer = readBuffer;
