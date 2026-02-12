import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface HealthResult {
    url: string;
    status: 'online' | 'offline';
    responseTime?: number;
}

async function checkStream(url: string): Promise<HealthResult> {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        clearTimeout(timeout);
        const responseTime = Date.now() - start;

        // Consider 2xx and 3xx as online
        if (response.ok || (response.status >= 300 && response.status < 400)) {
            return { url, status: 'online', responseTime };
        }
        return { url, status: 'offline', responseTime };
    } catch {
        return { url, status: 'offline', responseTime: Date.now() - start };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const urls: string[] = body.urls || [];

        if (urls.length === 0) {
            return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
        }

        // Process in batches of 10 for concurrency control
        const batchSize = 10;
        const results: HealthResult[] = [];

        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(checkStream));
            results.push(...batchResults);
        }

        // Convert to a map for easy lookup
        const healthMap: Record<string, { status: string; responseTime?: number }> = {};
        for (const result of results) {
            healthMap[result.url] = {
                status: result.status,
                responseTime: result.responseTime,
            };
        }

        return NextResponse.json(healthMap);
    } catch (error: any) {
        console.error('[Health Check Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
