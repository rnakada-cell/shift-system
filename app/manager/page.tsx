"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { OptimizationMode, OptimizationScope, OptimizationWeights, OptimizationConstraints, DaySegmentCapacity, Cast, TimeSegment } from "@/lib/optimizer";
import { getDateRange, formatDate, toLocalDateString } from "@/lib/utils";

// Components
import ExecutiveSummary from "../components/ExecutiveSummary";
import DayCapacityModal from "../components/DayCapacityModal";
import ShiftControlPanel from "../components/ShiftControlPanel";
import ShiftResultView from "../components/ShiftResultView";
import SettingsManagementTab from "../components/SettingsManagementTab";

const DEFAULT_WEIGHTS: OptimizationWeights = {
    revenueWeight: 1.0,
    profitWeight: 1.2,
    ltvBaseWeight: 0.8,
    rookieBonusWeight: 2.0,
};

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
    maxWeeklyHours: 40,
    maxConsecutiveDays: 5,
    laborCostLimit: 9999999,
};

export default function ManagerDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<OptimizationMode>("PROFIT_MAX");
    const [scope, setScope] = useState<OptimizationScope>("weekly");
    const [date, setDate] = useState(toLocalDateString(new Date()));
    const [startDate, setStartDate] = useState(() => toLocalDateString(new Date()));
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 6);
        return toLocalDateString(d);
    });
    const [month, setMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    });
    const [weights, setWeights] = useState<OptimizationWeights>(DEFAULT_WEIGHTS);
    const [constraints, setConstraints] = useState<OptimizationConstraints>(DEFAULT_CONSTRAINTS);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [casts, setCasts] = useState<Cast[]>([]);
    const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
    const [scrapedArpu, setScrapedArpu] = useState<number>(4600);
    const [pairRules, setPairRules] = useState<any[]>([]);
    const [aiWeights, setAiWeights] = useState({
        scoreWeightHourlyRevenue: 0.4,
        scoreWeightTotalRevenue: 0.3,
        scoreWeightCustomerCount: 0.2,
        scoreWeightAttendanceRate: 0.1,
        scorePeriodDays: 30
    });
    const [syncingPos, setSyncingPos] = useState(false);
    const [uploadingCsv, setUploadingCsv] = useState(false);
    const [confirmedShiftEntries, setConfirmedShiftEntries] = useState<any[]>([]);
    const [confirmingShift, setConfirmingShift] = useState(false);
    const [activeTab, setActiveTab] = useState<'shifts' | 'settings'>('shifts');
    const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
    const [rankWages, setRankWages] = useState<Record<string, number>>({
        'S': 3000, 'A': 2500, 'B': 2000, 'C': 1500
    });
    const [storeDefaultCapacity, setStoreDefaultCapacity] = useState({ min1F: 5, max1F: 6, min2F: 3, max2F: 4 });
    const [dayCapacities, setDayCapacities] = useState<Record<string, { 
        min1F: number; max1F: number; 
        min2F: number; max2F: number; 
    }>>({});

    const getCastName = useCallback((id: string) => casts.find(c => c.id === id)?.name || id, [casts]);
    const isCastRookie = useCallback((id: string) => casts.find(c => c.id === id)?.isRookie || false, [casts]);

    const buildDayCapacitiesArray = useCallback((): DaySegmentCapacity[] => {
        return Object.entries(dayCapacities).map(([key, val]) => {
            const [d, segmentId] = key.split('__');
            return { date: d, segmentId, min1F: val.min1F, max1F: val.max1F, min2F: val.min2F, max2F: val.max2F };
        });
    }, [dayCapacities]);

    const updateKPIs = (newData: any) => {
        if (!newData || !newData.dailyResults) return;
        let totalRevenue = 0; let totalCost = 0;
        newData.dailyResults.forEach((day: any) => {
            let dayRevenue = 0; let dayCost = 0;
            day.segments.forEach((seg: any) => {
                dayRevenue += seg.expectedRevenue || 0;
                const segCost = (seg.assignments || []).reduce((acc: number, a: any) => {
                    const cast = casts.find(c => c.id === a.castId);
                    return acc + ((cast?.hourlyWage || 2000) * 2);
                }, 0);
                dayCost += segCost;
                seg.expectedCost = segCost;
                seg.expectedProfit = (seg.expectedRevenue || 0) - segCost;
            });
            day.dailyRevenue = dayRevenue; day.dailyCost = dayCost; day.dailyProfit = dayRevenue - dayCost;
            totalRevenue += dayRevenue; totalCost += dayCost;
        });
        newData.summary = { ...newData.summary, totalRevenue, totalCost, totalProfit: totalRevenue - totalCost };
        setData(newData);
    };

    const runOptimizer = useCallback(async (
        selectedMode: OptimizationMode = mode,
        currentScope: OptimizationScope = scope,
        currentWeights: OptimizationWeights = weights,
        currentConstraints: OptimizationConstraints = constraints
    ) => {
        setLoading(true); setError(null);
        try {
            let reqStart = startDate; let reqEnd = endDate;
            if (currentScope === 'daily') { reqStart = date; reqEnd = date; }
            else if (currentScope === 'monthly') {
                reqStart = `${month}-01`;
                const lastDay = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
                reqEnd = `${month}-${lastDay.toString().padStart(2, '0')}`;
            }
            const res = await fetch(`/api/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: selectedMode, scope: currentScope, startDate: reqStart, endDate: reqEnd, date,
                    weights: currentWeights, constraints: currentConstraints, dayCapacities: buildDayCapacitiesArray(),
                }),
            });
            const json = await res.json();
            setData(json.data);
            if (json.data?.dailyResults?.length > 0) setExpandedDay(json.data.dailyResults[0].date);
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [mode, scope, weights, constraints, date, startDate, endDate, month, buildDayCapacitiesArray]);

    const fetchAiData = async () => {
        try {
            const [resP, resS] = await Promise.all([fetch('/api/casts/pairs'), fetch('/api/settings')]);
            const [jP, jS] = await Promise.all([resP.json(), resS.json()]);
            if (jP.success) setPairRules(jP.data);
            if (jS.success && jS.data) {
                setAiWeights({
                    scoreWeightHourlyRevenue: jS.data.scoreWeightHourlyRevenue,
                    scoreWeightTotalRevenue: jS.data.scoreWeightTotalRevenue,
                    scoreWeightCustomerCount: jS.data.scoreWeightCustomerCount,
                    scoreWeightAttendanceRate: jS.data.scoreWeightAttendanceRate,
                    scorePeriodDays: jS.data.scorePeriodDays,
                });
                if (jS.data.rankDefaultWages) setRankWages(jS.data.rankDefaultWages);
                if (jS.data.defaultCapacity) setStoreDefaultCapacity(jS.data.defaultCapacity);
            }
        } catch (e) { console.error(e); }
    };

    const handleRecalculateScores = async () => {
        try {
            const res = await fetch('/api/casts/scores/recalculate', { method: 'POST' });
            if (res.ok) {
                alert("スコアの再計算が完了しました。");
                const castsRes = await fetch('/api/casts');
                const castsJson = await castsRes.json();
                if (castsJson.success) setCasts(castsJson.data);
            }
        } catch (e) { alert("失敗しました"); }
    };

    const handleDeletePair = async (id: string) => {
        if (!confirm("削除しますか？")) return;
        try {
            const res = await fetch('/api/casts/pairs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) fetchAiData();
        } catch (e) { alert("失敗"); }
    };

    const fetchConfirmedShifts = useCallback(async () => {
        try {
            const res = await fetch(`/api/shifts?date=${date}&shopId=love_point`);
            const d = await res.json();
            if (Array.isArray(d)) setConfirmedShiftEntries(d);
        } catch (e) { console.error(e); }
    }, [date]);

    useEffect(() => { fetchConfirmedShifts(); }, [date, fetchConfirmedShifts]);

    useEffect(() => {
        const init = async () => {
            try {
                const [cR, sR] = await Promise.all([fetch('/api/casts'), fetch('/api/settings')]);
                const cJ = await cR.json(); const sJ = await sR.json();
                if (cJ.success) setCasts(cJ.data);
                if (sJ.success) setTimeSegments(sJ.data.defaultSegments);
                fetchAiData();
                fetch('/api/scrape').then(r => r.json()).then(j => {
                    if (j.success && j.data?.menu?.estimatedArpu) setScrapedArpu(j.data.menu.estimatedArpu);
                });
            } catch (e) { console.error(e); }
        };
        init();
    }, []);

    const handleExport = async () => {
        if (!data) return;
        try {
            const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dailyResults: data.dailyResults, summary: data.summary })
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `shift_${scope}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
        } catch (e) { alert("失敗しました"); }
    };

    const handleConfirmShift = async () => {
        if (!data) return;
        setConfirmingShift(true);
        try {
            const res = await fetch('/api/shifts/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dailyResults: data.dailyResults })
            });
            const resJson = await res.json();
            if (resJson.success) {
                alert("シフトを確定保存しました。");
                fetchConfirmedShifts();
            }
        } catch (e) { alert("保存に失敗しました。"); } finally { setConfirmingShift(false); }
    };

    const handleCsvUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        setUploadingCsv(true);
        try {
            const res = await fetch('/api/pos/import', { method: 'POST', body: formData });
            const json = await res.json();
            if (json.success) alert(`インポート完了: ${json.count}件`);
        } catch (e) { alert("アップロード失敗"); } finally { setUploadingCsv(false); }
    };

    const handleResetShift = useCallback(async () => {
        if (!confirm("現在のシフト案を初期化し、DB上の保存済み（確定）シフトもこの期間分クリアしますか？")) return;
        
        let reqStart = startDate;
        let reqEnd = endDate;
        if (scope === 'daily') {
            reqStart = date;
            reqEnd = date;
        } else if (scope === 'monthly') {
            reqStart = `${month}-01`;
            const lastDay = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
            reqEnd = `${month}-${lastDay.toString().padStart(2, '0')}`;
        }

        try {
            const res = await fetch('/api/shifts/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: reqStart, endDate: reqEnd })
            });

            if (res.ok) {
                setData(null);
                setError(null);
                fetchConfirmedShifts();
            } else {
                alert("初期化に失敗しました。");
            }
        } catch (e) {
            alert("通信エラーが発生しました。");
        }
    }, [startDate, endDate, date, scope, month, fetchConfirmedShifts]);

    const handleApplyToRange = useCallback((rangeType: 'week' | 'month') => {
        let targetDates: string[] = [];
        if (rangeType === 'week') {
            targetDates = getDateRange(startDate, endDate);
        } else {
            const [year, monthNum] = month.split('-').map(Number);
            const firstDay = new Date(year, monthNum - 1, 1);
            const lastDay = new Date(year, monthNum, 0);
            targetDates = getDateRange(toLocalDateString(firstDay), toLocalDateString(lastDay));
        }

        const currentConfigs = Object.entries(dayCapacities)
            .filter(([key]) => key.startsWith(`${date}__`))
            .map(([key, val]) => ({ segmentId: key.split('__')[1], val }));

        if (currentConfigs.length === 0) {
            alert("現在の日の設定が見つかりません。設定を行ってから実行してください。");
            return;
        }

        if (!confirm(`${targetDates.length}日分の日程に現在の設定（${date}分）をコピーします。よろしいですか？`)) return;

        setDayCapacities(prev => {
            const next = { ...prev };
            targetDates.forEach(d => {
                if (d === date) return; // 自分自身にはコピー不要
                currentConfigs.forEach(cfg => {
                    next[`${d}__${cfg.segmentId}`] = cfg.val;
                });
            });
            return next;
        });

        alert("一括反映を完了しました。");
    }, [date, dayCapacities, startDate, endDate, month]);

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <div className="max-w-7xl mx-auto p-4 space-y-4">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 gap-2">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            Future Shift AI – 管理者ダッシュボード
                        </h1>
                        <div className="text-xs text-gray-500 font-bold">Shift Submission System v3.2-modular</div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleExport} disabled={!data || loading} className="bg-gray-800 hover:bg-gray-700 text-cyan-400 text-sm font-bold py-2 px-4 rounded transition-colors shadow border border-cyan-900/50 disabled:opacity-50">📊 Excel出力</button>
                        <a href="/casts" className="bg-gray-800 hover:bg-gray-700 text-emerald-400 text-sm font-bold py-2 px-4 rounded transition-colors shadow border border-emerald-900/50">👥 キャスト管理へ</a>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                    <ShiftControlPanel 
                        mode={mode} scope={scope} date={date} startDate={startDate} endDate={endDate} month={month}
                        weights={weights} constraints={constraints} loading={loading} confirmingShift={confirmingShift}
                        scrapedArpu={scrapedArpu} aiWeights={aiWeights} rankWages={rankWages} pairRules={pairRules}
                        onModeChange={handleModeChange} onScopeChange={handleScopeChange}
                        onWeightsChange={setWeights} onConstraintsChange={setConstraints} onDateChange={setDate}
                        onStartDateChange={setStartDate} onEndDateChange={setEndDate} onMonthChange={setMonth}
                        onRunOptimizer={() => runOptimizer()} onConfirmShift={handleConfirmShift}
                        onDeletePair={handleDeletePair} 
                        onResetShift={handleResetShift} onOpenCapacityModal={() => setIsCapacityModalOpen(true)}
                    />

                    <div className="xl:col-span-3 space-y-4">
                        <div className="flex border-b border-gray-800">
                            {(['shifts', 'settings'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === tab ? 'text-indigo-400 border-indigo-400 bg-indigo-400/5' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}>
                                    {tab === 'shifts' ? '📅 シフト管理' : '⚙️ マスタ設定・CSV'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'shifts' && (
                            <div className="space-y-4">
                                <ExecutiveSummary summary={data?.summary} confirmedCount={confirmedShiftEntries.length} />
                                {loading && <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse bg-gray-900 border border-gray-800 rounded-xl">AIが最適シフトを計算中...</div>}
                                {error && <div className="text-red-400 p-4 bg-red-900/20 border border-red-800 rounded-xl">{error}</div>}
                                <ShiftResultView 
                                    data={data} 
                                    expandedDay={expandedDay} 
                                    onSetExpandedDay={setExpandedDay} 
                                    formatDate={formatDate} 
                                    getCastName={getCastName} 
                                    isCastRookie={isCastRookie} 
                                    onUpdateKPIs={updateKPIs} 
                                    dayCapacities={dayCapacities}
                                    onUpdateDayCapacity={(key, val) => setDayCapacities(prev => ({ ...prev, [key]: val }))}
                                />
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <SettingsManagementTab />
                        )}
                    </div>
                </div>
            </div>

            <DayCapacityModal 
                isOpen={isCapacityModalOpen}
                onClose={() => setIsCapacityModalOpen(false)}
                date={date}
                segments={timeSegments}
                dayCapacities={dayCapacities}
                defaultCapacity={storeDefaultCapacity}
                onUpdateCapacity={(key, val) => setDayCapacities(prev => ({ ...prev, [key]: val }))}
                onApplyToRange={handleApplyToRange}
            />
        </div>
    );

    function handleModeChange(m: OptimizationMode) { setMode(m); runOptimizer(m, scope, weights, constraints); }
    function handleScopeChange(s: OptimizationScope) { setScope(s); runOptimizer(mode, s, weights, constraints); }
}
