const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    passwordHash: { type: String }, // optional when using OAuth
    provider: { type: String, enum: ['google'], index: true },
    providerId: { type: String, index: true },
    avatar: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, partialFilterExpression: { provider: { $type: 'string' }, providerId: { $type: 'string' } } });

module.exports = mongoose.model('User', UserSchema);
