const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const response = { message };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};