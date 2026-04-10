import * as cheerio from 'cheerio';

export interface ScrapedStoreData {
    businessHours: {
        floor1: {
            weekday: string;
            weekend: string;
        };
        floor2: {
            all: string;
        };
    };
    menu: {
        entryFee: number;
        freeFlow60: number;
        drink: number;
        shot: number;
        rewardDrink: number;
        cheki: number;
        premiumChampagnes: Array<{ name: string; priceRange: string }>;
        estimatedArpu: number;
    };
    events: string[];
}

let cachedData: ScrapedStoreData | null = null;
let lastCacheTime: number = 0;
let isScraping: boolean = false;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

export async function getScrapedStoreData(): Promise<ScrapedStoreData> {
    const now = Date.now();
    const isExpired = now - lastCacheTime > CACHE_DURATION;

    // キャッシュがあり、期限内なら即座に返す
    if (cachedData && !isExpired) {
        return cachedData;
    }

    // キャッシュがあり、期限切れだが現在スクレイピング中なら、古いデータを即座に返す（待たせない）
    if (cachedData && isExpired && isScraping) {
        return cachedData;
    }

    // キャッシュがない、または期限切れでスクレイピング中でない場合
    if (!isScraping) {
        // バックグラウンドで更新を開始（awaitしない）
        refreshCache().catch(err => console.error('Background scraping error:', err));
    }

    // 初回などでキャッシュが全くない場合は、更新を待つかデフォルトを返す
    if (!cachedData) {
        // 初回のみ待機（あるいはデフォルトを即座に返す設計も可能だが、初回は正確性を優先）
        await refreshCache().catch(() => {});
        return cachedData || getDefaultData();
    }

    return cachedData;
}

async function refreshCache() {
    if (isScraping) return;
    isScraping = true;
    
    console.log('Starting store data scraping...');
    const start = Date.now();

    try {
        // 1. Fetch shop info for business hours
        const shopRes = await fetch('https://lv-point.com/shop', { signal: AbortSignal.timeout(5000) });
        const shopHtml = await shopRes.text();
        const $shop = cheerio.load(shopHtml);

        const shopText = $shop('body').text();
        const weekdayHoursMatch = shopText.match(/平日\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/);
        const weekendHoursMatch = shopText.match(/土日祝\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/);

        // 2. Menu data (augmented with manual knowledge for premium items)
        const menuData = {
            entryFee: 1100,
            freeFlow60: 2000,
            drink: 900,
            shot: 500,
            rewardDrink: 1300,
            cheki: 1300,
            premiumChampagnes: [
                { name: "モエ・エ・シャンドン", priceRange: "20,000〜" },
                { name: "ヴーヴ・クリコ", priceRange: "25,000〜" },
                { name: "ドン・ペリニヨン", priceRange: "60,000〜" },
                { name: "ソウメイ", priceRange: "80,000〜" },
                { name: "エンジェル", priceRange: "150,000〜" },
                { name: "アルマンド", priceRange: "200,000〜" }
            ],
            estimatedArpu: 8500
        };

        // 3. Events info
        const eventRes = await fetch('https://lv-point.com/', { signal: AbortSignal.timeout(5000) });
        const eventHtml = await eventRes.text();
        const $event = cheerio.load(eventHtml);

        const events: string[] = [];
        $event('h3, h2, a').each((_, el) => {
            const text = $event(el).text().trim();
            if (text.includes('イベント') || text.includes('ハッピーアワー') || text.includes('キャンペーン')) {
                events.push(text);
            }
        });

        cachedData = {
            businessHours: {
                floor1: {
                    weekday: weekdayHoursMatch ? `${weekdayHoursMatch[1]}-${weekdayHoursMatch[2]}` : '15:00-23:00',
                    weekend: weekendHoursMatch ? `${weekendHoursMatch[1]}-${weekendHoursMatch[2]}` : '12:00-23:00'
                },
                floor2: {
                    all: '17:00-24:00'
                }
            },
            menu: menuData,
            events: [...new Set(events)].filter(e => e.length > 0 && e.length < 50)
        };
        lastCacheTime = Date.now();
        console.log(`Scraping completed in ${Date.now() - start}ms`);
    } catch (error) {
        console.error('Scraping failed:', error);
        if (!cachedData) cachedData = getDefaultData();
    } finally {
        isScraping = false;
    }
}

function getDefaultData(): ScrapedStoreData {
    return {
        businessHours: {
            floor1: { weekday: '15:00-23:00', weekend: '12:00-23:00' },
            floor2: { all: '17:00-24:00' }
        },
        menu: {
            entryFee: 1100, freeFlow60: 2000, drink: 900, shot: 500,
            rewardDrink: 1300, cheki: 1300, premiumChampagnes: [],
            estimatedArpu: 4600
        },
        events: []
    };
}
