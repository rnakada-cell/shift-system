"use client";

import { motion } from "framer-motion";
import { 
    Calendar, 
    Rocket, 
    CheckCircle2, 
    Settings2, 
    Trash2, 
    Users,
    ChevronRight,
    Search
} from "lucide-react";
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
    scope, date, startDate, endDate, month,
    loading, confirmingShift, pairRules,
    onScopeChange, onDateChange, onStartDateChange, onEndDateChange, onMonthChange,
    onRunOptimizer, onConfirmShift, onDeletePair,
    onResetShift, onOpenCapacityModal
  } = props;

  return (
    <div className="space-y-8">
      {/* ── Control Center ── */}
      <div className="bg-[#111111]/80 backdrop-blur-3xl border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        
        {/* Scope Section */}
        <div className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">最適化スコープ設定</h2>
            </div>
          
            <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
                {(['daily', 'weekly', 'monthly'] as OptimizationScope[]).map(s => (
                <button 
                    key={s}
                    onClick={() => onScopeChange(s)}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scope === s ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    {s === 'daily' ? '日次' : s === 'weekly' ? '週次' : '月次'}
                </button>
                ))}
            </div>

            <div className="space-y-4">
                {scope === 'daily' && (
                    <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover:text-indigo-400 mb-0 transition-colors pointer-events-none" />
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => onDateChange(e.target.value)}
                            className="w-full bg-[#050505] border border-white/5 text-white rounded-2xl pl-12 pr-4 py-4 text-sm font-black italic italic outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" 
                        />
                    </div>
                )}
                {scope === 'weekly' && (
                    <div className="grid grid-cols-2 gap-3 items-center">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => onStartDateChange(e.target.value)}
                            className="w-full bg-[#050505] border border-white/5 text-white rounded-2xl p-4 text-[10px] font-black italic italic outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer" 
                        />
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => onEndDateChange(e.target.value)}
                            className="w-full bg-[#050505] border border-white/5 text-white rounded-2xl p-4 text-[10px] font-black italic italic outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer" 
                        />
                    </div>
                )}
                {scope === 'monthly' && (
                    <input 
                        type="month" 
                        value={month} 
                        onChange={e => onMonthChange(e.target.value)}
                        className="w-full bg-[#050505] border border-white/5 text-white rounded-2xl p-4 text-sm font-black italic italic text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" 
                    />
                )}
            </div>
        </div>

        {/* Action Center */}
        <div className="p-8 pt-4 space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRunOptimizer}
            disabled={loading}
            className="w-full py-5 rounded-3xl font-black italic italic text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 overflow-hidden group relative"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Rocket className={`w-5 h-5 relative z-10 ${loading ? 'animate-bounce' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
            <span className="relative z-10">{loading ? 'AIが計算中...' : 'AIでシフトを自動生成'}</span>
          </motion.button>

          <button
            onClick={onConfirmShift}
            disabled={confirmingShift}
            className="w-full py-4 rounded-2xl font-black italic italic text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirmingShift ? '保存中...' : 'このシフトで確定する'}
          </button>

          <div className="grid grid-cols-1 gap-2 border-t border-white/5 pt-6">
            <button
                onClick={onOpenCapacityModal}
                className="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2"
            >
                <Settings2 className="w-3.5 h-3.5" />
                詳細な制約・定員設定
            </button>

            <button
                onClick={onResetShift}
                className="w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/5 transition-all flex items-center justify-center gap-2"
            >
                <Trash2 className="w-3.5 h-3.5" />
                データを初期化する
            </button>
          </div>
        </div>
      </div>

      {/* Rules Registry */}
      <div className="bg-[#111111]/80 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Users className="w-4 h-4 text-amber-500" />
                </div>
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">登録済みペアルール</h2>
            </div>
            <button className="p-1 px-3 bg-white/5 rounded-full text-[8px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                管理
            </button>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
          {pairRules.length === 0 ? (
            <div className="py-12 text-center opacity-10 flex flex-col items-center">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">設定なし</p>
            </div>
          ) : (
            pairRules.map((p: any) => (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={p.id} 
                    className="flex justify-between items-center bg-[#050505]/50 p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-all"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${p.ruleType === 'ng' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-[11px] font-black italic italic text-white">{p.castNameA}</span>
                            <ChevronRight className="w-3 h-3 text-gray-700" />
                            <span className="text-[11px] font-black italic italic text-white">{p.castNameB}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onDeletePair(p.id)} 
                        className="text-gray-700 hover:text-rose-500 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
