import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for social login
    image: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    subscription: {
        status: { type: String, enum: ['inactive', 'active', 'trial', 'grace'], default: 'inactive' },
        plan: { type: String, enum: ['none', 'basic', 'pro', 'family'], default: 'none' },
        expiresAt: { type: Date },
    },
    devices: [{
        id: { type: String, required: true },
        name: { type: String },
        lastUsedAt: { type: Date, default: Date.now }
    }],
    favorites: [{ type: String }], // Array of channel IDs
    watchHistory: [{
        channelUrl: { type: String, required: true },
        channelName: { type: String },
        watchedAt: { type: Date, default: Date.now }
    }],
}, {
    timestamps: true // Automatically manages createdAt and updatedAt
});

const User = models.User || model('User', UserSchema);

export default User;
