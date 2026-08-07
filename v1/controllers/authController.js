const User = require('../../models/User');
const SessionLog = require('../../models/SessionLog');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../lib/jwt');
const { hashToken } = require('../../lib/hash');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      // Log failed attempt
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed attempt
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update login stats
    user.lastLoginAt = new Date();
    user.loginCount += 1;
    await user.save();

    // Create session log
    const session = await SessionLog.create({
      userId: user._id,
      ipAddress: req.ip,
      loginResult: 'success',
      device: {
        userAgent: req.headers['user-agent'],
        // additional device info could be extracted from fingerprint header
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
      return res.status(400).json({ message: 'Invite token expired' });
    }
    if (user.invite.usedAt) {
      return res.status(400).json({ message: 'Invite token already used' });
    }

    // Set password and activate
    user.passwordHash = password; // will be hashed by pre-save hook
    user.status = 'active';
    user.invite.usedAt = new Date();
    await user.save();

    res.status(200).json({ message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user);
    res.status(200).json({ accessToken });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    // Optionally update session log logoutAt
    // (sessionId passed from client or stored in req)
    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};