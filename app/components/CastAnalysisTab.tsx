"use client";

import { useState } from "react";
import { Cast } from "@/lib/optimizer";

interface CastAnalysisTabProps {
  casts: Cast[];
  getCastName: (id: string) => string;
}

export default function CastAnalysisTab({ casts, getCastName }: CastAnalysisTabProps) {
  const [selectedCast, setSelectedCast] = useState<any | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleViewStats = async (cast: Cast) => {
    setSelectedCast(cast);
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
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-950 border-b border-gray-800">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-gray-400">名前</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 text-center">ランク</th>
              <th className="px-4 py-3 text-xs font-bold text-cyan-400 text-right">AI スコア</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 text-right">時給売上 (Avg)</th>
              <th className="px-4 py-3 text-xs font-bold text-emerald-400 text-center">今月の出勤</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-400 text-center">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {casts.map(cast => (
              <tr key={cast.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-sm font-bold">{cast.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px] font-bold border border-gray-700">{cast.rank}</span>
                </td>
                <td className="px-4 py-3 text-right text-cyan-400 font-mono font-bold">
                  {cast.aiScore ? Math.round(cast.aiScore).toLocaleString() : '--'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-mono text-gray-300">
                  ¥{cast.hourlyRevenue ? cast.hourlyRevenue.toLocaleString() : '0'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold text-emerald-400">{(cast as any).monthlyAttendanceCount || 0}日</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => handleViewStats(cast)}
                    className="text-[10px] bg-gray-800 hover:bg-indigo-900/50 text-indigo-400 border border-indigo-900/50 px-3 py-1 rounded transition-all"
                  >
                    詳細分析
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCast && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <div>
              <h3 className="text-xl font-black text-white">{selectedCast.name} のパフォーマンス詳細</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cast AI Insight Report</p>
            </div>
            <button onClick={() => setSelectedCast(null)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
          </div>

          {loadingStats ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-xs text-gray-500 font-bold animate-pulse">AI 分析中...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <label className="text-[10px] text-gray-500 font-black block mb-1">現在の評価スコア</label>
                  <div className="text-3xl font-black text-cyan-400">{statsData?.score?.score?.toFixed(1) || '--'}</div>
                </div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <label className="text-[10px] text-gray-500 font-black block mb-1">時給単価 (Avg)</label>
                  <div className="text-2xl font-black text-white">¥{statsData?.score?.hourlyRevenue?.toLocaleString() || '0'}</div>
                </div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <label className="text-[10px] text-gray-500 font-black block mb-1">出勤率 (30d)</label>
                  <div className="text-2xl font-black text-emerald-400">{(statsData?.score?.attendanceRate * 100)?.toFixed(0) || '0'}%</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">売上トレンド</h4>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 h-48 flex items-end gap-1">
                  {statsData?.chartData?.length > 0 ? (
                    statsData.chartData.map((d: any, i: number) => {
                      const max = Math.max(...statsData.chartData.map((x: any) => x.sales), 1);
                      const height = (d.sales / max) * 100;
                      return (
                        <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                          <div 
                            className="w-full bg-indigo-600/60 rounded-t-sm transition-all hover:bg-indigo-400 min-h-[1px]"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl border border-gray-700">
                              {d.date.slice(5)}: ¥{d.sales.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 italic text-xs">データがありません</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
