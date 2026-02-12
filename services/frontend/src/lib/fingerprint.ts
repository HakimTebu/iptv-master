/**
 * Generates a stable, unique browser/device fingerprint.
 * This is used to enforce device limits and prevent account sharing.
 */
export async function getDeviceFingerprint(): Promise<string> {
    if (typeof window === 'undefined') return 'server';

    const userAgent = navigator.userAgent;
    const platform = (navigator as any).platform || '';
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const language = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Combine entropy sources
    const data = `${userAgent}|${platform}|${screenRes}|${language}|${timezone}`;

    // Create a SHA-256 hash
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Gets a human-readable device name based on UA.
 */
export function getDeviceName(): string {
    if (typeof window === 'undefined') return 'Unknown Device';

    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android Device';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
    if (/Macintosh/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Linux/.test(ua)) return 'Linux PC';

    return 'Desktop Browser';
}
