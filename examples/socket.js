'use strict';

var ut = require('utjs');

var Socket = require('../index').Socket;

var socket = new Socket({
  host: 'localhost',
  port: 5000

  //reconnect: false,
  //reconnectInterval: 2500,
  //autoConnect: true,
  //useQueue: true,
  //queueSize: 100
});

socket.on('data', function (data) {
  console.log('Received: ', data);
});

socket.on('connect', function () {
  console.log('connect');
});

socket.on('reconnecting', function () {
  console.log('reconnecting');
});

socket.on('end', function () {
  console.log('end');
});

socket.on('close', function () {
  console.log('close');
});

socket.on('error', function (err) {
  console.log(err.message);
});

setInterval(function () {
  socket.emit('event1', 'Hello, World ' + ut.randomNumber(1, 100) + '!');
}, 2500);

setInterval(function () {
  socket.emit('event2', 'How are you?', function (response) {
    console.log('Response: ' + response);
  });
}, 5000);
