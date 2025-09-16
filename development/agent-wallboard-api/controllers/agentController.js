// controllers/agentController.js - Business logic ที่แยกจาก routes
const { Agent, agents } = require('../models/Agent');
const { AGENT_STATUS, VALID_STATUS_TRANSITIONS, API_MESSAGES } = require('../utils/constants');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const agentController = {
  // ✅ Example complete function
  // GET /api/agents/:id
  getAgentById: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      console.log(`📋 Retrieved agent: ${agent.agentCode}`);
      return sendSuccess(res, 'Agent retrieved successfully', agent.toJSON());
    } catch (error) {
      console.error('Error in getAgentById:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #1: Completed
  // GET /api/agents
  getAllAgents: (req, res) => {
    try {
      const { status, department } = req.query;
      let agentList = Array.from(agents.values());

      // Filter by status
      if (status) {
        agentList = agentList.filter(agent => agent.status === status);
      }

      // Filter by department
      if (department) {
        agentList = agentList.filter(agent => agent.department === department);
      }

      console.log(`📋 Retrieved ${agentList.length} agents`);
      return sendSuccess(res, 'Agents retrieved successfully',
        agentList.map(agent => agent.toJSON())
      );
    } catch (error) {
      console.error('Error in getAllAgents:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #2: Completed
  // POST /api/agents
  createAgent: (req, res) => {
    try {
      const agentData = req.body;

      // Check duplicate agentCode
      const duplicate = Array.from(agents.values())
        .find(a => a.agentCode === agentData.agentCode);
      if (duplicate) {
        return sendError(res, API_MESSAGES.AGENT_CODE_DUPLICATE, 400);
      }

      // Create new agent
      const newAgent = new Agent(agentData);

      // Save to Map
      agents.set(newAgent.id, newAgent);

      console.log(`✅ Created new agent: ${newAgent.agentCode}`);
      return sendSuccess(res, API_MESSAGES.AGENT_CREATED, newAgent.toJSON(), 201);
    } catch (error) {
      console.error('Error in createAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ Example complete function
  // PUT /api/agents/:id
  updateAgent: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      const { name, email, department, skills } = req.body;
      
      // Update allowed fields
      if (name) agent.name = name;
      if (email) agent.email = email;
      if (department) agent.department = department;
      if (skills) agent.skills = skills;
      
      agent.updatedAt = new Date();
      
      console.log(`✏️ Updated agent: ${agent.agentCode}`);
      return sendSuccess(res, API_MESSAGES.AGENT_UPDATED, agent.toJSON());
    } catch (error) {
      console.error('Error in updateAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #3: Completed
  // PATCH /api/agents/:id/status
  updateAgentStatus: (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      // Find agent
      const agent = agents.get(id);
      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      // Validate status
      if (!Object.values(AGENT_STATUS).includes(status)) {
        return sendError(res, API_MESSAGES.INVALID_STATUS, 400);
      }

      // Validate transition
      const validTransitions = VALID_STATUS_TRANSITIONS[agent.status] || [];
      if (!validTransitions.includes(status)) {
        return sendError(res, API_MESSAGES.INVALID_STATUS_TRANSITION, 400);
      }

      // Update status
      agent.updateStatus(status, reason);

      console.log(`🔄 Updated status for agent: ${agent.agentCode} -> ${status}`);
      return sendSuccess(res, API_MESSAGES.AGENT_STATUS_UPDATED, agent.toJSON());
    } catch (error) {
      console.error('Error in updateAgentStatus:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ Example complete function
  // DELETE /api/agents/:id
  deleteAgent: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      agents.delete(id);
      
      console.log(`🗑️ Deleted agent: ${agent.agentCode} - ${agent.name}`);
      return sendSuccess(res, API_MESSAGES.AGENT_DELETED);
    } catch (error) {
      console.error('Error in deleteAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ Example complete function
  // GET /api/agents/status/summary
  getStatusSummary: (req, res) => {
    try {
      const agentList = Array.from(agents.values());
      const totalAgents = agentList.length;
      
      const statusCounts = {};
      Object.values(AGENT_STATUS).forEach(status => {
        statusCounts[status] = agentList.filter(agent => agent.status === status).length;
      });

      const statusPercentages = {};
      Object.entries(statusCounts).forEach(([status, count]) => {
        statusPercentages[status] = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0;
      });

      const summary = {
        totalAgents,
        statusCounts,
        statusPercentages,
        lastUpdated: new Date().toISOString()
      };

      return sendSuccess(res, 'Status summary retrieved successfully', summary);
    } catch (error) {
      console.error('Error in getStatusSummary:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  }
};

module.exports = agentController;
