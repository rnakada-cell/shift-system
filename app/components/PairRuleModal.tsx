"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Edit3, Save, UserPlus, Info } from "lucide-react";

interface PairRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    pairRules: any[];
    casts: any[];
    onSavePair: (pair: any) => Promise<void>;
    onDeletePair: (id: string) => Promise<void>;
}

export default function PairRuleModal({ isOpen, onClose, pairRules, casts, onSavePair, onDeletePair }: PairRuleModalProps) {
    const [editingRule, setEditingRule] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newPair, setNewPair] = useState({ castNameA: '', castNameB: '', ruleType: 'ng', note: '' });

    const handleSave = async (data: any) => {
        setIsSaving(true);
        try {
            await onSavePair(data);
            setEditingRule(null);
            if (!data.id) {
                setNewPair({ castNameA: '', castNameB: '', ruleType: 'ng', note: '' });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-[#0D0D0D] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">相性ルール設定</h2>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Registry Management // Compatibility rules</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                <X className="w-6 h-6 text-gray-500 hover:text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Left: Add Form */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-3xl space-y-4">
                                    <h3 className="text-xs font-black uppercase text-indigo-400 flex items-center gap-2">
                                        <UserPlus className="w-3 h-3" />
                                        新しいルールを追加
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1">キャスト A</label>
                                            <input 
                                                list="modal-cast-names"
                                                value={newPair.castNameA}
                                                onChange={e => setNewPair({...newPair, castNameA: e.target.value})}
                                                placeholder="名前を選択..."
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1">キャスト B</label>
                                            <input 
                                                list="modal-cast-names"
                                                value={newPair.castNameB}
                                                onChange={e => setNewPair({...newPair, castNameB: e.target.value})}
                                                placeholder="名前を選択..."
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <datalist id="modal-cast-names">
                                            {casts.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1">ルール種別</label>
                                            <select 
                                                value={newPair.ruleType}
                                                onChange={e => setNewPair({...newPair, ruleType: e.target.value})}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="ng">🚫 同時配置不可 (NG)</option>
                                                <option value="synergy">💎 相乗効果 (Synergy)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1">メモ・理由</label>
                                            <textarea 
                                                value={newPair.note}
                                                onChange={e => setNewPair({...newPair, note: e.target.value})}
                                                placeholder="例: 同じフロアNG 等"
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none h-20"
                                            />
                                        </div>

                                        <button 
                                            onClick={() => handleSave(newPair)}
                                            disabled={!newPair.castNameA || !newPair.castNameB || isSaving}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            ルールを登録
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-start gap-4">
                                    <Info className="w-5 h-5 text-gray-600 shrink-0 mt-1" />
                                    <p className="text-[10px] text-gray-500 leading-relaxed font-bold">
                                        相性ルールを設定することで、AIがシフトを生成する際に自動的に考慮します。一度設定したルールはサイドバーからいつでも確認・編集できます。
                                    </p>
                                </div>
                            </div>

                            {/* Right: List & Edit */}
                            <div className="lg:col-span-7 space-y-4">
                                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2 ml-2">
                                    登録済みの一覧 ({pairRules.length})
                                </h3>
                                
                                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                    {pairRules.map(rule => (
                                        <div key={rule.id} className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-5 rounded-3xl transition-all group">
                                            {editingRule?.id === rule.id ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-black text-white">{rule.castNameA} & {rule.castNameB}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <select 
                                                            value={editingRule.ruleType}
                                                            onChange={e => setEditingRule({...editingRule, ruleType: e.target.value})}
                                                            className="bg-black/60 border border-white/10 rounded-xl p-2 text-[10px] font-black uppercase outline-none"
                                                        >
                                                            <option value="ng">NG</option>
                                                            <option value="synergy">Synergy</option>
                                                        </select>
                                                        <input 
                                                            type="text"
                                                            value={editingRule.note || ''}
                                                            onChange={e => setEditingRule({...editingRule, note: e.target.value})}
                                                            className="bg-black/60 border border-white/10 rounded-xl p-2 text-[10px] outline-none"
                                                            placeholder="メモ"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-2">
                                                        <button onClick={() => setEditingRule(null)} className="px-4 py-2 text-[10px] font-black uppercase text-gray-500 hover:text-white">キャンセル</button>
                                                        <button onClick={() => handleSave(editingRule)} className="px-4 py-2 text-[10px] font-black uppercase bg-indigo-600 text-white rounded-lg">保存</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${rule.ruleType === 'ng' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                {rule.ruleType}
                                                            </span>
                                                            <span className="text-sm font-black italic text-gray-200">{rule.castNameA} & {rule.castNameB}</span>
                                                        </div>
                                                        {rule.note && <p className="text-[10px] text-gray-500 pl-1">{rule.note}</p>}
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button 
                                                            onClick={() => setEditingRule(rule)} 
                                                            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => onDeletePair(rule.id)}
                                                            className="p-2.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {pairRules.length === 0 && (
                                        <div className="py-20 text-center text-gray-600 italic text-sm">
                                            ルールがまだ登録されていません
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
                            <button 
                                onClick={onClose}
                                className="px-10 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                            >
                                閉じる
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
