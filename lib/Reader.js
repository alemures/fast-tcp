'use strict';

function Reader() {
  // Main buffer
  this._buffer = null;
  this._offset = 0;
  this._bytesRead = 0;
  this._payloadLength = 0;

  // Chunk
  this._offsetChunk = 0;
}

Reader.prototype.read = function(chunk) {
  this._offsetChunk = 0;
  var buffers = [];

  while (this._offsetChunk < chunk.length) {
    if (this._bytesRead < 4) {
      if (this._readPayloadLength(chunk)) {
        this._createBuffer();
      } else {
        break;
      }
    }

    if (this._bytesRead < this._buffer.length && !this._readPayload(chunk)) {
      break;
    }

    // Buffer ready, store it and keep reading the chunk
    buffers.push(this._buffer);
    this._offset = 0;
    this._bytesRead = 0;
    this._payloadLength = 0;
  }

  return buffers;
};

// Read an UInt32LE (4 bytes)
Reader.prototype._readPayloadLength = function(chunk) {
  for (; this._offsetChunk < chunk.length && this._bytesRead < 4; this._offsetChunk++, this._bytesRead++) {
    this._payloadLength |= chunk[this._offsetChunk] << (this._bytesRead * 8);
  }

  if (this._bytesRead === 4) {
    return true;
  }

  return false;
};

Reader.prototype._readPayload = function(chunk) {
  var bytesToRead = this._buffer.length - this._bytesRead;
  var bytesInChunk = chunk.length - this._offsetChunk;
  var end = bytesToRead > bytesInChunk ? chunk.length : this._offsetChunk + bytesToRead;

  chunk.copy(this._buffer, this._offset, this._offsetChunk, end);

  var bytesRead = end - this._offsetChunk;

  this._bytesRead += bytesRead;
  this._offset += bytesRead;
  this._offsetChunk = end;

  if (this._bytesRead === this._buffer.length) {
    return true;
  }

  return false;
};

Reader.prototype._createBuffer = function() {
  this._buffer = new Buffer(4 + this._payloadLength);
  this._buffer.writeUInt32LE(this._payloadLength, this._offset);
  this._offset += 4;
};

module.exports = Reader;
