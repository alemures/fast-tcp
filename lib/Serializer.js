const ut = require('utjs');

/**
 * @private
 */
class Serializer {
  /**
   * @param {Object} [opts]
   * @param {Function} [opts.objectSerializer=Serializer._defaultObjectSerializer]
   * @param {Function} [opts.objectDeserializer=Serializer._defaultObjectDeserializer]
   */
  constructor(opts) {
    opts = ut.isObject(opts) ? opts : {};

    this._objectSerializer = ut.isFunction(opts.objectSerializer) ?
      opts.objectSerializer : Serializer._defaultObjectSerializer;
    this._objectDeserializer = ut.isFunction(opts.objectDeserializer) ?
      opts.objectDeserializer : Serializer._defaultObjectDeserializer;
  }

  static get VERSION() {
    return 2;
  }

  // Data Types

  static get DT_STRING() {
    return 1;
  }

  static get DT_BINARY() {
    return 2;
  }

  static get DT_INTEGER() {
    return 3;
  }

  static get DT_DECIMAL() {
    return 4;
  }

  static get DT_OBJECT() {
    return 5;
  }

  static get DT_BOOLEAN() {
    return 6;
  }

  static get DT_EMPTY() {
    return 7;
  }

  // Message Types

  static get MT_ERROR() {
    return 0;
  }

  static get MT_REGISTER() {
    return 1;
  }

  static get MT_DATA() {
    return 2;
  }

  static get MT_DATA_TO_SOCKET() {
    return 3;
  }

  static get MT_DATA_TO_ROOM() {
    return 4;
  }

  static get MT_DATA_BROADCAST() {
    return 5;
  }

  static get MT_DATA_WITH_ACK() {
    return 6;
  }

  static get MT_ACK() {
    return 7;
  }

  static get MT_JOIN_ROOM() {
    return 8;
  }

  static get MT_LEAVE_ROOM() {
    return 9;
  }

  static get MT_LEAVE_ALL_ROOMS() {
    return 10;
  }

  static get MT_DATA_STREAM_OPEN() {
    return 11;
  }

  static get MT_DATA_STREAM() {
    return 12;
  }

  static get MT_DATA_STREAM_CLOSE() {
    return 13;
  }

  static get MT_DATA_STREAM_OPEN_WITH_ACK() {
    return 14;
  }

  static get MT_DATA_STREAM_OPEN_TO_SOCKET() {
    return 15;
  }

  static get MT_DATA_STREAM_OPEN_TO_ROOM() {
    return 16;
  }

  static get MT_DATA_STREAM_OPEN_BROADCAST() {
    return 17;
  }

  // Protocol sizes

  static get BYTES_MESSAGE_LENGTH() {
    return 4;
  }

  static get BYTES_VERSION() {
    return 1;
  }

  static get BYTES_FLAGS() {
    return 1;
  }

  static get BYTES_DATA_TYPE() {
    return 1;
  }

  static get BYTES_MESSAGE_TYPE() {
    return 1;
  }

  static get BYTES_MESSAGE_ID() {
    return 4;
  }

  static get BYTES_EVENT_LENGTH() {
    return 4;
  }

  static get BYTES_DATA_LENGTH() {
    return 4;
  }

  /**
   * @param {String} event
   * @param {String|Number|Object|Buffer|Boolean} data
   * @param {Number} mt
   * @param {Number} messageId
   * @return {Buffer}
   */
  serialize(event, data, mt, messageId) {
    let dt;

    switch (typeof data) {
      case 'string':
        dt = Serializer.DT_STRING;
        break;
      case 'number':
        dt = data % 1 === 0 ? Serializer.DT_INTEGER : Serializer.DT_DECIMAL;
        break;
      case 'object':
        if (data === null) {
          dt = Serializer.DT_EMPTY;
        } else if (data instanceof Buffer) {
          dt = Serializer.DT_BINARY;
        } else {
          data = this._objectSerializer(data, event);
          dt = Serializer.DT_OBJECT;
        }

        break;
      case 'boolean':
        data = data ? 1 : 0;
        dt = Serializer.DT_BOOLEAN;
        break;
      default:
        data = null;
        dt = Serializer.DT_EMPTY;
    }

    return Serializer._serialize(event, data, mt, messageId, dt);
  }

