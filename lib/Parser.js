
// Format: payloadLength(4 bytes) nameLength(4 bytes) name dataLength(4 bytes) data

function writeBuffer(name, data) {
	var nameLength = Buffer.byteLength(name, 'utf8');
	var dataLength = Buffer.byteLength(data, 'utf8');
	var payloadLength =  4 + nameLength + 4 + dataLength;
	
	var buff = new Buffer(4 + payloadLength);
	var offset = 0;

	// Total length
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
	offset += dataLength;

	return buff;
}

function readBuffer(buff) {
	var offset = 0;
	var name, data;
	var nameLength, dataLength;

	var payloadLength = buff.readUInt32LE(offset);
	offset += 4;

	nameLength = buff.readUInt32LE(offset);
	offset += 4;

	name = buff.toString('utf8', offset, offset + nameLength);
	offset += nameLength;

	dataLength = buff.readUInt32LE(offset);
	offset += 4;

	data = buff.toString('utf8', offset, offset + dataLength);

	return { name: name, data: data };
}

module.exports.writeBuffer = writeBuffer;
module.exports.readBuffer = readBuffer;
