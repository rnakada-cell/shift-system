"use client";

import { useState, useEffect } from "react";
import { Cast } from "@/lib/optimizer";
import Link from "next/link";
import { CAST_RANKS } from "@/lib/constants/ranks";

export default function CastManagement() {
    const [casts, setCasts] = useState<any[]>([]);
    const [pairRules, setPairRules] = useState<any[]>([]);
    const [newPair, setNewPair] = useState({ castNameA: '', castNameB: '', ruleType: 'ng', note: '' });
    const [statsCast, setStatsCast] = useState<any | null>(null);
    const [statsData, setStatsData] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const fetchData = async () => {
        const [castsRes, pairsRes] = await Promise.all([
            fetch('/api/casts'),
            fetch('/api/casts/pairs')
        ]);
        const castsJson = await castsRes.json();
        const pairsJson = await pairsRes.json();
        if (castsJson.success) setCasts(castsJson.data);
        if (pairsJson.success) setPairRules(pairsJson.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const saveCast = async (cast: Cast) => {
        await fetch('/api/casts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cast)
        });
    };

    const handleChange = (id: string, field: keyof Cast | 'isUnderage' | 'isLeader', value: any) => {
        const currentCast = casts.find(c => c.id === id);
        if (!currentCast) return;

        let additionalUpdates = {};

        // ランク変更時に時給を自動更新
        if (field === 'rank' && currentCast.rank !== value) {
            const rankInfo = Object.values(CAST_RANKS).find(r => r.id === value);
            if (rankInfo && !currentCast.isManualWage) {
                additionalUpdates = { hourlyWage: rankInfo.hourlyWage };
            }
        }

        const updatedCasts = casts.map(c => c.id === id ? { ...c, [field]: value, ...additionalUpdates } : c);
        setCasts(updatedCasts);
        
        const target = updatedCasts.find(c => c.id === id);
        if (target) saveCast(target);
    };

    const handleAddCast = async () => {
        const newCast: Cast = {
            id: `c${Date.now()}`,
            name: "新規キャスト",
            rank: 'C',
            hourlyWage: 2500,
            drinkBackRate: 0.1,
            chekiBackRate: 0.3,
            averageSales: 10000,
            nominationRate: 0.5,
            snsFollowers: 0,
            absenceRate: 0.0,
            floorPreference: 'ANY',
            canOpen: false,
            canClose: false,
            preferredSegments: [],
            isRookie: true,
        };
        const res = await fetch('/api/casts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCast)
        });
        if (res.ok) {
            setCasts([...casts, newCast]);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当に削除しますか？")) return;
        const res = await fetch(`/api/casts?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setCasts(casts.filter(c => c.id !== id));
        }
    };

    const handleAddPair = async () => {
        if (!newPair.castNameA || !newPair.castNameB) return;
        const res = await fetch('/api/casts/pairs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPair)
        });
        if (res.ok) {
            fetchData();
            setNewPair({ ...newPair, note: '' });
        }
    };

    const handleDeletePair = async (id: string) => {
        const res = await fetch('/api/casts/pairs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (res.ok) fetchData();
    };

    const handleViewStats = async (cast: any) => {
        setStatsCast(cast);
        setLoadingStats(true);
        try {
            const res = await fetch(`/api/casts/stats?name=${encodeURIComponent(cast.name)}`);
            const json = await res.json();
            if (json.success) {
                setStatsData(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingStats(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ヘッダー */}
                <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-xl">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                            キャスト管理 (Demo)
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">ここで設定したキャスト名や時給が最適化アルゴリズムに反映されます。</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/manager" className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold py-2 px-4 rounded transition-colors">
                            ← シフト管理に戻る
                        </Link>
                        <button
                            onClick={handleAddCast}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 px-4 rounded transition-colors shadow-lg shadow-emerald-900/50"
                        >
                            ＋ 新規追加
                        </button>
                    </div>
                </div>

                {/* キャスト一覧テーブル */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-left col-span-full">
                        <thead className="bg-gray-950 border-b border-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">ID</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">名前</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">ランク</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">時給</th>
                                <th className="px-4 py-3 text-xs font-medium text-cyan-400">AI スコア</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">売上力</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">バック(飲/チェ)</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">SNS/欠勤傾向</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">フロア</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">勤怠</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400">属性</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-400 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {casts.map(cast => (
                                <tr key={cast.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{cast.id}</td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={cast.name}
                                            onChange={e => handleChange(cast.id, 'name', e.target.value)}
                                            className="bg-gray-800 border-none rounded text-sm px-2 py-1 w-32 focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={cast.rank || '7'}
                                            onChange={e => handleChange(cast.id, 'rank', e.target.value)}
                                            className="bg-gray-800 border-none rounded text-[10px] px-1 py-1 focus:ring-1 focus:ring-emerald-500 w-24"
                                        >
                                            {Object.values(CAST_RANKS).map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <span className="text-gray-500 mr-1">¥</span>
                                            <input
                                                type="number"
                                                value={cast.hourlyWage}
                                                step="100"
                                                onChange={e => handleChange(cast.id, 'hourlyWage', parseInt(e.target.value) || 0)}
                                                className="bg-gray-800 border-none rounded text-sm px-2 py-1 w-20 font-mono focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-bold ${cast.castScores?.[0]?.score >= 80 ? 'text-cyan-400' : 'text-white'}`}>
                                                {cast.castScores?.[0]?.score ? `${Math.round(cast.castScores[0].score).toLocaleString()} /h` : '--'}
                                            </span>
                                            {cast.castScores?.[0]?.calculatedAt && (
                                                <span className="text-[8px] text-gray-600">
                                                    {new Date(cast.castScores[0].calculatedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <span className="text-gray-500 mr-1">¥</span>
                                            <input
                                                type="number"
                                                value={cast.averageSales}
                                                step="1000"
                                                onChange={e => handleChange(cast.id, 'averageSales', parseInt(e.target.value) || 0)}
                                                className="bg-gray-800 border-none rounded text-sm px-2 py-1 w-24 font-mono focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 space-y-1">
                                        <div className="flex items-center text-xs">
                                            <span className="w-4 text-gray-500">飲</span>
                                            <input
                                                type="number" step="0.01" min="0" max="1"
                                                value={cast.drinkBackRate || 0}
                                                onChange={e => handleChange(cast.id, 'drinkBackRate', parseFloat(e.target.value) || 0)}
                                                className="bg-gray-800 border-none rounded px-1 py-0.5 w-16 text-right font-mono focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <span className="w-4 text-gray-500">チ</span>
                                            <input
                                                type="number" step="0.01" min="0" max="1"
                                                value={cast.chekiBackRate || 0}
                                                onChange={e => handleChange(cast.id, 'chekiBackRate', parseFloat(e.target.value) || 0)}
                                                className="bg-gray-800 border-none rounded px-1 py-0.5 w-16 text-right font-mono focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 space-y-1">
                                        <div className="flex items-center text-xs">
                                            <span className="w-6 text-gray-500">SNS</span>
                                            <input
                                                type="number" step="100"
                                                value={cast.snsFollowers || 0}
                                                onChange={e => handleChange(cast.id, 'snsFollowers', parseInt(e.target.value) || 0)}
                                                className="bg-gray-800 border-none rounded px-1 py-0.5 w-16 text-right font-mono focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <span className="w-6 text-rose-500/70">欠勤</span>
                                            <input
                                                type="number" step="0.05" min="0" max="1"
                                                value={cast.absenceRate || 0}
                                                onChange={e => handleChange(cast.id, 'absenceRate', parseFloat(e.target.value) || 0)}
                                                className="bg-gray-800 border-none rounded px-1 py-0.5 w-16 text-right font-mono focus:ring-1 focus:ring-rose-500"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={cast.floorPreference || 'ANY'}
                                            onChange={e => handleChange(cast.id, 'floorPreference', e.target.value)}
                                            className="bg-gray-800 border-none rounded text-xs px-2 py-1 focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="1F">1F優先</option>
                                            <option value="2F">2F優先</option>
                                            <option value="ANY">どちらでも</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-xs space-y-1">
                                        <label className="flex items-center cursor-pointer">
                                            <input type="checkbox" checked={cast.canOpen || false} onChange={e => handleChange(cast.id, 'canOpen', e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-emerald-500 focus:ring-emerald-500 mr-1 w-3 h-3" />
                                            OPEN
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input type="checkbox" checked={cast.canClose || false} onChange={e => handleChange(cast.id, 'canClose', e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-emerald-500 focus:ring-emerald-500 mr-1 w-3 h-3" />
                                            CLOSE
                                        </label>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] space-y-1">
                                        <label className="flex items-center cursor-pointer text-rose-400">
                                            <input type="checkbox" checked={cast.isUnderage || false} onChange={e => handleChange(cast.id, 'isUnderage', e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-rose-500 focus:ring-rose-500 mr-1 w-3 h-3" />
                                            未成年
                                        </label>
                                        <label className="flex items-center cursor-pointer text-cyan-400">
                                            <input type="checkbox" checked={cast.isLeader || false} onChange={e => handleChange(cast.id, 'isLeader', e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-cyan-500 mr-1 w-3 h-3" />
                                            リーダー
                                        </label>
                                        <label className="flex items-center cursor-pointer text-amber-500/80">
                                            <input type="checkbox" checked={cast.isRookie} onChange={e => handleChange(cast.id, 'isRookie', e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500 mr-1 w-3 h-3" />
                                            新人枠
                                        </label>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewStats(cast)}
                                                className="text-cyan-500 hover:text-cyan-400 text-xs px-2 py-1 rounded hover:bg-cyan-500/10 transition-colors"
                                            >
                                                統計
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cast.id)}
                                                className="text-rose-500 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ペアルール管理セクション */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 追加フォーム */}
                    <div className="md:col-span-1 bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4">
                        <h2 className="text-lg font-bold text-fuchsia-400">💑 相性ルールの追加</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold block mb-1">キャストA (名前を正確に)</label>
                                <input
                                    type="text"
                                    list="cast-names"
                                    value={newPair.castNameA}
                                    onChange={e => setNewPair({ ...newPair, castNameA: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-fuchsia-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold block mb-1">キャストB (名前を正確に)</label>
                                <input
                                    type="text"
                                    list="cast-names"
                                    value={newPair.castNameB}
                                    onChange={e => setNewPair({ ...newPair, castNameB: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-fuchsia-500"
                                />
                            </div>
                            <datalist id="cast-names">
                                {casts.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold block mb-1">ルール種別</label>
                            <select
                                value={newPair.ruleType}
                                onChange={e => setNewPair({ ...newPair, ruleType: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-fuchsia-500"
                            >
                                <option value="ng">🚫 同時配置不可 (NG)</option>
                                <option value="synergy">💎 相乗効果 (Synergy)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold block mb-1">メモ</label>
                            <input
                                type="text"
                                value={newPair.note}
                                onChange={e => setNewPair({ ...newPair, note: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-fuchsia-500"
                                placeholder="理由など"
                            />
                        </div>
                        <button
                            onClick={handleAddPair}
                            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 rounded-lg transition-all shadow-lg shadow-fuchsia-900/30 active:scale-95"
                        >
                            ルールを保存
                        </button>
                    </div>
                </div>

                {/* ルール一覧 */}
                <div className="md:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <h2 className="text-lg font-bold text-gray-300 mb-4">登録済みの相性ルール</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[400px]">
                        {pairRules.length === 0 && <div className="col-span-full text-center py-10 text-gray-600 italic">ルールはまだありません</div>}
                        {pairRules.map(rule => (
                            <div key={rule.id} className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex justify-between items-start group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${rule.ruleType === 'ng' ? 'bg-rose-900/50 text-rose-400 border border-rose-800' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'}`}>
                                            {rule.ruleType}
                                        </span>
                                        <span className="text-xs font-bold text-gray-200">{rule.castNameA} & {rule.castNameB}</span>
                                    </div>
                                    {rule.note && <p className="text-[10px] text-gray-500 leading-tight">{rule.note}</p>}
                                </div>
                                <button
                                    onClick={() => handleDeletePair(rule.id)}
                                    className="text-gray-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <span className="text-xl">×</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 統計モーダル */}
            {statsCast && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                            <div>
                                <h2 className="text-2xl font-black text-white">{statsCast.name} のパフォーマンス分析</h2>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Cast Performance Insights</p>
                            </div>
                            <button onClick={() => setStatsCast(null)} className="text-gray-500 hover:text-white text-3xl">&times;</button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 space-y-8">
                            {loadingStats ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                                    <p className="text-gray-500 font-bold animate-pulse">AI ANALYZING DATA...</p>
                                </div>
                            ) : (
                                <>
                                    {/* スコアサマリー */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                            <label className="text-[10px] text-gray-500 font-black block mb-2">現在のAIスコア</label>
                                            <div className="text-5xl font-black text-cyan-400">
                                                {statsData?.score?.score?.toFixed(1) || '--'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                            <label className="text-[10px] text-gray-500 font-black block mb-2">時間売上 (Avg)</label>
                                            <div className="text-3xl font-black text-white">
                                                ¥{statsData?.score?.hourlyRevenue?.toLocaleString() || '0'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                                            <label className="text-[10px] text-gray-500 font-black block mb-2">出勤安定度</label>
                                            <div className="text-3xl font-black text-emerald-400">
                                                {(statsData?.score?.attendanceRate * 100)?.toFixed(0) || '0'}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* 売上推移グラフ (簡易CSS実装) */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">過去30日間の売上推移</h3>
                                        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 h-64 flex items-end gap-1">
                                            {statsData?.chartData?.length > 0 ? (
                                                statsData.chartData.map((d: any, i: number) => {
                                                    const max = Math.max(...statsData.chartData.map((x: any) => x.sales), 1);
                                                    const height = (d.sales / max) * 100;
                                                    return (
                                                        <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                                                            <div
                                                                className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all hover:bg-white min-h-[2px]"
                                                                style={{ height: `${height}%` }}
                                                            >
                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                                                                    {d.date.slice(5)}: ¥{d.sales.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600 italic text-sm">データがありません</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-6 bg-gray-950 border-t border-gray-800 text-right">
                            <button
                                onClick={() => setStatsCast(null)}
                                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-8 rounded-xl transition-all"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
        </div >
    );
}
