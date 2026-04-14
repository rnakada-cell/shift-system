"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ArrowLeftRight, 
    CheckCircle2, 
    XCircle, 
    UserMinus, 
    UserPlus,
    Clock
} from "lucide-react";

export default function SwapApprovalTab() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [casts, setCasts] = useState<any[]>([]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [reqRes, castsRes] = await Promise.all([
                fetch('/api/shifts/swap'),
                fetch('/api/casts')
            ]);
            const reqJson = await reqRes.json();
            const castsJson = await castsRes.json();
            
            if (reqJson.success) setRequests(reqJson.data);
            if (castsJson.success) setCasts(castsJson.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (req: any, action: 'APPROVE' | 'REJECT') => {
        try {
            const res = await fetch('/api/shifts/swap', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: req.date,
                    originalCastId: req.castId,
                    applicantId: req.swapApplicantId,
                    action
                })
            });
            if (res.ok) {
                fetchRequests();
            }
        } catch (e) {
            alert("エラーが発生しました");
        }
    };

    const groupedRequests = requests.reduce((acc: any[], curr) => {
        if (curr.swapStatus !== 'APPLIED') return acc;
        const key = `${curr.date}__${curr.castId}`;
        const existing = acc.find(a => `${a.date}__${a.castId}` === key);
        if (existing) {
            existing.segments.push(curr);
        } else {
            acc.push({ ...curr, segments: [curr] });
        }
        return acc;
    }, []);

    const getCastName = (id: string) => casts.find(c => c.id === id)?.name || id;

    return (
        <div className="space-y-10">
            <header>
                <h2 className="text-3xl font-black italic italic tracking-tighter uppercase mb-2">
                    交代承認<span className="text-amber-500">待ち</span>
                </h2>
                <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">キャスト間の交代申請を確認・承認します</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center opacity-30 animate-pulse">
                        <Clock className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase tracking-[0.3em]">データを同期中...</p>
                    </div>
                ) : groupedRequests.length > 0 ? (
                    <AnimatePresence>
                        {groupedRequests.map((req, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#111111]/80 backdrop-blur-2xl border border-white/5 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <ArrowLeftRight className="w-32 h-32 -mr-10 -mt-10" />
                                </div>

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <div className="text-xs text-amber-500 font-black uppercase tracking-widest mb-2">{req.date.replace(/-/g, '.')}</div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-500/10 rounded-lg">
                                                    <UserMinus className="w-4 h-4 text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">辞退者</p>
                                                    <p className="font-black italic italic">{getCastName(req.castId)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-700 ml-4 group-hover:text-amber-500/50 transition-colors">
                                                <ArrowLeftRight className="w-4 h-4" />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                    <UserPlus className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">交代希望者</p>
                                                    <p className="font-black italic italic text-emerald-400">{getCastName(req.swapApplicantId)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 relative z-10">
                                        <button 
                                            onClick={() => handleAction(req, 'APPROVE')}
                                            className="bg-white text-black font-black italic italic px-6 py-3 rounded-2xl text-[10px] shadow-xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            承認
                                        </button>
                                        <button 
                                            onClick={() => handleAction(req, 'REJECT')}
                                            className="bg-white/5 border border-white/5 text-gray-500 font-black italic italic px-6 py-3 rounded-2xl text-[10px] hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            却下
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="flex flex-wrap gap-2">
                                        {req.segments.map((s: any, si: number) => (
                                            <span key={si} className="text-[10px] bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl font-bold text-gray-400">
                                                {s.segmentId}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] text-gray-500 font-medium italic">
                                        「{req.swapNote || "理由は入力されていません"}」
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="col-span-full py-40 text-center opacity-10 border-4 border-dashed border-white/5 rounded-[40px]">
                        <CheckCircle2 className="w-20 h-20 mx-auto mb-6" />
                        <p className="text-xl font-black italic italic tracking-tighter uppercase underline decoration-amber-500 underline-offset-8">対応が必要な申請はありません</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-6">すべての交代申請が処理済みです</p>
                    </div>
                )}
            </div>
        </div>
    );
}
