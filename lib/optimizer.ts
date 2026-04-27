/**
 * Future Shift AI - Core Optimizer Engine (Phase 2.5)
 * 貪欲法ベース × 期間制約対応 × モジュール分離設計
 */

export type OptimizationMode = 'REVENUE_MAX' | 'PROFIT_MAX' | 'LTV_MAX';
export type OptimizationScope = 'daily' | 'weekly' | 'monthly';

// ==================== TYPE DEFINITIONS ====================

export interface Cast {
    id: string;
    name: string;
    rank: string;
    hourlyWage: number;
    drinkBackRate: number;
    chekiBackRate: number;
    averageSales: number;
    nominationRate: number;
    snsFollowers: number;
    absenceRate: number;
    floorPreference: string;
    canOpen: boolean;
    canClose: boolean;
    preferredSegments: string[];
    isRookie: boolean;
    isUnderage?: boolean;   // NEW: 18歳・19歳キャスト制約
    isLeader?: boolean;     // NEW: フロントリーダー役割
    isManualWage?: boolean; 
    isManualBackRate?: boolean; // Phase 7: 手動設定上書きフラグ
    skillLevel?: number;
    aiScore?: number; // AIによる計算済みスコア (0-1000)
    lineId?: string; // LINE連携用ID
    strengthItems?: string[]; // Phase 5: 得意アイテム登録 (例: ["シャンパン", "チェキ"])
    arpu?: number;          // Phase 5: 実際の客単価 (円)
    hourlyRevenue?: number; // 全体の時給売上実績
    granularRevenue?: {     // 時間帯別の時給売上実績 (Phase 10: 14-00対応)
        early: number; // 14-18
        mid: number;   // 18-21
        late: number;  // 21-00
    };
}

export interface TimeSegment {
    id: string;
    label: string;
    hours: number;
    demandFactor: number;
    maxCapacity: number;
}

// Phase 2.5: 日×時間帯ごとの可変定員
export interface DaySegmentCapacity {
    date: string;        // 対象日付
    segmentId: string;   // 対象セグメントID
    requiredMin?: number; 
    requiredMax?: number; 
    min1F?: number;      
    max1F?: number;      
    min2F?: number;      
    max2F?: number;      
}

// Phase 3: 期間・カレンダー・自由時間枠対応の希望データ
export interface SegmentAvailability {
    segmentId: string;      
    startTime?: string;     
    endTime?: string;       
    hasCompanion?: boolean; 
    hasDropIn?: boolean;    
}

export interface PeriodAvailability {
    date: string;        // YYYY-MM-DD
    startTime?: string;     
    endTime?: string;       
    targetFloor?: string; // "1F", "2F", "ANY"
    segments: SegmentAvailability[]; 
    notes?: string;       
}

export interface CastAvailability {
    castId: string;
    availability: PeriodAvailability[];
}

export type OptimizationWeights = {
    revenueWeight: number;
    profitWeight: number;
    ltvBaseWeight: number;
    rookieBonusWeight: number;
};

// Phase 3: Dynamic Data from Scraper
export interface ScrapedData {
    expectedArpu: number; 
    eventMultiplier?: number;
    trendingItems?: string[]; 
    demandTrends?: {
        dayOfWeek: number;
        hour: number;
        avgCustomerCount: number;
        avgSales: number;
        avgArpu: number;
    }[];
}

// Phase 4: ペアルール
export interface CastPairRule {
    castNameA: string;
    castNameB: string;
    ruleType: 'ng' | 'synergy';
    penalty: number;
}

// 確定シフト（POSCONEで青バーなもの）
// 最適化内で固定配置される
export interface ConfirmedShiftEntry {
    castId: string;       // Castマスタのid
    castName: string;
    date: string;         // YYYY-MM-DD
    startTime: string;    // HH:MM
    endTime: string;      // HH:MM
    shopId?: string;
}

// Phase 2.5: 制約条件
export type OptimizationConstraints = {
    maxWeeklyHours: number;     
    minWeeklyHours?: number;    
    maxConsecutiveDays: number; 
    laborCostLimit: number;     
};

export type SegmentResult = {
    segmentId: string;
    label?: string; 
    assignedCastIds: string[];
    assignments?: { castId: string, floor: '1F' | '2F', notes?: string }[];
    expectedRevenue: number;
    expectedCost: number;
    expectedProfit: number;
    unassignedReasons: { castId: string; reason: string }[];
    rationales?: { castId: string; rationale: string }[]; 
    detailedRationales?: { castId: string; rationale: { type: string, value: number, label: string }[] }[];
};

