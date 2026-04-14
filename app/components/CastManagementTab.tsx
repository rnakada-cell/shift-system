"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    UserPlus, 
    Trash2, 
    TrendingUp, 
    Star, 
    Clock, 
    Shield, 
    Zap,
    ChevronRight,
    Search,
    UserCircle2,
    Save
} from "lucide-react";
import { Cast } from "@/lib/optimizer";
import { CAST_RANKS } from "@/lib/constants/ranks";

interface CastManagementTabProps {
  casts: Cast[];
  onRefreshCasts: () => void;
}

export default function CastManagementTab({ casts, onRefreshCasts }: CastManagementTabProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCasts = casts.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSaveCast = async (cast: Cast) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/casts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cast)
            });
            if (res.ok) {
                setEditingId(null);
                onRefreshCasts();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setIsSaving(false), 500); // 完了感がわかるように少し残す
        }
    };

    const handleAddCast = async () => {
        const newCast: Partial<Cast> = {
            id: `c${Date.now()}`,
            name: "新規キャスト",
            rank: 'S',
            hourlyWage: 3000,
            averageSales: 15000,
            isRookie: true,
            floorPreference: 'ANY',
        };
        await handleSaveCast(newCast as Cast);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/casts?id=${id}`, { method: 'DELETE' });
            if (res.ok) onRefreshCasts();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#111111]/60 p-6 rounded-[32px] border border-white/5 backdrop-blur-3xl shadow-2xl relative">
                    <AnimatePresence>
                        {isSaving && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-2xl z-50 flex items-center gap-2"
                            >
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                データをデータベースに同期中...
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="キャスト名やIDで検索..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#050505] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddCast}
                    className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all"
                >
                    <UserPlus className="w-4 h-4" />
                    キャストを新規登録
                </motion.button>
            </div>

            {/* Cast Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredCasts.map(cast => (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={cast.id}
                            className={`bg-[#111111]/40 backdrop-blur-3xl border ${editingId === cast.id ? 'border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-indigo-500/10' : 'border-white/5 shadow-2xl'} rounded-[32px] overflow-hidden transition-all group`}
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/20 transition-all">
                                                <UserCircle2 className="w-8 h-8 text-indigo-400" />
                                            </div>
                                            {cast.isRookie && (
                                                <div className="absolute -top-2 -right-2 bg-amber-500 text-[#000] text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">新人</div>
                                            )}
                                        </div>
                                        <div>
                                            <input 
                                                type="text" 
                                                value={cast.name} 
                                                onChange={e => {
                                                    const updated = {...cast, name: e.target.value};
                                                    handleSaveCast(updated);
                                                }}
                                                className="bg-transparent text-xl font-black italic italic border-none focus:ring-0 text-white p-0 w-32 outline-none" 
                                            />
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono mt-1 opacity-50">{cast.id}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleDelete(cast.id)}
                                            className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#050505]/40 p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Star className="w-3 h-3 text-amber-500/50" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">ランク設定</span>
                                        </div>
                                        <select 
                                            value={cast.rank}
                                            onChange={e => handleSaveCast({...cast, rank: e.target.value})}
                                            className="w-full bg-transparent text-sm font-black italic italic text-white outline-none cursor-pointer"
                                        >
                                            <option value="S">ランク S</option>
                                            <option value="A">ランク A</option>
                                            <option value="B">ランク B</option>
                                            <option value="C">ランク C</option>
                                        </select>
                                    </div>
                                    <div className="bg-[#050505]/40 p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="w-3 h-3 text-indigo-500/50" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">基本時給</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-black italic italic text-gray-500">¥</span>
                                            <input 
                                                type="number" 
                                                value={cast.hourlyWage}
                                                step="100"
                                                onChange={e => handleSaveCast({...cast, hourlyWage: parseInt(e.target.value) || 0})}
                                                className="bg-transparent text-sm font-black italic italic text-white outline-none w-full" 
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-[#050505]/40 p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-3 h-3 text-emerald-500/50" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">想定売上/h</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-black italic italic text-gray-500">¥</span>
                                            <input 
                                                type="number" 
                                                value={cast.averageSales}
                                                step="1000"
                                                onChange={e => handleSaveCast({...cast, averageSales: parseInt(e.target.value) || 0})}
                                                className="bg-transparent text-sm font-black italic italic text-white outline-none w-full" 
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-[#050505]/40 p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-3 h-3 text-cyan-500/50" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">属性フラグ</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleSaveCast({...cast, isRookie: !cast.isRookie})}
                                                className={`text-[9px] font-black px-2 py-1 rounded-lg border transition-all ${cast.isRookie ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-white/5 border-white/10 text-gray-600'}`}
                                            >新人</button>
                                            <button 
                                                onClick={() => handleSaveCast({...cast, isLeader: !(cast as any).isLeader})}
                                                className={`text-[9px] font-black px-2 py-1 rounded-lg border transition-all ${(cast as any).isLeader ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-600'}`}
                                            >リーダー</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between group-hover:translate-x-1 transition-transform cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-white/5 border border-[#111] border-white/10" />)}
                                        </div>
                                        <span className="text-[10px] font-black italic italic text-gray-500 uppercase tracking-widest">パフォーマンス詳細へ</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
