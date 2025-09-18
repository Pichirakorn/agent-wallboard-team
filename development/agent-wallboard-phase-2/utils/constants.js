// utils/constants.js

// ค่าที่ตรงกับ schema ของ AgentMongo.js
const AGENT_STATUS = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  WRAP: 'Wrap',
  BREAK: 'Break',
  NOT_READY: 'Not Ready',
  OFFLINE: 'Offline',
};

// list ไว้ใช้กับ Joi
const AGENT_STATUS_LIST = Object.values(AGENT_STATUS);

// แผนกที่อนุญาต (ตรงกับ schema)
const DEPARTMENTS = ['Sales', 'Support', 'Technical', 'General', 'Supervisor'];

// การเปลี่ยนสถานะที่อนุญาต (ปรับตามกติกาคุณได้)
const VALID_STATUS_TRANSITIONS = {
  [AGENT_STATUS.AVAILABLE]:   ['Available','Busy','Wrap','Break','Not Ready','Offline'],
  [AGENT_STATUS.BUSY]:        ['Busy','Wrap','Break','Available','Not Ready','Offline'],
  [AGENT_STATUS.WRAP]:        ['Wrap','Available','Busy','Break','Not Ready','Offline'],
  [AGENT_STATUS.BREAK]:       ['Break','Available','Busy','Not Ready','Offline'],
  [AGENT_STATUS.NOT_READY]:   ['Not Ready','Available','Busy','Break','Offline'],
  [AGENT_STATUS.OFFLINE]:     ['Offline','Available'],
};

const API_MESSAGES = {
  INTERNAL_ERROR: 'Internal server error',
  AGENT_NOT_FOUND: 'Agent not found',
  AGENT_CREATED: 'Agent created successfully',
  AGENT_UPDATED: 'Agent updated successfully',
  AGENT_DELETED: 'Agent deleted successfully',
  STATUS_UPDATED: 'Agent status updated successfully',
};

module.exports = {
  AGENT_STATUS,
  AGENT_STATUS_LIST,
  DEPARTMENTS,
  VALID_STATUS_TRANSITIONS,
  API_MESSAGES,
};
