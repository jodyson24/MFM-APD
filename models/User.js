const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, default: null }, // null until set via invite
  role: {
    type: String,
    enum: [
      'super_admin',
      'mega_region_admin',
      'mega_region_it',
      'mega_region_overseer',
      'region_admin',
      'region_overseer',
      'zone_admin',
      'zonal_pastor',
      'branch_admin',
      'branch_pastor',
      'pastor',
      'it_official',
    ],
    required: true,
  },
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  divisions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Division' }],
  isSuperAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['invited', 'active', 'deactivated'],
    default: 'invited',
  },
  invite: {
    tokenHash: { type: String },
    expiresAt: { type: Date },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date },
  },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastLoginAt: { type: Date },
  loginCount: { type: Number, default: 0 },
  totalTimeLoggedInSeconds: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save hook to hash password if set
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  if (this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, parseInt(process.env.BCRYPT_ROUNDS || 12));
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);