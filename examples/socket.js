'use strict';

var ut = require('utjs');

var Socket = require('../index').Socket;

var socket = new Socket({
  host: 'localhost',
  port: 5000

  //reconnection: false,
  //reconnectionInterval: 2500
});

socket.on('data', function(data) {
  console.log('Received: ', data);
});

socket.on('connect', function() {
  console.log('connect');
});

socket.on('end', function() {
  console.log('end');
});

socket.on('close', function(isError) {
  console.log(isError ? 'close due to an error' : 'close');
});

socket.on('error', function(err) {
  console.log(err.message);
});

setInterval(function() {
  socket.emit('event1', 'Hello, World ' + ut.randomNumber(1, 100) + '!');
}, 2500);

setInterval(function() {
  socket.emit('event2', 'How are you?', function(response) {
    console.log('Response: ' + response);
  });
}, 5000);
