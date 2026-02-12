import jwt from 'jsonwebtoken';

const PLAYBACK_SECRET = process.env.PLAYBACK_SECRET || 'iptv_playback_secret_key_change_me';

interface PlaybackTokenPayload {
    url: string;
    userId: string;
    deviceId: string;
    exp: number;
}

/**
 * Generates a short-lived playback token for a specific stream URL.
 * Defaults to 60 seconds expiration to prevent link sharing.
 */
export function generatePlaybackToken(url: string, userId: string, deviceId: string): string {
    const payload: PlaybackTokenPayload = {
        url,
        userId,
        deviceId,
        exp: Math.floor(Date.now() / 1000) + 60, // 60 seconds
    };

    return jwt.sign(payload, PLAYBACK_SECRET);
}

/**
 * Verifies a playback token and ensures it matches the requested URL.
 */
export function verifyPlaybackToken(token: string, requestedUrl: string): { userId: string; deviceId: string } | null {
    try {
        const decoded = jwt.verify(token, PLAYBACK_SECRET) as PlaybackTokenPayload;

        // Safety check: ensure token belongs to the URL being requested
        // This prevents one valid token from being used to play every channel
        if (decoded.url !== requestedUrl) {
            console.error('Playback token URL mismatch');
            return null;
        }

        return {
            userId: decoded.userId,
            deviceId: decoded.deviceId
        };
    } catch (error) {
        console.error('Playback token verification failed:', error);
        return null;
    }
}
