const mongoose = require('mongoose');

// Rotating refresh tokens (§8.2). One row per issued token; each refresh
// rotates the token (old -> new) within the same familyId. A presented token
// that has already been rotated out (no row, or revokedAt set) is treated as
// a reuse attempt and revokes the entire family.
const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  familyId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);