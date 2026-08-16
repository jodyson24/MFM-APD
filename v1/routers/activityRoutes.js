const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const { validate, validateDynamicFollowUp } = require('../../middlewares/validation');
const { createActivitySchema, cancelActivitySchema } = require('../../lib/validationSchemas');
const { createActivity, getActivities, getActivity, updateActivity, cancelActivity, submitFollowUp } = require('../controllers/activityController');

router.use(authenticate, applyScope);

router.post('/', validate(createActivitySchema), createActivity);
router.get('/', cacheable({ ttl: 30, ns: 'activities' }), getActivities);
router.get('/:id', cacheable({ ttl: 30, ns: 'activities', parts: [req => req.params.id] }), getActivity);
router.put('/:id', validate(createActivitySchema), updateActivity);
router.post('/:id/cancel', validate(cancelActivitySchema), cancelActivity);
router.post('/:id/follow-up', validateDynamicFollowUp(), submitFollowUp);

module.exports = router;