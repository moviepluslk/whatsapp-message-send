const express = require('express');
const socketIO = require('socket.io');
const { createServer } = require('http');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const server = createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3030;

// Serve static files
app.use(express.static('public'));

// WhatsApp client setup
const whatsappClient = require('./whatsapp.js')(io);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
