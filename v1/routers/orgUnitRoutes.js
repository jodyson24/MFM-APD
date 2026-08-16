const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const { validate } = require('../../middlewares/validation');
const { createOrgUnitSchema } = require('../../lib/validationSchemas');
const {
  getOrgUnits,
  getOrgUnit,
  getOrgUnitTree,
  createOrgUnit,
  updateOrgUnit,
  deleteOrgUnit,
} = require('../controllers/orgUnitController');

router.use(authenticate, applyScope);

router.get('/', cacheable({ ttl: 300, ns: 'orgunits' }), getOrgUnits);
router.get('/tree', cacheable({ ttl: 300, ns: 'orgunits', scopeKey: false }), getOrgUnitTree);
router.get('/:id', cacheable({ ttl: 300, ns: 'orgunits', parts: [req => req.params.id] }), getOrgUnit);
router.post('/', validate(createOrgUnitSchema), createOrgUnit);
router.put('/:id', validate(createOrgUnitSchema), updateOrgUnit);
router.delete('/:id', deleteOrgUnit);

module.exports = router;