const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { getAnalytics, getGrowth } = require('../controllers/analyticsController');

router.use(authenticate);

router.get('/', getAnalytics);
router.get('/growth', getGrowth);

module.exports = router;