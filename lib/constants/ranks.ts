/**
 * Love Point - Rank & Commission (Back Table) Definitions
 */

export interface RankInfo {
    id: number;
    name: string;
    label: string;
    hourlyWage: number;
    backGroupId: number; // 1: Rank1-3, 2: Rank4-5, 3: Rank6,9, 4: Rank7-8
}

export const CAST_RANKS: Record<number, RankInfo> = {
    1: { id: 1, name: 'producer', label: 'プロデューサー', hourlyWage: 0, backGroupId: 1 },
    2: { id: 2, name: 'must', label: 'マストシスター', hourlyWage: 2100, backGroupId: 1 },
    3: { id: 3, name: 'grand', label: 'グランドシスター', hourlyWage: 1900, backGroupId: 1 },
    4: { id: 4, name: 'manager', label: '店長', hourlyWage: 1700, backGroupId: 2 },
    5: { id: 5, name: 'chief', label: 'チーフシスター', hourlyWage: 1600, backGroupId: 2 },
    6: { id: 6, name: 'kirakira', label: 'キラキラシスター', hourlyWage: 1500, backGroupId: 3 },
    7: { id: 7, name: 'sister', label: 'シスター', hourlyWage: 1300, backGroupId: 4 },
    8: { id: 8, name: 'apprentice', label: '見習いシスター', hourlyWage: 1200, backGroupId: 4 },
    9: { id: 9, name: 'training', label: '研修シスター', hourlyWage: 1500, backGroupId: 3 },
    10: { id: 10, name: 'executive', label: 'エグゼクティブシスター', hourlyWage: 0, backGroupId: 1 }, // Executive has special 50% rule
};

/**
 * 簡易的なバック率モデル (平均的な売上に対する還元率の推計)
 * 厳密にはアイテムごとに異なりますが、最適化ロジックではカテゴリー別の「期待還元率」として定義します。
 */
export const BACK_RATES = {
    1: { // Rank 1-3
        champagne: 0.27, // 22000 -> 6000 (Michael)
        wine: 0.125,     // 8800 -> 1100
        vip: 0.30,      // 22000 -> 6600
        system: 0.20,   // 8900 -> 1800
        others: 0.15
    },
    2: { // Rank 4-5
        champagne: 0.22, // 22000 -> 5000
        wine: 0.125,     // 8800 -> 1100
        vip: 0.25,      // 22000 -> 5500
        system: 0.20,
        others: 0.12
    },
    3: { // Rank 6,9
        champagne: 0.18, // 22000 -> 4000
        wine: 0.125,     // 8800 -> 1100
        vip: 0.20,      // 22000 -> 4400
        system: 0.18,
        others: 0.10
    },
    4: { // Rank 7-8
        champagne: 0.09, // 22000 -> 2000
        wine: 0.045,     // 8800 -> 400
        vip: 0.10,      // 22000 -> 2200
        system: 0.09,   // 8900 -> 800
        others: 0.05
    }
};

/**
 * 名前や数値からランクIDを取得するユーティリティ
 */
export function getRankId(rankValue: string | number): number {
    if (typeof rankValue === 'number') return rankValue;
    
    // 文字列(S, A, B, C等)からマッピング
    const map: Record<string, number> = {
        'S': 2, 'A': 3, 'B': 5, 'C': 7,
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10
    };
    return map[rankValue] || 7; // デフォルトはシスター
}
