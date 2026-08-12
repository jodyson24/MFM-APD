const crypto = require('crypto');

// Deterministic SHA-256 hashing for opaque tokens (invite tokens, refresh tokens).
// These are high-entropy random strings, so a fast deterministic hash is safe
// and allows equality lookups (findOne({ tokenHash })) unlike bcrypt's random salt.
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

exports.compareToken = (plain, hash) => {
  const computed = exports.hashToken(plain);
  return computed === hash;
};
