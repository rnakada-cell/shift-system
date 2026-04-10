import { TimeSegment } from "./optimizer";

export interface StoreSettings {
    id: string;
    name: string;
    businessHours: {
        start: string; // "14:00"
        end: string;   // "05:00" (翌朝)
    };
    defaultSegments: TimeSegment[];
}

export const defaultStoreSettings: StoreSettings = {
    id: "main-store",
    name: "Future Shift Main Store",
    businessHours: {
        start: "14:00",
        end: "24:00"
    },
    defaultSegments: [
        {
            id: 'SEG_12_14',
            label: '12:00 - 14:00',
            hours: 2,
            demandFactor: 0.5, // 昼間は需要が最も低め
            maxCapacity: 17
        },
        {
            id: 'SEG_14_16',
            label: '14:00 - 16:00',
            hours: 2,
            demandFactor: 0.6,
            maxCapacity: 17
        },
        {
            id: 'SEG_16_18',
            label: '16:00 - 18:00',
            hours: 2,
            demandFactor: 0.7,
            maxCapacity: 17
        },
        {
            id: 'SEG_18_20',
            label: '18:00 - 20:00',
            hours: 2,
            demandFactor: 0.8,
            maxCapacity: 17
        },
        {
            id: 'SEG_20_22',
            label: '20:00 - 22:00',
            hours: 2,
            demandFactor: 1.2,
            maxCapacity: 17
        },
        {
            id: 'SEG_22_24',
            label: '22:00 - 24:00',
            hours: 2,
            demandFactor: 1.0,
            maxCapacity: 17
        }
    ]
};

/**
 * 汎用化のためのユーティリティ
 */
export function getStoreSettings(storeId: string = "main-store"): StoreSettings {
    // 現状はデフォルトを返すが、将来的に拡張可能
    return defaultStoreSettings;
}
