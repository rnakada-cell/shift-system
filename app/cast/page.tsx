"use client";

import { useState, useEffect, useMemo } from "react";
import { PeriodAvailability, SegmentAvailability, Cast, TimeSegment } from "@/lib/optimizer";
import { toLocalDateString } from "@/lib/utils";

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
    const [viewMode, setViewMode] = useState<"input" | "confirmed">("input");
    const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);

    const VERSION = "v3.1.2-stabilized";

    useEffect(() => {
        setMounted(true);
    }, []);

    // キャスト一覧の読み込み（DBから）
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [castsRes, settingsRes] = await Promise.all([
                    fetch('/api/casts'),
                    fetch('/api/settings')
                ]);
                const castsJson = await castsRes.json();
                const settingsJson = await settingsRes.json();

                if (castsJson.success) {
                    setSystemCasts(castsJson.data);
                } else {
                    setError("キャストの取得に失敗しました: " + (castsJson.error || "不明なエラー"));
                }

                if (settingsJson.success) {
                    setTimeSegments(settingsJson.data.defaultSegments);
                } else {
                    setError("設定の取得に失敗しました: " + (settingsJson.error || "不明なエラー"));
                }
            } catch (error: any) {
                console.error("Failed to fetch data:", error);
                setError("通信エラーが発生しました: " + error.message);
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
                if (Array.isArray(data)) {
                    setConfirmedShifts(data);
                }
            } catch (error) {
                console.error("Failed to fetch confirmed shifts:", error);
            }
        };
        fetchConfirmed();
    }, [castId, viewMode, currentYear, currentMonth, days]);

    // 既存の希望シフトの読み込み（同期用）
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
                        mapped[a.date] = {
                            date: a.date,
                            startTime: a.startTime || "12:00",
                            endTime: a.endTime || "01:00",
                            targetFloor: a.targetFloor || "ANY",
                            segments: a.segments || [],
                            notes: a.notes || ""
                        };
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

    const handleDateClick = (dateStr: string) => {
        setSelectedDate(dateStr);
    };

    const updateDayAvailability = (date: string, data: Partial<PeriodAvailability>) => {
        setAvailability(prev => {
            const existing = prev[date] || { date, segments: [] };
            return {
                ...prev,
                [date]: {
                    ...existing,
                    ...data
                }
            };
        });
    };

    const toggleSegment = (date: string, segmentId: string) => {
        setAvailability(prev => {
            const day = prev[date] || { date, segments: [] };
            const exists = day.segments.find(s => s.segmentId === segmentId);
            const updatedSegments = exists
                ? day.segments.filter(s => s.segmentId !== segmentId)
                : [...day.segments, { segmentId }];
            return { ...prev, [date]: { ...day, segments: updatedSegments } };
        });
    };

    const handleAIPredict = () => {
        if (!castId) {
            setMessage("まずは名前を選択してや！");
            return;
        }

        // AI予測：今回は一時的にデモデータで予測（将来的にDB履歴から算出）
        // const existing = JSON.parse(localStorage.getItem("castAvailabilities") || "[]");
        // const history = existing.find((a: any) => a.castId === castId);
        const history = null; // API連携中は一旦複雑化を避けるため簡易予測にする

        const newAvail: Record<string, PeriodAvailability> = { ...availability };

        days.forEach(d => {
            const dateStr = toLocalDateString(d);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            // 履歴があればその曜日と同じ設定を、なければデフォルトを適用
            // API連携中は一旦複雑化を避けるため簡易予測にする
            // const historyMatch = history?.availability?.find((h: any) => {
            //     const hDate = new Date(h.date);
            //     return hDate.getDay() === d.getDay();
            // });
            const historyMatch = null;

            if (historyMatch) {
                newAvail[dateStr] = {
                    ...(historyMatch as any),
                    date: dateStr // 日付だけ今月のものに差し替え
                };
            } else {
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
            }
        });

        setAvailability(newAvail);
        setMessage(history ? "過去の出勤パターンから予測したよ！" : "標準的な出勤パターンで予測したよ！");
    };

    const handleReset = async () => {
        if (!castId) {
            setMessage("まずは名前を選択してや！");
            return;
        }

        if (!confirm(`${currentMonth + 1}月分の申請をすべて初期化（削除）してもええの？`)) {
            return;
        }

        try {
            const start = toLocalDateString(days[0]);
            const end = toLocalDateString(days[days.length - 1]);
            
            const res = await fetch('/api/availabilities/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    castId,
                    startDate: start,
                    endDate: end
                })
            });

            if (res.ok) {
                setAvailability({});
                setMessage(`${currentMonth + 1}月分のデータを初期化したよ！🧹`);
            } else {
                setMessage("初期化に失敗しました。");
            }
        } catch (error) {
            console.error(error);
            setMessage("通信エラーが発生しました。");
        }

        setTimeout(() => setMessage(""), 4000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!castId) {
            setMessage("名前を選んでや！");
            return;
        }

        const periodAvailabilities = Object.values(availability).filter(a => a.segments.length > 0 || a.startTime);

        if (periodAvailabilities.length === 0) {
            setMessage("最低でも1日はシフトを入力してや！");
            return;
        }

        try {
            const res = await fetch('/api/availabilities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    castId,
                    availabilities: periodAvailabilities
                })
            });

            if (res.ok) {
                setMessage("1ヶ月分のシフト希望を送信したよ！🚀");
            } else {
                setMessage("送信に失敗しました。もう一度試してね🙏");
            }
        } catch (error) {
            console.error(error);
            setMessage("通信エラーが発生しました。");
        }

        setTimeout(() => setMessage(""), 4000);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-sans selection:bg-purple-500/30">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-br from-white to-gray-500 bg-clip-text text-transparent tracking-tighter">
                            CAST CALENDAR
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Shift Submission System {VERSION}</p>
                        {error && (
                            <div className="mt-2 text-red-500 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                                ⚠ {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <select
                            value={castId}
                            onChange={e => setCastId(e.target.value)}
                            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 min-w-[200px] focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-lg"
                        >
                            <option value="">名前を選択...</option>
                            {systemCasts.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                            <button
                                onClick={() => setViewMode("input")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "input" ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                希望入力
                            </button>
                            <button
                                onClick={() => setViewMode("confirmed")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "confirmed" ? "bg-emerald-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                            >
                                確定確認
                            </button>
                        </div>

                        {viewMode === "input" && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAIPredict}
                                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-2 group"
                                >
                                    <span className="text-lg group-hover:rotate-12 transition-transform">✨</span>
                                    AI 予測入力
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 font-bold py-3 px-4 rounded-xl shadow-xl transition-all border border-gray-700 hover:border-red-500/50 flex items-center gap-2"
                                    title="表示中の月を初期化"
                                >
                                    <span className="text-lg">🧹</span>
                                    初期化
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    {/* カレンダー本体 */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold">{currentYear}年 {currentMonth + 1}月</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">←</button>
                                    <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">→</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-black text-gray-600 mb-2">{d}</div>
                                ))}
                                {mounted && days.length > 0 && Array(days[0].getDay()).fill(0).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square opacity-0"></div>
                                ))}
                                {mounted && days.map(d => {
                                    const dateStr = toLocalDateString(d);
                                    const dayAvail = availability[dateStr];
                                    const isSelected = selectedDate === dateStr;
                                    const hasData = dayAvail && (dayAvail.segments.length > 0 || dayAvail.startTime);
                                    
                                    const dayShifts = confirmedShifts.filter(s => s.date === dateStr);
                                    const isConfirmed = dayShifts.length > 0;

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => handleDateClick(dateStr)}
                                            className={`relative aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 group
                                                ${isSelected ? 'bg-purple-600 border-purple-400 scale-105 z-10 shadow-[0_0_30px_rgba(147,51,234,0.4)]' :
                                                    viewMode === "confirmed" && isConfirmed ? 'bg-emerald-900/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                                                    hasData ? 'bg-gray-800/80 border-gray-600' : 'bg-gray-900/30 border-gray-800 hover:border-gray-600'}`}
                                        >
                                            <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-gray-400'}`}>{d.getDate()}</span>
                                            {viewMode === "confirmed" && isConfirmed && !isSelected && (
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                                </div>
                                            )}
                                            {viewMode === "input" && hasData && !isSelected && (
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                                                    {dayAvail.segments.some(s => s.hasCompanion) && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {message && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl text-center font-bold animate-fade-in">
                                {message}
                            </div>
                        )}
                    </div>

                    {/* 詳細設定パネル */}
                    <div className="lg:col-span-2">
                        <div className={`bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl sticky top-6 transition-all duration-500 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-30 blur-sm pointer-events-none translate-y-4'}`}>
                            {selectedDate ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black">{selectedDate.replace(/-/g, '/')}</h3>
                                        <button onClick={() => setSelectedDate(null)} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-widest">Close</button>
                                    </div>

                                    {viewMode === "confirmed" ? (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">確定済みシフト</label>
                                            {confirmedShifts.filter(s => s.date === selectedDate).length > 0 ? (
                                                confirmedShifts.filter(s => s.date === selectedDate).map((s, i) => {
                                                    const seg = timeSegments.find(ts => ts.id === s.segmentId);
                                                    return (
                                                        <div key={i} className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-emerald-300 font-black">{seg?.label || s.segmentId}</span>
                                                                <span className="text-[10px] bg-emerald-500 text-emerald-950 px-2 py-0.5 rounded-full font-bold uppercase">Confirmed</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                配置フロア: <span className="text-white font-bold">{s.floor || "指定なし"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-10 opacity-40">
                                                    <p className="text-xs font-bold uppercase tracking-widest">No segments<br />assigned yet</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">自由時間設定 ＆ 一言メモ</label>
                                                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-3">
                                                    <div className="flex items-center gap-2 w-full xl:w-auto">
                                                        <select
                                                            value={availability[selectedDate]?.startTime || "12:00"}
                                                            onChange={e => updateDayAvailability(selectedDate, { startTime: e.target.value })}
                                                            className="flex-1 xl:w-32 bg-gray-800 border border-gray-700 rounded-xl p-3 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
                                                        >
                                                            {[
                                                                "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
                                                                "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", 
                                                                "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", 
                                                                "00:00", "00:30", "01:00"
                                                            ].map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                        <span className="text-gray-600">〜</span>
                                                        <select
                                                            value={availability[selectedDate]?.endTime || "01:00"}
                                                            onChange={e => updateDayAvailability(selectedDate, { endTime: e.target.value })}
                                                            className="flex-1 xl:w-32 bg-gray-800 border border-gray-700 rounded-xl p-3 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
                                                        >
                                                            {[
                                                                "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
                                                                "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", 
                                                                "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", 
                                                                "00:00", "00:30", "01:00"
                                                            ].map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="一言（来客予定など）"
                                                        value={availability[selectedDate]?.notes || ""}
                                                        onChange={e => updateDayAvailability(selectedDate, { notes: e.target.value })}
                                                        className="w-full xl:flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-600"
                                                    />
                                                </div>
                                            </div>

                                    <div className="pt-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">希望フロア</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => updateDayAvailability(selectedDate, { targetFloor: '1F' })}
                                                className={`p-3 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 ${availability[selectedDate]?.targetFloor === '1F' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                            >
                                                1F
                                            </button>
                                            <button
                                                onClick={() => updateDayAvailability(selectedDate, { targetFloor: '2F' })}
                                                className={`p-3 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 ${availability[selectedDate]?.targetFloor === '2F' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                            >
                                                2F
                                            </button>
                                            <button
                                                onClick={() => updateDayAvailability(selectedDate, { targetFloor: 'ANY' })}
                                                className={`p-3 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 ${(!availability[selectedDate]?.targetFloor || availability[selectedDate]?.targetFloor === 'ANY') ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                            >
                                                どちらでも
                                            </button>
                                        </div>
                                    </div>


                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="text-6xl mb-4">📅</div>
                                    <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Select a date<br />to start editing</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {viewMode === "input" && (
                    <div className="mt-12 flex justify-center">
                        <button
                            onClick={handleSubmit}
                            disabled={!castId}
                            className="bg-white hover:bg-gray-200 text-black font-black py-5 px-16 rounded-full text-xl shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all active:scale-95 disabled:opacity-20 flex items-center gap-4"
                        >
                            <span>SEND ALL DATA</span>
                            <span className="text-2xl">🚀</span>
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
