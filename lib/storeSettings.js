"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultStoreSettings = void 0;
exports.getStoreSettings = getStoreSettings;
exports.defaultStoreSettings = {
    id: "main-store",
    name: "Future Shift Main Store",
    businessHours: {
        start: "18:00",
        end: "24:00"
    },
    defaultSegments: [
        { id: "SEG_18_20", label: "18:00 - 20:00", hours: 2, demandFactor: 1.0, maxCapacity: 5 },
        { id: "SEG_20_22", label: "20:00 - 22:00", hours: 2, demandFactor: 1.5, maxCapacity: 8 },
        { id: "SEG_22_24", label: "22:00 - 24:00", hours: 2, demandFactor: 1.2, maxCapacity: 6 }
    ]
};
/**
 * 汎用化のためのユーティリティ
 * 将来的にはここで複数の店舗設定を管理したり、DBから取得したりする
 */
function getStoreSettings(storeId) {
    if (storeId === void 0) { storeId = "main-store"; }
    // 現状はデフォルトを返すが、将来的に拡張可能
    return exports.defaultStoreSettings;
}
