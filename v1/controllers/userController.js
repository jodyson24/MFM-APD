const User = require('../../models/User');
const OrgUnit = require('../../models/OrgUnit');
const { hashToken } = require('../../lib/hash');
const { logAction } = require('../../services/auditService');
const crypto = require('crypto');
const { sendInviteEmail } = require('../../services/emailService');
const { isSuperAdmin, canManageUsers, ROLE_ORG_TYPES } = require('../../lib/permissions');

// Validate that a role can be attached to an org unit of the given type
// (e.g. a mega_region_overseer must sit at a mega region, never a branch).
async function assertRoleOrgMatch(role, orgUnitId) {
  const allowedType = ROLE_ORG_TYPES[role];
  if (!allowedType) return { ok: true };
  const orgUnit = await OrgUnit.findById(orgUnitId);
  if (!orgUnit) {
    return { ok: false, message: 'Invalid org unit' };
  }
  if (orgUnit.type !== allowedType) {
    return {
      ok: false,
      message: `A user with the role "${role.replace(/_/g, ' ')}" must belong to a ${allowedType.replace(/_/g, ' ')} org unit.`,
    };
  }
  return { ok: true };
}

// Create user (invite)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, orgUnitId, divisions } = req.body;

    // Only super admins may provision super admins
    if (role === 'super_admin' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can create another super admin' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Validate orgUnit exists and is within requester's scope (req.scope)
    const orgUnit = await OrgUnit.findById(orgUnitId);
    if (!orgUnit) {
      return res.status(400).json({ message: 'Invalid org unit' });
    }
    // Check scope: if not super admin, ensure orgUnit is in allowed list
    if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(orgUnitId)) {
      return res.status(403).json({ message: 'Cannot create user outside your scope' });
    }

    // Role must match the org unit level
    const match = await assertRoleOrgMatch(role, orgUnitId);
    if (!match.ok) {
      return res.status(400).json({ message: match.message });
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const user = new User({
      name,
      email,
      phone,
      role,
      orgUnitId,
      divisions: divisions || [],
      isSuperAdmin: role === 'super_admin',
      status: 'invited',
      invite: {
        tokenHash,
        expiresAt,
        createdByUserId: req.user._id,
      },
      createdByUserId: req.user._id,
    });

    await user.save();

    logAction({
      userId: req.user._id,
      action: 'create_user',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
      meta: { email, role },
    });

    // Send invite email (best-effort; failure must not block user creation)
    try {
      await sendInviteEmail(email, token, { name });
    } catch (emailErr) {
      console.error('Invite email failed to send', emailErr.message);
    }

    res.status(201).json({
      message: 'User created and invite sent',
      user: { id: user._id, name, email, role, status: 'invited' },
    });
  } catch (error) {
    next(error);
  }
};

// List users (scope-limited)
exports.getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (!isSuperAdmin(req.user)) {
      filter.orgUnitId = { $in: req.scope.orgUnitIds };
    }
    const users = await User.find(filter)
      .select('-invite -passwordHash')
      .populate('orgUnitId', 'name type')
      .populate('divisions', 'name code');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Get single user
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-invite -passwordHash')
      .populate('orgUnitId', 'name type')
      .populate('divisions', 'name code');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Check scope
    if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(user.orgUnitId._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Current user profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -invite')
      .populate('orgUnitId', 'name type')
      .populate('divisions', 'name code');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update user (name, phone, role, divisions, orgUnitId)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, phone, role, divisions, orgUnitId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only management users may edit other accounts
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Scope check
    if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only super admin can modify (or demote) a super admin
    if (user.isSuperAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can edit a super admin' });
    }
    // Only super admin can promote someone to super admin
    if (role === 'super_admin' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can promote to super admin' });
    }

    // Resolve the effective org unit (current unless a new one is supplied)
    const nextOrgUnitId = orgUnitId || user.orgUnitId;
    if (orgUnitId) {
      const newOrg = await OrgUnit.findById(orgUnitId);
      if (!newOrg) return res.status(400).json({ message: 'Invalid org unit' });
      if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(orgUnitId)) {
        return res.status(403).json({ message: 'Cannot move user outside your scope' });
      }
    }

    // Role must match the org unit level (both when role or orgUnit changes)
    const effectiveRole = role || user.role;
    const match = await assertRoleOrgMatch(effectiveRole, nextOrgUnitId);
    if (!match.ok) {
      return res.status(400).json({ message: match.message });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (role) {
      user.role = role;
      user.isSuperAdmin = role === 'super_admin';
    }
    if (divisions) user.divisions = divisions;
    if (orgUnitId) user.orgUnitId = orgUnitId;

    await user.save();

    logAction({
      userId: req.user._id,
      action: 'update_user',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
      meta: { role: user.role },
    });

    res.json({ message: 'User updated', user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    next(error);
  }
};

// Deactivate user (soft delete)
exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (user.isSuperAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can deactivate a super admin' });
    }
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    user.isActive = false;
    user.status = 'deactivated';
    await user.save();

    logAction({
      userId: req.user._id,
      action: 'deactivate_user',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

// Permanently delete a user account — super admins only
exports.deleteUser = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can delete users' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const remainingSuperAdmins = await User.countDocuments({
      isSuperAdmin: true,
      _id: { $ne: user._id },
    });

    if (user.isSuperAdmin && remainingSuperAdmins === 0) {
      return res.status(400).json({ message: 'At least one super admin must remain in the system' });
    }

    await User.findByIdAndDelete(req.params.id);

    logAction({
      userId: req.user._id,
      action: 'delete_user',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
      meta: { email: user.email, name: user.name, role: user.role },
    });

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

// Force a password reset: clears the password, flips the user back to
// 'invited' and issues a fresh 72-hour set-password link (invite-style).
exports.resetPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (user.isSuperAdmin && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can reset a super admin\'s password' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Invalidate the old password and all current sessions (passwordHash null
    // means login is impossible until the new password is set)
    user.passwordHash = null;
    user.status = 'invited';
    user.invite.tokenHash = tokenHash;
    user.invite.expiresAt = expiresAt;
    user.invite.usedAt = null;
    await user.save();

    logAction({
      userId: req.user._id,
      action: 'reset_password',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    // Send email (best-effort)
    try {
      await sendInviteEmail(user.email, token, { name: user.name });
    } catch (emailErr) {
      console.error('Password reset email failed to send', emailErr.message);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({
      message: 'Password reset. A set-password link was generated.',
      resetLink: `${frontendUrl}/set-password?token=${token}`,
    });
  } catch (error) {
    next(error);
  }
};

// Resend invite
exports.resendInvite = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (user.status !== 'invited') {
      return res.status(400).json({ message: 'User is not in invited state' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    user.invite.tokenHash = tokenHash;
    user.invite.expiresAt = expiresAt;
    user.invite.usedAt = null;
    await user.save();

    // Resend email (best-effort)
    try {
      await sendInviteEmail(user.email, token, { name: user.name });
    } catch (emailErr) {
      console.error('Resend invite email failed', emailErr.message);
    }

    res.json({ message: 'Invite resent' });
  } catch (error) {
    next(error);
  }
};
