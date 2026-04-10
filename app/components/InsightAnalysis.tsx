"use client";

interface InsightAnalysisProps {
  analysisData: any;
  fetchingAnalysis: boolean;
  getCastName: (id: string) => string;
}

export default function InsightAnalysis(props: InsightAnalysisProps) {
  const { analysisData, fetchingAnalysis, getCastName } = props;

  if (fetchingAnalysis) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse bg-gray-900 border border-gray-800 rounded-2xl">
        AI売上分析データを読み込み中...
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl">
        分析データがありません。「再計算」を実行してください。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 需給トレンド */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span className="text-indigo-400">📈</span> 需給トレンド分析
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
            <div className="text-sm font-bold text-gray-400 mb-3">時間帯別・予測客数 (期待値)</div>
            <div className="space-y-2">
              {analysisData.demandTrends?.map((d: any) => (
                <div key={d.hour} className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 w-8">{d.hour}:00</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500/60" 
                      style={{ width: `${Math.min(100, (d.count / 15) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300">{d.count.toFixed(1)}人</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
            <div className="text-sm font-bold text-gray-400 mb-3">AIによる推奨キャスト数</div>
            <div className="space-y-2">
              {analysisData.demandTrends?.map((d: any) => (
                <div key={d.hour} className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 w-8">{d.hour}:00</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500/60" 
                      style={{ width: `${Math.min(100, (d.suggestedSupply / 10) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300">{d.suggestedSupply.toFixed(1)}名</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* キャスト別・売上ポテンシャル */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span className="text-fuchsia-400">💎</span> キャスト別・売上ポテンシャル (ROI)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="pb-3 pl-2">キャスト名</th>
                <th className="pb-3">時間売上 (実力値)</th>
                <th className="pb-3">相性シナジー</th>
                <th className="pb-3">AI優先度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {analysisData.castPerformance?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 pl-2">
                    <div className="font-bold text-gray-300">{getCastName(c.id)}</div>
                    <div className="text-[10px] text-gray-500">{c.rank}ランク</div>
                  </td>
                  <td className="py-3">
                    <div className="text-indigo-300 font-bold">¥{Math.round(c.hourlyRevenue).toLocaleString()}</div>
                    <div className="text-[9px] text-gray-600">Avg. ¥{Math.round(c.averageSales).toLocaleString()}/回</div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.topSynergies?.map((s: any, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 rounded border border-emerald-800/50 text-[9px]">
                          +{Math.round(s.boost * 100)}% with {getCastName(s.partnerId)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full max-w-[60px]">
                        <div className="h-full bg-fuchsia-500" style={{ width: `${c.aiScore}%` }}></div>
                      </div>
                      <span className="font-bold text-fuchsia-400">{Math.round(c.aiScore)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
