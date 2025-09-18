// controllers/agentControllerMongo.js - MongoDB-based controllers
const mongoose = require('mongoose');
const AgentMongo = require('../models/AgentMongo');
const CallMongo = require('../models/CallMongo'); // ⬅️ เพิ่มสำหรับคำนวณ performance
const { AGENT_STATUS, VALID_STATUS_TRANSITIONS, API_MESSAGES } = require('../utils/constants');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/** ===== Helpers: ใช้คำนวณช่วงเวลาทับซ้อน & BREAK seconds ===== */
function overlappedMs(aStart, aEnd, bStart, bEnd) {
    const start = Math.max(aStart.getTime(), bStart.getTime());
    const end = Math.min(aEnd.getTime(), bEnd.getTime());
    return Math.max(0, end - start);
}
function computeBreakSeconds(agent, start, end) {
    const hist = [...(agent.statusHistory || [])].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // หา status ณ เวลา start
    let curStatus;
    let prevTime = start;

    for (let i = hist.length - 1; i >= 0; i--) {
        if (new Date(hist[i].timestamp) <= start) {
            curStatus = hist[i].to;
            break;
        }
    }
    if (!curStatus) curStatus = agent.status || 'Available';

    let breakMs = 0;

    for (const ev of hist) {
        const evTime = new Date(ev.timestamp);
        if (evTime <= start) continue;
        if (evTime >= end) break;

        if (curStatus === 'Break') {
            breakMs += overlappedMs(prevTime, evTime, start, end);
        }
        curStatus = ev.to;
        prevTime = evTime;
    }

    if (curStatus === 'Break') {
        breakMs += overlappedMs(prevTime, end, start, end);
    }

    return Math.floor(breakMs / 1000); // seconds
}

