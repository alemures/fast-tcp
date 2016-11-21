'use strict';

// npm install dcodeIO/protobuf.js
var protobuf = require('protobufjs');

var Server = require('../index').Server;

var User = null;

var server = new Server({
  objectDeserializer: function (buffer, event) {
    return User.decode(buffer);
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

  objectSerializer: function (user, event) {
    return User.encode(user).finish();
  }
});

protobuf.load(__dirname + '/User.proto', function (err, root) {
  if (err) { throw err; }

  User = root.lookup('fasttcp.User');
  var user = User.create({ username: 'Alex', password: '1234' });

  socket.emit('login', user, function (result) {
    console.log('Login result:', result);
  });
});
