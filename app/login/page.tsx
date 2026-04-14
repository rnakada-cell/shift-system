"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [passcode, setPasscode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode })
            });

            const data = await res.json();

            if (data.success) {
                // Force a hard navigation so middleware picks up the new cookie properly
                window.location.href = data.redirect;
            } else {
                setError("パスコードが間違っています。");
            }
        } catch (err) {
            setError("通信エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements - more dynamic gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] bg-rose-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:1s]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-t from-indigo-950/20 to-transparent" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-sm relative z-10"
            >
                <div className="bg-[#111111]/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 shadow-[0_0_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
                    
                    <div className="flex justify-center mb-8">
                        <motion.div 
                            whileHover={{ rotate: 15 }}
                            className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner"
                        >
                            <Shield className="w-8 h-8 text-white" />
                        </motion.div>
                    </div>

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase">Manager Center</h1>
                        <div className="h-px w-12 bg-indigo-500 mx-auto mb-4" />
                        <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase leading-relaxed">
                            管理者認証コードを入力して<br/>マネージャーセンターへ進んでください
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    placeholder="Passcode"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/10 transition-all placeholder:text-gray-700"
                                    required
                                />
                            </div>
                            {error && (
                                <motion.p 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    className="text-[11px] font-bold text-rose-500 px-2 mt-1"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !passcode}
                            className="w-full bg-white text-black font-black italic text-sm py-4 rounded-2xl shadow-xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>ログイン</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center opacity-30 hover:opacity-100 transition-opacity">
                        <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">
                            Secure Access Control System v1.0
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
