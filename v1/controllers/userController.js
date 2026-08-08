const User = require('../../models/User');
const OrgUnit = require('../../models/OrgUnit');
const { generateAccessToken } = require('../../lib/jwt');
const { hashToken } = require('../../lib/hash');
const { logAction } = require('../../services/auditService');
const crypto = require('crypto');
const { sendInviteEmail } = require('../../services/emailService');

// Create user (invite)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, orgUnitId, divisions } = req.body;

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
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(orgUnitId)) {
      return res.status(403).json({ message: 'Cannot create user outside your scope' });
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
    if (!req.user.isSuperAdmin) {
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
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(user.orgUnitId._id.toString())) {
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

// Update user (limited fields)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, phone, role, divisions, orgUnitId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Scope check
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only super admin can change role or orgUnitId
    if ((role || orgUnitId) && !req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Only super admin can change role or org unit' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (role) user.role = role;
    if (divisions) user.divisions = divisions;
    if (orgUnitId) {
      const newOrg = await OrgUnit.findById(orgUnitId);
      if (!newOrg) return res.status(400).json({ message: 'Invalid org unit' });
      user.orgUnitId = orgUnitId;
    }

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

// Deactivate user
exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
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

// Resend invite
exports.resendInvite = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(user.orgUnitId.toString())) {
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