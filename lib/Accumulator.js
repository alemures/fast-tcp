
function Accumulator() {
	// Local buffer
	this._buff;
	this._offset = 0;
	this._bytesRead = 0;

	// External buffer
	this._offsetEx = 0;

	// Info
	this._payloadLength = 0;
}

Accumulator.prototype.add = function(buff) {
	this._offsetEx = 0;

	var buffers = [];
	
	while(this._offsetEx < buff.length) {

		if(this._bytesRead < 4) {
			if(this._readPayloadLength(buff)) {
				this._createBuffer(this._payloadLength);
			} else {
				break;
			}
		}

		if(this._bytesRead < this._buff.length && !this._readPayload(buff)) {
			break;
		}

		// Buffer ready, store it and keep reading the external one
		buffers.push(this._buff);
		this._offset = 0;
		this._bytesRead = 0;
		this._payloadLength = 0;

	}

	return buffers;
};

// UInt32LE
Accumulator.prototype._readPayloadLength = function(buff) {
	for(; this._offsetEx < buff.length && this._bytesRead < 4; this._offsetEx++, this._bytesRead++) {
		this._payloadLength |= buff[this._offsetEx] << (this._bytesRead * 8);
	}

	if(this._bytesRead === 4) {
		return true;
	}
	return false;
};

Accumulator.prototype._readPayload = function(buff) {
	var bytesToRead = this._buff.length - this._bytesRead;
	var bytesInBuff = buff.length - this._offsetEx;
	var end = bytesToRead > bytesInBuff ? buff.length: this._offsetEx + bytesToRead;

	buff.copy(this._buff, this._offset, this._offsetEx, end);

	var bytesRead = end - this._offsetEx;

	this._bytesRead += bytesRead;
	this._offset += bytesRead;
	this._offsetEx = end;

	if(this._bytesRead === this._buff.length) {
		return true;
	}
	return false;
};

Accumulator.prototype._createBuffer = function(payloadLength) {
	this._buff = new Buffer(4 + payloadLength);
	this._buff.writeUInt32LE(payloadLength, this._offset);
	this._offset += 4;
};

module.exports = Accumulator;
