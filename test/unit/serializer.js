const Serializer = require('../../lib/Serializer');

describe('Serializer', () => {
  it('should be a function', () => {
    expect(Serializer).to.be.a('function');
  });

  describe('constructor', () => {
    it('should create a Serializer instance with default object serializers', () => {
      const serializer = new Serializer();
      expect(serializer).to.be.a.instanceof(Serializer);
      expect(serializer._objectSerializer).to.be.a('function');
      expect(serializer._objectDeserializer).to.be.a('function');
    });

    it('should create a Serializer instance with custom object serializers', () => {
      const opts = {
        objectSerializer: () => {},
        objectDeserializer: () => {}
      };

      const serializer = new Serializer(opts);
      expect(serializer).to.be.a.instanceof(Serializer);
      expect(serializer._objectSerializer).to.be.equal(opts.objectSerializer);
      expect(serializer._objectDeserializer).to.be.equal(opts.objectDeserializer);
    });
  });

  describe('_getDataType', () => {
    it('should return the data type', () => {
      expect(Serializer._getDataType('string')).to.be.equal(Serializer.DT_STRING);
      expect(Serializer._getDataType(256)).to.be.equal(Serializer.DT_INTEGER);
      expect(Serializer._getDataType(15.67)).to.be.equal(Serializer.DT_DECIMAL);
      expect(Serializer._getDataType(null)).to.be.equal(Serializer.DT_EMPTY);
      expect(Serializer._getDataType(Buffer.alloc(4))).to.be.equal(Serializer.DT_BINARY);
      expect(Serializer._getDataType({})).to.be.equal(Serializer.DT_OBJECT);
      expect(Serializer._getDataType(true)).to.be.equal(Serializer.DT_BOOLEAN);
      expect(Serializer._getDataType(undefined)).to.be.equal(Serializer.DT_EMPTY);
    });
  });

  describe('_getDataLength', () => {
    it('should return the data length', () => {
      expect(Serializer._getDataLength('string', Serializer.DT_STRING)).to.be.equal(6);
      expect(Serializer._getDataLength(256, Serializer.DT_INTEGER)).to.be.equal(6);
      expect(Serializer._getDataLength(15.67, Serializer.DT_DECIMAL)).to.be.equal(8);
      expect(Serializer._getDataLength(null, Serializer.DT_EMPTY)).to.be.equal(0);
      expect(Serializer._getDataLength(Buffer.alloc(4), Serializer.DT_BINARY)).to.be.equal(4);
      expect(Serializer._getDataLength(Buffer.from('{}'), Serializer.DT_OBJECT)).to.be.equal(2);
      expect(Serializer._getDataLength(1, Serializer.DT_BOOLEAN)).to.be.equal(1);
    });
  });

  describe('_parseData', () => {
    it('should convert complex data into primitives', () => {
      const serializer = new Serializer();
      const event = 'theevent';
      const object = { a: 5, b: 'string', c: true };
      expect(serializer._parseData(event, object, Serializer.DT_OBJECT)).to.be.a.instanceof(Buffer);
      expect(serializer._parseData(event, true, Serializer.DT_BOOLEAN)).to.be.a('number');
      expect(serializer._parseData(event, 'string', Serializer.DT_STRING)).to.be.equal('string');
    });
  });

  describe('_defaultObjectSerializer', () => {
    it('should conver a object into a buffer', () => {
      const object = { a: 5, b: 'string', c: true };
      expect(Serializer._defaultObjectSerializer(object)).to.be.a.instanceof(Buffer);
    });
  });

  describe('_defaultObjectDeserializer', () => {
    it('should conver a buffer into a object', () => {
      const buffer = Buffer.from(JSON.stringify({ a: 5, b: 'string', c: true }));
      expect(Serializer._defaultObjectDeserializer(buffer)).to.be.a('object');
    });
  });
});
