"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ChevronDown, 
    TrendingUp, 
    Zap, 
    Layers, 
    MapPin,
    AlertCircle,
    Info,
    UserCircle2,
    BarChart3,
    List
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
  
  const [viewMode, setViewMode] = useState<'cards' | 'heatmap'>('heatmap');

  if (!data?.dailyResults) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex bg-[#111111]/80 backdrop-blur-3xl p-1.5 rounded-xl border border-white/5">
            <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <List className="w-4 h-4" /> スロット詳細
            </button>
            <button
                onClick={() => setViewMode('heatmap')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'heatmap' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <BarChart3 className="w-4 h-4" /> 比較・ヒートマップ
            </button>
        </div>

        {onExport && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
          >
            <span className="text-xl">📊</span>
            Excelに出力
          </motion.button>
        )}
      </div>

      {data.dailyResults.map((day: any) => {
        // Collect all casts assigned or applied for this day
        const dayAvailabilities = data.availabilities?.map((ca: any) => ({
            castId: ca.castId,
            avail: ca.availability.find((a: any) => a.date === day.date)
        })).filter((c: any) => c.avail) || [];

        const assignedCastIds = new Set<string>();
        day.segments.forEach((seg: any) => {
            seg.assignments?.forEach((a: any) => assignedCastIds.add(a.castId));
        });

        // Unique casts involved today
        const involvedCasts = Array.from(new Set([
            ...dayAvailabilities.map((c: any) => c.castId),
            ...Array.from(assignedCastIds)
        ]));

        return (
          <div key={day.date} className="bg-[#111111]/40 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden shadow-2xl transition-all hover:border-white/10">
            {/* Daily Header */}
            <button
              onClick={() => onSetExpandedDay(expandedDay === day.date ? null : day.date)}
              className="w-full px-8 py-5 flex justify-between items-center hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-center gap-8">
                  <div>
                      <span className="text-xl font-black italic tracking-tighter text-white group-hover:text-indigo-400 transition-colors">{formatDate(day.date)}</span>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">運用サイクル</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6">
                      <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-500/50" />
                          <span className="text-sm font-black italic text-indigo-400">売上 ¥{(day.dailyRevenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-500/50" />
                          <span className="text-sm font-black italic text-emerald-400">利益 ¥{(day.dailyProfit || 0).toLocaleString()}</span>
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
                      <div className="border-t border-white/5 p-8">
                        {viewMode === 'heatmap' ? (
                            <div className="bg-[#050505]/60 border border-white/5 rounded-[28px] p-6 overflow-x-auto">
                                <div className="min-w-[800px]">
                                    {/* Heatmap Header */}
                                    <div className="flex mb-4">
                                        <div className="w-40 shrink-0"></div>
                                        <div className="flex-1 flex gap-2">
                                            {day.segments.map((seg: any) => (
                                                <div key={seg.segmentId} className="flex-1 text-center">
                                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl py-2 mb-2">
                                                        <span className="text-xs font-black italic tracking-tighter text-indigo-400">
                                                            {seg.segmentId.replace('SEG_', '').replace('_', ':00-') + ':00'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-around text-[10px] font-black uppercase text-gray-500">
                                                        <span>1F: {seg.assignments?.filter((a: any) => a.floor === '1F').length || 0}</span>
                                                        <span>2F: {seg.assignments?.filter((a: any) => a.floor === '2F').length || 0}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Heatmap Rows */}
                                    <div className="space-y-2">
                                        {involvedCasts.map(castId => {
                                            const availData = dayAvailabilities.find((a: any) => a.castId === castId)?.avail;
                                            
                                            return (
                                                <div key={castId} className="flex items-stretch hover:bg-white/[0.02] p-1 rounded-xl transition-colors">
                                                    <div className="w-40 shrink-0 flex items-center gap-2 px-2">
                                                        {isCastRookie(castId) && <span className="text-[10px]">🔰</span>}
                                                        <span className="text-sm font-black italic text-gray-300">{getCastName(castId)}</span>
                                                    </div>
                                                    <div className="flex-1 flex gap-2">
                                                        {day.segments.map((seg: any) => {
                                                            // Check if assigned
                                                            const assignment = seg.assignments?.find((a: any) => a.castId === castId);
                                                            
                                                            // Check if requested via segments or startTime/endTime
                                                            let isRequested = false;
                                                            if (availData) {
                                                                if (availData.segments && availData.segments.find((s: any) => s.segmentId === seg.segmentId)) {
                                                                    isRequested = true;
                                                                } else if (availData.startTime && availData.endTime) {
                                                                    const parseTime = (str: string) => {
                                                                        const [h,m] = str.split(':').map(Number);
                                                                        return (h < 6 ? h + 24 : h) * 60 + m;
                                                                    };
                                                                    const parts = seg.segmentId.replace('SEG_', '').split('_');
                                                                    const segStartStr = parts[0] + ":00";
                                                                    const segStart = parseTime(segStartStr);
                                                                    const aStart = parseTime(availData.startTime);
                                                                    const aEnd = parseTime(availData.endTime);
                                                                    if (aStart <= segStart && aEnd > segStart) {
                                                                        isRequested = true;
                                                                    }
                                                                }
                                                            }

                                                            // Determine Styling
                                                            let bgClass = "bg-white/[0.02] border-white/5";
                                                            let textClass = "text-transparent";
                                                            let content = "-";

                                                            if (assignment) {
                                                                bgClass = assignment.floor === '1F' ? "bg-indigo-500/20 border-indigo-500/50" : "bg-emerald-500/20 border-emerald-500/50";
                                                                textClass = assignment.floor === '1F' ? "text-indigo-400" : "text-emerald-400";
                                                                content = assignment.floor;
                                                            } else if (isRequested) {
                                                                bgClass = "bg-amber-500/10 border-amber-500/30 border-dashed";
                                                                textClass = "text-amber-500/50";
                                                                content = "希望のみ";
                                                            }

                                                            return (
                                                                <div key={seg.segmentId} className={`flex-1 flex items-center justify-center p-2 rounded-lg border text-[10px] font-black uppercase tracking-widest ${bgClass} ${textClass}`}>
                                                                    {content}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="mt-8 flex items-center justify-end gap-6 text-[10px] font-black uppercase text-gray-500">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-500/20 border border-indigo-500/50"></div> 1F 確定</div>
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50"></div> 2F 確定</div>
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500/10 border border-amber-500/30 border-dashed"></div> 希望のみ（シフト外れ）</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {day.segments.map((seg: any) => (
                                    <div key={seg.segmentId} className="bg-[#050505]/60 border border-white/5 rounded-[28px] p-6 relative group/seg transition-all hover:bg-[#050505]/80 hover:border-white/10">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                    <Layers className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <h4 className="text-lg font-black italic uppercase tracking-tighter">
                                                    {(seg.segmentId || '').replace('SEG_', '').replace('_', ':00 - ') + ':00'}
                                                </h4>
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">予想売上</span>
                                                    <span className="text-sm font-black italic text-indigo-400">¥{(seg.expectedRevenue || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">予想利益</span>
                                                    <span className="text-sm font-black italic text-emerald-400">¥{(seg.expectedProfit || 0).toLocaleString()}</span>
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
                                                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black italic transition-all ${isCastRookie(a.castId) ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.1)]' : 'bg-white/5 border-white/5 text-gray-300 hover:border-white/20'}`}>
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
                                                                        <span className="text-[11px] font-black italic text-white">{getCastName(asm.castId)}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-black italic text-emerald-400">貢献売上: ¥{(asm.expectedRevenue || 0).toLocaleString()}</span>
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
                        )}
                      </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
