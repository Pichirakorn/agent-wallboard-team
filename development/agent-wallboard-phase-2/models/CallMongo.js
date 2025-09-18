// ============================================================================
// models/CallMongo.js
// เก็บสถิติการโทรต่อสายของ Agent (ใช้คำนวณ totalCalls/avg/satisfaction)
// ============================================================================
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CallSchema = new Schema({
  agentId:          { type: Schema.Types.ObjectId, ref: 'Agent', index: true, required: true },
  startedAt:        { type: Date, required: true, index: true },
  endedAt:          { type: Date, required: true },
  durationSec:      { type: Number, required: true },   // แนะนำให้คำนวณเมื่อ call จบ
  satisfactionScore:{ type: Number, default: null }      // ให้ null ถ้าไม่มีคะแนน
}, { timestamps: true });

CallSchema.index({ agentId: 1, startedAt: 1 });
module.exports = mongoose.model('Call', CallSchema);
