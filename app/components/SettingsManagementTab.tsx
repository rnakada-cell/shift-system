"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

interface Settings {
  name: string;
  businessStart: string;
  businessEnd: string;
  scoreWeightHourlyRevenue: number;
  scoreWeightTotalRevenue: number;
  scoreWeightCustomerCount: number;
  scoreWeightAttendanceRate: number;
  scorePeriodDays: number;
  rankDefaultWages: Record<string, number>;
  defaultCapacity: { min1F: number; max1F: number; min2F: number; max2F: number };
  lineChannelAccessToken: string;
  lineChannelSecret: string;
}

export default function SettingsManagementTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [syncingMaster, setSyncingMaster] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [syncStartDate, setSyncStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [syncEndDate, setSyncEndDate] = useState(() => {
    const d = new Date(); d.setDate(0); // 月末
    return d.toISOString().split('T')[0];
  });

  const [syncStats, setSyncStats] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
    fetchSyncStats();
  }, []);

  const fetchSyncStats = async () => {
    try {
      const res = await fetch('/api/sync/stats');
      const json = await res.json();
      if (json.success) {
        setSyncStats(json.stats);
      }
    } catch (e) {
      console.error("Failed to fetch sync stats", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '設定を保存しました' });
      } else {
        setMessage({ type: 'error', text: '保存に失敗しました' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm("全キャストのAIスコアを再計算します。よろしいですか？")) return;
    setRecalculating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/casts/scores/recalculate', { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'AIスコアの再計算が完了しました' });
      } else {
        setMessage({ type: 'error', text: '再計算に失敗しました' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/sync/csv', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `CSVインポート完了: ${json.processedCount}件のデータを更新しました` });
      } else {
        setMessage({ type: 'error', text: `エラー: ${json.error}` });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'アップロード中にエラーが発生しました' });
    } finally {
      setUploadingCsv(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleMasterSync = async () => {
    setSyncingMaster(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: syncStartDate, endDate: syncEndDate })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `POS同期完了: 勤怠${json.attendanceCount}件, 取引${json.transactionCount}件を更新しました` });
      } else {
        setMessage({ type: 'error', text: `同期エラー: ${json.error}` });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setSyncingMaster(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-500 animate-pulse">Loading settings...</div>;
  if (!settings) return <div className="py-20 text-center text-red-400">Settings not found.</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      
      {message && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-rose-900/20 border-rose-800 text-rose-400'}`}>
          {message.text}
        </div>
      )}

      {/* 全店標準定員設定 */}
      <section className="bg-gray-900 border border-indigo-900/30 p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
          👥 全店標準・定員設定
        </h3>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          特定の日の設定がない場合に適用される、標準的な必要人数です。
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 block border-l-2 border-indigo-500 pl-2">1F フロア</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" value={settings.defaultCapacity?.min1F ?? 5} 
                onChange={e => setSettings({...settings, defaultCapacity: {...(settings.defaultCapacity || {}), min1F: parseInt(e.target.value) || 0} as any})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-center text-sm"
              />
              <span className="text-gray-600">~</span>
              <input 
                type="number" value={settings.defaultCapacity?.max1F ?? 6} 
                onChange={e => setSettings({...settings, defaultCapacity: {...(settings.defaultCapacity || {}), max1F: parseInt(e.target.value) || 0} as any})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-center text-sm"
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 block border-l-2 border-emerald-500 pl-2">2F カウンター</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" value={settings.defaultCapacity?.min2F ?? 3} 
                onChange={e => setSettings({...settings, defaultCapacity: {...(settings.defaultCapacity || {}), min2F: parseInt(e.target.value) || 0} as any})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-center text-sm"
              />
              <span className="text-gray-600">~</span>
              <input 
                type="number" value={settings.defaultCapacity?.max2F ?? 4} 
                onChange={e => setSettings({...settings, defaultCapacity: {...(settings.defaultCapacity || {}), max2F: parseInt(e.target.value) || 0} as any})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-center text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* データ同期設定 */}
      <section className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          🔄 データ同期・蓄積
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 勤怠CSVインポート */}
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-300">勤怠管理CSVインポート</h4>
              <span className="text-[10px] text-gray-500 italic">過去データ蓄積に</span>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                「勤怠管理 CSV」をアップロードしてAIに学習させます。
              </p>
              <div className="relative group">
                <input 
                  type="file" accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={uploadingCsv}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={`py-4 border-2 border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:bg-gray-900/50 transition-all ${uploadingCsv ? 'opacity-50' : ''}`}>
                  <span className="text-2xl">📄</span>
                  <span className="text-xs font-bold text-gray-400">{uploadingCsv ? 'インポート中...' : 'CSVを選択'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* POSCONE 過去データ同期 */}
          <div className="bg-gray-950 p-6 rounded-xl border border-gray-800 space-y-4">
            <h4 className="text-sm font-bold text-gray-300">POSCONE 履歴データ同期</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="date" value={syncStartDate}
                  onChange={e => setSyncStartDate(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-gray-600">〜</span>
                <input 
                  type="date" value={syncEndDate}
                  onChange={e => setSyncEndDate(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button 
                onClick={handleMasterSync}
                disabled={syncingMaster}
                className="w-full py-3 rounded-xl bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {syncingMaster ? '同期中...' : '🌐 POSCONEから履歴を同期'}
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* LINE 通知設定 (新規追加) */}
      <section className="bg-[#111111]/60 border border-white/5 p-8 rounded-[32px] space-y-6 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full group-hover:bg-emerald-500/10 transition-all" />
        
        <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <span className="text-xl">💬</span>
            </div>
            <div>
                <h3 className="text-xl font-black italic italic tracking-tighter text-white">LINE 通知エンジン設定</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Messaging API 連携</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-[24px]">
                <h4 className="text-xs font-black text-emerald-400 mb-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> 通知の仕組みについて
                </h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                    キャスト固有の <span className="text-white font-bold">LINE ID</span> が登録されている場合、シフト交代の申請や承認時にシステムから自動的に通知が送信されます。
                    通知内容はデータベースに記録された後、このAPIキーを使用してLINEのプッシュ通知へ変換されます。
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Channel Access Token</label>
                    <input 
                        type="password" 
                        value={settings.lineChannelAccessToken || ''} 
                        onChange={e => setSettings({...settings, lineChannelAccessToken: e.target.value})}
                        className="w-full bg-[#050505] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Channel Secret</label>
                    <input 
                        type="password" 
                        value={settings.lineChannelSecret || ''} 
                        onChange={e => setSettings({...settings, lineChannelSecret: e.target.value})}
                        className="w-full bg-[#050505] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-12 rounded-xl transition-all shadow-xl shadow-indigo-900/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? '保存中...' : '設定を保存する'}
        </button>
      </div>

    </div>
  );
}
