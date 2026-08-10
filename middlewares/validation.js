const { z } = require('zod');

// Validation middleware factory
exports.validate = (schema) => {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
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

// Async validation for activity follow-ups. The report.metrics schema is built
// dynamically from the ActivityType's extraFields (§9), so we resolve the
// activity -> activityType first, then validate against the (cached) schema.
exports.validateDynamicFollowUp = () => {
  return async (req, res, next) => {
    try {
      const Activity = require('../models/Activity');
      const { getFollowUpSchema } = require('../lib/validationSchemas');

      const activity = await Activity.findById(req.params.id).select('activityTypeId').lean();
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      const schema = await getFollowUpSchema(activity.activityTypeId);
      req.parsedFollowUp = schema.parse(req.body);
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