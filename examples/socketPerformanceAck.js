'use strict';

var ut = require('utjs');

var Socket = require('../index').Socket;

var counter = 0;
var lastCounterValue = 0;
var messageSize = 1;

var times = 100000;
var string = ut.randomString(10000);
var socket = new Socket({
  host: 'localhost',
  port: 5000
});

socket.on('connect', function () {
  var i;
  for (i = 0; i < times; i++) {
    socket.emit('data', string, receiver);
  }
});

function receiver(data) {
  messageSize = data.length;
  counter++;
}

setInterval(function () {
  var delta = counter - lastCounterValue;
  console.log(delta + ' msg/s, ' + Math.floor(delta * messageSize / 1024 / 1024) + ' MB/s');
  lastCounterValue = counter;
}, 1000);
