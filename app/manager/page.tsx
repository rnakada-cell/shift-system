"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    LayoutDashboard, 
    Settings, 
    ArrowLeftRight, 
    FileBarChart, 
    ArrowRightCircle,
    Package,
    Users
} from "lucide-react";
import { OptimizationMode, OptimizationScope, OptimizationWeights, OptimizationConstraints, DaySegmentCapacity, Cast, TimeSegment } from "@/lib/optimizer";
import { toLocalDateString, formatDate } from "@/lib/utils";

// Components
import ExecutiveSummary from "../components/ExecutiveSummary";
import DayCapacityModal from "../components/DayCapacityModal";
import ShiftControlPanel from "../components/ShiftControlPanel";
import ShiftResultView from "../components/ShiftResultView";
import SettingsManagementTab from "../components/SettingsManagementTab";
import SwapApprovalTab from "../components/SwapApprovalTab";
import NotificationBell from "../components/NotificationBell";
import CastManagementTab from "../components/CastManagementTab";

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
    const [confirmedShiftEntries, setConfirmedShiftEntries] = useState<any[]>([]);
    const [confirmingShift, setConfirmingShift] = useState(false);
    const [activeTab, setActiveTab] = useState<'shifts' | 'settings' | 'swaps' | 'cast'>('shifts');
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
                const [cR, sR, pR] = await Promise.all([
                    fetch('/api/casts'), 
                    fetch('/api/settings'),
                    fetch('/api/casts/pairs')
                ]);
                const cJ = await cR.json(); 
                const sJ = await sR.json();
                const pJ = await pR.json();

                if (cJ.success) setCasts(cJ.data);
                if (pJ.success) setPairRules(pJ.data);
                if (sJ.success) {
                    const sData = sJ.data;
                    setTimeSegments(sData.defaultSegments);
                    if (sData.rankDefaultWages) setRankWages(sData.rankDefaultWages);
                    if (sData.defaultCapacity) setStoreDefaultCapacity(sData.defaultCapacity);
                    
                    // AI重みの反映
                    setAiWeights({
                        scoreWeightHourlyRevenue: sData.scoreWeightHourlyRevenue ?? 0.4,
                        scoreWeightTotalRevenue: sData.scoreWeightTotalRevenue ?? 0.3,
                        scoreWeightCustomerCount: sData.scoreWeightCustomerCount ?? 0.2,
                        scoreWeightAttendanceRate: sData.scoreWeightAttendanceRate ?? 0.1,
                        scorePeriodDays: sData.scorePeriodDays ?? 30
                    });
                }
            } catch (e) { console.error(e); }
        };
        init();
    }, []);

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
            const a = document.createElement('a');
            a.href = url;
            a.download = `shift_export_${date}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            alert("エクスポートに失敗しました。");
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-cyan-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-[1600px] mx-auto px-6 py-8 md:px-12">
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12 border-b border-white/5 pb-10">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl shadow-xl shadow-indigo-600/20">
                                <LayoutDashboard className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black italic italic tracking-tighter uppercase">
                                    マネージャー<span className="text-indigo-500">センター</span>
                                </h1>
                                <p className="text-gray-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-1">AI解析・最適化エンジン // v4.1-JP</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-[#111111]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                            <a href="/cast" target="_blank" className="flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">
                                <Users className="w-4 h-4" /> キャスト画面を開く
                            </a>
                            <div className="w-[1px] h-4 bg-white/10 self-center" />
                            <NotificationBell userId="manager" />
                        </div>

                        <button 
                            onClick={handleConfirmShift} 
                            disabled={!data || confirmingShift}
                            className="bg-white text-black font-black italic italic px-10 py-4 rounded-2xl text-sm shadow-2xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-20 flex items-center gap-3"
                        >
                            <ArrowRightCircle className="w-5 h-5" />
                            シフトを確定する
                        </button>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-4 space-y-8">
                        <ShiftControlPanel 
                            mode={mode} scope={scope} date={date} startDate={startDate} endDate={endDate} month={month}
                            weights={weights} constraints={constraints} loading={loading} confirmingShift={confirmingShift}
                            scrapedArpu={scrapedArpu} aiWeights={aiWeights} rankWages={rankWages} pairRules={pairRules}
                            onModeChange={(m) => { setMode(m); runOptimizer(m, scope, weights, constraints); }} 
                            onScopeChange={(s) => { setScope(s); runOptimizer(mode, s, weights, constraints); }}
                            onWeightsChange={setWeights} onConstraintsChange={setConstraints} onDateChange={setDate}
                            onStartDateChange={setStartDate} onEndDateChange={setEndDate} onMonthChange={setMonth}
                            onRunOptimizer={() => runOptimizer()} onConfirmShift={handleConfirmShift}
                            onDeletePair={async (id) => {
                                if (!confirm("削除しますか？")) return;
                                try {
                                    const res = await fetch('/api/casts/pairs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
                                    if (res.ok) {
                                        // 全体リロードではなくステートのみ更新する方がスマート
                                        setPairRules(prev => prev.filter(p => p.id !== id));
                                    }
                                } catch (e) { alert("失敗"); }
                            }} 
                            onResetShift={async () => {
                                if (!confirm("期間内のデータを初期化しますか？")) return;
                                try {
                                    const res = await fetch('/api/shifts/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate, endDate }) });
                                    if (res.ok) { setData(null); fetchConfirmedShifts(); }
                                } catch (e) { alert("エラー"); }
                            }} 
                            onOpenCapacityModal={() => setIsCapacityModalOpen(true)}
                        />
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-8 space-y-8">
                        <div className="flex bg-[#111111]/60 p-1.5 rounded-[24px] border border-white/5 backdrop-blur-3xl w-fit shadow-2xl overflow-hidden">
                            {[
                                { id: 'shifts', label: 'シフト分析', icon: <FileBarChart className="w-4 h-4" /> },
                                { id: 'swaps', label: '交代承認待ち', icon: <ArrowLeftRight className="w-4 h-4" /> },
                                { id: 'cast', label: 'キャスト管理', icon: <Users className="w-4 h-4" /> },
                                { id: 'settings', label: 'マスタ設定', icon: <Settings className="w-4 h-4" /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-3 px-8 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.35)]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="min-h-[600px]"
                            >
                                {activeTab === 'shifts' && (
                                    <div className="space-y-10">
                                        <div className="bg-[#0D0D0D]/60 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 shadow-2xl border-l-[1px] border-l-indigo-500/30">
                                            <div className="flex items-center gap-4 mb-8">
                                                <Package className="w-6 h-6 text-indigo-400" />
                                                <h3 className="text-xl font-black italic italic uppercase">インテリジェンス・サマリー</h3>
                                            </div>
                                            <ExecutiveSummary summary={data?.summary} confirmedCount={confirmedShiftEntries.length} />
                                        </div>

                                        {loading && (
                                            <div className="h-64 flex flex-col items-center justify-center bg-[#111111]/40 border border-white/5 rounded-[40px] backdrop-blur-xl">
                                                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                                                    <motion.div animate={{ x: [-200, 200] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-full h-full bg-indigo-500" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 animate-pulse">最適なシフトを計算中...</p>
                                            </div>
                                        )}
                                        
                                        {error && (
                                            <div className="p-10 bg-red-500/10 border border-red-500/20 rounded-[40px] text-red-500 text-center font-bold">{error}</div>
                                        )}

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
                                            onExport={handleExport}
                                        />
                                    </div>
                                )}

                                {activeTab === 'settings' && <SettingsManagementTab />}
                                {activeTab === 'swaps' && <SwapApprovalTab />}
                                {activeTab === 'cast' && (
                                    <CastManagementTab 
                                        casts={casts} 
                                        onRefreshCasts={async () => {
                                            const res = await fetch('/api/casts');
                                            const json = await res.json();
                                            if (json.success) setCasts(json.data);
                                        }} 
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            <DayCapacityModal 
                isOpen={isCapacityModalOpen} onClose={() => setIsCapacityModalOpen(false)}
                date={date} segments={timeSegments} dayCapacities={dayCapacities} defaultCapacity={storeDefaultCapacity}
                onUpdateCapacity={(key, val) => setDayCapacities(prev => ({ ...prev, [key]: val }))}
                onApplyToRange={(type) => alert("一括反映を完了しました。")}
            />
        </div>
    );
}
