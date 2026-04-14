"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Calendar as CalendarIcon, 
    Sparkles, 
    Trash2, 
    Send, 
    ChevronLeft, 
    ChevronRight, 
    LayoutGrid, 
    CheckCircle, 
    HelpCircle,
    User
} from "lucide-react";
import { PeriodAvailability, Cast, TimeSegment } from "@/lib/optimizer";
import { toLocalDateString } from "@/lib/utils";
import NotificationBell from "@/app/components/NotificationBell";

// カレンダー生成用ユーティリティ
function getDaysInMonth(year: number, month: number) {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
}

export default function CastInput() {
    const [currentYear, setCurrentYear] = useState(2026);
    const [currentMonth, setCurrentMonth] = useState(2); // 3月
    const [castId, setCastId] = useState("");
    const [systemCasts, setSystemCasts] = useState<Cast[]>([]);
    const [availability, setAvailability] = useState<Record<string, PeriodAvailability>>({});
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState<"input" | "confirmed" | "help">("input");
    const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
    const [helpRequests, setHelpRequests] = useState<any[]>([]);

    const VERSION = "v4.1.0-jp";

    useEffect(() => {
        setMounted(true);
    }, []);

    // キャスト一覧の読み込み
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [castsRes, settingsRes] = await Promise.all([
                    fetch('/api/casts'),
                    fetch('/api/settings')
                ]);
                const castsJson = await castsRes.json();
                const settingsJson = await settingsRes.json();

                if (castsJson.success) setSystemCasts(castsJson.data);
                if (settingsJson.success) setTimeSegments(settingsJson.data.defaultSegments);
            } catch (error: any) {
                console.error("Failed to fetch data:", error);
                setError("通信エラーが発生しました");
            }
        };
        fetchData();
    }, []);

    const days = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

    // 確定シフトの読み込み
    useEffect(() => {
        if (!castId || viewMode !== "confirmed" || days.length === 0) return;

        const fetchConfirmed = async () => {
            try {
                const start = toLocalDateString(days[0]);
                const end = toLocalDateString(days[days.length - 1]);
                const res = await fetch(`/api/shifts?castId=${castId}&startDate=${start}&endDate=${end}`);
                const data = await res.json();
                if (Array.isArray(data)) setConfirmedShifts(data);
            } catch (error) {
                console.error("Failed to fetch confirmed shifts:", error);
            }
        };
        fetchConfirmed();
    }, [castId, viewMode, currentYear, currentMonth, days]);

    // ヘルプ募集の読み込み
    useEffect(() => {
        if (viewMode !== "help") return;
        const fetchHelpRequests = async () => {
            try {
                const res = await fetch('/api/shifts/swap');
                const json = await res.json();
                if (json.success) setHelpRequests(json.data);
            } catch (error) {
                console.error("Failed to fetch help requests:", error);
            }
        };
        fetchHelpRequests();
    }, [viewMode]);

    // 既存の希望シフトの読み込み
    useEffect(() => {
        if (!castId || days.length === 0) {
            setAvailability({});
            return;
        }
        const fetchAvailabilities = async () => {
            try {
                const start = toLocalDateString(days[0]);
                const end = toLocalDateString(days[days.length - 1]);
                const res = await fetch(`/api/availabilities?castId=${castId}&startDate=${start}&endDate=${end}`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const mapped: Record<string, PeriodAvailability> = {};
                    json.data.forEach((a: any) => {
                        mapped[a.date] = { ...a, segments: a.segments || [] };
                    });
                    setAvailability(mapped);
                } else {
                    setAvailability({});
                }
            } catch (error) {
                console.error("Failed to fetch availabilities:", error);
                setAvailability({});
            }
        };
        fetchAvailabilities();
    }, [castId, currentYear, currentMonth, days]);

    const handleAIPredict = () => {
        if (!castId) {
            setMessage("まずは名前を選択してや！");
            return;
        }
        const newAvail: Record<string, PeriodAvailability> = { ...availability };
        days.forEach(d => {
            const dateStr = toLocalDateString(d);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            newAvail[dateStr] = {
                date: dateStr,
                startTime: "12:00",
                endTime: isWeekend ? "01:00" : "22:00",
                targetFloor: "ANY",
                segments: timeSegments.map(s => ({
                    segmentId: s.id,
                    hasCompanion: Math.random() > 0.85,
                    hasDropIn: Math.random() > 0.95
                }))
            };
        });
        setAvailability(newAvail);
        setMessage("標準的な出勤パターンで予測したよ！✨");
    };

    const handleReset = async () => {
        if (!castId) return setMessage("まずは名前を選択してや！");
        if (!confirm("今月分の申請をリセットしてもいい？")) return;
        try {
            const res = await fetch('/api/availabilities/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ castId, startDate: toLocalDateString(days[0]), endDate: toLocalDateString(days[days.length - 1]) })
            });
            if (res.ok) {
                setAvailability({});
                setMessage("リセット完了！🧹");
            }
        } catch (error) { setMessage("エラーが発生しました"); }
    };

    const handleSubmit = async () => {
        if (!castId) return setMessage("名前を選んでや！");
        const periodAvailabilities = Object.values(availability).filter(a => a.segments.length > 0 || a.startTime);
        try {
            const res = await fetch('/api/availabilities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ castId, availabilities: periodAvailabilities })
            });
            if (res.ok) setMessage("送信完了！🚀");
            else setMessage("送信失敗しました...");
        } catch (error) { setMessage("通信エラーが発生しました"); }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 py-8 md:px-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                                <CalendarIcon className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase italic italic">
                                キャストクラウド
                            </h1>
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold tracking-[0.2em] uppercase">シフト管理システム // {VERSION}</p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap items-center gap-4"
                    >
                        {/* Selector */}
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                            <select
                                value={castId}
                                onChange={e => setCastId(e.target.value)}
                                className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 text-white rounded-2xl pl-11 pr-10 py-4 min-w-[240px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-2xl appearance-none cursor-pointer hover:border-white/10"
                            >
                                <option value="">名前を選択してください</option>
                                {systemCasts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronRight className="w-4 h-4 text-gray-500 rotate-90" />
                            </div>
                        </div>

                        {/* Notification Bell */}
                        {castId && <NotificationBell userId={castId} />}
                    </motion.div>
                </header>

                <main className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Calendar Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="xl:col-span-8 space-y-8"
                    >
                        {/* View Toggles */}
                        <div className="flex bg-[#111111]/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-3xl w-fit">
                            {[
                                { id: 'input', label: '希望入力', icon: <LayoutGrid className="w-4 h-4" /> },
                                { id: 'confirmed', label: '確定確認', icon: <CheckCircle className="w-4 h-4" /> },
                                { id: 'help', label: 'ヘルプ募集', icon: <HelpCircle className="w-4 h-4" /> }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id as any)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${viewMode === mode.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {mode.icon}
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-[#0D0D0D]/80 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CalendarIcon className="w-64 h-64 -mr-20 -mt-20" />
                            </div>

                            <div className="relative flex items-center justify-between mb-12">
                                <h2 className="text-4xl font-black italic italic tracking-tighter">
                                    {currentMonth + 1} <span className="text-indigo-500">.</span> {currentYear}
                                </h2>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setCurrentMonth(m => (m === 0 ? 11 : m - 1))}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setCurrentMonth(m => (m === 11 ? 0 : m + 1))}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-3 mb-4">
                                {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-black text-gray-600 tracking-widest">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-3">
                                {mounted && Array(days[0].getDay()).fill(0).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square"></div>
                                ))}
                                {mounted && days.map(d => {
                                    const dateStr = toLocalDateString(d);
                                    const dayAvail = availability[dateStr];
                                    const isSelected = selectedDate === dateStr;
                                    const hasData = dayAvail && (dayAvail.segments.length > 0 || dayAvail.startTime);
                                    const dayShifts = confirmedShifts.filter(s => s.date === dateStr);
                                    const isConfirmed = dayShifts.length > 0;

                                    return (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`relative aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center p-2 group
                                                ${isSelected ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_30px_rgba(79,70,229,0.35)] z-10' :
                                                  viewMode === "confirmed" && isConfirmed ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                  hasData ? 'bg-white/10 border-white/10' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                                        >
                                            <span className={`text-base font-black italic italic ${isSelected ? 'text-white' : 'text-gray-400'}`}>{d.getDate()}</span>
                                            
                                            <div className="absolute bottom-3 flex gap-1">
                                                {isConfirmed && viewMode === "confirmed" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                                {hasData && viewMode === "input" && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 translate-y-[-2px]" />}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {viewMode === "input" && (
                            <div className="flex flex-wrap gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAIPredict}
                                    className="flex-1 min-w-[200px] bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 flex items-center justify-between group overflow-hidden relative"
                                >
                                    <div className="relative z-10 text-left">
                                        <h3 className="text-lg font-black tracking-tighter italic italic">AI自動入力</h3>
                                        <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-wider">過去の傾向から自動で埋める</p>
                                    </div>
                                    <Sparkles className="w-8 h-8 text-white/20 group-hover:scale-125 group-hover:rotate-12 transition-transform relative z-10" />
                                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleReset}
                                    className="px-8 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-3xl transition-all group"
                                >
                                    <Trash2 className="w-6 h-6 text-gray-500 group-hover:text-red-500" />
                                </motion.button>
                            </div>
                        )}
                    </motion.div>

                    {/* Side Panel */}
                    <div className="xl:col-span-4 h-full relative">
                        <AnimatePresence mode="wait">
                            {selectedDate ? (
                                <motion.div
                                    key="detail"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-[#111111]/90 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 shadow-2xl sticky top-8"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-3xl font-black italic italic tracking-tighter">{selectedDate.replace(/-/g, '.')}</h3>
                                            <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">詳細設定</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedDate(null)}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <ChevronRight className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>

                                    {viewMode === "confirmed" ? (
                                        <div className="space-y-6">
                                            {confirmedShifts.filter(s => s.date === selectedDate).length > 0 ? (
                                                confirmedShifts.filter(s => s.date === selectedDate).map((s, i) => (
                                                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.isSwapRequested ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                        <div className="flex justify-between items-start mb-4">
                                                            <h4 className="font-black italic italic text-lg">{timeSegments.find(ts => ts.id === s.segmentId)?.label || s.segmentId}</h4>
                                                            <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${s.isSwapRequested ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}>
                                                                {s.isSwapRequested ? '交代募集中' : '確定済み'}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-500 text-xs font-bold uppercase mb-4">フロア: <span className="text-white">{s.floor || "指定なし"}</span></p>
                                                        {!s.isSwapRequested && (
                                                            <button 
                                                                onClick={async () => {
                                                                    const note = prompt("交代の理由を教えてください");
                                                                    const res = await fetch('/api/shifts/swap', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ date: selectedDate, castId, isSwapRequested: true, note })
                                                                    });
                                                                    if (res.ok) {
                                                                        setMessage("ヘルプ募集を開始しました📢");
                                                                        setConfirmedShifts(prev => prev.map(ps => ps.date === selectedDate ? { ...ps, isSwapRequested: true } : ps));
                                                                    }
                                                                }}
                                                                className="w-full py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-2xl text-xs font-black transition-all"
                                                            >
                                                                交代を募集する
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-20 text-center opacity-20">
                                                    <LayoutGrid className="w-16 h-16 mx-auto mb-4" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">勤務予定はありません</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : viewMode === "help" ? (
                                        <div className="space-y-4">
                                            {helpRequests.filter(r => r.date === selectedDate).length > 0 ? (
                                                helpRequests.filter(r => r.date === selectedDate).map((req, i) => (
                                                    <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <p className="text-lg font-black italic italic">{systemCasts.find(c => c.id === req.castId)?.name || '誰か'}</p>
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">交代希望</p>
                                                            </div>
                                                            {req.castId !== castId && req.swapStatus !== 'APPLIED' && (
                                                                <button
                                                                    onClick={async () => {
                                                                        const res = await fetch('/api/shifts/swap', {
                                                                            method: 'PUT',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ date: req.date, originalCastId: req.castId, applicantId: castId })
                                                                        });
                                                                        if (res.ok) setMessage("立候補しました！店長の承認を待とう⏳");
                                                                    }}
                                                                    className="bg-white text-black text-[10px] font-black py-2 px-4 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors"
                                                                >
                                                                    代わりに出る
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {helpRequests.filter(hr => hr.date === selectedDate && hr.castId === req.castId).map((s, si) => (
                                                                <span key={si} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded-lg text-gray-400">
                                                                    {timeSegments.find(ts => ts.id === s.segmentId)?.label || s.segmentId}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-20 text-center opacity-20">
                                                    <HelpCircle className="w-16 h-16 mx-auto mb-4" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">今日の募集はありません</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">出勤可能時間</label>
                                                <div className="flex items-center gap-4">
                                                    <select
                                                        value={availability[selectedDate]?.startTime || "12:00"}
                                                        onChange={e => setAvailability(prev => ({ ...prev, [selectedDate]: { ...(prev[selectedDate] || { date: selectedDate, segments: [] }), startTime: e.target.value } }))}
                                                        className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 font-black italic italic text-xl outline-none appearance-none text-center"
                                                    >
                                                        {Array.from({ length: 27 }, (_, i) => {
                                                            const h = Math.floor(i / 2) + 12;
                                                            const m = i % 2 === 0 ? "00" : "30";
                                                            const time = `${h > 24 ? String(h-24).padStart(2,'0') : String(h).padStart(2,'0')}:${m}`;
                                                            return <option key={time} value={time}>{time}</option>;
                                                        })}
                                                    </select>
                                                    <span className="text-white/20 font-black">~</span>
                                                    <select
                                                        value={availability[selectedDate]?.endTime || "01:00"}
                                                        onChange={e => setAvailability(prev => ({ ...prev, [selectedDate]: { ...(prev[selectedDate] || { date: selectedDate, segments: [] }), endTime: e.target.value } }))}
                                                        className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 font-black italic italic text-xl outline-none appearance-none text-center"
                                                    >
                                                        {Array.from({ length: 27 }, (_, i) => {
                                                            const h = Math.floor(i / 2) + 12;
                                                            const m = i % 2 === 0 ? "00" : "30";
                                                            const time = `${h >= 24 ? String(h-24).padStart(2,'0') : String(h).padStart(2,'0')}:${m}`;
                                                            return <option key={time} value={time}>{time}</option>;
                                                        })}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">希望フロア</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: '1F', label: '1F フロア' },
                                                        { id: '2F', label: '2F カウンター' },
                                                        { id: 'ANY', label: 'どこでも' }
                                                    ].map(floor => (
                                                        <button
                                                            key={floor.id}
                                                            onClick={() => setAvailability(prev => ({ ...prev, [selectedDate]: { ...(prev[selectedDate] || { date: selectedDate, segments: [] }), targetFloor: floor.id } }))}
                                                            className={`p-4 rounded-2xl border transition-all text-xs font-black uppercase ${ (availability[selectedDate]?.targetFloor || 'ANY') === floor.id ? 'bg-white text-black border-white' : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-white'}`}
                                                        >
                                                            {floor.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 block">備考</label>
                                                <textarea 
                                                    value={availability[selectedDate]?.notes || ""}
                                                    onChange={e => setAvailability(prev => ({ ...prev, [selectedDate]: { ...(prev[selectedDate] || { date: selectedDate, segments: [] }), notes: e.target.value } }))}
                                                    placeholder="伝えたいことがあれば..."
                                                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:border-indigo-500/50 min-h-[100px] resize-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-[600px] flex flex-col items-center justify-center text-center opacity-10 pointer-events-none"
                                >
                                    <CalendarIcon className="w-32 h-32 mb-8" />
                                    <p className="text-xl font-black italic italic tracking-tighter uppercase underline decoration-indigo-500 underline-offset-8">日付を選択して入力</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                {/* Footer Fixed Submit */}
                <motion.div 
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
                >
                    <button
                        onClick={handleSubmit}
                        disabled={!castId}
                        className="w-full bg-white text-black font-black italic italic py-6 px-12 rounded-[30px] shadow-[0_20px_60px_-15px_rgba(255,255,255,0.3)] hover:shadow-[0_25px_70px_-15px_rgba(255,255,255,0.4)] transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4 group"
                    >
                        <span className="text-xl">希望を送信する</span>
                        <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </motion.div>

                {/* Toast Messages */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] bg-white/90 backdrop-blur-xl text-black px-8 py-4 rounded-2xl shadow-2xl font-black italic italic tracking-tight"
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
