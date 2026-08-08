const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { getOrgUnits, getOrgUnitTree } = require('../controllers/orgUnitController');

router.use(authenticate, applyScope);

router.get('/', getOrgUnits);
router.get('/tree', getOrgUnitTree);

module.exports = router;