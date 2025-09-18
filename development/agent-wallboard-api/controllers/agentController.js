// controllers/agentController.js - Business logic ที่แยกจาก routes
const { Agent, agents } = require('../models/Agent');
const { AGENT_STATUS, VALID_STATUS_TRANSITIONS, API_MESSAGES } = require('../utils/constants');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const agentController = {
  // ✅ ตัวอย่างสำเร็จ
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

  // 🔄 TODO #1: ทำเสร็จแล้ว
  // GET /api/agents
  getAllAgents: (req, res) => {
    try {
      const { status, department } = req.query;
      console.log('📖 Getting all agents with filters:', { status, department });

      // 1) ดึงข้อมูลทั้งหมดจาก Map
      let agentList = Array.from(agents.values());

      // 2) กรองตาม query
      if (status) {
        agentList = agentList.filter(a => a.status === status);
      }
      if (department) {
        agentList = agentList.filter(a => a.department === department);
      }

      console.log(`📋 Retrieved ${agentList.length} agents`);

      // 3) ส่งผลลัพธ์
      return sendSuccess(
        res,
        'Agents retrieved successfully',
        agentList.map(a => a.toJSON())
      );
    } catch (error) {
      console.error('Error in getAllAgents:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #2: ทำเสร็จแล้ว
  // POST /api/agents
  createAgent: (req, res) => {
    try {
      const agentData = req.body;
      console.log('📝 Creating new agent:', agentData);

      // 1) เช็ค agentCode ซ้ำ
      const existing = Array.from(agents.values())
        .find(a => a.agentCode === agentData.agentCode);
      if (existing) {
        return sendError(res, `Agent code ${agentData.agentCode} already exists`, 409);
      }

      // 2) สร้าง agent
      const newAgent = new Agent(agentData);

      // 3) เก็บลง Map
      agents.set(newAgent.id, newAgent);

      console.log(`✅ Created agent: ${newAgent.agentCode} - ${newAgent.name}`);

      // 4) ตอบกลับ
      return sendSuccess(res, API_MESSAGES.AGENT_CREATED, newAgent.toJSON(), 201);
    } catch (error) {
      console.error('Error in createAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ ตัวอย่างสำเร็จ
  // PUT /api/agents/:id
  updateAgent: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      const { name, email, department, skills } = req.body;

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

  // 🔄 TODO #3: ทำเสร็จแล้ว (ยึดตาม mapping ของ VALID_STATUS_TRANSITIONS)
  // PATCH /api/agents/:id/status
  updateAgentStatus: (req, res) => {
    try {
      const { id } = req.params;

      // normalize input
      const target = typeof req.body.status === 'string' ? req.body.status.trim() : '';
      const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

      console.log(`🔄 Updating agent status: ${id} -> ${target} (reason: ${reason || '-'})`);

      // 1) หา agent
      const agent = agents.get(id);
      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      // 2) ตรวจว่า status อยู่ใน enum
      if (!Object.values(AGENT_STATUS).includes(target)) {
        return sendError(
          res,
          `Invalid status. Valid statuses: ${Object.values(AGENT_STATUS).join(', ')}`,
          400
        );
      }

      // 3) ตรวจ transition
      const currentStatus = agent.status;
      const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
      console.log(`📌 current=${currentStatus} | allowed=[${validTransitions.join(', ')}]`);

      if (!validTransitions.includes(target)) {
        return sendError(
          res,
          `Cannot change from ${currentStatus} to ${target}. Valid transitions: ${validTransitions.join(', ')}`,
          400
        );
      }

      // 4) อัปเดตสถานะ
      agent.updateStatus(target, reason);
      console.log(`✅ Agent ${agent.agentCode} status updated to ${target}`);

      // 5) ตอบกลับ
      return sendSuccess(res, API_MESSAGES.STATUS_UPDATED, agent.toJSON());
    } catch (error) {
      console.error('Error in updateAgentStatus:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ สำเร็จ
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

  // ✅ Dashboard API
  // GET /api/agents/status/summary
  getStatusSummary: (req, res) => {
    try {
      const agentList = Array.from(agents.values());
      const totalAgents = agentList.length;

      const statusCounts = {};
      Object.values(AGENT_STATUS).forEach(s => {
        statusCounts[s] = agentList.filter(a => a.status === s).length;
      });

      const statusPercentages = {};
      Object.entries(statusCounts).forEach(([s, count]) => {
        statusPercentages[s] = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0;
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
