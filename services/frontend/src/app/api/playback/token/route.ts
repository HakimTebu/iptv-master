import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generatePlaybackToken } from '@/lib/tokens';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
// import geoip from 'geoip-lite'; // Lazy loaded to prevent build errors when data files are missing

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get client IP for Geo-IP lookup
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

        // Lazy load geoip-lite to avoid build-time crashes
        const geoip = require('geoip-lite');
        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : 'Unknown';

        const { url, fingerprint, deviceName } = await req.json();
        if (!url || !fingerprint) {
            return NextResponse.json({ error: 'URL and Fingerprint are required' }, { status: 400 });
        }

        await dbConnect();
        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Phase 3: Device Binding & Anti-Sharing
        // Check if this fingerprint is already registered
        const deviceIndex = user.devices.findIndex((d: any) => d.id === fingerprint);
        const maxDevices = 3; // Default limit for families/pro, could be based on user.subscription.plan

        if (deviceIndex > -1) {
            // Internal update: Refresh last used time
            user.devices[deviceIndex].lastUsedAt = new Date();
            if (deviceName) user.devices[deviceIndex].name = deviceName;
        } else {
            // New device: Check if we are at the limit
            if (user.devices.length >= maxDevices) {
                return NextResponse.json({
                    error: 'Device limit reached. Please remove an old device from your account settings.'
                }, { status: 403 });
            }

            // Register new device
            user.devices.push({
                id: fingerprint,
                name: deviceName || 'Unknown Browser',
                lastUsedAt: new Date()
            });
        }

        await user.save();

        // Phase 3: Geo-IP Policy Enforcement
        // Example: Block specific countries for certain content tiers
        // Mock logic: some channels might only be available in specific regions
        const isMockRestricted = url.includes('special-content') && country !== 'USA';
        if (isMockRestricted) {
            return NextResponse.json({
                error: `Content not available in your region (${country}).`
            }, { status: 403 });
        }

        // Entitlement Check:
        // Future: Check if user.subscription.status === 'active'

        const token = generatePlaybackToken(url, (user as any)._id.toString(), fingerprint);

        return NextResponse.json({ token });
    } catch (error) {
        console.error('Playback token error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
