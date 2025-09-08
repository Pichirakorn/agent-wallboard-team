// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sendSuccess } = require('./utils/apiResponse');
const { API_MESSAGES } = require('./utils/constants');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(helmet());
app.use(morgan('dev'));

// Test route
app.get('/', (req, res) => {
  return sendSuccess(res, API_MESSAGES.STATUS_UPDATED, { status: 'API is running 🚀' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
