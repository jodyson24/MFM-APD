const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validation');
const { createUserSchema } = require('../../lib/validationSchemas');
const { createUser, getUsers, getUser, updateUser, deactivateUser, resendInvite } = require('../controllers/userController');

// All user routes require authentication
router.use(authenticate);

// Super admin or mega region admin can create users
router.post('/', authorize('super_admin', 'mega_region_admin'), validate(createUserSchema), createUser);

// List users (scope-limited)
router.get('/', getUsers);

// Get single user
router.get('/:id', getUser);

// Update user (limited fields)
router.put('/:id', updateUser);

// Deactivate user (soft delete)
router.patch('/:id/deactivate', deactivateUser);

// Resend invite
router.post('/:id/resend-invite', authorize('super_admin', 'mega_region_admin'), resendInvite);

module.exports = router;