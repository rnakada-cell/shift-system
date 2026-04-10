"use strict";
/**
 * Future Shift AI - Core Optimizer Engine (Phase 2.5)
 * 貪欲法ベース × 期間制約対応 × モジュール分離設計
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeShift = optimizeShift;
// ==================== SCORE CALCULATION ====================
function calcScore(cast, segment, mode, weights, 
// 追加: 同伴/来客のフラグ
hasCompanion, hasDropIn) {
    if (hasCompanion === void 0) { hasCompanion = false; }
    if (hasDropIn === void 0) { hasDropIn = false; }
    // 同伴・来客による売上ブースト（例: 同伴は+3万円、来客は+2万円の期待値加算）
    var companionBonus = hasCompanion ? 30000 : 0;
    var dropInBonus = hasDropIn ? 20000 : 0;
    var expectedRevenue = (cast.averageSales * segment.demandFactor) + companionBonus + dropInBonus;
    var expectedCost = cast.hourlyWage * segment.hours;
    if (mode === 'REVENUE_MAX') {
        return expectedRevenue * weights.revenueWeight;
    }
    else if (mode === 'PROFIT_MAX') {
        return (expectedRevenue - expectedCost) * weights.profitWeight;
    }
    else {
        // LTV_MAX: 売上 × ltvBaseWeight + 新人育成ポイント × rookieBonusWeight
        var rookiePoints = cast.isRookie ? 10000 : 0;
        return (expectedRevenue * weights.ltvBaseWeight) + (rookiePoints * weights.rookieBonusWeight);
    }
}
// ==================== SINGLE DAY OPTIMIZER ====================
function optimizeDay(date, casts, availabilities, segments, mode, weights, 
// 期間をまたぐ累積状態 (Phase 2.5)
cumulativeHours, consecutiveDays, totalCostSoFar, constraints, 
// 日×時間帯の可変定員オーバーライド
dayCapacities) {
    if (dayCapacities === void 0) { dayCapacities = []; }
    var segmentsResult = [];
    var dailyRevenue = 0;
    var dailyCost = 0;
    // 直前の稼働状況に関係なく、この日に割当があればconsecutiveDaysが加算される
    var assignedTodayCasts = new Set();
    var _loop_1 = function (segment) {
        // この時間帯に出勤可能なキャストとセグメントごとの希望詳細を抽出
        var availableCandidates = availabilities
            .map(function (a) {
            var dayAvail = a.availability.find(function (av) { return av.date === date; });
            if (!dayAvail)
                return null;
            // セグメントごとの詳細希望をチェック
            var segAvail = dayAvail.segments.find(function (s) { return s.segmentId === segment.id; });
            // Phase 3: 自由時間枠（startTime, endTime）のチェック
            // もし自由時間枠が指定されている場合、セグメントの時間帯が含まれているか確認
            var isTimeMatch = false;
            if (dayAvail.startTime && dayAvail.endTime) {
                // 簡易比較 (例: "18:00" vs "18:00-20:00")
                // セグメントの開始・終了（仮定）を取得
                var segStart = segment.label.split(' - ')[0];
                if (dayAvail.startTime <= segStart && dayAvail.endTime >= segStart) {
                    isTimeMatch = true;
                }
            }
            // セグメント指定があるか、自由時間枠に合致する場合のみ候補とする
            if (!segAvail && !isTimeMatch)
                return null;
            var cast = casts.find(function (c) { return c.id === a.castId; });
            if (!cast)
                return null;
            // セグメント指定がない場合は空のオブジェクトをデフォルトとする
            return { cast: cast, segAvail: segAvail || { segmentId: segment.id } };
        })
            .filter(function (item) { return item !== null; });
        // スコアを計算してソート
        var scoredCasts = availableCandidates.map(function (_a) {
            var cast = _a.cast, segAvail = _a.segAvail;
            var hasCompanion = !!segAvail.hasCompanion;
            var hasDropIn = !!segAvail.hasDropIn;
            // スコア計算時の期待売上にもボーナスを反映
            var companionBonus = hasCompanion ? 30000 : 0;
            var dropInBonus = hasDropIn ? 20000 : 0;
            var baseRevenue = cast.averageSales * segment.demandFactor;
            return {
                cast: cast,
                score: calcScore(cast, segment, mode, weights, hasCompanion, hasDropIn),
                expectedRevenue: baseRevenue + companionBonus + dropInBonus,
                expectedCost: cast.hourlyWage * segment.hours,
                hasCompanion: hasCompanion,
                hasDropIn: hasDropIn
            };
        }).sort(function (a, b) { return b.score - a.score; });
        // 日×時間帯の可変定員を取得（オーバーライドがあれば優先）
        var capacityOverride = dayCapacities.find(function (dc) { return dc.date === date && dc.segmentId === segment.id; });
        var effectiveMaxCapacity = capacityOverride ? capacityOverride.requiredMax : segment.maxCapacity;
        var assignedInSegment = [];
        var unassignedReasons = [];
        for (var _b = 0, scoredCasts_1 = scoredCasts; _b < scoredCasts_1.length; _b++) {
            var candidate = scoredCasts_1[_b];
            var castId = candidate.cast.id;
            // 制約1: 最大出勤人数（日×セグメントのオーバーライドを考慮）
            if (assignedInSegment.length >= effectiveMaxCapacity) {
                unassignedReasons.push({ castId: castId, reason: "\u5B9A\u54E1\uFF08".concat(effectiveMaxCapacity, "\u540D\uFF09\u306B\u9054\u3057\u305F\u305F\u3081") });
                continue;
            }
            // 制約2: 週の最大労働時間
            var currentHours = cumulativeHours.get(castId) || 0;
            if (currentHours + segment.hours > constraints.maxWeeklyHours) {
                unassignedReasons.push({ castId: castId, reason: "\u9031\u306E\u6700\u5927\u52B4\u50CD\u6642\u9593\uFF08".concat(constraints.maxWeeklyHours, "h\uFF09\u306B\u8D85\u904E\u306E\u305F\u3081") });
                continue;
            }
            // 制約3: 連勤上限
            var consec = consecutiveDays.get(castId) || 0;
            if (!assignedTodayCasts.has(castId) && consec >= constraints.maxConsecutiveDays) {
                unassignedReasons.push({ castId: castId, reason: "\u9023\u52E4\u4E0A\u9650\uFF08".concat(constraints.maxConsecutiveDays, "\u65E5\uFF09\u306B\u9054\u3057\u305F\u305F\u3081") });
                continue;
            }
            // 制約4: 総人件費上限
            if (totalCostSoFar.value + candidate.expectedCost > constraints.laborCostLimit) {
                unassignedReasons.push({ castId: castId, reason: "\u4EBA\u4EF6\u8CBB\u4E0A\u9650\uFF08\u00A5".concat(constraints.laborCostLimit.toLocaleString(), "\uFF09\u8D85\u904E\u306E\u305F\u3081") });
                continue;
            }
            // 制約5: 新人・ベテランペアリング
            if (candidate.cast.isRookie) {
                var hasVeteranAssigned = assignedInSegment.some(function (a) { return !a.cast.isRookie; });
                var hasVeteranInRemaining = scoredCasts.some(function (c) { return !c.cast.isRookie && !assignedInSegment.includes(c); });
                if (!hasVeteranAssigned && !hasVeteranInRemaining) {
                    unassignedReasons.push({ castId: castId, reason: '同時間帯にベテランがいないため（新人単独禁止）' });
                    continue;
                }
            }
            // アサイン決定
            assignedInSegment.push(candidate);
            assignedTodayCasts.add(castId);
            // 累積状態を更新
            cumulativeHours.set(castId, (cumulativeHours.get(castId) || 0) + segment.hours);
            totalCostSoFar.value += candidate.expectedCost;
        }
        // 最終的に新人単独になってしまった場合の後処理
        var hasVeteran = assignedInSegment.some(function (a) { return !a.cast.isRookie; });
        var finalAssigned = assignedInSegment;
        if (!hasVeteran) {
            var rookies = finalAssigned.filter(function (a) { return a.cast.isRookie; });
            rookies.forEach(function (r) { return unassignedReasons.push({ castId: r.cast.id, reason: '最終的にベテランが確保できなかったため' }); });
            finalAssigned = finalAssigned.filter(function (a) { return !a.cast.isRookie; });
        }
        var segRevenue = finalAssigned.reduce(function (s, a) { return s + a.expectedRevenue; }, 0);
        var segCost = finalAssigned.reduce(function (s, a) { return s + a.expectedCost; }, 0);
        segmentsResult.push({
            segmentId: segment.id,
            assignedCastIds: finalAssigned.map(function (a) { return a.cast.id; }),
            expectedRevenue: segRevenue,
            expectedCost: segCost,
            expectedProfit: segRevenue - segCost,
            unassignedReasons: unassignedReasons,
        });
        dailyRevenue += segRevenue;
        dailyCost += segCost;
    };
    for (var _i = 0, segments_1 = segments; _i < segments_1.length; _i++) {
        var segment = segments_1[_i];
        _loop_1(segment);
    }
    // 連勤日数を更新
    for (var _a = 0, casts_1 = casts; _a < casts_1.length; _a++) {
        var cast = casts_1[_a];
        if (assignedTodayCasts.has(cast.id)) {
            consecutiveDays.set(cast.id, (consecutiveDays.get(cast.id) || 0) + 1);
        }
        else {
            consecutiveDays.set(cast.id, 0); // 休日で連勤リセット
        }
    }
    return {
        date: date,
        segments: segmentsResult,
        dailyRevenue: dailyRevenue,
        dailyCost: dailyCost,
        dailyProfit: dailyRevenue - dailyCost,
    };
}
// ==================== MAIN OPTIMIZER ====================
function optimizeShift(dates, // 対象日付の配列（1日 or 複数日）
casts, availabilities, // 期間提出型の希望データ
segments, mode, scope, weights, constraints, dayCapacities // 日×時間帯の可変定員
) {
    if (mode === void 0) { mode = 'REVENUE_MAX'; }
    if (scope === void 0) { scope = 'daily'; }
    if (weights === void 0) { weights = {
        revenueWeight: 1.0,
        profitWeight: 1.2,
        ltvBaseWeight: 0.8,
        rookieBonusWeight: 2.0,
    }; }
    if (constraints === void 0) { constraints = {
        maxWeeklyHours: 40,
        minWeeklyHours: 0,
        maxConsecutiveDays: 5,
        laborCostLimit: 9999999,
    }; }
    if (dayCapacities === void 0) { dayCapacities = []; }
    var dailyResults = [];
    var cumulativeHours = new Map();
    var consecutiveDays = new Map();
    var totalCostSoFar = { value: 0 };
    for (var _i = 0, dates_1 = dates; _i < dates_1.length; _i++) {
        var date = dates_1[_i];
        var dayResult = optimizeDay(date, casts, availabilities, segments, mode, weights, cumulativeHours, consecutiveDays, totalCostSoFar, constraints, dayCapacities // 可変定員を渡す
        );
        dailyResults.push(dayResult);
    }
    var totalRevenue = dailyResults.reduce(function (s, d) { return s + d.dailyRevenue; }, 0);
    var totalCost = dailyResults.reduce(function (s, d) { return s + d.dailyCost; }, 0);
    return {
        scope: scope,
        mode: mode,
        summary: {
            totalRevenue: totalRevenue,
            totalCost: totalCost,
            totalProfit: totalRevenue - totalCost,
        },
        dailyResults: dailyResults,
    };
}
