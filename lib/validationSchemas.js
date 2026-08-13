const { z } = require('zod');

// User creation (invite)
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum([
    'super_admin',
    'mega_region_admin',
    'mega_region_it',
    'mega_region_overseer',
    'region_admin',
    'region_overseer',
    'zone_admin',
    'zonal_pastor',
    'branch_admin',
    'branch_pastor',
    'pastor',
    'it_official',
  ]),
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  divisions: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
});

// Set password (invite accept)
const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10)
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol'),
  confirmPassword: z.string().min(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Org unit creation / update (regions, zones, branches, mega regions)
// Parent-type hierarchy (region under mega region, zone under region, branch under zone)
// is validated at the controller (it needs DB lookups).
const createOrgUnitSchema = z.object({
  type: z.enum(['mega_region', 'region', 'zone', 'branch']),
  name: z.string().min(1, 'Name is required'),
  location: z.string().optional(),
  parentId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  isHeadquarters: z.boolean().optional(),
});

// Activity creation / update
const mediaItemSchema = z.object({
  mediaType: z.enum(['image', 'video']),
  url: z.string().url(),
  caption: z.string().optional(),
});

const createActivitySchema = z.object({
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  activityTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  divisions: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  strategicInitiativeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string().datetime(),
  scheduledEndDate: z.string().datetime().optional(),
  actualDate: z.string().datetime().nullable().optional(),
  media: z.array(mediaItemSchema).optional(),
});

// Cancel a scheduled activity (Phase 1 — schedule/edit/cancel)
const cancelActivitySchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

// ============================================================
// §4 / §9 Dynamic validation for report.metrics
// ------------------------------------------------------------
// The follow-up report schema is NOT static: report.metrics = the
// §4 baseline schema MERGED with the ActivityType's extraFields,
// rebuilt (and cached) per activityTypeId. See ACTIVITY_MODEL.md §9.
// ============================================================

const baselineMetricsSchema = z.object({
  attendanceBreakdown: z.object({
    adults: z.number().optional(),
    children: z.number().optional(),
    teenagers: z.number().optional(),
    youth: z.number().optional(),
    total: z.number().optional(),
  }).optional(),
  soulsWon: z.number().optional(),
  decisionsForChrist: z.number().optional(),
  followUpsConducted: z.number().optional(),
  tractsLiteratureDistributed: z.number().optional(),
  prayerRequestsOrTestimonies: z.number().optional(),
  budgetOrResources: z.object({
    amount: z.number().optional(),
    currency: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

// Generate a Zod field from an ActivityType.extraFields descriptor.
function fieldFromDescriptor(field) {
  const { dataType, enumOptions = [] } = field || {};
  let zod;
  switch (dataType) {
    case 'string':
      zod = z.string();
      break;
    case 'number':
      zod = z.number();
      break;
    case 'enum':
      zod = enumOptions.length > 0 ? z.enum(enumOptions) : z.string();
      break;
    case 'array':
      zod = z.array(z.union([z.string(), z.number()]));
      break;
    case 'object':
      zod = z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]));
      break;
    default:
      zod = z.unknown();
  }
  return field.required ? zod : zod.optional();
}

// Baseline (§4) merged with the type's extraFields (§5) into one metrics object.
function buildMetricsSchema(extraFields = []) {
  const shape = baselineMetricsSchema.shape;
  for (const field of extraFields) {
    if (field.key in shape) continue; // baseline wins on collision
    shape[field.key] = fieldFromDescriptor(field);
  }
  return z.object(shape);
}

// Full follow-up schema as a Yes/No discriminated union.
// Yes branch requires narrative + merged metrics + ≥1 image (photo policy §10.2).
// No branch requires only notHeldReason.
function buildFollowUpSchema(activityType) {
  const extraFields = (activityType && activityType.extraFields) || [];
  return z.discriminatedUnion('wasHeld', [
    z.object({
      wasHeld: z.literal(true),
      narrativeReport: z.string().min(1, 'Narrative report is required'),
      metrics: buildMetricsSchema(extraFields),
      media: z.array(mediaItemSchema)
        .min(1, 'At least one media item is required')
        .refine(
          (items) => items.some((item) => item.mediaType === 'image'),
          { message: 'At least one photo (image) is required as pictorial evidence' }
        ),
    }),
    z.object({
      wasHeld: z.literal(false),
      notHeldReason: z.string().min(1, 'Reason is required when activity was not held'),
      // Optional reschedule: auto-creates a linked new Activity (§10 Step 5)
      rescheduledDate: z.string().datetime().optional(),
    }),
  ]);
}

// Cache of dynamic follow-up schemas, keyed by activityTypeId (as string).
// Invalidated whenever an ActivityType is edited — call invalidateFollowUpSchemaCache().
const followUpSchemaCache = new Map();

async function getFollowUpSchema(activityTypeId) {
  const key = activityTypeId.toString();
  if (followUpSchemaCache.has(key)) {
    return followUpSchemaCache.get(key);
  }
  const ActivityType = require('../models/ActivityType');
  const activityType = await ActivityType.findById(activityTypeId).lean();
  if (!activityType) {
    const error = new Error('ActivityType not found');
    error.status = 404;
    throw error;
  }
  const schema = buildFollowUpSchema(activityType);
  followUpSchemaCache.set(key, schema);
  return schema;
}

function invalidateFollowUpSchemaCache(activityTypeId) {
  if (!activityTypeId) {
    followUpSchemaCache.clear();
    return;
  }
  followUpSchemaCache.delete(activityTypeId.toString());
}

module.exports = {
  createUserSchema,
  setPasswordSchema,
  loginSchema,
  createActivitySchema,
  cancelActivitySchema,
  createOrgUnitSchema,
  mediaItemSchema,
  buildFollowUpSchema,
  getFollowUpSchema,
  invalidateFollowUpSchemaCache,
};