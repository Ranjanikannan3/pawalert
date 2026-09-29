const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_role_room', (role) => {
      if (role) {
        socket.join(`role_${role.toLowerCase()}`);
        console.log(`📡 [Socket.IO] Socket ${socket.id} joined room role_${role.toLowerCase()}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function broadcastEvent(eventName, payload) {
  if (io) {
    io.emit(eventName, payload);
    console.log(`📢 [Socket.IO Broadcast] Emitted event '${eventName}'`);
  }
}

function emitToRole(role, eventName, payload) {
  if (io && role) {
    io.to(`role_${role.toLowerCase()}`).emit(eventName, payload);
  }
}

module.exports = {
  initSocket,
  getIO,
  broadcastEvent,
  emitToRole,
};
