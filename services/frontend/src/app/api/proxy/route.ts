import { NextRequest, NextResponse } from 'next/server';
import { verifyPlaybackToken } from '@/lib/tokens';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    const token = request.nextUrl.searchParams.get('token');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    if (!token) {
        return NextResponse.json({ error: 'Missing playback token' }, { status: 401 });
    }

    try {
        const decodedUrl = decodeURIComponent(url);

        // Entitlement Verification:
        // Ensure the token is valid and specifically issued for this URL
        const auth = verifyPlaybackToken(token, decodedUrl);
        if (!auth) {
            return NextResponse.json({ error: 'Invalid or expired playback token' }, { status: 403 });
        }

        const parsedUrl = new URL(decodedUrl);

        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': parsedUrl.origin,
                'Referer': `${parsedUrl.origin}/`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            return new Response(`Upstream returned ${response.status}`, {
                status: response.status,
                headers: { 'Access-Control-Allow-Origin': '*' },
            });
        }

        const contentType = response.headers.get('content-type') || '';
        const isManifest = decodedUrl.includes('.m3u8') || contentType.includes('mpegurl');

        if (isManifest) {
            const text = await response.text();
            const basePath = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

            // Rewrite URLs in the manifest to route through our proxy, PASSING THE TOKEN ALONG
            const rewritten = text.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    if (trimmed.includes('URI="')) {
                        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
                            const abs = uri.startsWith('http') ? uri : new URL(uri, basePath).toString();
                            return `URI="/api/proxy?url=${encodeURIComponent(abs)}&token=${encodeURIComponent(token)}"`;
                        });
                    }
                    return line;
                }
                const absolute = trimmed.startsWith('http') ? trimmed : new URL(trimmed, basePath).toString();
                return `/api/proxy?url=${encodeURIComponent(absolute)}&token=${encodeURIComponent(token)}`;
            }).join('\n');

            return new Response(rewritten, {
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                },
            });
        }

        // Binary segment data
        const data = await response.arrayBuffer();
        return new Response(data, {
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=5',
            },
        });
    } catch (error: any) {
        console.error('[Proxy Error]', error.message, '| URL:', url);
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
