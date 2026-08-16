const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const { validate } = require('../../middlewares/validation');
const { createUserSchema } = require('../../lib/validationSchemas');
const {
  createUser,
  getUsers,
  getMe,
  getUser,
  updateUser,
  deactivateUser,
  deleteUser,
  resetPassword,
  resendInvite,
} = require('../controllers/userController');

// All user routes require authentication
router.use(authenticate, applyScope);

// Current user profile
router.get('/me', cacheable({ ttl: 30, ns: 'users', userKey: true, scopeKey: false }), getMe);

// Super admin, mega region admin or mega region IT can create users
router.post('/', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), validate(createUserSchema), createUser);

// List users (scope-limited; mega_region_overseer may view read-only)
router.get('/', cacheable({ ttl: 30, ns: 'users' }), getUsers);

// Permanently delete user — super admin only
router.delete('/:id', authorize('super_admin'), deleteUser);

// Get single user
router.get('/:id', cacheable({ ttl: 30, ns: 'users', parts: [req => req.params.id] }), getUser);

// Update user (limited fields) — management roles only
router.put('/:id', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), updateUser);

// Deactivate user (soft delete) — management roles only
router.patch('/:id/deactivate', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), deactivateUser);

// Force password reset (management roles only)
router.post('/:id/reset-password', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), resetPassword);

// Resend invite
router.post('/:id/resend-invite', authorize('super_admin', 'mega_region_admin', 'mega_region_it'), resendInvite);

module.exports = router;