  /**
   * @param {Buffer} buff
   * @return {Object}
   */
  deserialize(buff) {
    let offset = 0;

    // Message length (unused)
    // const messageLength = buff.readUInt32LE(offset);
    offset += Serializer.BYTES_MESSAGE_LENGTH;

    // Version
    const version = buff[offset];
    offset += Serializer.BYTES_VERSION;

    if (version !== Serializer.VERSION) {
      return {
        mt: Serializer.MT_ERROR,
        data: `Serializer version mismatch. Remote ${version}, Local ${Serializer.VERSION}`
      };
    }

    // Flags (unused)
    // const flags = buff[offset];
    offset += Serializer.BYTES_FLAGS;

    // Data type
    const dt = buff[offset];
    offset += Serializer.BYTES_DATA_TYPE;

    // Message type
    const mt = buff[offset];
    offset += Serializer.BYTES_MESSAGE_TYPE;

    // Message id
    const messageId = buff.readUInt32LE(offset);
    offset += Serializer.BYTES_MESSAGE_ID;

    // Event
    const eventLength = buff.readUInt32LE(offset);
    offset += Serializer.BYTES_EVENT_LENGTH;

    const event = buff.toString(undefined, offset, offset + eventLength);
    offset += eventLength;

    // Data
    const dataLength = buff.readUInt32LE(offset);
    offset += Serializer.BYTES_DATA_LENGTH;

    let data;
    switch (dt) {
      case Serializer.DT_STRING:
        data = buff.toString(undefined, offset, offset + dataLength);
        break;
      case Serializer.DT_OBJECT:
        data = this._objectDeserializer(buff.slice(offset, offset + dataLength), event);
        break;
      case Serializer.DT_BINARY:
        data = buff.slice(offset, offset + dataLength);
        break;
      case Serializer.DT_INTEGER:
        data = buff.readIntLE(offset, dataLength);
        break;
      case Serializer.DT_DECIMAL:
        data = buff.readDoubleLE(offset);
        break;
      case Serializer.DT_BOOLEAN:
        data = !!buff[offset];
        break;
      default:
    }

    return {
      event,
      data,
      messageId,
      mt
    };
  }

  /**
   * @param {String} event
   * @param {String|Number|Buffer} data
   * @param {Number} mt
   * @param {Number} messageId
   * @param {Number} dt
   * @return {Buffer}
   */
  static _serialize(event, data, mt, messageId, dt) {
    const eventLength = Buffer.byteLength(event);
    const dataLength = Serializer._getDataLength(data, dt);

    const messageLength = Serializer.BYTES_VERSION + Serializer.BYTES_FLAGS +
      Serializer.BYTES_DATA_TYPE + Serializer.BYTES_MESSAGE_TYPE + Serializer.BYTES_MESSAGE_ID +
      Serializer.BYTES_EVENT_LENGTH + eventLength + Serializer.BYTES_DATA_LENGTH + dataLength;

    const buff = Buffer.allocUnsafe(Serializer.BYTES_MESSAGE_LENGTH + messageLength);
    let offset = 0;

    // Message length
    buff.writeUInt32LE(messageLength, offset);
    offset += Serializer.BYTES_MESSAGE_LENGTH;

    // Version
    buff[offset] = Serializer.VERSION;
    offset += Serializer.BYTES_VERSION;

    // Flags (unused so far)
    buff[offset] = 0;
    offset += Serializer.BYTES_FLAGS;

    // Data type
    buff[offset] = dt;
    offset += Serializer.BYTES_DATA_TYPE;

    // Message type
    buff[offset] = mt;
    offset += Serializer.BYTES_MESSAGE_TYPE;

    // Message id
    buff.writeUInt32LE(messageId, offset);
    offset += Serializer.BYTES_MESSAGE_ID;

    // Event
    buff.writeUInt32LE(eventLength, offset);
    offset += Serializer.BYTES_EVENT_LENGTH;

    buff.write(event, offset, eventLength);
    offset += eventLength;

    // Data
    buff.writeUInt32LE(dataLength, offset);
    offset += Serializer.BYTES_DATA_LENGTH;

    switch (dt) {
      case Serializer.DT_STRING:
        buff.write(data, offset, dataLength);
        break;
      case Serializer.DT_BINARY:
      case Serializer.DT_OBJECT:
        data.copy(buff, offset, 0, dataLength);
        break;
      case Serializer.DT_INTEGER:
        buff.writeIntLE(data, offset, dataLength);
        break;
      case Serializer.DT_DECIMAL:
        buff.writeDoubleLE(data, offset);
        break;
      case Serializer.DT_BOOLEAN:
        buff[offset] = data;
        break;
      default:
    }

    return buff;
  }

  /**
   * @param {String|Number|Buffer} data
   * @param {Number} dt
   * @return {Number}
   */
  static _getDataLength(data, dt) {
    switch (dt) {
      case Serializer.DT_STRING:
        return Buffer.byteLength(data);
      case Serializer.DT_BINARY:
      case Serializer.DT_OBJECT:
        return data.length;
      case Serializer.DT_INTEGER:
        return 6;
      case Serializer.DT_DECIMAL:
        return 8;
      case Serializer.DT_BOOLEAN:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * @param {Object} data
   * @return {Buffer}
   */
  static _defaultObjectSerializer(data) {
    return Buffer.from(JSON.stringify(data));
  }

  /**
   * @param {Buffer} data
   * @return {Object}
   */
  static _defaultObjectDeserializer(data) {
    return JSON.parse(data.toString());
  }
}

module.exports = Serializer;
