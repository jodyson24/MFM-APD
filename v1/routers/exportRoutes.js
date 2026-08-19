const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { exportPresentation, exportCSV, exportPDF } = require('../controllers/exportController');

router.use(authenticate, applyScope);

router.get('/presentation/:cycleId', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), exportPresentation);
router.get('/csv/:cycleId', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), exportCSV);
router.get('/pdf/:cycleId', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), exportPDF);

module.exports = router;
