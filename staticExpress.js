/* Required packages */
const bot = require('./bot.js');
const express = require('express');
const WSS = require('websocket').server;
const http = require('http');

const app = express();

/* Serve static website files */
app.use(express.static('public'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/images', express.static(__dirname + '/public/images'));

// Start Express server
const webserver = app.listen(8081, () => {
  console.log('Server started at http://localhost:8081');
});

// Create and start WebSocket server
const wsServer = http.createServer();
wsServer.listen(8181);

const wss = new WSS({
  httpServer: wsServer,
  autoAcceptConnections: false
});

const myBot = new bot();
const connections = {};

wss.on('request', (request) => {
  const connection = request.accept('chat', request.origin);
  console.log('New connection accepted');

  connection.on('message', (message) => {
    if (message.type !== 'utf8') return;

    let data;
    try {
      data = JSON.parse(message.utf8Data);
      if (typeof data !== 'object') throw new Error('Invalid message format');

      // Handle bot messages: broadcast to all clients and do NOT forward to bot again
      if (data.sender === 'RestaurantBot') {
        const botMsg = JSON.stringify(data);
        for (const key in connections) {
          if (connections[key]) {
            connections[key].sendUTF(botMsg);
          }
        }
        console.log('Broadcasting bot message');
        return; // Prevent further processing (no loop)
      }
    } catch (e) {
      console.error('Invalid message:', e.message);
      return;
    }

    // Find sender's name associated with this connection
    let name = '';
    for (const key in connections) {
      if (connections[key] === connection) {
        name = key;
        break;
      }
    }

    let msg;
    let shouldNotifyBot = false;

    switch (data.type) {
      case 'join':
        connections[data.name] = connection;
        msg = JSON.stringify({
          type: 'join',
          names: Object.keys(connections)
        });
        if (!myBot.connected) myBot.connect();
        break;

      case 'msg':
        msg = JSON.stringify({
          type: 'msg',
          name: name,
          msg: data.msg,
          sender: data.sender
        });
        shouldNotifyBot = true; // Forward user messages to bot
        break;
    }

    // Broadcast user messages (or join notifications) to all except sender
    if (msg) {
      for (const key in connections) {
        if (connections[key] && connections[key] !== connection) {
          connections[key].sendUTF(msg);
        }
      }
    }

    // Forward user messages to bot for processing
    if (shouldNotifyBot) {
      console.log('Forwarding user message to bot');
      myBot.post(msg);
    }
  });

  connection.on('close', () => {
    for (const key in connections) {
      if (connections[key] === connection) {
        delete connections[key];
        break;
      }
    }
  });
});
