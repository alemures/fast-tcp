'use strict';

var Server = require('../index').Server;

// Custom Object
function User(username, password) {
  this.username = username;
  this.password = password;
}

User.fromBuffer = function (buffer) {
  return new User(buffer.toString().split(':')[0], buffer.toString().split(':')[1]);
};

User.prototype.toBuffer = function () {
  return new Buffer(this.username + ':' + this.password);
};

var server = new Server({
  // Creates an object instance from a binary buffer
  objectDeserializer: function (buffer) {
    return User.fromBuffer(buffer);
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

  // Convert the object to a binary buffer
  objectSerializer: function (user) {
    return user.toBuffer();
  }
});

socket.emit('login', new User('Alex', '1234'), function (result) {
  console.log('Login result:', result);
});
