// routes/index.js - Updated routes aggregator (Phase 2)
const express = require('express');
const agentRoutes = require('./agents');
const messageRoutes = require('./messages');

const router = express.Router();

// API health check with database + websocket status
router.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  try {
    const io = req.io;
    const connected = io ? io.sockets.sockets.size : 0;

    res.json({
      success: true,
      status: 'OK',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '2.0.0', // Phase 2
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        name: mongoose.connection.name || null
      },
      websocket: {
        status: io ? 'Active' : 'Disabled',
        connectedClients: connected
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, status: 'ERROR', message: e.message });
  }
});

// API documentation
router.get('/docs', (req, res) => {
  res.json({
    title: 'Agent Wallboard API Phase 2 - Database + WebSocket',
    version: '2.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    features: [
      'MongoDB persistence',
      'Real-time WebSocket communication',
      'Message system',
      'Agent status tracking',
      'Dashboard statistics'
    ],
    endpoints: {
      // Health
      'GET /api/health': 'API health check with database & websocket status',

      // Agent endpoints
      'GET /api/agents': 'List all agents (?status=, ?department=, ?isOnline=)',
      'POST /api/agents': 'Create new agent',
      'GET /api/agents/:id': 'Get specific agent',
      'PUT /api/agents/:id': 'Update agent information',
      'PATCH /api/agents/:id/status': 'Update agent status',
      'DELETE /api/agents/:id': 'Delete agent',
      'GET /api/agents/status/summary': 'Agent status summary',
      'GET /api/agents/:id/history': 'Agent status history',

      // Message endpoints
      'POST /api/messages': 'Send message to agent(s)',
      'GET /api/messages': 'Get all messages',
      'GET /api/messages/:agentCode': 'Get messages for specific agent',
      'PATCH /api/messages/:id/read': 'Mark message as read'
    },
    websocketEvents: {
      client: ['agent-login', 'agent-logout', 'join-dashboard'],
      server: [
        'agentStatusChanged',
        'newMessage',
        'agentCreated',
        'agentUpdated',
        'agentDeleted',
        'agent-online',
        'agent-offline',
        'dashboardUpdate'
      ]
    }
  });
});

// Mount routes
router.use('/agents', agentRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
