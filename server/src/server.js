require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { autoSeedIfEmpty } = require('./seed/seedData');

const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect to Database
  const isConnected = await connectDB();

  if (isConnected) {
    // Ensure required role accounts exist without inserting any sample reports
    await autoSeedIfEmpty();
  }

  const server = http.createServer(app);

  // Initialize Real-Time WebSocket / Socket.IO Server
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🐾 PawAlert AI Server running on http://localhost:${PORT}`);
    console.log(`⚡ Real-Time Socket.IO Server Active on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🧠 AI Microservice URL: ${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}`);
    console.log(`=======================================================`);
  });
}

startServer();
