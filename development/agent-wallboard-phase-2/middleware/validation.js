// middleware/validation.js
const Joi = require('joi');
const {
  AGENT_STATUS,
  AGENT_STATUS_LIST,
  DEPARTMENTS,
} = require('../utils/constants');

const createAgentSchema = Joi.object({
  agentCode: Joi.string().pattern(/^[A-Z]\d{3}$/).required()
    .messages({
      'string.pattern.base': 'agentCode must be like A001',
      'any.required': 'agentCode is required',
    }),
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  department: Joi.string().valid(...DEPARTMENTS).default('General'),
  skills: Joi.array().items(Joi.string().min(2).max(50)).default([]),
  status: Joi.string().valid(...AGENT_STATUS_LIST).default(AGENT_STATUS.AVAILABLE),
});

const updateAgentSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  department: Joi.string().valid(...DEPARTMENTS),
  skills: Joi.array().items(Joi.string().min(2).max(50)),
  status: Joi.string().valid(...AGENT_STATUS_LIST),
}).min(1); // ต้องมีอย่างน้อย 1 ฟิลด์

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...AGENT_STATUS_LIST).required(),
  reason: Joi.string().allow('', null).default(null),
});

function respondValidationError(res, error) {
  const details = (error.details || []).map(d => ({
    field: d.path.join('.'),
    message: d.message,
  }));
  return res.status(400).json({ success: false, message: 'Validation failed', details });
}

exports.validateCreateAgent = (req, res, next) => {
  const { error, value } = createAgentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return respondValidationError(res, error);
  req.body = value;
  next();
};

exports.validateUpdateAgent = (req, res, next) => {
  const { error, value } = updateAgentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return respondValidationError(res, error);
  req.body = value;
  next();
};

exports.validateUpdateStatus = (req, res, next) => {
  const { error, value } = updateStatusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return respondValidationError(res, error);
  req.body = value;
  next();
};
