/* eslint no-bitwise: 0 */

module.exports = class Reader {
  constructor() {
    // Main buffer
    this._buffer = null;
    this._offset = 0;
    this._bytesRead = 0;
    this._messageLength = 0;

    // Chunk
    this._offsetChunk = 0;
  }

  read(chunk) {
    this._offsetChunk = 0;
    const buffers = [];

    while (this._offsetChunk < chunk.length) {
      if (this._bytesRead < 4) {
        if (this._readMessageLength(chunk)) {
          this._createBuffer();
        } else {
          break;
        }
      }

      if (this._bytesRead < this._buffer.length && !this._readMessageContent(chunk)) {
        break;
      }

      // Buffer ready, store it and keep reading the chunk
      buffers.push(this._buffer);
      this._offset = 0;
      this._bytesRead = 0;
      this._messageLength = 0;
    }

    return buffers;
  }

  // Read an uInt32LE (4 bytes)
  _readMessageLength(chunk) {
    for (; this._offsetChunk < chunk.length && this._bytesRead < 4;
      this._offsetChunk++, this._bytesRead++) {
      this._messageLength |= chunk[this._offsetChunk] << (this._bytesRead * 8);
    }

    return this._bytesRead === 4;
  }

  _readMessageContent(chunk) {
    const bytesToRead = this._buffer.length - this._bytesRead;
    const bytesInChunk = chunk.length - this._offsetChunk;
    const end = bytesToRead > bytesInChunk ? chunk.length : this._offsetChunk + bytesToRead;

    chunk.copy(this._buffer, this._offset, this._offsetChunk, end);

    const bytesRead = end - this._offsetChunk;

    this._bytesRead += bytesRead;
    this._offset += bytesRead;
    this._offsetChunk = end;

    return this._bytesRead === this._buffer.length;
  }

  _createBuffer() {
    this._buffer = Buffer.allocUnsafe(4 + this._messageLength);
    this._buffer.writeUInt32LE(this._messageLength, this._offset);
    this._offset += 4;
  }
};
