'use strict';

var Server = require('../index').Server;
var Socket = require('../index').Socket;

function User(username, password) {
  this.username = username;
  this.password = password;
}

User.prototype.getUsername = function () {
  return this.username;
};

User.prototype.getPassword = function () {
  return this.password;
};

User.fromBuffer = function (buffer) {
  return new User(buffer.toString().split(':')[0], buffer.toString().split(':')[1]);
};

User.prototype.toBuffer = function () {
  return new Buffer(this.username + ':' + this.password);
};

var server = new Server({
  // Creates an object instance from a binary buffer
  objectDeserializer: function (buffer, event) {
    return User.fromBuffer(buffer);
  }
});

server.on('connection', function (socket) {
  socket.on('login', function (user) {
    console.log(user.getUsername() + ' -> ' + user.getPassword());
  });
});

server.listen(5000);

var socket = new Socket({
  host: 'localhost',
  port: 5000,

  // Convert the object to a binary buffer
  objectSerializer: function (user, event) {
    return user.toBuffer();
  }
});

socket.emit('login', new User('alex', '1234'));
