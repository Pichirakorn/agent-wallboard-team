// server.js - Phase 2: Main application server with MongoDB + WebSocket
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// DB & WebSocket
const db = require('./config/database');
const socketServer = require('./websocket/socketServer');

// Routes & middleware
const routes = require('./routes');
const { globalErrorHandler, notFoundHandler, performanceMonitor } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ---------- Security & basics ----------
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(performanceMonitor);

// ---------- WebSocket ----------
const io = socketServer.initialize(server); // ใช้ CORS ใน socketServer อยู่แล้ว

// inject io เข้า req เพื่อให้ controller ส่ง event ได้
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ---------- Root ----------
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Agent Wallboard API Phase 2 - Database + WebSocket',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api/docs',
    health: '/api/health',
    endpoints: { agents: '/api/agents', messages: '/api/messages' }
  });
});

// ---------- API ----------
app.use('/api', routes);

// ---------- Errors ----------
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ---------- Start after DB connected ----------
(async () => {
  try {
    await db.connect(); // ใช้ MONGODB_URI จาก .env
    server.listen(PORT, () => {
      console.log('🎯━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 API ready:     http://localhost:${PORT}`);
      console.log(`🔌 WebSocket on:  ws://localhost:${PORT}`);
      console.log('🎯━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();

// ---------- Graceful shutdown ----------
const shutdown = async (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);
  try {
    if (io) io.close();
    await db.disconnect();
    server.close(() => {
      console.log('✅ HTTP server closed. Bye!');
      process.exit(0);
    });
  } catch (e) {
    console.error('❌ Error during shutdown:', e);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, server, io };
