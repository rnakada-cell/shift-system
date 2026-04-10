"use strict";
/**
 * Future Shift AI - Mock Data (Phase 2.5)
 * 型はoptimizerから再エクスポート
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDayCapacities = exports.mockAvailabilities = exports.mockCasts = exports.timeSegments = exports.storeSettings = void 0;
exports.getDateRange = getDateRange;
var storeSettings_1 = require("./storeSettings");
exports.storeSettings = (0, storeSettings_1.getStoreSettings)();
// ==================== 時間帯マスタ ====================
exports.timeSegments = exports.storeSettings.defaultSegments;
// ==================== キャストマスタ ====================
exports.mockCasts = [
    {
        id: 'c1',
        name: 'さくら',
        hourlyWage: 3000,
        averageSales: 18000,
        nominationRate: 0.75,
        preferredSegments: ['SEG_20_22', 'SEG_22_24'],
        isRookie: false,
    },
    {
        id: 'c2',
        name: 'ことね',
        hourlyWage: 5000, // 超高時給（利益モードで不利になる）
        averageSales: 20000,
        nominationRate: 0.90,
        preferredSegments: ['SEG_20_22'],
        isRookie: false,
    },
    {
        id: 'c3',
        name: 'りな（新人）',
        hourlyWage: 2500,
        averageSales: 4000, // 売上低いが将来性あり（LTVモードで加点）
        nominationRate: 0.10,
        preferredSegments: ['SEG_18_20', 'SEG_20_22'],
        isRookie: true,
    },
    {
        id: 'c4',
        name: 'みかみ',
        hourlyWage: 2800,
        averageSales: 16000,
        nominationRate: 0.60,
        preferredSegments: ['SEG_20_22', 'SEG_22_24'],
        isRookie: false,
    },
    {
        id: 'c5',
        name: 'あやか',
        hourlyWage: 2600,
        averageSales: 14000,
        nominationRate: 0.55,
        preferredSegments: ['SEG_18_20', 'SEG_22_24'],
        isRookie: false,
    },
];
// ==================== モック希望データ（期間提出型）====================
// デフォルトの2024-03-01週分のモックデータ
exports.mockAvailabilities = [
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
exports.mockDayCapacities = [
    // 2024-03-01 (金) → ピークタイムの定員を増加
    { date: '2024-03-01', segmentId: 'SEG_20_22', requiredMin: 3, requiredMax: 5 },
    { date: '2024-03-01', segmentId: 'SEG_22_24', requiredMin: 2, requiredMax: 4 },
    // 2024-03-02 (土) → 最大ピーク
    { date: '2024-03-02', segmentId: 'SEG_20_22', requiredMin: 4, requiredMax: 5 },
    { date: '2024-03-02', segmentId: 'SEG_22_24', requiredMin: 3, requiredMax: 4 },
];
// ==================== 日付ユーティリティ ====================
function getDateRange(startDate, endDate) {
    var dates = [];
    var current = new Date(startDate);
    var end = new Date(endDate);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}
