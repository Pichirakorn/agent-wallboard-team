const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// ส่งข้อความ
router.post('/', messageController.sendMessage);

// ข้อความของเอเจนต์ (รวม broadcast)
router.get('/:agentCode', messageController.getMessagesForAgent);

// อ่านแล้ว (ทีละข้อความ)
router.patch('/:id/read', messageController.markMessageAsRead);

// ✅ อ่านทั้งหมดของเอเจนต์
router.patch('/:agentCode/read-all', messageController.markAllAsRead);

// สำหรับ supervisor: ดูทั้งหมด
router.get('/', messageController.getAllMessages);

module.exports = router;
