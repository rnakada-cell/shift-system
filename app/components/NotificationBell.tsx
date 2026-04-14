"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Info, ArrowLeftRight, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    link?: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const fetchNotifications = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/notifications?userId=${userId}`);
            const json = await res.json();
            if (json.success) setNotifications(json.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // 30秒ごとに確認
        return () => clearInterval(interval);
    }, [userId]);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId: id, isRead: true })
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SWAP_APPLIED': return <ArrowLeftRight className="w-4 h-4 text-amber-500" />;
            case 'SWAP_APPROVED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'SWAP_REJECTED': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
            >
                <Bell className="w-5 h-5 text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-black">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)} 
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-4 w-80 max-h-[480px] overflow-hidden bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col"
                        >
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-sm tracking-tight">通知センター</h3>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{notifications.length} 件</div>
                            </div>

                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => markAsRead(n.id)}
                                            className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-white/[0.02]' : 'opacity-60'}`}
                                        >
                                            {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />}
                                            <div className="flex gap-3">
                                                <div className="mt-1 p-2 rounded-lg bg-gray-900 border border-white/5">
                                                    {getTypeIcon(n.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="text-sm font-bold text-white truncate">{n.title}</h4>
                                                        <span className="text-[10px] text-gray-500 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center opacity-30">
                                        <Bell className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-widest">通知はありません</p>
                                    </div>
                                )}
                            </div>

                            {notifications.some(n => !n.isRead) && (
                                <button 
                                    className="p-3 text-[10px] font-bold uppercase tracking-widest text-center text-gray-500 hover:text-white border-t border-white/5 transition-colors"
                                    onClick={() => {/* 全て既読にするロジック */}}
                                >
                                    全て既読にする
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
