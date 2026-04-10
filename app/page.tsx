"use client";

import { useEffect, useState } from "react";
import { OptimizationMode } from "@/lib/optimizer";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<OptimizationMode>("REVENUE_MAX");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const runOptimizer = async (selectedMode: OptimizationMode) => {
    setLoading(true);
    setMode(selectedMode);
    try {
      const res = await fetch(`/api/optimize?mode=${selectedMode}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimizer("REVENUE_MAX");
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6">Future Shift AI - Phase 1 Verification</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => runOptimizer("REVENUE_MAX")}
          className={`px-4 py-2 rounded font-semibold ${mode === "REVENUE_MAX" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
          disabled={loading}
        >
          売上最大化モード
        </button>
        <button
          onClick={() => runOptimizer("PROFIT_MAX")}
          className={`px-4 py-2 rounded font-semibold ${mode === "PROFIT_MAX" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800"}`}
          disabled={loading}
        >
          利益最大化モード
        </button>
        <button
          onClick={() => runOptimizer("LTV_MAX")}
          className={`px-4 py-2 rounded font-semibold ${mode === "LTV_MAX" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-800"}`}
          disabled={loading}
        >
          LTV最大化モード (Phase 3用)
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 font-mono">Running optimization...</div>
      ) : (mounted && data) ? (
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto shadow-2xl">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : null}
    </main>
  );
}
