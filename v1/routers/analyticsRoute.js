const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { getAnalytics, getGrowth } = require('../controllers/analyticsController');

router.use(authenticate, applyScope);

router.get('/', getAnalytics);
router.get('/growth', getGrowth);

module.exports = router;