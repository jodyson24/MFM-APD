const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { validate } = require('../../middlewares/validation');
const { z } = require('zod');
const {
  getCycles,
  getNextCycle,
  getCurrentCycle,
  createCycle,
  updateCycle,
  deleteCycle,
} = require('../controllers/presentationCycleController');

const cycleSchema = z.object({
  label: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  presentationDate: z.string().datetime(),
});

router.use(authenticate, applyScope);

router.get('/', getCycles);
router.get('/next', getNextCycle);
router.get('/current', getCurrentCycle);
router.post('/', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), validate(cycleSchema), createCycle);

router.put('/:id', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), validate(cycleSchema), updateCycle);

router.delete('/:id', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), deleteCycle);
module.exports = router;
