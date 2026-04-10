"use client";

import { useState, useEffect } from "react";

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
                alert(action === 'APPROVE' ? "承認しました" : "却下しました");
                fetchRequests();
            }
        } catch (e) {
            alert("エラーが発生しました");
        }
    };

    // Grouping segments by date and cast for display
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
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-amber-500">🔄</span> 交代申請の承認
                </h2>
                
                {loading ? (
                    <div className="text-center py-10 opacity-50">読み込み中...</div>
                ) : groupedRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupedRequests.map((req, i) => (
                            <div key={i} className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl shadow-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-1">{req.date}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400">辞退者:</span>
                                            <span className="font-bold text-white">{getCastName(req.castId)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-amber-400">希望者:</span>
                                            <span className="font-bold text-amber-300">{getCastName(req.swapApplicantId)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => handleAction(req, 'APPROVE')}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg transition-all active:scale-95"
                                        >
                                            承認する
                                        </button>
                                        <button 
                                            onClick={() => handleAction(req, 'REJECT')}
                                            className="text-gray-400 hover:text-red-400 text-xs font-bold py-2 px-4 transition-all"
                                        >
                                            却下
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded-lg italic">
                                    「{req.swapNote || "理由なし"}」
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-30 border-2 border-dashed border-gray-800 rounded-2xl">
                        <p className="font-bold uppercase tracking-widest">承認待ちの交代申請はありません</p>
                    </div>
                )}
            </div>
        </div>
    );
}
