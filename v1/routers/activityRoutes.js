const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validation');
const { createActivitySchema, activityFollowUpSchema } = require('../../lib/validationSchemas');
const { createActivity, getActivities, getActivity, updateActivity, submitFollowUp } = require('../controllers/activityController');

router.use(authenticate);

router.post('/', validate(createActivitySchema), createActivity);
router.get('/', getActivities);
router.get('/:id', getActivity);
router.put('/:id', validate(createActivitySchema), updateActivity);
router.post('/:id/follow-up', validate(activityFollowUpSchema), submitFollowUp);

module.exports = router;