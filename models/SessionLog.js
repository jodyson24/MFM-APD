const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  // userId is optional: failed attempts with an unknown email have no user
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String }, // attempted email on failed sign-in
  loginAt: { type: Date, default: Date.now },
  logoutAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 }, // computed on logout
  ipAddress: { type: String },
  approxLocation: {
    city: { type: String },
    region: { type: String },
    country: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  device: {
    fingerprintHash: { type: String },
    userAgent: { type: String },
    os: { type: String },
    browser: { type: String },
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'] },
  },
  loginResult: {
    type: String,
    enum: ['success', 'failed_password', 'failed_locked', 'failed_expired_invite'],
  },
  refreshTokenFamilyId: { type: String },
});

module.exports = mongoose.model('SessionLog', sessionLogSchema);