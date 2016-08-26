'use strict';

var ut = require('utjs');

var Socket = require('../index').Socket;

var times = 100000;
var string = ut.randomString(10000);
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

socket.on('connect', function () {
  var i;
  for (i = 0; i < times; i++) {
    socket.emit('data', string);
  }
});
