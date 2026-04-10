"use client";

import React, { useState } from 'react';

interface DayCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  segments: any[];
  dayCapacities: Record<string, any>;
  defaultCapacity: { min1F: number; max1F: number; min2F: number; max2F: number };
  onUpdateCapacity: (key: string, val: any) => void;
  onApplyToRange: (type: 'week' | 'month') => void;
}

export default function DayCapacityModal({ isOpen, onClose, date, segments, dayCapacities, defaultCapacity, onUpdateCapacity, onApplyToRange }: DayCapacityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <div>
            <h3 className="text-xl font-black text-white">定員詳細設定</h3>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{date} のフロア別定員</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const updated = { ...dayCapacities };
                segments.forEach(seg => {
                  const key = `${date}__${seg.id}`;
                  onUpdateCapacity(key, { ...defaultCapacity });
                });
                alert(`全ての時間枠に店基準（1F:${defaultCapacity.min1F}-${defaultCapacity.max1F}名, 2F:${defaultCapacity.min2F}-${defaultCapacity.max2F}名）を反映しました。`);
              }}
              className="text-[10px] bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 border border-indigo-700 px-3 py-1.5 rounded-lg font-bold transition-all"
            >
              📋 デフォルトを一括反映 (店基準: {defaultCapacity.min1F}-{defaultCapacity.max1F}, {defaultCapacity.min2F}-{defaultCapacity.max2F})
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-white text-2xl p-2 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-5 gap-4 px-2 mb-2">
            <div className="col-span-1 text-[10px] text-gray-500 font-bold">時間枠</div>
            <div className="col-span-2 text-[10px] text-indigo-400 font-bold text-center">1F フロア (最小-最大)</div>
            <div className="col-span-2 text-[10px] text-emerald-400 font-bold text-center">2F カウンター (最小-最大)</div>
          </div>

          {segments.map((seg) => {
            const key = `${date}__${seg.id}`;
            const cap = dayCapacities[key] || { min1F: 1, max1F: 9, min2F: 1, max2F: 8 };
            
            return (
              <div key={seg.id} className="grid grid-cols-5 gap-4 items-center bg-gray-950/30 p-3 rounded-xl border border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                <div className="col-span-1">
                  <span className="text-xs font-bold text-gray-300">
                    {seg.label || seg.id || '未設定'}
                  </span>
                </div>
                
                {/* 1F Inputs */}
                <div className="col-span-2 flex items-center gap-2 justify-center">
                  <input 
                    type="number" min="0" max="20"
                    value={cap.min1F}
                    onChange={(e) => onUpdateCapacity(key, { ...cap, min1F: parseInt(e.target.value) || 0 })}
                    className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-center text-xs text-white"
                  />
                  <span className="text-gray-600">~</span>
                  <input 
                    type="number" min="0" max="20"
                    value={cap.max1F}
                    onChange={(e) => onUpdateCapacity(key, { ...cap, max1F: parseInt(e.target.value) || 0 })}
                    className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-center text-xs text-white"
                  />
                </div>

                {/* 2F Inputs */}
                <div className="col-span-2 flex items-center gap-2 justify-center">
                  <input 
                    type="number" min="0" max="20"
                    value={cap.min2F}
                    onChange={(e) => onUpdateCapacity(key, { ...cap, min2F: parseInt(e.target.value) || 0 })}
                    className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-center text-xs text-white"
                  />
                  <span className="text-gray-600">~</span>
                  <input 
                    type="number" min="0" max="20"
                    value={cap.max2F}
                    onChange={(e) => onUpdateCapacity(key, { ...cap, max2F: parseInt(e.target.value) || 0 })}
                    className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-center text-xs text-white"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-gray-500 italic">※現在の設定を他の日に一括コピーできます。</p>
            <div className="flex gap-2">
              <button 
                onClick={() => onApplyToRange('week')}
                className="text-[10px] bg-cyan-900/30 hover:bg-cyan-800 text-cyan-400 border border-cyan-800 px-3 py-1.5 rounded-lg font-bold transition-all"
              >
                📅 今週すべてに反映
              </button>
              <button 
                onClick={() => onApplyToRange('month')}
                className="text-[10px] bg-purple-900/30 hover:bg-purple-800 text-purple-400 border border-purple-800 px-3 py-1.5 rounded-lg font-bold transition-all"
              >
                🗓️ 今月すべてに反映
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-8 rounded-lg transition-all whitespace-nowrap"
          >
            設定を終了する
          </button>
        </div>
      </div>
    </div>
  );
}
