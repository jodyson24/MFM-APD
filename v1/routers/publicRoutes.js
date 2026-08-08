const express = require('express');
const router = express.Router();
const { getPublicDashboard, getPublicTree } = require('../controllers/publicController');

// Public, read-only, unauthenticated — dates & programme names only, no internal data.
router.get('/dashboard', getPublicDashboard);
router.get('/tree', getPublicTree);

module.exports = router;
