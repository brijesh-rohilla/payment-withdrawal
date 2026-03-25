const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({ msg: err.message, stack: err.stack, url: req.originalUrl });

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
