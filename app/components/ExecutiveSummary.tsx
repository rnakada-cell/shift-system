"use client";

import { motion } from "framer-motion";
import { 
    TrendingUp, 
    CreditCard, 
    Zap, 
    Database,
    CheckCircle2
} from "lucide-react";

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
    <div className="space-y-6">
      {confirmedCount > 0 && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">データベース同期済み</div>
              <div className="text-xs text-gray-400 font-medium">この期間のシフト構成は既に本番環境に反映されています。</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#050505]/50 px-4 py-2 rounded-xl border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-black text-white">{confirmedCount} スロット確定</span>
          </div>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
            { label: '予想総売上', value: summary.totalRevenue, color: 'indigo', icon: <TrendingUp className="w-5 h-5" /> },
            { label: '人件費（概算）', value: summary.totalCost, color: 'rose', icon: <CreditCard className="w-5 h-5" /> },
            { label: '最終利益予想', value: summary.totalProfit, color: 'emerald', icon: <Zap className="w-5 h-5" /> }
        ].map((item, i) => (
            <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-[#111111]/40 backdrop-blur-3xl border border-white/5 rounded-[32px] p-8 relative overflow-hidden group shadow-2xl`}
            >
                <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${item.color}-500/10 blur-[40px] rounded-full group-hover:bg-${item.color}-500/20 transition-all`} />
                
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 bg-${item.color}-500/10 rounded-2xl border border-${item.color}-500/20 text-${item.color}-400`}>
                        {item.icon}
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{item.label}</span>
                </div>

                <div className="relative">
                    <div className={`text-3xl font-black italic italic tracking-tighter text-${item.color}-400`}>
                        ¥{(item.value || 0).toLocaleString()}
                    </div>
                </div>
                
                {item.label === '最終利益予想' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                )}
            </motion.div>
        ))}
      </div>
    </div>
  );
}
