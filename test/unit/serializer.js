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

  describe('serialize', () => {
    it('should calculate the message type and call _serialize', () => {
      const serializer = new Serializer();
      const spy = sinon.spy(Serializer, '_serialize');

      const datas = ['data', 5, 5.2, null, Buffer.alloc(0), {}, true, undefined];

      datas.forEach((data) => {
        serializer.serialize('event', data, Serializer.MT_DATA, 1);
      });

      expect(spy.calledWith('event', datas[0], Serializer.MT_DATA, 1, Serializer.DT_STRING)).to.be.true;
      expect(spy.calledWith('event', datas[1], Serializer.MT_DATA, 1, Serializer.DT_INTEGER)).to.be.true;
      expect(spy.calledWith('event', datas[2], Serializer.MT_DATA, 1, Serializer.DT_DECIMAL)).to.be.true;
      expect(spy.calledWith('event', datas[3], Serializer.MT_DATA, 1, Serializer.DT_EMPTY)).to.be.true;
      expect(spy.calledWith('event', datas[4], Serializer.MT_DATA, 1, Serializer.DT_BINARY)).to.be.true;
      expect(spy.calledWith('event', serializer._objectSerializer(datas[5]), Serializer.MT_DATA, 1, Serializer.DT_OBJECT)).to.be.true;
      expect(spy.calledWith('event', datas[6] ? 1 : 0, Serializer.MT_DATA, 1, Serializer.DT_BOOLEAN)).to.be.true;
      expect(spy.calledWith('event', null, Serializer.MT_DATA, 1, Serializer.DT_EMPTY)).to.be.true;
    });
  });
});
