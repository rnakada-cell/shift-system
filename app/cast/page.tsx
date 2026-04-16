
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle, 
    User,
    Info
} from "lucide-react";
import { Cast } from "@/lib/optimizer";
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
    const [mounted, setMounted] = useState(false);
    const [confirmedShifts, setConfirmedShifts] = useState<any[]>([]);
    const [castSearch, setCastSearch] = useState("");
    const [castDropdownOpen, setCastDropdownOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const VERSION = "v4.2.0-jp";

    useEffect(() => {
        setMounted(true);
    }, []);

    // キャスト一覧の読み込み
    useEffect(() => {
        const fetchData = async () => {
            try {
                const castsRes = await fetch('/api/casts');
                const castsJson = await castsRes.json();
                if (castsJson.success) setSystemCasts(castsJson.data);
            } catch (error: any) {
                console.error("Failed to fetch data:", error);
            }
        };
        fetchData();
    }, []);

    const days = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth]);

    // 確定シフトの読み込み
    useEffect(() => {
        if (!castId || days.length === 0) return;

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
    }, [castId, currentYear, currentMonth, days]);

    return (
        <div className="min-h-screen bg-rose-50 text-gray-800 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-300/30 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-rose-300/30 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 py-8 md:px-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-pink-500 rounded-xl shadow-lg shadow-pink-400/30">
                                <CalendarIcon className="w-6 h-6 text-black" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter uppercase italic">キャストクラウド</h1>
                        </div>
                        <p className="text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase">閲覧専用モード // {VERSION}</p>
                    </motion.div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group z-50">
                            <div 
                                onClick={() => setCastDropdownOpen(!castDropdownOpen)}
                                className="bg-white/80 backdrop-blur-xl border border-pink-200 text-gray-800 rounded-2xl pl-11 pr-10 py-4 min-w-[280px] focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-xl cursor-pointer hover:border-pink-300 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-pink-500 transition-colors" />
                                    <span className="truncate max-w-[180px]">
                                        {castId ? systemCasts.find(c => c.id === castId)?.name : "キャストを検索・選択"}
                                    </span>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${castDropdownOpen ? 'rotate-90' : ''}`} />
                            </div>

                            <AnimatePresence>
                                {castDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-3xl border border-pink-100 rounded-[24px] shadow-[0_20px_50px_rgba(236,72,153,0.15)] overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-pink-50">
                                            <input
                                                type="text"
                                                placeholder="名前を入力して検索..."
                                                value={castSearch}
                                                onChange={(e) => setCastSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                                className="w-full bg-pink-50/50 border border-pink-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400 placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto p-2">
                                            {systemCasts
                                                .filter(c => c.name.toLowerCase().includes(castSearch.toLowerCase()))
                                                .map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => {
                                                            setCastId(c.id);
                                                            setCastDropdownOpen(false);
                                                            setCastSearch("");
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${castId === c.id ? 'bg-pink-500 text-white font-bold' : 'hover:bg-pink-50 text-gray-700'}`}
                                                    >
                                                        <span className="text-sm">{c.name}</span>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {castId && <NotificationBell userId={castId} />}
                    </div>
                </header>

                <main className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    <div className="xl:col-span-8 space-y-8">
                        <div className="flex bg-white/60 p-4 rounded-3xl border border-pink-200 backdrop-blur-3xl items-center justify-between shadow-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-500 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-black" />
                                </div>
                                <span className="font-black italic text-sm">確定済みシフト</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-pink-500 uppercase tracking-widest bg-pink-50 px-3 py-1.5 rounded-full border border-pink-100">
                                <Info className="w-3 h-3" />
                                シフト申請は公式LINEからのみ受け付けています
                            </div>
                        </div>

                        <div className="bg-white/90 backdrop-blur-3xl border border-pink-200 rounded-[40px] p-8 shadow-2xl overflow-hidden relative group">
                            <div className="relative flex items-center justify-between mb-12">
                                <h2 className="text-4xl font-black italic tracking-tighter">
                                    {currentMonth + 1} <span className="text-pink-500">.</span> {currentYear}
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentMonth(m => (m === 0 ? 11 : m - 1))} className="p-3 bg-pink-50/50 hover:bg-pink-100 rounded-2xl border border-pink-200 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                    <button onClick={() => setCurrentMonth(m => (m === 11 ? 0 : m + 1))} className="p-3 bg-pink-50/50 hover:bg-pink-100 rounded-2xl border border-pink-200 transition-colors"><ChevronRight className="w-5 h-5" /></button>
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
                                    const dayShifts = confirmedShifts.filter(s => s.date === dateStr);
                                    const isConfirmed = dayShifts.length > 0;
                                    const isSelected = selectedDate === dateStr;

                                    return (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`relative aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center p-2 group
                                                ${isSelected ? 'bg-pink-500 border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.35)]' :
                                                  isConfirmed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white border-pink-200 hover:border-pink-300'}`}
                                        >
                                            <span className={`text-base font-black italic ${isSelected ? 'text-black' : 'text-gray-400'}`}>{d.getDate()}</span>
                                            {isConfirmed && <div className="absolute bottom-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-4 h-full relative">
                        <AnimatePresence mode="wait">
                            {selectedDate ? (
                                <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white/90 backdrop-blur-3xl border border-pink-200 rounded-[40px] p-8 shadow-2xl sticky top-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-3xl font-black italic tracking-tighter">{selectedDate.replace(/-/g, '.')}</h3>
                                            <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">詳細情報</p>
                                        </div>
                                        <button onClick={() => setSelectedDate(null)} className="p-2 bg-pink-50/50 hover:bg-pink-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-gray-400" /></button>
                                    </div>

                                    <div className="space-y-6">
                                        {confirmedShifts.filter(s => s.date === selectedDate).length > 0 ? (
                                            confirmedShifts.filter(s => s.date === selectedDate).map((s, i) => (
                                                <div key={i} className="bg-white border border-pink-200 rounded-3xl p-6 relative overflow-hidden group">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h4 className="font-black italic text-lg">{s.segmentId}</h4>
                                                        <span className="text-[10px] px-3 py-1 rounded-full font-black uppercase bg-emerald-500 text-black">確定済み</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 leading-relaxed">
                                                        本日のシフトは確定しています。変更・交代希望は管理者に直接連絡してください。
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center opacity-20">
                                                <CalendarIcon className="w-16 h-16 mx-auto mb-4" />
                                                <p className="text-xs font-bold uppercase tracking-widest">予定なし</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="h-[600px] flex flex-col items-center justify-center text-center opacity-10 pointer-events-none">
                                    <CalendarIcon className="w-32 h-32 mb-8" />
                                    <p className="text-xl font-black italic tracking-tighter uppercase underline decoration-indigo-500 underline-offset-8">日付を選択して確認</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}

