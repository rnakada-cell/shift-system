"use client";

interface SummaryData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

interface ExecutiveSummaryProps {
  summary: SummaryData;
  confirmedCount: number;
}

export default function ExecutiveSummary({ summary, confirmedCount }: ExecutiveSummaryProps) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      {confirmedCount > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">📁</span>
            <div>
              <div className="text-xs font-bold text-emerald-300">確定済みデータあり</div>
              <div className="text-[10px] text-emerald-500/80">この日のシフトは既に保存されています。</div>
            </div>
          </div>
          <div className="text-xs font-bold text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
            枠数: {confirmedCount}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-gray-400 text-xs font-medium">期間合計売上</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            ¥{(summary.totalRevenue || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-gray-400 text-xs font-medium">期間合計コスト</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            ¥{(summary.totalCost || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center ring-1 ring-emerald-600/30">
          <div className="text-gray-400 text-xs font-medium">期間合計利益</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ¥{(summary.totalProfit || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
