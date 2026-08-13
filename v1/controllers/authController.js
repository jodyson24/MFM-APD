const User = require('../../models/User');
const SessionLog = require('../../models/SessionLog');
const RefreshToken = require('../../models/RefreshToken');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../lib/jwt');
const { hashToken } = require('../../lib/hash');
const { logAction } = require('../../services/auditService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const refreshLifetimeMs = () => {
  const exp = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  const match = String(exp).match(/^(\d+)d$/);
  return match ? parseInt(match[1], 10) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
};

const clearRefreshCookie = (res) =>
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

async function recordFailedAttempt(userId, reason, req) {
  const payload = {
    ipAddress: req.ip,
    loginResult: reason,
    device: { userAgent: req.headers['user-agent'] },
  };
  if (req.body?.email) payload.email = req.body.email;
  if (userId) payload.userId = userId;
  const session = await SessionLog.create(payload);
  if (userId) {
    logAction({
      userId,
      sessionId: session._id,
      action: 'failed_login',
      entity: 'User',
      entityId: userId,
      ipAddress: req.ip,
      meta: { reason },
    });
  }
}

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      await recordFailedAttempt(user && user._id, 'failed_password', req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordFailedAttempt(user._id, 'failed_password', req);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update login stats
    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save();

    // Refresh-token family (§8.2/§8.4): one family per login session
    const familyId = crypto.randomUUID();
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, familyId);
    const tokenHash = await hashToken(refreshToken);
    await RefreshToken.create({
      userId: user._id,
      familyId,
      tokenHash,
      expiresAt: new Date(Date.now() + refreshLifetimeMs()),
      userAgent: req.headers['user-agent'],
    });

    // Create session log
    const session = await SessionLog.create({
      userId: user._id,
      ipAddress: req.ip,
      loginResult: 'success',
      refreshTokenFamilyId: familyId,
      device: {
        userAgent: req.headers['user-agent'],
        fingerprintHash: req.headers['x-device-fingerprint'] || null,
      },
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, cookieOptions());

    req.log('info', 'User login successful', {
      userId: user._id.toString(),
      sessionId: session._id.toString(),
      action: 'login',
    });

    logAction({
      userId: user._id,
      sessionId: session._id,
      action: 'login',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgUnitId: user.orgUnitId,
        divisions: user.divisions,
        isSuperAdmin: user.isSuperAdmin,
      },
      sessionId: session._id,
    });
  } catch (error) {
    next(error);
  }
};

// Set password (invite acceptance)
exports.setPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    // Find user with matching invite token (hashed)
    const hashedToken = await hashToken(token);
    const user = await User.findOne({ 'invite.tokenHash': hashedToken });
    if (!user || user.status !== 'invited') {
      return res.status(400).json({ message: 'Invalid or expired invite token' });
    }
    if (user.invite.expiresAt < new Date()) {
      await recordFailedAttempt(user._id, 'failed_expired_invite', req);
      return res.status(400).json({ message: 'Invite token expired' });
    }
    if (user.invite.usedAt) {
      await recordFailedAttempt(user._id, 'failed_expired_invite', req);
      return res.status(400).json({ message: 'Invite token already used' });
    }

    // Set password and activate
    user.passwordHash = password; // will be hashed by pre-save hook
    user.status = 'active';
    user.invite.usedAt = new Date();
    await user.save();

    logAction({
      userId: user._id,
      action: 'set_password',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// Refresh token — rotate on every use; reuse of a rotated-out token revokes the family (§8.2)
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const tokenHash = await hashToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Presenting a token we cannot account for (already rotated out or forged)
      // is a reuse attempt: revoke the whole family and hard-invalidate sessions.
      if (decoded && decoded.familyId && decoded.id) {
        await RefreshToken.updateMany({ familyId: decoded.familyId }, { revokedAt: new Date() });
        await SessionLog.updateMany(
          { refreshTokenFamilyId: decoded.familyId },
          { logoutAt: new Date(), durationSeconds: 0 }
        );
        logAction({
          userId: decoded.id,
          action: 'refresh_token_reuse_detected',
          entity: 'User',
          entityId: decoded.id,
          ipAddress: req.ip,
          meta: { familyId: decoded.familyId },
        });
      }
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Rotate: revoke the used token, issue a new one in the same family
    stored.revokedAt = new Date();
    await stored.save();

    const newToken = generateRefreshToken(user, decoded.familyId);
    const newHash = await hashToken(newToken);
    await RefreshToken.create({
      userId: user._id,
      familyId: decoded.familyId,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + refreshLifetimeMs()),
      userAgent: req.headers['user-agent'],
    });

    res.cookie('refreshToken', newToken, cookieOptions());
    res.status(200).json({ accessToken: generateAccessToken(user) });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    clearRefreshCookie(res);

    // Revoke the refresh-token family for this session (from cookie or sessionId)
    const offeredToken = req.cookies.refreshToken;
    if (offeredToken) {
      const tokenHash = await hashToken(offeredToken);
      const stored = await RefreshToken.findOne({ tokenHash });
      if (stored) {
        await RefreshToken.updateMany({ familyId: stored.familyId }, { revokedAt: new Date() });
      }
    }

    const sessionId = req.body?.sessionId;
    if (sessionId) {
      const session = await SessionLog.findById(sessionId);
      if (session) {
        const logoutAt = new Date();
        session.logoutAt = logoutAt;
        session.durationSeconds = Math.max(
          0,
          Math.round((logoutAt - session.loginAt) / 1000)
        );
        await session.save();

        // Accumulate time-logged-in on the user (§8.4 per-user counters)
        if (session.durationSeconds > 0 && session.userId) {
          await User.updateOne(
            { _id: session.userId },
            { $inc: { totalTimeLoggedInSeconds: session.durationSeconds } }
          );
        }

        logAction({
          userId: session.userId,
          sessionId: session._id,
          action: 'logout',
          entity: 'User',
          entityId: session.userId,
          ipAddress: req.ip,
          requestId: req.id,
          meta: {
            logoutReason: 'user_logout',
            sessionId: session._id.toString(),
            loginAt: session.loginAt,
            logoutAt: logoutAt.toISOString(),
            durationSeconds: session.durationSeconds,
            refreshTokenFamilyId: session.refreshTokenFamilyId || null,
            requestId: req.id,
          },
        });
      }
    }

    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};