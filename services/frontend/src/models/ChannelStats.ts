import mongoose, { Schema, model, models } from 'mongoose';

const ChannelStatsSchema = new Schema({
    channelUrl: { type: String, required: true, unique: true },
    channelName: { type: String, required: true },
    totalWatchTime: { type: Number, default: 0 }, // In seconds
    totalViews: { type: Number, default: 0 },
    activeViewers: { type: Number, default: 0 },
    lastStreamedAt: { type: Date, default: Date.now },
}, {
    timestamps: true
});

// Index for fast trending lookups
ChannelStatsSchema.index({ totalWatchTime: -1 });

const ChannelStats = models.ChannelStats || model('ChannelStats', ChannelStatsSchema);

export default ChannelStats;
