const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const { validate } = require('../../middlewares/validation');
const { z } = require('zod');
const {
  getComplianceRules,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  getComplianceStatus,
  triggerComplianceCheck,
} = require('../controllers/complianceController');

const complianceRuleSchema = z.object({
  orgLevel: z.enum(['mega_region', 'region', 'zone', 'branch']),
  divisionId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  activityCategoryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  requiredCountPerPeriod: z.number().int().min(0).nullable().optional(),
  periodType: z.enum(['monthly', 'bi-monthly', 'quarterly', 'half-year']),
});

router.use(authenticate, applyScope);

// Rules management (super admin / mega region admin)
router.get('/rules', cacheable({ ttl: 60, ns: 'compliance' }), getComplianceRules);
router.post('/rules', authorize('super_admin'), validate(complianceRuleSchema), createComplianceRule);
router.put('/rules/:id', authorize('super_admin'), validate(complianceRuleSchema), updateComplianceRule);
router.delete('/rules/:id', authorize('super_admin'), deleteComplianceRule);

// Compliance status / shortfalls (scope-limited)
router.get('/status', cacheable({ ttl: 60, ns: 'compliance' }), getComplianceStatus);

// Manual trigger (admin only)
router.post('/check', triggerComplianceCheck);

module.exports = router;
