import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import ChannelStats from '@/models/ChannelStats';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event, url, name, duration = 0 } = await req.json();

        if (!event || !url) {
            return NextResponse.json({ error: 'Event and URL are required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Update User Watch History (Only on 'play' or significant progress)
        if (event === 'play') {
            await User.updateOne(
                { email: session.user.email },
                {
                    $push: {
                        watchHistory: {
                            $each: [{ channelUrl: url, channelName: name, watchedAt: new Date() }],
                            $slice: -20 // Keep last 20 items
                        }
                    }
                }
            );
        }

        // 2. Update Global Channel Stats
        const updateQuery: any = { $set: { lastStreamedAt: new Date() } };

        if (event === 'play') {
            updateQuery.$inc = { totalViews: 1 };
        } else if (event === 'heartbeat') {
            updateQuery.$inc = { totalWatchTime: duration };
        }

        await ChannelStats.updateOne(
            { channelUrl: url },
            {
                ...updateQuery,
                $setOnInsert: { channelName: name }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Telemetry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
