
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    MessageSquare, 
    Check, 
    X, 
    Clock, 
    Calendar,
    User,
    AlertCircle,
    RefreshCw,
    Store,
    Lock
} from "lucide-react";

interface ShiftRequest {
    id: string;
    castName: string | null;
    castId: string | null;
    lineId: string | null;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    rawText: string | null;
    createdAt: string;
    source?: string;
    duplicate?: boolean;
}

interface SyncResult {
    requested: number;
    confirmed: number;
    skipped: number;
    date: string;
    shopId: string;
}

interface LineRequestInboxProps {
    onRefresh: () => void;
}

const SHOP_OPTIONS = [
    { value: 'love_point', label: '1F Love Point' },
    { value: 'room_of_love_point', label: '2F ROOM of Love Point' },
];

export default function LineRequestInbox({ onRefresh }: LineRequestInboxProps) {
    const [requests, setRequests] = useState<ShiftRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

    // 同期パラメータ
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.slice(0, 7); // YYYY-MM
    const [syncMode, setSyncMode] = useState<'single' | 'period'>('period');
    const [syncDate, setSyncDate] = useState(todayStr);
    const [syncMonth, setSyncMonth] = useState(currentMonth);
    const [syncPeriod, setSyncPeriod] = useState<'first_half' | 'second_half' | 'all'>('first_half');
    const [syncShop, setSyncShop] = useState<string>('love_point');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/shift-requests');
            const json = await res.json();
            if (json.success) setRequests(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const payload = syncMode === 'single'
              ? { mode: 'single', date: syncDate, shopId: syncShop }
              : { mode: 'period', month: syncMonth, period: syncPeriod, shopId: syncShop };

            const res = await fetch('/api/shift-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.success) {
                setSyncResult({
                    requested: json.requested ?? 0,
                    confirmed: json.confirmed ?? 0,
                    skipped: json.skipped ?? 0,
                    date: json.date,
                    shopId: json.shopId,
                });
                fetchRequests();
                onRefresh();
            } else {
                alert(json.error || "同期に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("通信エラーが発生しました");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'ignore') => {
        setActionLoading(id);
        try {
            const res = await fetch('/api/shift-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            const json = await res.json();
            if (json.success) {
                fetchRequests();
                onRefresh();
            } else {
                alert(json.error || "処理に失敗しました");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* ─── ヘッダー + 同期パネル ─── */}
            <div className="bg-[#111111]/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black italic text-white flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-pink-500" />
                            POSCONE 同期
                        </h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                            シフト希望・確定をPOSCONEから直接取得してAI最適化に反映
                        </p>
                    </div>
                    <button
                        onClick={fetchRequests}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                    >
                        <Clock className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* モード切替タブ */}
                <div className="flex items-center gap-2 mb-4 p-1 bg-white/5 w-fit rounded-xl">
                    <button
                        onClick={() => setSyncMode('period')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${syncMode === 'period' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        期間で一括同期
                    </button>
                    <button
                        onClick={() => setSyncMode('single')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${syncMode === 'single' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        1日だけ同期
                    </button>
                </div>

                {/* 同期コントロール */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    
                    {syncMode === 'single' ? (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                            <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <input
                                type="date"
                                value={syncDate}
                                onChange={e => setSyncDate(e.target.value)}
                                className="bg-transparent text-white text-xs font-bold w-full outline-none [color-scheme:dark]"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <input
                                    type="month"
                                    value={syncMonth}
                                    onChange={e => setSyncMonth(e.target.value)}
                                    className="bg-transparent text-white text-xs font-bold w-full outline-none [color-scheme:dark]"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                <select
                                    value={syncPeriod}
                                    onChange={e => setSyncPeriod(e.target.value as any)}
                                    className="bg-transparent text-white text-xs font-bold w-full outline-none appearance-none"
                                >
                                    <option value="first_half" className="bg-[#111]">前半 (1日〜15日)</option>
                                    <option value="second_half" className="bg-[#111]">後半 (16日〜月末)</option>
                                    <option value="all" className="bg-[#111]">1ヶ月分すべて</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* 店舗 */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <Store className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <select
                            value={syncShop}
                            onChange={e => setSyncShop(e.target.value)}
                            className="bg-transparent text-white text-xs font-bold w-full outline-none appearance-none"
                        >
                            {SHOP_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[#111]">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 同期ボタン */}
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 py-3 px-6"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? '同期中...' : 'POSCONEから同期'}
                    </button>
                </div>

                {/* 同期結果 */}
                {syncResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex flex-wrap gap-3"
                    >
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black">
                            <Check className="w-3 h-3" />
                            希望 {syncResult.requested} 件取得
                        </div>
                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-xl text-xs font-black">
                            <Lock className="w-3 h-3" />
                            確定 {syncResult.confirmed} 件ロック
                        </div>
                        {syncResult.skipped > 0 && (
                            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-black">
                                <AlertCircle className="w-3 h-3" />
                                スキップ {syncResult.skipped} 件
                            </div>
                        )}
                        <div className="text-gray-600 text-[10px] font-mono flex items-center">
                            {syncResult.date} / {SHOP_OPTIONS.find(o => o.value === syncResult.shopId)?.label}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ─── シフト申請リスト（過去の手動取り込みなど） ─── */}
            <div>
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 px-1">
                    未処理の手動申請 ({requests.length} 件)
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <div className="w-8 h-8 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-[#111111]/40 border border-white/5 rounded-[32px] p-16 text-center">
                        <div className="p-4 bg-white/5 rounded-full w-fit mx-auto mb-6">
                            <Check className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-500 font-bold">未処理の申請はありません</p>
                        <p className="text-gray-700 text-xs mt-2">上のボタンでPOSCONEから同期すると希望シフトが自動取得されます</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {requests.map((req) => (
                                <motion.div
                                    key={req.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`bg-[#111111]/60 backdrop-blur-3xl border ${req.duplicate ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:border-red-500/80' : 'border-white/10 hover:border-pink-500/30'} rounded-[32px] overflow-hidden group transition-all`}
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-pink-500/10 rounded-xl">
                                                    <User className="w-4 h-4 text-pink-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white">{req.castName || "不明なキャスト"}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono">{req.lineId?.substring(0, 8)}...</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {!req.castId && (
                                                    <div className="flex items-center gap-1 text-[8px] bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full font-black uppercase flex-shrink-0">
                                                        <AlertCircle className="w-2 h-2" />
                                                        未連携
                                                    </div>
                                                )}
                                                {req.source === 'EXTERNAL_FORM' ? (
                                                    <div className="flex items-center gap-1 text-[8px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-black uppercase flex-shrink-0">
                                                        EXTERNAL_FORM
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[8px] bg-[#06C755]/20 text-[#06C755] px-2 py-1 rounded-full font-black uppercase flex-shrink-0">
                                                        LINE_MESSAGE
                                                    </div>
                                                )}
                                                {req.duplicate && (
                                                    <div className="flex items-center gap-1 text-[8px] bg-red-500/20 text-red-500 px-2 py-1 rounded-full font-black flex-shrink-0">
                                                        <AlertCircle className="w-2 h-2" />
                                                        重複の可能性
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex items-center gap-3 text-gray-400">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold">{req.date}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold">{req.startTime} - {req.endTime}</span>
                                            </div>
                                        </div>

                                        {req.rawText && (
                                            <div className="bg-[#050505]/60 p-4 rounded-2xl border border-white/5 mb-8 text-[11px] text-gray-500 italic font-medium leading-relaxed">
                                                "{req.rawText}"
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleAction(req.id, 'approve')}
                                                disabled={actionLoading === req.id}
                                                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all"
                                            >
                                                {actionLoading === req.id ? "..." : <><Check className="w-3 h-3" /> 取り込む</>}
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'ignore')}
                                                disabled={actionLoading === req.id}
                                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <X className="w-3 h-3" /> 無視
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
