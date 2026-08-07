const { z } = require('zod');

// Validation middleware factory
exports.validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};