'use strict';

const WebSocketClient = require('websocket').client;
const baseData = require('./base.json');
const fallbackData = require('./fallback.json');

class Bot {
  constructor() {
    this.fallbacks = fallbackData.fallbacks;
    this.connected = false;
    this.client = new WebSocketClient();
    this.reservationState = {};
    this.timeoutDuration = 300000; // 5 minutes in ms

    this.client.on('connectFailed', (error) => {
      console.log('Connection failed:', error.toString());
    });

    this.client.on('connect', (connection) => {
      this.connection = connection;
      this.connected = true;
      console.log('WebSocket client connected');

      connection.on('error', (error) => {
        console.log('Connection error:', error.toString());
      });

      connection.on('close', () => {
        console.log('Connection closed');
        this.connected = false;
      });

      connection.on('message', (message) => {
        if (message.type === 'utf8') {
          try {
            const data = JSON.parse(message.utf8Data);
            if (data.sender && data.sender !== 'RestaurantBot') {
              this.processUserMessage(data);
            }
          } catch (e) {
            console.error('Message parse error:', e.message);
          }
        }
      });

      this.sendWelcomeMessage();
    });
  }

  connect() {
    this.client.connect('ws://localhost:8181/', 'chat');
  }

  sendWelcomeMessage() {
    if (this.connection && this.connection.connected) {
      const welcomeMsg = JSON.stringify({
        type: 'msg',
        name: 'RestaurantBot',
        msg: 'Herzlich willkommen! Sie können einen Tisch reservieren, nach unserem Menü fragen oder unsere Öffnungszeiten erfragen.',
        sender: 'RestaurantBot'
      });
      this.connection.sendUTF(welcomeMsg);
    }
  }

  processUserMessage(data) {
    const userMessage = data.msg.toLowerCase();
    const userId = data.sender;

    // Check for ongoing reservation first
    if (this.reservationState[userId]) {
      this.continueReservation(userId, userMessage);
      return;
    }

    // Check for new reservation request
    if (this.isReservationRequest(userMessage)) {
      this.startReservation(userId);
      this.sendResponse(userId, this.askForPartySize());
      return;
    }

    // Existing pattern matching for other queries
    let bestMatch = null;
    let highestScore = 0;

    for (const category in baseData) {
      if (category === 'reservieren') continue; // Skip as we handle separately
      
      let score = 0;
      baseData[category].patterns.forEach(pattern => {
        const patternLower = pattern.toLowerCase();
        if (userMessage.includes(patternLower)) {
          score += patternLower.length;
        }
      });
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = category;
      }
    }

    const response = highestScore > 0 
      ? baseData[bestMatch].responses[0]
      : this.getRandomFallback();

    this.sendResponse(userId, response);
  }

  isReservationRequest(message) {
    return baseData.reservieren.patterns.some(pattern => {
      const regex = new RegExp(pattern.replace("[0-9]", "\\d+"), "i");
      return regex.test(message);
    });
  }

  startReservation(userId) {
    this.reservationState[userId] = {
      step: 'partySize',
      details: {},
      timestamp: Date.now()
    };
    this.checkForTimeouts();
  }

  continueReservation(userId, message) {
    const state = this.reservationState[userId];
    state.timestamp = Date.now(); // Update last activity time

    switch(state.step) {
      case 'partySize':
        const partySize = parseInt(message);
        if (isNaN(partySize) || partySize < 1 || partySize > 20) {
          this.sendResponse(userId, "Bitte geben Sie eine gültige Anzahl von Personen (1-20) an:");
          return;
        }
        state.details.partySize = partySize;
        state.step = 'name';
        this.sendResponse(userId, this.askForName());
        break;
        
      case 'name':
        if (message.trim().length < 2) {
          this.sendResponse(userId, "Bitte geben Sie einen gültigen Namen ein (mindestens 2 Zeichen):");
          return;
        }
        state.details.name = message.trim();
        state.step = 'complete';
        this.sendResponse(userId, this.completeReservation(userId));
        break;
        
      default:
        delete this.reservationState[userId];
        this.sendResponse(userId, this.getRandomFallback());
    }
  }

  askForPartySize() {
    return "Für wie viele Personen möchten Sie reservieren? (Bitte Zahl zwischen 1 und 20 eingeben)";
  }

  askForName() {
    return "Unter welchem Namen soll die Reservierung erfolgen?";
  }

  completeReservation(userId) {
    const reservation = this.reservationState[userId].details;
    delete this.reservationState[userId];
    
    return `Reservierung erfolgreich gebucht!\n\n` +
           `Name: ${reservation.name}\n` +
           `Personen: ${reservation.partySize}\n\n` +
           `Vielen Dank für Ihre Reservierung!`;
  }

  checkForTimeouts() {
    const now = Date.now();
    for (const userId in this.reservationState) {
      if (now - this.reservationState[userId].timestamp > this.timeoutDuration) {
        delete this.reservationState[userId];
      }
    }
  }

  sendResponse(userId, message) {
    const botResponse = JSON.stringify({
      type: 'msg',
      name: 'RestaurantBot',
      msg: message,
      sender: 'RestaurantBot'
    });

    if (this.connection && this.connection.connected) {
      this.connection.sendUTF(botResponse);
    }
  }

  post(msg) {
    try {
      const data = JSON.parse(msg);
      this.processUserMessage(data);
    } catch (e) {
      console.error('Invalid message:', e.message);
    }
  }

  getRandomFallback() {
    return this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)];
  }
}

module.exports = Bot;