export type DailyResult = {
    date: string;
    segments: SegmentResult[];
    dailyRevenue: number;
    dailyCost: number;
    dailyProfit: number;
};

export type OptimizationResult = {
    scope: OptimizationScope;
    mode: OptimizationMode;
    summary: {
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
    };
    dailyResults: DailyResult[];
};

// ==================== SCORE CALCULATION ====================

function calcBaseScore(
    cast: Cast,
    segment: TimeSegment,
    date: string,
    mode: OptimizationMode,
    weights: OptimizationWeights,
    hasCompanion: boolean = false,
    hasDropIn: boolean = false,
    scrapedData?: ScrapedData
): { 
    baseScore: number, 
    expectedRevenue: number, 
    expectedCost: number, 
    detailedRationale: { type: string, value: number, label: string }[]
} {
    const companionBonus = hasCompanion ? 30000 : 0;
    const dropInBonus = hasDropIn ? 20000 : 0;

    let hourlyRevenuePotential = cast.hourlyRevenue || (cast.aiScore ? cast.aiScore * 10 : cast.averageSales || 0);
    if (hourlyRevenuePotential < 1000) {
        hourlyRevenuePotential = (cast.aiScore ? cast.aiScore * 10 : (cast.averageSales && cast.averageSales > 1000 ? cast.averageSales : 15000)); 
    }

    const d = new Date(date);
    const day = d.getDay();
    const isWeekend = (day === 0 || day === 6);
    const hour = parseInt(segment.label.split(':')[0]);
    const isNight = (hour >= 21 || hour < 5);

    if (cast.granularRevenue) {
        if (hour >= 14 && hour < 18 && cast.granularRevenue.early > 0) {
            hourlyRevenuePotential = cast.granularRevenue.early;
        } else if (hour >= 18 && hour < 21 && cast.granularRevenue.mid > 0) {
            hourlyRevenuePotential = cast.granularRevenue.mid;
        } else if ((hour >= 21 || hour < 2) && cast.granularRevenue.late > 0) {
            hourlyRevenuePotential = cast.granularRevenue.late;
        }
    }

    let dynamicDemandFactor = segment.demandFactor;
    const detailedRationale: { type: string, value: number, label: string }[] = [];

    if (scrapedData?.demandTrends) {
        const trend = scrapedData.demandTrends.find(t => t.dayOfWeek === day && t.hour === hour);
        if (trend) {
            const baseline = 20000;
            const ratio = trend.avgSales / baseline;
            dynamicDemandFactor = Math.min(2.5, Math.max(0.5, ratio)); 
            detailedRationale.push({ type: 'demand', value: dynamicDemandFactor, label: `需要予測補正: x${dynamicDemandFactor.toFixed(2)}` });
        }
    }
        
    let baseRevenue = hourlyRevenuePotential * segment.hours * dynamicDemandFactor;
    detailedRationale.push({ type: 'base', value: baseRevenue, label: `基礎売上予測: ¥${Math.round(baseRevenue).toLocaleString()}` });

    if (cast.strengthItems && scrapedData?.trendingItems) {
        const matchingItems = cast.strengthItems.filter(item => scrapedData.trendingItems?.includes(item));
        if (matchingItems.length > 0) {
            const boost = baseRevenue * 0.1; 
            baseRevenue += boost;
            detailedRationale.push({ type: 'item', value: boost, label: `トレンド一致傾向: +¥${Math.round(boost).toLocaleString()}` });
        }
    }

    if (hasCompanion) detailedRationale.push({ type: 'companion', value: 30000, label: `同伴予約: +¥30,000` });
    if (hasDropIn) detailedRationale.push({ type: 'dropin', value: 20000, label: `フリー送客: +¥20,000` });

    const expectedRevenue = Math.round(baseRevenue + companionBonus + dropInBonus);
    
    // バック額の推定 (手動入力データがある場合は優先)
    let backRate = 0.12; // default fallback
    const manualBackAvg = ((cast.drinkBackRate || 0) + (cast.chekiBackRate || 0)) / 2;
    
    if (manualBackAvg > 0) {
        backRate = manualBackAvg;
    } else {
        const r = cast.rank;
        if (r === 'S' || r === 'A' || r === '1' || r === '2' || r === '3') backRate = 0.20;
        else if (r === 'B' || r === '4' || r === '5') backRate = 0.15;
        else if (r === '7' || r === '8') backRate = 0.08;
    }
    
    const projectedBackPay = expectedRevenue * backRate;
    const expectedCost = Math.round((cast.hourlyWage * segment.hours) + projectedBackPay);

    let baseScore = 0;
    if (mode === 'REVENUE_MAX') {
        const efficiency = expectedRevenue / (expectedCost || 1);
        baseScore = (expectedRevenue * weights.revenueWeight) * (1 + (efficiency * 0.1));
    } else if (mode === 'PROFIT_MAX') {
        baseScore = (expectedRevenue - expectedCost) * weights.profitWeight;
    } else {
        // LTV_MAX モード（デフォルト）: 売上予測に加え、新人・実績重視
        const rookiePoints = cast.isRookie ? 1000000 : 0; // 新人は圧倒的優先 (議事録: 100%通す)
        baseScore = (expectedRevenue * weights.ltvBaseWeight) + (rookiePoints * weights.rookieBonusWeight);
    }

    const attendanceFactor = 1.0 - (cast.absenceRate || 0);
    baseScore *= Math.max(0.5, attendanceFactor);

    return { 
        baseScore, 
        expectedRevenue, 
        expectedCost, 
        detailedRationale
    };
}

