/**
 * Future Shift AI - Mock Data (Phase 2.5)
 * 型はoptimizerから再エクスポート
 */

import type { Cast, TimeSegment, CastAvailability } from './optimizer';
export type { Cast, TimeSegment, CastAvailability };

import { getStoreSettings } from './storeSettings';

export const storeSettings = getStoreSettings();

// ==================== 時間帯マスタ ====================
export const timeSegments: TimeSegment[] = storeSettings.defaultSegments;

// ==================== キャストマスタ ====================
export const mockCasts: Cast[] = [
    {
        id: 'c1',
        name: 'さくら',
        rank: 'S',
        hourlyWage: 3000,
        drinkBackRate: 0.2,
        chekiBackRate: 0.3,
        averageSales: 18000,
        nominationRate: 0.75,
        snsFollowers: 5000,
        absenceRate: 0.05,
        floorPreference: 'ANY',
        canOpen: true,
        canClose: true,
        preferredSegments: ['SEG_20_22', 'SEG_22_24'],
        isRookie: false,
    },
    {
        id: 'c2',
        name: 'ことね',
        rank: 'A',
        hourlyWage: 5000,
        drinkBackRate: 0.1,
        chekiBackRate: 0.2,
        averageSales: 20000,
        nominationRate: 0.90,
        snsFollowers: 12000,
        absenceRate: 0.02,
        floorPreference: '2F',
        canOpen: false,
        canClose: true,
        preferredSegments: ['SEG_20_22'],
        isRookie: false,
    },
    {
        id: 'c3',
        name: 'りな（新人）',
        rank: 'C',
        hourlyWage: 2500,
        drinkBackRate: 0.0,
        chekiBackRate: 0.1,
        averageSales: 4000,
        nominationRate: 0.10,
        snsFollowers: 800,
        absenceRate: 0.1,
        floorPreference: 'ANY',
        canOpen: false,
        canClose: false,
        preferredSegments: ['SEG_18_20', 'SEG_20_22'],
        isRookie: true,
    },
    {
        id: 'c4',
        name: 'みかみ',
        rank: 'B',
        hourlyWage: 2800,
        drinkBackRate: 0.15,
        chekiBackRate: 0.25,
        averageSales: 16000,
        nominationRate: 0.60,
        snsFollowers: 3500,
        absenceRate: 0.08,
        floorPreference: '1F',
        canOpen: true,
        canClose: false,
        preferredSegments: ['SEG_20_22', 'SEG_22_24'],
        isRookie: false,
    },
    {
        id: 'c5',
        name: 'あやか',
        rank: 'B',
        hourlyWage: 2600,
        drinkBackRate: 0.1,
        chekiBackRate: 0.2,
        averageSales: 14000,
        nominationRate: 0.55,
        snsFollowers: 2200,
        absenceRate: 0.12,
        floorPreference: 'ANY',
        canOpen: false,
        canClose: true,
        preferredSegments: ['SEG_18_20', 'SEG_22_24'],
        isRookie: false,
    },
];

// ==================== モック希望データ（期間提出型）====================
// デフォルトの2024-03-01週分のモックデータ
export const mockAvailabilities: CastAvailability[] = [
    {
        castId: 'c1',
        availability: [
            { date: '2024-03-01', segments: [{ segmentId: 'SEG_20_22', hasDropIn: true }, { segmentId: 'SEG_22_24' }] },
            { date: '2024-03-02', segments: [{ segmentId: 'SEG_20_22' }] },
            { date: '2024-03-03', segments: [{ segmentId: 'SEG_20_22' }, { segmentId: 'SEG_22_24' }] },
            { date: '2024-03-04', segments: [{ segmentId: 'SEG_22_24' }] },
            { date: '2024-03-05', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_20_22' }] },
        ],
    },
    {
        castId: 'c2',
        availability: [
            { date: '2024-03-01', segments: [{ segmentId: 'SEG_20_22', hasCompanion: true }] },
            { date: '2024-03-02', segments: [{ segmentId: 'SEG_20_22' }, { segmentId: 'SEG_22_24' }] },
            { date: '2024-03-03', segments: [{ segmentId: 'SEG_20_22', hasDropIn: true }] },
            { date: '2024-03-05', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_20_22' }] },
            { date: '2024-03-07', segments: [{ segmentId: 'SEG_20_22' }, { segmentId: 'SEG_22_24' }] },
        ],
    },
    {
        castId: 'c3',
        availability: [
            { date: '2024-03-01', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_20_22' }] },
            { date: '2024-03-02', segments: [{ segmentId: 'SEG_18_20' }] },
            { date: '2024-03-04', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_20_22' }] },
            { date: '2024-03-06', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_20_22' }] },
            { date: '2024-03-07', segments: [{ segmentId: 'SEG_20_22' }] },
        ],
    },
    {
        castId: 'c4',
        availability: [
            { date: '2024-03-01', segments: [{ segmentId: 'SEG_20_22' }, { segmentId: 'SEG_22_24' }] },
            { date: '2024-03-02', segments: [{ segmentId: 'SEG_22_24' }] },
            { date: '2024-03-03', segments: [{ segmentId: 'SEG_20_22' }, { segmentId: 'SEG_22_24' }] },
            { date: '2024-03-04', segments: [{ segmentId: 'SEG_20_22' }] },
            { date: '2024-03-06', segments: [{ segmentId: 'SEG_20_22' }, { segmentId: 'SEG_22_24' }] },
        ],
    },
    {
        castId: 'c5',
        availability: [
            { date: '2024-03-01', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_22_24', hasDropIn: true }] },
            { date: '2024-03-03', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_22_24' }] },
            { date: '2024-03-05', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_20_22', hasCompanion: true }] },
            { date: '2024-03-06', segments: [{ segmentId: 'SEG_22_24' }] },
            { date: '2024-03-07', segments: [{ segmentId: 'SEG_18_20' }, { segmentId: 'SEG_22_24' }] },
        ],
    },
];

// ==================== 可変定員データ（日×時間帯ごと）====================
// 例：金曜のピーク時間帯は定員を増やす
export const mockDayCapacities: import('./optimizer').DaySegmentCapacity[] = [
    // 2024-03-01 (金) → ピークタイムの定員を増加
    { date: '2024-03-01', segmentId: 'SEG_20_22', requiredMin: 3, requiredMax: 5 },
    { date: '2024-03-01', segmentId: 'SEG_22_24', requiredMin: 2, requiredMax: 4 },
    // 2024-03-02 (土) → 最大ピーク
    { date: '2024-03-02', segmentId: 'SEG_20_22', requiredMin: 4, requiredMax: 5 },
    { date: '2024-03-02', segmentId: 'SEG_22_24', requiredMin: 3, requiredMax: 4 },
];

// ==================== 日付ユーティリティ ====================
export function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}
