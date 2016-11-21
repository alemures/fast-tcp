'use strict';

// npm install avsc
var avro = require('avsc');

var Server = require('../index').Server;

var user = avro.parse({
  name: 'User',
  type: 'record',
  fields: [
    { name: 'username', type: 'string' },
    { name: 'password', type: 'string' }
  ]
});

var server = new Server({
  objectDeserializer: function (buffer, event) {
    return user.fromBuffer(buffer);
  }
});

server.on('connection', function (socket) {
  socket.on('login', function (user, cb) {
    if (user.username === 'Alex' && user.password === '1234') {
      cb('Login correct!');
    } else {
      cb('Access denied!');
    }
  });
});

server.listen(5000);

var Socket = require('../index').Socket;
var socket = new Socket({
  host: 'localhost',
  port: 5000,

  objectSerializer: function (data, event) {
    return user.toBuffer(data);
  }
});

socket.emit('login', { username: 'Alex', password: '1234' }, function (result) {
  console.log('Login result:', result);
});
