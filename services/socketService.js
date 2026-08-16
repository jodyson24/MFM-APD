const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

let io = null;

function getAllowedOrigins() {
  return [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
  ].filter(Boolean);
}

function initSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  // Authenticate the handshake with the same access token used by the API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('_id name role isActive isSuperAdmin')
        .lean();
      if (!user || !user.isActive) return next(new Error('User not found or inactive'));

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      socket.join(`user:${socket.user._id.toString()}`);
      logger.info(`[socket] connected ${socket.id} (user ${socket.user._id})`);
    } else {
      logger.warn(`[socket] connected without user ${socket.id}`);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`[socket] disconnected ${socket.id} (${reason})`);
    });
  });

  return io;
}

function getIo() {
  return io;
}

function closeSocket() {
  if (io) {
    io.close();
    io = null;
  }
}

module.exports = { initSocket, getIo, closeSocket };
