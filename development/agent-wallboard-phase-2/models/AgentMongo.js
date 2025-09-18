// ============================================================================
// models/AgentMongo.js
// MongoDB schema สำหรับ Agent + ฝัง performance (optional cache)
// ============================================================================
const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  from: { type: String, required: true },
  to:   { type: String, required: true },
  reason:    { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
});

// ✅ Performance (ตามสเปคในโจทย์) — เก็บค่า cache ได้ถ้าต้องการ
const performanceSchema = new mongoose.Schema({
  totalCalls:        { type: Number, default: 0 },
  avgCallDuration:   { type: Number, default: 0 }, // seconds
  satisfactionScore: { type: Number, default: 0 }, // avg
  totalBreakTime:    { type: Number, default: 0 }  // seconds
}, { _id: false });

const agentMongoSchema = new mongoose.Schema({
  agentCode: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z]\d{3}$/
  },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  department: {
    type: String,
    default: 'General',
    enum: ['Sales', 'Support', 'Technical', 'General', 'Supervisor']
  },
  skills: [{
    type: String,
    minlength: 2,
    maxlength: 50
  }],
  status: {
    type: String,
    default: 'Available',
    enum: ['Available', 'Busy', 'Wrap', 'Break', 'Not Ready', 'Offline']
  },
  isActive: { type: Boolean, default: true },

  loginTime:         { type: Date, default: null },
  lastStatusChange:  { type: Date, default: Date.now },
  statusHistory:     [statusHistorySchema],

  // WebSocket session tracking
  socketId: { type: String, default: null },
  isOnline: { type: Boolean, default: false },

  // ✅ optional cache (อัปเดตเป็นครั้งคราว)
  performance: { type: performanceSchema, default: () => ({}) },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt before saving
agentMongoSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Instance method สำหรับ update status
agentMongoSchema.methods.updateStatus = function (newStatus, reason = null) {
  this.statusHistory.push({
    from: this.status,
    to: newStatus,
    reason,
    timestamp: new Date()
  });

  this.status = newStatus;
  this.lastStatusChange = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// Static method สำหรับ migration
agentMongoSchema.statics.migrateFromMemory = async function (memoryAgents) {
  try {
    await this.deleteMany({});
    const agentsArray = Array.from(memoryAgents.values());
    const migrated = await this.insertMany(agentsArray);
    console.log(`✅ Migrated ${migrated.length} agents to MongoDB`);
    return migrated;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

const AgentMongo = mongoose.model('Agent', agentMongoSchema);
module.exports = AgentMongo;
