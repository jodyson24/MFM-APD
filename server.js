require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');
const v1Router = require('./v1/router');
const { connectDB } = require('./db');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Allow requests without an origin (curl, health checks) or matching FRONTEND_URL
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

app.use((req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  req.log = (levelOrMessage, maybeMessage, maybeMeta) => {
    const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    const isLevel = typeof levelOrMessage === 'string' && levels.includes(levelOrMessage);
    const level = isLevel ? levelOrMessage : 'info';
    const message = isLevel ? (maybeMessage || 'Request log') : (levelOrMessage || 'Request log');
    const meta = isLevel ? (maybeMeta || {}) : (maybeMessage || {});

    const payload = { requestId: req.id, ...meta };
    if (typeof message === 'string') payload.message = message;

    if (typeof logger[level] === 'function') {
      return logger[level](payload);
    }

    return logger.info(payload);
  };

  logger.info({
    message: 'Incoming request',
    requestId: req.id,
    method,
    url: originalUrl,
    ip,
    userAgent: req.headers['user-agent'],
  });

  res.on('finish', () => {
    logger.info({
      message: 'Request completed',
      requestId: req.id,
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
      ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
});

// Serve uploaded media (pictorial evidence)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Routes
app.use('/api/v1', v1Router);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Import cron jobs (they schedule themselves)
require('./services/complianceJob');
require('./services/rollupJob');

console.log('Cron jobs initialized');

// Serve built frontend (production) with SPA fallback
const frontendDist = path.join(__dirname, 'frontend', 'dist');

if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  console.log(`Serving frontend from: ${frontendDist}`);

  app.use(express.static(frontendDist));

  // SPA fallback for React Router: only for app routes, not API or uploaded files
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path === '/health'
    ) {
      return next();
    }

    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}


// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});