const agentControllerMongo = {
    // GET /api/agents
    getAllAgents: async (req, res) => {
        try {
            const { status, department, isOnline } = req.query;
            console.log('📖 Getting all agents with filters:', { status, department, isOnline });

            const filter = {};
            if (status) filter.status = status;
            if (department) filter.department = department;
            if (isOnline !== undefined) filter.isOnline = isOnline === 'true';

            const agents = await AgentMongo.find(filter)
                .select('-statusHistory')
                .sort({ agentCode: 1 });

            console.log(`📋 Retrieved ${agents.length} agents from MongoDB`);
            return sendSuccess(res, 'Agents retrieved successfully', agents);
        } catch (error) {
            console.error('Error in getAllAgents:', error);
            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // GET /api/agents/:id
    getAgentById: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`📖 Getting agent by ID: ${id}`);

            const agent = await AgentMongo.findById(id);
            if (!agent) {
                return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
            }

            console.log(`✅ Retrieved agent: ${agent.agentCode}`);
            return sendSuccess(res, 'Agent retrieved successfully', agent);
        } catch (error) {
            console.error('Error in getAgentById:', error);
            if (error.name === 'CastError') {
                return sendError(res, 'Invalid agent ID format', 400);
            }
            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // POST /api/agents
    createAgent: async (req, res) => {
        try {
            const agentData = req.body;
            console.log('📝 Creating new agent:', agentData);

            const existingAgent = await AgentMongo.findOne({ agentCode: agentData.agentCode });
            if (existingAgent) {
                return sendError(res, `Agent code ${agentData.agentCode} already exists`, 409);
            }

            const newAgent = new AgentMongo(agentData);
            await newAgent.save();

            console.log(`✅ Created agent: ${newAgent.agentCode} - ${newAgent.name}`);

            if (req.io) {
                req.io.emit('agentCreated', { agent: newAgent, timestamp: new Date() });
            }

            return sendSuccess(res, API_MESSAGES.AGENT_CREATED, newAgent, 201);
        } catch (error) {
            console.error('Error in createAgent:', error);

            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                return sendError(res, `${field} already exists`, 409);
            }
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => ({
                    field: err.path,
                    message: err.message
                }));
                return sendError(res, 'Validation failed', 400, validationErrors);
            }
            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // PUT /api/agents/:id
    updateAgent: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            console.log(`✏️ Updating agent ID: ${id}`, updateData);

            delete updateData.agentCode;
            delete updateData.statusHistory;
            delete updateData.createdAt;

            const agent = await AgentMongo.findByIdAndUpdate(
                id,
                { ...updateData, updatedAt: new Date() },
                { new: true, runValidators: true }
            );

            if (!agent) {
                return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
            }

            console.log(`✅ Updated agent: ${agent.agentCode}`);

            if (req.io) {
                req.io.emit('agentUpdated', { agent, timestamp: new Date() });
            }

            return sendSuccess(res, API_MESSAGES.AGENT_UPDATED, agent);
        } catch (error) {
            console.error('Error in updateAgent:', error);

            if (error.name === 'CastError') {
                return sendError(res, 'Invalid agent ID format', 400);
            }
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => ({
                    field: err.path,
                    message: err.message
                }));
                return sendError(res, 'Validation failed', 400, validationErrors);
            }

            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // PATCH /api/agents/:id/status
    updateAgentStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            console.log(`🔄 Updating agent status: ${id} -> ${status}`);

            const agent = await AgentMongo.findById(id);
            if (!agent) return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);

            const ALLOWED = Object.values(AGENT_STATUS);
            if (!ALLOWED.includes(status)) {
                return sendError(
                    res,
                    `Invalid status. Valid statuses: ${ALLOWED.join(', ')}`,
                    400
                );
            }

            const currentStatus = agent.status;

            if (currentStatus === status) {
                return sendSuccess(res, 'Status unchanged (no update needed)', agent);
            }

            const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
            if (!validTransitions.includes(status)) {
                return sendError(
                    res,
                    `Cannot change from "${currentStatus}" to "${status}". Valid transitions: ${validTransitions.join(', ') || '(none)'} `,
                    400
                );
            }

            const updated = await agent.updateStatus(status, reason || null);
            console.log(`✅ Agent ${agent.agentCode} status: ${currentStatus} -> ${status}`);

            if (req.io) {
                req.io.emit('agentStatusChanged', {
                    agentId: updated._id,
                    agentCode: updated.agentCode,
                    previousStatus: currentStatus,
                    newStatus: status,
                    reason: reason || null,
                    timestamp: new Date(),
                    agent: {
                        id: updated._id,
                        agentCode: updated.agentCode,
                        name: updated.name,
                        status: updated.status,
                    },
                });
            }

            return sendSuccess(res, API_MESSAGES.STATUS_UPDATED, updated);
        } catch (error) {
            console.error('Update status error:', error);
            return sendError(res, error.message || 'Status validation failed', 400, error?.errors);
        }
    },

    // DELETE /api/agents/:id
    deleteAgent: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`🗑️ Deleting agent ID: ${id}`);

            const agent = await AgentMongo.findByIdAndDelete(id);
            if (!agent) {
                return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
            }

            console.log(`✅ Deleted agent: ${agent.agentCode} - ${agent.name}`);

            if (req.io) {
                req.io.emit('agentDeleted', {
                    agentId: agent._id,
                    agentCode: agent.agentCode,
                    timestamp: new Date()
                });
            }

            return sendSuccess(res, API_MESSAGES.AGENT_DELETED);
        } catch (error) {
            console.error('Error in deleteAgent:', error);
            if (error.name === 'CastError') {
                return sendError(res, 'Invalid agent ID format', 400);
            }
            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // GET /api/agents/status/summary
    getStatusSummary: async (req, res) => {
        try {
            console.log('📊 Getting status summary from MongoDB');

            const totalAgents = await AgentMongo.countDocuments({ isActive: true });

            const statusCounts = await AgentMongo.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            const statusCountsObj = {};
            Object.values(AGENT_STATUS).forEach(status => {
                statusCountsObj[status] = 0;
            });
            statusCounts.forEach(item => {
                statusCountsObj[item._id] = item.count;
            });

            const statusPercentages = {};
            Object.entries(statusCountsObj).forEach(([status, count]) => {
                statusPercentages[status] = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0;
            });

            const onlineAgents = await AgentMongo.countDocuments({
                isActive: true,
                isOnline: true
            });

            const summary = {
                totalAgents,
                onlineAgents,
                offlineAgents: totalAgents - onlineAgents,
                statusCounts: statusCountsObj,
                statusPercentages,
                lastUpdated: new Date().toISOString()
            };

            return sendSuccess(res, 'Status summary retrieved successfully', summary);
        } catch (error) {
            console.error('Error in getStatusSummary:', error);
            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // GET /api/agents/:id/history
    getAgentStatusHistory: async (req, res) => {
        try {
            const { id } = req.params;
            const { limit = 50, page = 1 } = req.query;

            console.log(`📊 Getting status history for agent: ${id}`);

            const agent = await AgentMongo.findById(id)
                .select('agentCode name statusHistory');

            if (!agent) {
                return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
            }

            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);

            const sortedHistory = agent.statusHistory
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(startIndex, endIndex);

            const response = {
                agent: {
                    id: agent._id,
                    agentCode: agent.agentCode,
                    name: agent.name
                },
                history: sortedHistory,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: agent.statusHistory.length,
                    hasMore: endIndex < agent.statusHistory.length
                }
            };

            return sendSuccess(res, 'Status history retrieved successfully', response);
        } catch (error) {
            console.error('Error in getAgentStatusHistory:', error);
            if (error.name === 'CastError') {
                return sendError(res, 'Invalid agent ID format', 400);
            }
            return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
        }
    },

    // ✅ GET /api/agents/:id/performance
    getAgentPerformance: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) return sendError(res, 'Invalid agent id', 400);

            const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
            const start = req.query.startDate
                ? new Date(req.query.startDate)
                : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
                return sendError(res, 'Invalid date range', 400);
            }

            const agent = await AgentMongo.findById(id).lean();
            if (!agent) return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);

            // Calls ที่ "ทับช่วงเวลา" หน้าต่าง start..end
            const callsAgg = await CallMongo.aggregate([
                {
                    $match: {
                        agentId: new mongoose.Types.ObjectId(id),
                        startedAt: { $lt: end },
                        endedAt: { $gt: start }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCalls: { $sum: 1 },
                        avgCallDuration: { $avg: '$durationSec' },
                        satisfactionScore: { $avg: '$satisfactionScore' } // null จะถูกละเว้น
                    }
                }
            ]);

            const calls = callsAgg[0] || { totalCalls: 0, avgCallDuration: 0, satisfactionScore: null };
            const totalBreakTime = computeBreakSeconds(agent, start, end);

            const metrics = {
                totalCalls: calls.totalCalls || 0,
                avgCallDuration: calls.avgCallDuration ? Math.round(calls.avgCallDuration) : 0, // seconds
                satisfactionScore: calls.satisfactionScore ?? 0,
                totalBreakTime // seconds
            };

            return sendSuccess(res, 'Performance data', {
                agentId: id,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                ...metrics
            });
        } catch (error) {
            console.error('getAgentPerformance error:', error);
            return sendError(res, 'Failed to get performance data', 500);
        }
    }
};

module.exports = agentControllerMongo;
