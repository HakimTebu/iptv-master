import { NextResponse } from 'next/server';
import { parseMarkdownLists } from '@/lib/data-parser';
import path from 'path';

export async function GET() {
    try {
        const listsDir = path.join(process.cwd(), 'data');
        const data = parseMarkdownLists(listsDir);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to parse IPTV lists:', error);
        return NextResponse.json({ error: 'Failed to parse IPTV lists' }, { status: 500 });
    }
}
