"use client";

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
}

export default function ShiftResultView(props: ShiftResultViewProps) {
  const { 
    data, expandedDay, onSetExpandedDay, formatDate, getCastName, isCastRookie, onUpdateKPIs,
    dayCapacities = {}, onUpdateDayCapacity 
  } = props;

  if (!data?.dailyResults) return null;

  return (
    <div className="space-y-2">
      {data.dailyResults.map((day: any) => (
        <div key={day.date} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* 日別ヘッダー */}
          <button
            onClick={() => onSetExpandedDay(expandedDay === day.date ? null : day.date)}
            className="w-full px-5 py-3 flex justify-between items-center hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-200">{formatDate(day.date)}</span>
              <span className="text-xs text-indigo-300">売上 ¥{(day.dailyRevenue || 0).toLocaleString()}</span>
              <span className="text-xs text-emerald-300">利益 ¥{(day.dailyProfit || 0).toLocaleString()}</span>
            </div>
            <span className="text-gray-500 text-sm">{expandedDay === day.date ? '▲' : '▼'}</span>
          </button>

          {/* 日別詳細 */}
          {expandedDay === day.date && (
            <div className="border-t border-gray-800 p-4 grid gap-3">
              {day.segments.map((seg: any) => (
                <div key={seg.segmentId} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-300">
                      {(seg.segmentId || '').replace('SEG_', '').replace('_', ':00 - ') + ':00'}
                    </span>
                      <div className="text-xs text-gray-500 flex gap-3">
                        <span>売上 <span className="text-indigo-300">¥{(seg.expectedRevenue || 0).toLocaleString()}</span></span>
                        <span>利益 <span className="text-emerald-300">¥{(seg.expectedProfit || 0).toLocaleString()}</span></span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 配置キャスト */}
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">AI配置</div>
                      {!(seg.assignments?.length) && !(seg.assignedCastIds?.length) ? (
                        <div className="text-xs text-gray-600 italic">該当なし</div>
                      ) : seg.assignments ? (
                        <div className="space-y-3">
                          {/* 1F */}
                          <div>
                            <span className="text-[10px] bg-indigo-900/50 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-700 font-bold mb-1 inline-block">1F フロア</span>
                            <div className="flex flex-wrap gap-1">
                              {seg.assignments.filter((a: any) => a.floor === '1F').map((a: any) => (
                                <div key={a.castId} className="group relative">
                                  <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${isCastRookie(a.castId) ? 'bg-fuchsia-900/40 border-fuchsia-700 text-fuchsia-300' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                                    {isCastRookie(a.castId) && '🔰 '}{getCastName(a.castId)}
                                    {seg.rationales?.find((r: any) => r.castId === a.castId) && (
                                      <span className="text-[10px] text-indigo-400 ml-1 opacity-70 cursor-help" title={seg.rationales.find((r: any) => r.castId === a.castId).rationale}>💡</span>
                                    )}
                                    <button 
                                      onClick={() => {
                                        const newData = {...data};
                                        const dayData = newData.dailyResults.find((dr: any) => dr.date === day.date);
                                        const segment = dayData.segments.find((s: any) => s.segmentId === seg.segmentId);
                                        segment.assignments = segment.assignments.filter((asm: any) => asm.castId !== a.castId);
                                        onUpdateKPIs(newData);
                                      }}
                                      className="ml-1 text-gray-500 hover:text-rose-400 transition-colors"
                                    >×</button>
                                  </span>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const castId = prompt("追加するキャストのIDを入力してください（β機能）");
                                  if (!castId) return;
                                  const newData = {...data};
                                  const dayData = newData.dailyResults.find((dr: any) => dr.date === day.date);
                                  const segment = dayData.segments.find((s: any) => s.segmentId === seg.segmentId);
                                  segment.assignments.push({ castId, floor: '1F' });
                                  onUpdateKPIs(newData);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
                              >+ 追加</button>
                              {seg.assignments.filter((a: any) => a.floor === '1F').length === 0 && <span className="text-xs text-rose-500/50 italic">配置なし</span>}
                            </div>
                          </div>
                          {/* 2F */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-700 font-bold mb-1 inline-block">2F カウンター</span>
                            <div className="flex flex-wrap gap-1">
                              {(seg.assignments || []).filter((a: any) => a.floor === '2F').map((a: any) => (
                                <div key={a.castId} className="group relative">
                                  <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${isCastRookie(a.castId) ? 'bg-fuchsia-900/40 border-fuchsia-700 text-fuchsia-300' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                                    {isCastRookie(a.castId) && '🔰 '}{getCastName(a.castId)}
                                    {seg.rationales?.find((r: any) => r.castId === a.castId) && (
                                      <span className="text-[10px] text-indigo-400 ml-1 opacity-70 cursor-help" title={seg.rationales.find((r: any) => r.castId === a.castId).rationale}>💡</span>
                                    )}
                                    <button 
                                      onClick={() => {
                                        const newData = {...data};
                                        const dayData = newData.dailyResults.find((dr: any) => dr.date === day.date);
                                        const segment = dayData.segments.find((s: any) => s.segmentId === seg.segmentId);
                                        segment.assignments = (segment.assignments || []).filter((asm: any) => asm.castId !== a.castId);
                                        onUpdateKPIs(newData);
                                      }}
                                      className="ml-1 text-gray-500 hover:text-rose-400 transition-colors"
                                    >×</button>
                                  </span>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const castId = prompt("追加するキャストのIDを入力してください（β機能）");
                                  if (!castId) return;
                                  const newData = {...data};
                                  const dayData = newData.dailyResults.find((dr: any) => dr.date === day.date);
                                  const segment = dayData.segments.find((s: any) => s.segmentId === seg.segmentId);
                                  segment.assignments.push({ castId, floor: '2F' });
                                  onUpdateKPIs(newData);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
                              >+ 追加</button>
                              {(seg.assignments || []).filter((a: any) => a.floor === '2F').length === 0 && <span className="text-xs text-rose-500/50 italic">配置なし</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(seg.assignedCastIds || []).map((id: string) => (
                            <span key={id} className={`text-xs px-2 py-1 rounded-full border ${isCastRookie(id) ? 'bg-fuchsia-900/40 border-fuchsia-700 text-fuchsia-300' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                              {isCastRookie(id) && '🔰 '}{getCastName(id)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Why インサイト */}
                    <div className="space-y-4">
                      {seg.unassignedReasons?.length > 0 && (
                        <div>
                          <div className="text-xs text-rose-500 uppercase tracking-wider mb-1">制約により未配置</div>
                          <div className="space-y-1">
                            {seg.unassignedReasons.map((r: any, i: number) => (
                              <div key={i} className="text-[10px] text-gray-500 flex items-start gap-1">
                                <span className="text-rose-600 shrink-0">⚠</span>
                                <span><span className="text-gray-400">{getCastName(r.castId)}:</span> {r.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {seg.rationales?.length > 0 && (
                        <div>
                          <div className="text-xs text-indigo-400 uppercase tracking-wider mb-1">AI意思決定の根拠 (ROI)</div>
                          <div className="space-y-1">
                            {(seg.assignments || []).map((asm: any, i: number) => {
                              const r = seg.rationales.find((rat: any) => rat.castId === asm.castId);
                              return (
                                <div key={i} className="text-[10px] bg-indigo-950/20 border border-indigo-900/30 p-2 rounded flex flex-col gap-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-indigo-300 font-black">{getCastName(asm.castId)}</span>
                                    <span className="text-emerald-400 font-bold">売上予想: ¥{(asm.expectedRevenue || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="text-gray-500 italic text-[8px] border-l-2 border-indigo-500 pl-2">
                                    {r?.rationale || '実績ベースの最適配置'}
                                  </div>
                                  {asm.detailedRationale && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {asm.detailedRationale.map((d: any, idx: number) => (
                                        <span key={idx} className={`px-1 rounded ${d.type === 'synergy' ? 'bg-amber-900/40 text-amber-300' : 'bg-gray-800 text-gray-400'}`}>
                                          {d.label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