// ==================== SINGLE DAY OPTIMIZER ====================

function optimizeDay(
    date: string,
    casts: Cast[],
    availabilities: CastAvailability[],
    segments: TimeSegment[],
    mode: OptimizationMode,
    weights: OptimizationWeights,
    cumulativeHours: Map<string, number>,
    consecutiveDays: Map<string, number>,
    totalCostSoFar: { value: number },
    constraints: OptimizationConstraints,
    pairRules: CastPairRule[] = [], 
    dayCapacities: DaySegmentCapacity[] = [],
    scrapedData?: ScrapedData,
    confirmedShifts: ConfirmedShiftEntry[] = []
): DailyResult {

    const segmentsResult: SegmentResult[] = [];
    let dailyRevenue = 0;
    let dailyCost = 0;

    const assignedTodayCasts = new Set<string>();
    const castLastFloor = new Map<string, '1F' | '2F'>();

    const toMin = (t: string) => { 
        const [h, m] = t.split(':').map(Number); 
        let adjustedH = h;
        if (h >= 0 && h <= 5) adjustedH += 24;
        return adjustedH * 60 + m; 
    };

    const todayConfirmed = confirmedShifts.filter(cs => cs.date === date);
    const confirmedCastIds = new Set(todayConfirmed.map(cs => cs.castId));

    todayConfirmed.forEach(cs => {
        assignedTodayCasts.add(cs.castId);
        const workedHours = Math.max(0, (toMin(cs.endTime) - toMin(cs.startTime)) / 60);
        cumulativeHours.set(cs.castId, (cumulativeHours.get(cs.castId) || 0) + workedHours);
    });

    for (const segment of segments) {
        const availableCandidates = availabilities
            .map(a => {
                const dayAvail = a.availability.find(av => av.date === date);
                if (!dayAvail) return null;

                if (confirmedCastIds.has(a.castId)) return null;

                const segAvail = dayAvail.segments?.find(s => (s as any).segmentId === segment.id);

                let isTimeMatch = false;
                if (dayAvail.startTime && dayAvail.endTime) {
                    const toMinutes = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        let adjustedH = h;
                        if (h >= 0 && h <= 5) adjustedH += 24;
                        return adjustedH * 60 + m;
                    };
                    const segStart = segment.label.split(/[-〜~～]/)[0]?.trim();
                    if (segStart && segStart.includes(':')) {
                        const sMin = toMinutes(segStart);
                        const startMin = toMinutes(dayAvail.startTime);
                        const endMin = toMinutes(dayAvail.endTime);
                        if (startMin <= sMin && endMin > sMin) isTimeMatch = true;
                    }
                }

                if (!segAvail && !isTimeMatch) return null;

                const cast = casts.find(c => c.id === a.castId);
                if (!cast) return null;

                const targetFloor = dayAvail.targetFloor || cast.floorPreference || 'ANY';
                return { cast, segAvail: (segAvail as SegmentAvailability) || { segmentId: segment.id }, targetFloor, isTimeMatch };
            })
            .filter((item): item is { cast: Cast, segAvail: SegmentAvailability, targetFloor: string, isTimeMatch: boolean } => item !== null);

        const isFirstSegment = segment === segments[0];
        const isLastSegment = segment === segments[segments.length - 1];

        let candidates = availableCandidates.map(({ cast, segAvail, targetFloor, isTimeMatch }) => {
            const isVeteranRole = cast.rank === 'S' || cast.rank === 'A';
            const rookie = (cast.isRookie !== undefined) ? cast.isRookie : !isVeteranRole;
            const updatedCast = { ...cast, isRookie: rookie };

            const hasCompanion = !!segAvail.hasCompanion;
            const hasDropIn = !!segAvail.hasDropIn;
            const isManuallyRequested = isTimeMatch || (!!segAvail && Object.keys(segAvail).length > 1);

            const { baseScore, expectedRevenue, expectedCost, detailedRationale } = calcBaseScore(updatedCast, segment, date, mode, weights, hasCompanion, hasDropIn, scrapedData);

            let score = baseScore;
            
            // 希望シフトへの強力なインセンティブ
            if (isManuallyRequested) {
                const requestBoost = 200000; // 圧倒的な加点
                score += requestBoost;
                detailedRationale.push({ type: 'request', value: requestBoost, label: '希望シフト優先加点' });
            }

            if (isFirstSegment && updatedCast.canOpen) score += 50000;
            if (isLastSegment && updatedCast.canClose) score += 50000;
            const riskPenalty = updatedCast.absenceRate ? (updatedCast.absenceRate * 20000) : 0;
            score -= riskPenalty;

            return {
                cast: updatedCast,
                targetFloor,
                score,
                baseScore,
                expectedRevenue,
                expectedCost,
                hasCompanion,
                hasDropIn,
                isManuallyRequested, // フラグ保持
                assignedFloor: null as '1F' | '2F' | null,
                rationale: isManuallyRequested ? "本人希望" : "",
                detailedRationale
            };
        });

        let currentRevenue = 0;
        let currentCost = 0;
        const assignedInSegment: typeof candidates = [];
        const assignments: { castId: string; floor: '1F' | '2F'; notes: string }[] = [];
        const assignedThisSegment: string[] = [];

        const confirmedInSegment: typeof candidates = []; // 確定枠を追跡するためのリスト

        // ── 確定シフトを先にセグメントにアサイン ──
        const segStartMatch = segment.label.split(/[~～\-〜]/)[0]?.trim();
        const sMin = segStartMatch ? toMin(segStartMatch) : 0;
        
        todayConfirmed.forEach(cs => {
            const cast = casts.find(c => c.id === cs.castId);
            if (!cast) return;

            const startMin = toMin(cs.startTime);
            const endMin = toMin(cs.endTime);
            if (startMin <= sMin && endMin > sMin) {
                const targetFloor: '1F' | '2F' = cs.shopId === 'room_of_love_point' ? '2F' : '1F';
                
                castLastFloor.set(cast.id, targetFloor);

                const scoreRes = calcBaseScore(cast, segment, date, mode, weights, false, false, scrapedData);
                
                confirmedInSegment.push({
                    cast,
                    targetFloor,
                    score: scoreRes.baseScore,
                    baseScore: scoreRes.baseScore,
                    expectedRevenue: scoreRes.expectedRevenue,
                    expectedCost: scoreRes.expectedCost,
                    hasCompanion: false,
                    hasDropIn: false,
                    isManuallyRequested: false,
                    assignedFloor: targetFloor,
                    rationale: 'POSCONE確定済',
                    detailedRationale: scoreRes.detailedRationale
                });
            }
        });

        const assignedFloor1: typeof candidates = [];
        const assignedFloor2: typeof candidates = [];
        const unassignedReasons: { castId: string; reason: string }[] = [];

        // フロアごとの定員枠
        const dayCap = dayCapacities.find(dc => dc.date === date && dc.segmentId === segment.id);
        const max1F = dayCap?.max1F ?? 999;
        const max2F = dayCap?.max2F ?? 999;

        // 確定枠で埋まっている分、AIの配置上限を減らす
        const adjustedSegmentCapacity = Math.max(0, segment.maxCapacity - confirmedInSegment.length);
        let aiAssignedCount = 0;

        while (candidates.length > 0) {
            candidates.sort((a, b) => b.score - a.score);
            const candidate = candidates.shift()!;
            const castId = candidate.cast.id;

            // Phase 10: 本人希望または同期による希望がない人を勝手に入れないように制限（ノイズ防止）
            if (!candidate.isManuallyRequested) {
                unassignedReasons.push({ castId, reason: '本人希望なし' });
                continue;
            }

            if (aiAssignedCount >= adjustedSegmentCapacity) {
                unassignedReasons.push({ castId, reason: 'AI割当上限に到達' });
                continue;
            }

            if (cumulativeHours.get(castId)! + segment.hours > constraints.maxWeeklyHours) {
                unassignedReasons.push({ castId, reason: `週最大労働時間超過` });
                continue;
            }

            if (!assignedTodayCasts.has(castId) && (consecutiveDays.get(castId) || 0) >= constraints.maxConsecutiveDays) {
                unassignedReasons.push({ castId, reason: `連勤上限超過` });
                continue;
            }

            if (totalCostSoFar.value + candidate.expectedCost > constraints.laborCostLimit) {
                unassignedReasons.push({ castId, reason: `人件費上限超過` });
                continue;
            }

            if (candidate.cast.isRookie && assignedInSegment.filter(a => a.cast.isRookie).length >= 2) {
                unassignedReasons.push({ castId, reason: '新人枠超過' });
                continue;
            }

            let assignedFloor: '1F' | '2F' | null = null;
            let floorRationale = "";

            const canAssignTo = (floor: '1F' | '2F') => {
                const assignedList = floor === '1F' ? assignedFloor1 : assignedFloor2;
                return !pairRules.some(r => r.ruleType === 'ng' && 
                    ((r.castNameA === candidate.cast.name && assignedList.some(a => a.cast.name === r.castNameB)) ||
                     (r.castNameB === candidate.cast.name && assignedList.some(a => a.cast.name === r.castNameA))));
            };

            const can1 = assignedFloor1.length < max1F && canAssignTo('1F');
            const can2 = assignedFloor2.length < max2F && canAssignTo('2F');

            // --- 制約適用: 未成年は1Fのみ ---
            if (candidate.cast.isUnderage) {
                if (can1) { assignedFloor = '1F'; floorRationale = "未成年制約により1Fに配置"; }
                else { unassignedReasons.push({ castId, reason: '未成年制約（1Fのみ）だが1F満員' }); continue; }
            }

            if (!assignedFloor) {
                const currentAssignedTotal = assignedFloor1.length + assignedFloor2.length;
                const optimalDemand = 10 * segment.demandFactor;
                const diminishingFactor = currentAssignedTotal <= optimalDemand ? 1.0 : Math.max(0.1, 1.0 - (currentAssignedTotal - optimalDemand) * 0.15);
                const dynamicRevenue = candidate.expectedRevenue * diminishingFactor;

                const prevFloor = castLastFloor.get(castId);
                if (prevFloor === '1F' && can1) { assignedFloor = '1F'; floorRationale = "前期1Fを継続"; }
                else if (prevFloor === '2F' && can2) { assignedFloor = '2F'; floorRationale = "前期2Fを継続"; }

                if (!assignedFloor) {
                    if (candidate.cast.isLeader) {
                        const l1 = assignedFloor1.filter(a => a.cast.isLeader).length;
                        const l2 = assignedFloor2.filter(a => a.cast.isLeader).length;
                        if (l1 === 0 && can1) { assignedFloor = '1F'; floorRationale = "1Fリーダー"; }
                        else if (l2 === 0 && can2) { assignedFloor = '2F'; floorRationale = "2Fリーダー"; }
                    }

                    if (!assignedFloor) {
                        const p1 = candidate.targetFloor === '1F';
                        const p2 = candidate.targetFloor === '2F';
                        if (p1 && can1) { assignedFloor = '1F'; floorRationale = "希望1F優先"; }
                        else if (p2 && can2) { assignedFloor = '2F'; floorRationale = "希望2F優先"; }
                        else {
                            const isUnderMin = false; // Phase 10: To simplify, skip min requirements for now
                            const isRequested = (candidate as any).isManuallyRequested;
                            
                            // 希望が出ている場合は、赤字計算でも一旦入れる（店長の「希望を取り込む」意図を優先）
                            if (mode === 'PROFIT_MAX' && (dynamicRevenue - candidate.expectedCost) < 0 && !isUnderMin && !isRequested) {
                                unassignedReasons.push({ castId, reason: '需要不足による不採算' });
                                continue;
                            }
                            if (can1 && can2) {
                                const s1 = pairRules.filter(r => r.ruleType === 'synergy' && ((r.castNameA === candidate.cast.name && assignedFloor1.some(a => a.cast.name === r.castNameB)) || (r.castNameB === candidate.cast.name && assignedFloor1.some(a => a.cast.name === r.castNameA)))).length;
                                const s2 = pairRules.filter(r => r.ruleType === 'synergy' && ((r.castNameA === candidate.cast.name && assignedFloor2.some(a => a.cast.name === r.castNameB)) || (r.castNameB === candidate.cast.name && assignedFloor2.some(a => a.cast.name === r.castNameA)))).length;
                                if (s1 > s2) { assignedFloor = '1F'; floorRationale = "シナジー1F"; }
                                else if (s2 > s1) { assignedFloor = '2F'; floorRationale = "シナジー2F"; }
                                else if (assignedFloor1.length <= assignedFloor2.length) { assignedFloor = '1F'; floorRationale = "バランス1F"; }
                                else { assignedFloor = '2F'; floorRationale = "バランス2F"; }
                            } else if (can1) { assignedFloor = '1F'; floorRationale = "1F空きのみ"; }
                            else if (can2) { assignedFloor = '2F'; floorRationale = "2F空きのみ"; }
                        }
                    }
                }
            }

            if (!assignedFloor) {
                unassignedReasons.push({ castId, reason: '定員超過または制約' });
                continue;
            }

            candidate.assignedFloor = assignedFloor;
            (candidate as any).floorRationale = floorRationale;
            if (assignedFloor === '1F') assignedFloor1.push(candidate);
            else assignedFloor2.push(candidate);
            assignedInSegment.push(candidate);
            aiAssignedCount++;
            assignedTodayCasts.add(castId);
            castLastFloor.set(castId, assignedFloor);
            cumulativeHours.set(castId, (cumulativeHours.get(castId) || 0) + segment.hours);
            totalCostSoFar.value += candidate.expectedCost;

            const relevantRules = pairRules.filter(r => r.ruleType === 'synergy' && (r.castNameA === candidate.cast.name || r.castNameB === candidate.cast.name));
            if (relevantRules.length > 0) {
                candidates = candidates.map(c => {
                    const floorAssigned = candidate.assignedFloor === '1F' ? assignedFloor1 : assignedFloor2;
                    const synergies = pairRules.filter(r => r.ruleType === 'synergy' && ((r.castNameA === c.cast.name && floorAssigned.some(a => a.cast.name === r.castNameB)) || (r.castNameB === c.cast.name && floorAssigned.some(a => a.cast.name === r.castNameA))));
                    if (synergies.length === 0) return c;
                    const synergyBoost = c.expectedRevenue * (synergies.length * 0.15);
                    const newRevenue = c.expectedRevenue + synergyBoost;
                    let newScore = c.baseScore;
                    if (mode === 'REVENUE_MAX') newScore = (newRevenue * weights.revenueWeight) * (1 + ((newRevenue / (c.expectedCost || 1)) * 0.1));
                    else if (mode === 'PROFIT_MAX') newScore = (newRevenue - c.expectedCost) * weights.profitWeight;
                    else newScore = (newRevenue * weights.ltvBaseWeight) + (c.cast.isRookie ? 10000 : 0 * weights.rookieBonusWeight);
                    if (isFirstSegment && c.cast.canOpen) newScore += 50000;
                    if (isLastSegment && c.cast.canClose) newScore += 50000;
                    newScore -= c.cast.absenceRate ? (c.cast.absenceRate * 20000) : 0;
                    return { ...c, score: newScore, rationale: "シナジー増", detailedRationale: [...c.detailedRationale, { type: 'synergy', value: synergyBoost, label: `シナジー: +¥${synergyBoost}` }] };
                });
            }
        }

        const hasVeteran = assignedInSegment.some(a => !a.cast.isRookie);
        let finalAssigned = assignedInSegment;
        if (!hasVeteran && finalAssigned.length > 0) {
            finalAssigned.filter(a => a.cast.isRookie).forEach(r => unassignedReasons.push({ castId: r.cast.id, reason: 'ベテラン不在' }));
            finalAssigned = finalAssigned.filter(a => !a.cast.isRookie);
        }

        // ── 確定シフトとAIアサインをマージ ──
        finalAssigned.forEach(a => {
            const fr = (a as any).floorRationale;
            if (fr) a.rationale = a.rationale ? `${a.rationale} | ${fr}` : fr;
        });

        // 確定シフトを追加
        finalAssigned.push(...confirmedInSegment);

        let actualSegRevenue = 0;
        finalAssigned.sort((a,b) => b.expectedRevenue - a.expectedRevenue).forEach((a, i) => {
             const df = i <= (10 * segment.demandFactor) ? 1.0 : Math.max(0.1, 1.0 - (i - 10 * segment.demandFactor) * 0.15);
             actualSegRevenue += a.expectedRevenue * df;
        });
        
        const segRevenue = Math.min(actualSegRevenue, (scrapedData?.expectedArpu || 10000) * segment.maxCapacity * segment.demandFactor);
        const segCost = finalAssigned.reduce((s, a) => s + a.expectedCost, 0);

        segmentsResult.push({
            segmentId: segment.id,
            label: segment.label,
            assignedCastIds: finalAssigned.map(a => a.cast.id),
            assignments: finalAssigned.map(a => ({ 
                castId: a.cast.id, 
                floor: a.assignedFloor as '1F' | '2F',
                notes: (availabilities.find(av => av.castId === a.cast.id)?.availability.find(p => p.date === date) as any)?.notes || ""
            })),
            expectedRevenue: Math.round(segRevenue),
            expectedCost: segCost,
            expectedProfit: Math.round(segRevenue) - segCost,
            unassignedReasons: unassignedReasons,
            rationales: finalAssigned.filter(a => a.rationale).map(a => ({ castId: a.cast.id, rationale: a.rationale! })),
            detailedRationales: finalAssigned.filter(a => (a as any).detailedRationale).map(a => ({ castId: a.cast.id, rationale: (a as any).detailedRationale }))
        });

        dailyRevenue += segRevenue;
        dailyCost += segCost;
    }

    for (const cast of casts) consecutiveDays.set(cast.id, assignedTodayCasts.has(cast.id) ? (consecutiveDays.get(cast.id) || 0) + 1 : 0);

    return { date, segments: segmentsResult, dailyRevenue, dailyCost, dailyProfit: dailyRevenue - dailyCost };
}

