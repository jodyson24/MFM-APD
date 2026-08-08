const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { exportPresentation } = require('../controllers/exportController');

router.use(authenticate, applyScope);

// Phase 5 — presentation JSON contract
router.get('/presentation/:cycleId', authorize('super_admin', 'mega_region_admin'), exportPresentation);

module.exports = router;
