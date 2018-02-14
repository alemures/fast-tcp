const Benchmark = require('benchmark');

const Serializer = require('../../lib/Serializer');

const suite = new Benchmark.Suite();
const serializer = new Serializer();

// serialize

suite.add('Serializer#serialize - string data', () => {
  serializer.serialize('The event', 'The data', Serializer.MT_DATA, 1);
});

suite.add('Serializer#serialize - number data', () => {
  serializer.serialize('The event', 52, Serializer.MT_DATA, 1);
});

const object = { a: 1, b: 'string', c: true };
suite.add('Serializer#serialize - plain object data', () => {
  serializer.serialize('The event', object, Serializer.MT_DATA, 1);
});

const buffer = Buffer.from([1, 2, 3, 4]);
suite.add('Serializer#serialize - buffer data', () => {
  serializer.serialize('The event', buffer, Serializer.MT_DATA, 1);
});

suite.add('Serializer#serialize - empty data', () => {
  serializer.serialize('The event', null, Serializer.MT_DATA, 1);
});

suite.add('Serializer#serialize - boolean data', () => {
  serializer.serialize('The event', true, Serializer.MT_DATA, 1);
});

// deserialize

const stringBuffer = serializer.serialize('The event', 'The data', Serializer.MT_DATA, 1);
suite.add('Serializer#deserialize - string data', () => {
  serializer.deserialize(stringBuffer);
});

const numberBuffer = serializer.serialize('The event', 52, Serializer.MT_DATA, 1);
suite.add('Serializer#deserialize - number data', () => {
  serializer.deserialize(numberBuffer);
});

const objectBuffer = serializer.serialize(
  'The event',
  { a: 1, b: 'string', c: true }, Serializer.MT_DATA, 1
);
suite.add('Serializer#deserialize - plain object data', () => {
  serializer.deserialize(objectBuffer);
});

const bufferBuffer = serializer.serialize('The event', Buffer.from([1, 2, 3, 4]), Serializer.MT_DATA, 1);
suite.add('Serializer#deserialize - buffer data', () => {
  serializer.deserialize(bufferBuffer);
});

const emptyBuffer = serializer.serialize('The event', null, Serializer.MT_DATA, 1);
suite.add('Serializer#deserialize - empty data', () => {
  serializer.deserialize(emptyBuffer);
});

const booleanBuffer = serializer.serialize('The event', true, Serializer.MT_DATA, 1);
suite.add('Serializer#deserialize - boolean data', () => {
  serializer.deserialize(booleanBuffer);
});

suite.on('cycle', (event) => {
  console.log(String(event.target));
}).on('complete', () => {
  console.log('Finished Serializer');
});

suite.run({ async: true });
