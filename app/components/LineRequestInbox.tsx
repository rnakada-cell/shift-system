
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
    AlertCircle
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
}

interface LineRequestInboxProps {
    onRefresh: () => void;
}

export default function LineRequestInbox({ onRefresh }: LineRequestInboxProps) {
    const [requests, setRequests] = useState<ShiftRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-8 h-8 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black italic text-white flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-pink-500" />
                        LINE 申請インボックス
                    </h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                        未処理のシフト申請: {requests.length} 件
                    </p>
                </div>
                <button 
                    onClick={fetchRequests}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                    <Clock className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {requests.length === 0 ? (
                <div className="bg-[#111111]/40 border border-white/5 rounded-[32px] p-20 text-center">
                    <div className="p-4 bg-white/5 rounded-full w-fit mx-auto mb-6">
                        <Check className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500 font-bold">未処理の申請はありません</p>
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
                                className="bg-[#111111]/60 backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden group hover:border-pink-500/30 transition-all"
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
                                        {!req.castId && (
                                            <div className="flex items-center gap-1 text-[8px] bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full font-black uppercase">
                                                <AlertCircle className="w-2 h-2" />
                                                未連携
                                            </div>
                                        )}
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
    );
}
