# Agent Wallboard API (Phase 2)

REST API + WebSocket สำหรับระบบติดตามและวิเคราะห์ Agent แบบเรียลไทม์  
รองรับ **Agent Management**, **Performance Metrics**, และ **Dashboard Analytics**

---

## 🚀 Features
- จัดเก็บข้อมูล Agent ใน MongoDB (Mongoose)
- REST API สำหรับ CRUD agent และ performance metrics
- WebSocket (socket.io) สำหรับการอัปเดตสถานะแบบเรียลไทม์
- Real-time Dashboard Analytics (broadcast ทุก 5 วินาที)
- รองรับการกรอง agent ตาม status, department, online/offline
- # ถ้าใช้ MongoDB Atlas ให้ใส่ Connection String ของแต่ละคน
- MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/agentdb?retryWrites=true&w=majority&appName=Cluster0

---

