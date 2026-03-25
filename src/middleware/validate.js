const Joi = require('joi');

// Validates and whitelists only allowed fields
const withdrawalSchema = Joi.object({
  // userId comes from route param, not body — prevents tampering
  amountInPaisa: Joi.number().integer().min(1).max(10_000_000).required(),
  destination: Joi.string().min(5).max(100).required(),
  idempotencyKey: Joi.string().uuid().required(),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ error: error.details.map((d) => d.message) });
  }
  req.body = value; // Only whitelisted fields
  next();
};

module.exports = { validate, withdrawalSchema };
