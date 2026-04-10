import { NextResponse } from 'next/server';
import { getScrapedStoreData } from '@/lib/scraper';

export async function GET() {
    try {
        const scrapedData = await getScrapedStoreData();
        return NextResponse.json({ success: true, data: scrapedData });
    } catch (error: any) {
        console.error('Scraping API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to scrape store data' }, { status: 500 });
    }
}
