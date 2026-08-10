const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
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

router.get('/', getOrgUnits);
router.get('/tree', getOrgUnitTree);
router.get('/:id', getOrgUnit);
router.post('/', validate(createOrgUnitSchema), createOrgUnit);
router.put('/:id', validate(createOrgUnitSchema), updateOrgUnit);
router.delete('/:id', deleteOrgUnit);

module.exports = router;