"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
    ChevronDown, 
    ChevronUp, 
    TrendingUp, 
    Zap, 
    Layers, 
    MapPin,
    AlertCircle,
    Info,
    UserCircle2
} from "lucide-react";

interface ShiftResultViewProps {
  data: any;
  expandedDay: string | null;
  onSetExpandedDay: (day: string | null) => void;
  formatDate: (date: string) => string;
  getCastName: (id: string) => string;
  isCastRookie: (id: string) => boolean;
  onUpdateKPIs: (newData: any) => void;
  dayCapacities?: Record<string, any>;
  onUpdateDayCapacity?: (key: string, val: any) => void;
  onExport?: () => void;
}

export default function ShiftResultView(props: ShiftResultViewProps) {
  const { 
    data, expandedDay, onSetExpandedDay, formatDate, getCastName, isCastRookie, onUpdateKPIs, onExport
  } = props;

  if (!data?.dailyResults) return null;

  return (
    <div className="space-y-4">
      {onExport && (
        <div className="flex justify-end mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
          >
            <span className="text-xl">📊</span>
            Excelに出力
          </motion.button>
        </div>
      )}
      {data.dailyResults.map((day: any) => (
        <div key={day.date} className="bg-[#111111]/40 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden shadow-2xl transition-all hover:border-white/10">
          {/* Daily Header */}
          <button
            onClick={() => onSetExpandedDay(expandedDay === day.date ? null : day.date)}
            className="w-full px-8 py-5 flex justify-between items-center hover:bg-white/[0.02] transition-colors group"
          >
            <div className="flex items-center gap-8">
                <div>
                    <span className="text-xl font-black italic italic tracking-tighter text-white group-hover:text-indigo-400 transition-colors">{formatDate(day.date)}</span>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">運用サイクル</p>
                </div>
                <div className="hidden md:flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500/50" />
                        <span className="text-sm font-black italic italic text-indigo-400">売上 ¥{(day.dailyRevenue || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500/50" />
                        <span className="text-sm font-black italic italic text-emerald-400">利益 ¥{(day.dailyProfit || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div className={`p-2 rounded-xl bg-white/5 border border-white/5 transition-all ${expandedDay === day.date ? 'rotate-180 bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'text-gray-500'}`}>
                <ChevronDown className="w-5 h-5" />
            </div>
          </button>

          {/* Daily Details */}
          <AnimatePresence>
            {expandedDay === day.date && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="border-t border-white/5 p-8 grid gap-6">
                    {day.segments.map((seg: any) => (
                        <div key={seg.segmentId} className="bg-[#050505]/60 border border-white/5 rounded-[28px] p-6 relative group/seg transition-all hover:bg-[#050505]/80 hover:border-white/10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <h4 className="text-lg font-black italic italic uppercase tracking-tighter">
                                        {(seg.segmentId || '').replace('SEG_', '').replace('_', ':00 - ') + ':00'}
                                    </h4>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">予想売上</span>
                                        <span className="text-sm font-black italic italic text-indigo-400">¥{(seg.expectedRevenue || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">予想利益</span>
                                        <span className="text-sm font-black italic italic text-emerald-400">¥{(seg.expectedProfit || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Deployment Matrix */}
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">AI配置マトリクス</h5>
                                    <div className="space-y-4">
                                        {[
                                            { id: '1F', label: '1F フロア' },
                                            { id: '2F', label: '2F カウンター' }
                                        ].map(floor => (
                                            <div key={floor.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <MapPin className={`w-3 h-3 ${floor.id === '1F' ? 'text-indigo-400' : 'text-emerald-400'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${floor.id === '1F' ? 'text-indigo-400' : 'text-emerald-400'}`}>{floor.label}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {seg.assignments?.filter((a: any) => a.floor === floor.id).map((a: any) => (
                                                        <div key={a.castId} className="group/cast relative">
                                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black italic italic transition-all ${isCastRookie(a.castId) ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'bg-white/5 border-white/5 text-gray-300 hover:border-white/20'}`}>
                                                                {isCastRookie(a.castId) && <span className="text-[8px]">🔰</span>}
                                                                {getCastName(a.castId)}
                                                                <button 
                                                                    onClick={() => {
                                                                        const newData = {...data};
                                                                        const segment = newData.dailyResults.find((dr: any) => dr.date === day.date).segments.find((s: any) => s.segmentId === seg.segmentId);
                                                                        segment.assignments = segment.assignments.filter((asm: any) => asm.castId !== a.castId);
                                                                        onUpdateKPIs(newData);
                                                                    }}
                                                                    className="ml-1 text-gray-700 hover:text-rose-500 transition-colors"
                                                                >×</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const castId = prompt("追加するキャストIDを入力:");
                                                            if (!castId) return;
                                                            const newData = {...data};
                                                            newData.dailyResults.find((dr: any) => dr.date === day.date).segments.find((s: any) => s.segmentId === seg.segmentId).assignments.push({ castId, floor: floor.id });
                                                            onUpdateKPIs(newData);
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl border border-dashed border-white/10 text-[10px] uppercase font-black text-gray-600 hover:text-white hover:border-white/20 transition-all"
                                                    >+ 追加</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Intelligent Rationale */}
                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">AI配置の根拠・インサイト</h5>
                                    
                                    {/* Warnings */}
                                    {seg.unassignedReasons?.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {seg.unassignedReasons.map((r: any, i: number) => (
                                                <div key={i} className="flex items-start gap-2 text-[10px] text-rose-500/70 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                                    <span><span className="font-bold text-rose-500">{getCastName(r.castId)}:</span> {r.reason}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ROI Insights */}
                                    <div className="space-y-3">
                                        {(seg.assignments || []).map((asm: any, i: number) => {
                                            const r = seg.rationales?.find((rat: any) => rat.castId === asm.castId);
                                            return (
                                                <div key={i} className="bg-[#111111]/40 border border-white/5 p-4 rounded-2xl group/insight hover:border-indigo-500/20 transition-all">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <UserCircle2 className="w-3 h-4 text-indigo-400/50" />
                                                            <span className="text-[11px] font-black italic italic text-white">{getCastName(asm.castId)}</span>
                                                        </div>
                                                        <span className="text-[10px] font-black italic italic text-emerald-400">貢献売上: ¥{(asm.expectedRevenue || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 pl-2 border-l border-indigo-500/30">
                                                        <Info className="w-3 h-3 text-indigo-500/50 mt-0.5" />
                                                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                                                            {r?.rationale || '過去のパフォーマンスデータに基づいた最適な配置です。'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
