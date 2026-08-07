const { z } = require('zod');

// User creation (invite)
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'mega_region_admin', 'region_admin', 'zone_admin', 'branch_admin', 'pastor', 'it_official']),
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

// Activity creation
const createActivitySchema = z.object({
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  activityTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  divisions: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  strategicInitiativeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string().datetime(),
  scheduledEndDate: z.string().datetime().optional(),
});

// Activity follow-up (Yes/No) - discriminated union
const activityFollowUpSchema = z.discriminatedUnion('wasHeld', [
  z.object({
    wasHeld: z.literal(true),
    narrativeReport: z.string().min(1),
    metrics: z.object({
      // We'll add per-type validation later; for now, any object
      attendance: z.number().optional(),
      soulsWon: z.number().optional(),
      // ... other fields
    }).passthrough(),
    media: z.array(z.object({
      mediaType: z.enum(['image', 'video']),
      url: z.string().url(),
      caption: z.string().optional(),
    })).min(1, 'At least one media item required when activity was held'),
  }),
  z.object({
    wasHeld: z.literal(false),
    notHeldReason: z.string().min(1, 'Reason is required when activity was not held'),
  }),
]);

module.exports = {
  createUserSchema,
  setPasswordSchema,
  loginSchema,
  createActivitySchema,
  activityFollowUpSchema,
};