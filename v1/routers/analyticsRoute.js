const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const { getAnalytics, getGrowth } = require('../controllers/analyticsController');

router.use(authenticate, applyScope);

router.get('/', cacheable({ ttl: 120, ns: 'analytics' }), getAnalytics);
router.get('/growth', cacheable({ ttl: 120, ns: 'analytics' }), getGrowth);

module.exports = router;