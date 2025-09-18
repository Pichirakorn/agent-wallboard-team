// routes/agents.js - Updated routes สำหรับ MongoDB
const express = require('express');
const agentController = require('../controllers/agentControllerMongo');
const {
  validateCreateAgent,
  validateUpdateAgent,
  validateUpdateStatus,
} = require('../middleware/validation');

const router = express.Router();

// GET /api/agents - List all agents
router.get('/', agentController.getAllAgents);

// GET /api/agents/status/summary - ต้องมาก่อน /:id route
router.get('/status/summary', agentController.getStatusSummary);

// ✅ GET /api/agents/:id/performance - Agent performance metrics
router.get('/:id/performance', agentController.getAgentPerformance);

// GET /api/agents/:id - Get specific agent
router.get('/:id', agentController.getAgentById);

// GET /api/agents/:id/history - Get agent status history
router.get('/:id/history', agentController.getAgentStatusHistory);

// POST /api/agents - Create new agent (with validation)
router.post('/', validateCreateAgent, agentController.createAgent);

// PUT /api/agents/:id - Update agent (with validation)
router.put('/:id', validateUpdateAgent, agentController.updateAgent);

// PATCH /api/agents/:id/status - Update status (with validation)
router.patch('/:id/status', validateUpdateStatus, agentController.updateAgentStatus);

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', agentController.deleteAgent);

module.exports = router;
