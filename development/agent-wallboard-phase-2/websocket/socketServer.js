// websocket/socketServer.js - WebSocket server management (socket.io v4+)
const { Server } = require('socket.io');
const AgentMongo = require('../models/AgentMongo');

class SocketServer {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // Map: socketId -> clientInfo
    this.dashboardInterval = null; // interval handler
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    console.log('🌐 WebSocket server initialized');
    return this.io;
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 Client connected: ${socket.id}`);

      // Agent login
      socket.on('agent-login', async (data) => {
        try {
          const { agentCode, agentName } = data || {};
          if (!agentCode) {
            socket.emit('login-error', { message: 'agentCode is required' });
            return;
          }
          console.log(`🔐 Agent login: ${agentCode}`);

          const agent = await AgentMongo.findOneAndUpdate(
            { agentCode },
            { isOnline: true, socketId: socket.id, loginTime: new Date() },
            { new: true }
          );

          if (agent) {
            this.connectedClients.set(socket.id, {
              agentCode,
              agentName,
              agentId: agent._id,
              loginTime: new Date(),
            });

            socket.join(`agent-${agentCode}`);

            socket.broadcast.emit('agent-online', {
              agentCode,
              agentName,
              timestamp: new Date(),
            });

            socket.emit('login-success', {
              agent,
              message: 'Successfully connected to Agent Wallboard System',
            });

            console.log(`✅ Agent ${agentCode} logged in successfully`);
            this.sendDashboardUpdate();
          } else {
            socket.emit('login-error', { message: `Agent ${agentCode} not found` });
          }
        } catch (error) {
          console.error('❌ Agent login error:', error);
          socket.emit('login-error', { message: 'Login failed' });
        }
      });

      // Agent logout
      socket.on('agent-logout', async () => {
        try {
          const clientInfo = this.connectedClients.get(socket.id);
          if (clientInfo) await this.handleAgentDisconnect(socket.id);
        } catch (error) {
          console.error('❌ Agent logout error:', error);
        }
      });

      // Join dashboard room
      socket.on('join-dashboard', () => {
        socket.join('dashboard');
        console.log(`📊 Client joined dashboard room: ${socket.id}`);
        this.sendDashboardUpdate();
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`👤 Client disconnected: ${socket.id}`);
        await this.handleAgentDisconnect(socket.id);
      });

      // Ping-pong
      socket.on('ping', () => socket.emit('pong'));
    });

    // 🔥 Start pushing dashboard updates every 5s
    this.startDashboardUpdates();
  }

  async handleAgentDisconnect(socketId) {
    try {
      const clientInfo = this.connectedClients.get(socketId);
      if (clientInfo) {
        const { agentCode, agentName } = clientInfo;

        await AgentMongo.findOneAndUpdate(
          { agentCode },
          { isOnline: false, socketId: null, status: 'Offline' }
        );

        this.connectedClients.delete(socketId);

        this.io.emit('agent-offline', {
          agentCode,
          agentName,
          timestamp: new Date(),
        });

        console.log(`🔌 Agent ${agentCode} disconnected and marked offline`);
        this.sendDashboardUpdate();
      }
    } catch (error) {
      console.error('❌ Error handling agent disconnect:', error);
    }
  }

  // ───────────────────────────────
  // Challenge 3: Real-time Dashboard
  // ───────────────────────────────
  startDashboardUpdates() {
    if (this.dashboardInterval) clearInterval(this.dashboardInterval);

    // ยิงครั้งแรกทันที
    this.sendDashboardUpdate();

    // ตั้ง interval ทุก 5 วินาที
    this.dashboardInterval = setInterval(async () => {
      await this.sendDashboardUpdate();
    }, 5000);
  }

  async sendDashboardUpdate() {
    try {
      const stats = await AgentMongo.aggregate([
        {
          $group: {
            _id: null,
            totalAgents: { $sum: 1 },
            onlineAgents: {
              $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] }
            },
            avgResponseTime: { $avg: '$avgResponseTime' }, // optional field
          }
        }
      ]);

      const statusBreakdown = await AgentMongo.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } }
      ]);

      const payload = {
        ...(stats[0] || { totalAgents: 0, onlineAgents: 0, avgResponseTime: null }),
        statusBreakdown,
        timestamp: new Date(),
      };

      this.io.to('dashboard').emit('dashboard-update', payload);
      console.log('📊 Dashboard update sent:', payload);
    } catch (error) {
      console.error('❌ Error sending dashboard update:', error);
    }
  }

  // For /api/health
  getStatus() {
    const active = !!this.io;
    const connected = active ? this.io.of('/').sockets.size : 0;
    return {
      status: active ? 'Active' : 'Inactive',
      connectedClients: connected,
    };
  }
}

module.exports = new SocketServer();