// ==================== MAIN OPTIMIZER ====================

export function optimizeShift(
    dates: string[],                          
    casts: Cast[],
    availabilities: CastAvailability[],       
    segments: TimeSegment[],
    mode: OptimizationMode = 'REVENUE_MAX',
    scope: OptimizationScope = 'daily',
    weights: OptimizationWeights = {
        revenueWeight: 1.0,
        profitWeight: 1.2,
        ltvBaseWeight: 0.8,
        rookieBonusWeight: 2.0,
    },
    constraints: OptimizationConstraints = {
        maxWeeklyHours: 40,
        minWeeklyHours: 0,
        maxConsecutiveDays: 5,
        laborCostLimit: 9999999,
    },
    dayCapacities: DaySegmentCapacity[] = [],  
    pairRules: CastPairRule[] = [],            
    scrapedData?: ScrapedData,
    confirmedShifts: ConfirmedShiftEntry[] = []
): OptimizationResult {

    const dailyResults: DailyResult[] = [];
    const cumulativeHours = new Map<string, number>();
    const consecutiveDays = new Map<string, number>();
    const totalCostSoFar = { value: 0 };

    for (const cast of casts) {
        cumulativeHours.set(cast.id, 0);
        consecutiveDays.set(cast.id, 0);
    }

    for (const date of dates) {
        const dayResult = optimizeDay(
            date, casts, availabilities, segments, mode, weights,
            cumulativeHours, consecutiveDays, totalCostSoFar, constraints,
            pairRules, dayCapacities, scrapedData, confirmedShifts
        );
        dailyResults.push(dayResult);
    }

    const totalRevenue = dailyResults.reduce((s, d) => s + d.dailyRevenue, 0);
    const totalCost = dailyResults.reduce((s, d) => s + d.dailyCost, 0);

    return {
        scope,
        mode,
        summary: {
            totalRevenue,
            totalCost,
            totalProfit: totalRevenue - totalCost,
        },
        dailyResults,
    };
}
