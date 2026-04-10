"use client";

import { OptimizationMode, OptimizationScope, OptimizationWeights, OptimizationConstraints } from "@/lib/optimizer";

interface ShiftControlPanelProps {
  mode: OptimizationMode;
  scope: OptimizationScope;
  date: string;
  startDate: string;
  endDate: string;
  month: string;
  weights: OptimizationWeights;
  constraints: OptimizationConstraints;
  loading: boolean;
  confirmingShift: boolean;
  scrapedArpu: number;
  aiWeights: any;
  rankWages: Record<string, number>;
  pairRules: any[];
  onModeChange: (m: OptimizationMode) => void;
  onScopeChange: (s: OptimizationScope) => void;
  onWeightsChange: (w: OptimizationWeights) => void;
  onConstraintsChange: (c: OptimizationConstraints) => void;
  onDateChange: (d: string) => void;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
  onMonthChange: (m: string) => void;
  onRunOptimizer: () => void;
  onConfirmShift: () => void;
  onDeletePair: (id: string) => void;
  onResetShift: () => void;
  onOpenCapacityModal: () => void;
}

export default function ShiftControlPanel(props: ShiftControlPanelProps) {
  const {
    mode, scope, date, startDate, endDate, month, weights, constraints,
    loading, confirmingShift, scrapedArpu, aiWeights, rankWages, pairRules,
    onModeChange, onScopeChange, onWeightsChange, onConstraintsChange,
    onDateChange, onStartDateChange, onEndDateChange, onMonthChange,
    onRunOptimizer, onConfirmShift, onDeletePair,
    onResetShift, onOpenCapacityModal
  } = props;

  return (
    <div className="xl:col-span-1 space-y-4">
      {/* 最適化スコープ */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* ── 期間セクション ── */}
        <div className="p-4 pb-3">
          <h2 className="text-[10px] font-bold text-cyan-400 mb-2 uppercase tracking-widest">📅 最適化期間</h2>
          <div className="flex gap-1.5 mb-3">
            {(['daily', 'weekly', 'monthly'] as OptimizationScope[]).map(s => (
              <button key={s}
                onClick={() => onScopeChange(s)}
                className={`flex-1 py-1.5 text-[11px] rounded-lg font-bold transition-all ${scope === s ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/50' : 'bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-750'}`}
              >
                {s === 'daily' ? '日次' : s === 'weekly' ? '週次' : '月次'}
              </button>
            ))}
          </div>

          {scope === 'daily' && (
            <input type="date" value={date} onChange={e => onDateChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm font-mono text-center outline-none focus:ring-1 focus:ring-cyan-600" />
          )}
          {scope === 'weekly' && (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-cyan-600" />
              <span className="text-gray-600 text-xs">〜</span>
              <input type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-cyan-600" />
            </div>
          )}
          {scope === 'monthly' && (
            <input type="month" value={month} onChange={e => onMonthChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm font-mono text-center outline-none focus:ring-1 focus:ring-cyan-600" />
          )}
        </div>

        {/* ── アクションセクション ── */}
        <div className="border-t border-gray-800 p-4 space-y-2">

          {/* メインCTA: AI再計算 */}
          <button
            onClick={onRunOptimizer}
            disabled={loading}
            className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-900/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin inline-block">🔄</span> 計算中...</>
            ) : (
              <><span>🚀</span> AI再計算・最適化</>
            )}
          </button>

          {/* サブCTA: 確定反映 */}
          <button
            onClick={onConfirmShift}
            disabled={confirmingShift}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-600/40 shadow-md shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirmingShift ? '💾 保存中...' : '✅ この構成で確定反映'}
          </button>

          {/* 定員設定リンク */}
          <button
            onClick={onOpenCapacityModal}
            className="w-full py-2 rounded-lg font-bold text-[11px] bg-indigo-950/60 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/40 transition-all flex items-center justify-center gap-1.5"
          >
            <span>👥</span> 日別定員の詳細設定
          </button>

          {/* 危険操作: 初期化（目立ちすぎず、でも分かる） */}
          <button
            onClick={onResetShift}
            className="w-full py-1.5 rounded-lg text-[10px] font-bold text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-800/50 transition-all flex items-center justify-center gap-1"
          >
            🗑️ 期間内の全シフト案と確定データを初期化
          </button>
        </div>
      </div>

      {/* 登録済みペアルール */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">登録済みのペアルール</h2>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {pairRules.length === 0 && <div className="text-[10px] text-gray-600 italic">設定なし</div>}
          {pairRules.map((p: any) => (
            <div key={p.id} className="flex justify-between items-center bg-gray-950 p-1.5 rounded border border-gray-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full ${p.ruleType === 'ng' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                <span className="text-[10px] text-gray-300 truncate">{p.castNameA} & {p.castNameB}</span>
              </div>
              <button 
                onClick={() => onDeletePair(p.id)} 
                className="text-gray-600 hover:text-rose-400 text-xs px-1"
              >×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
