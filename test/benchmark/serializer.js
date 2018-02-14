const Benchmark = require('benchmark');

const Serializer = require('../../lib/Serializer');

const suite = new Benchmark.Suite();
const serializer = new Serializer();

suite.add('Serializer#serialize - string data', () => {
  serializer.serialize('The event', 'The data', Serializer.MT_DATA, 1);
}).add('Serializer#serialize - number data', () => {
  serializer.serialize('The event', 52, Serializer.MT_DATA, 1);
}).on('cycle', (event) => {
  console.log(String(event.target));
}).on('complete', () => {
  console.log('Finished Serializer');
})
  .run({ async: true });
