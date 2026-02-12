import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import ChannelStats from '@/models/ChannelStats';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Simple Admin Auth Check (role must be admin)
        if (!session || !session.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();

        // 1. Total Registered Users
        const totalUsers = await User.countDocuments();

        // 2. Active Streams (Channels with heartbeats in the last 60 seconds)
        const activeStreamsCount = await ChannelStats.countDocuments({
            lastStreamedAt: { $gte: new Date(Date.now() - 60000) }
        });

        // 3. Top 5 Trending Channels
        const trendingChannels = await ChannelStats.find()
            .sort({ totalWatchTime: -1 })
            .limit(5);

        return NextResponse.json({
            totalUsers,
            activeStreamsCount,
            trendingChannels
        });
    } catch (error) {
        console.error('Admin API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
