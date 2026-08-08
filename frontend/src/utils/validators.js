import { z } from 'zod';

// Frontend mirrors of the backend Zod schemas (§14.1 — single source of truth
// is enforced by keeping these field-for-field identical to lib/validationSchemas.js).

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const setPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const createActivitySchema = z.object({
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Select an org unit'),
  activityTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Select an activity type'),
  divisions: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  strategicInitiativeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  scheduledEndDate: z.string().optional(),
});

// Yes/No follow-up (§10) — Yes requires metrics + at least one photo (§10.2)
export const activityFollowUpSchema = z.discriminatedUnion('wasHeld', [
  z.object({
    wasHeld: z.literal(true),
    narrativeReport: z.string().min(1, 'Narrative report is required'),
    metrics: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
    media: z
      .array(
        z.object({
          mediaType: z.enum(['image', 'video']),
          url: z.string().url(),
          caption: z.string().optional(),
        })
      )
      .min(1, 'At least one media item is required')
      .refine((items) => items.some((item) => item.mediaType === 'image'), {
        message: 'Attach at least one photo before submitting',
      }),
  }),
  z.object({
    wasHeld: z.literal(false),
    notHeldReason: z.string().min(1, 'Reason is required when activity was not held'),
  }),
]);

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  role: z.enum([
    'super_admin',
    'mega_region_admin',
    'region_admin',
    'zone_admin',
    'branch_admin',
    'pastor',
    'it_official',
  ]),
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Select an org unit'),
  divisions: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
});
