import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Send, Shield, MessageCircle, Trash2, LogIn } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeKeys } from '../utils/normalize';
import { ConfirmDialog } from './ConfirmDialog';

interface ChatMessage {
    id: number;
    userId: string;
    nickname: string;
    role: string;
    message: string;
    replyTo?: number;
    createdAt: string;
}

export const GroupChat: React.FC = () => {
    const { currentUser } = useAuthStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const prevMessagesRef = useRef<string>('');
    
    // Memoized fetch function to avoid re-renders on identical data
    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/public-chat?limit=50');
            const data = await res.json();
            
            // Simple optimization: Compare stringified data to prevent re-render loop
            const dataString = JSON.stringify(data);
            if (prevMessagesRef.current !== dataString) {
                setMessages(normalizeKeys(data));
                prevMessagesRef.current = dataString;
            }
        } catch (error) {
            console.error("Failed to fetch chat messages:", error);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds for efficiency
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !currentUser) return;

        setLoading(true);
        try {
            await fetch('/api/public-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.userId,
                    message: inputText,
                    // replyTo logic can be enhanced later if clicking a message sets a reply ID
                })
            });
            setInputText('');
            await fetchMessages();
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        setMessageToDelete(messageId);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;

        try {
            const res = await fetch(`/api/public-chat/${messageToDelete}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser?.userId })
            });
            
            if (res.ok) {
                await fetchMessages();
            }
        } catch (error) {
            console.error("Failed to delete message:", error);
        } finally {
            setMessageToDelete(null);
        }
    };

    const handleMention = (nickname: string) => {
        setInputText(prev => `${prev}@${nickname} `);
    };

    const formatMessage = (text: string, isMe: boolean) => {
        // Highlight mentions
        const parts = text.split(/(@\S+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const style = isMe 
                    ? "text-blue-900 font-extrabold bg-white/20" 
                    : "text-accent font-bold bg-accent/10";
                return <span key={i} className={`px-1 rounded ${style}`}>{part}</span>;
            }
            return part;
        });
    };

    return (
        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[500px] md:h-[600px] shadow-2xl backdrop-blur-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">コミュニティ・チャット</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Global Access</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col" ref={chatContainerRef}>
                {messages.length === 0 && !isFocused ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex items-center justify-center py-8"
                    >
                        <div className="text-slate-400 text-sm space-y-6 md:space-y-8 opacity-60 max-w-2xl w-full">
                            <div className="text-center mb-6 md:mb-8">
                                <h4 className="text-lg md:text-xl font-black text-white mb-2 md:mb-3 tracking-tight">
                                    <span className="mr-2">🚀</span>
                                    G-KENTEI COMMUNITY
                                </h4>
                                <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-sm mx-auto px-4">
                                    ここは、G検定合格を目指す学習者のためのコミュニティです。<br/>
                                    学習の進捗状況を共有したり、分からない問題を相談し合うことで、<br className="hidden md:inline"/>
                                    互いに高め合いながら効率的に学習を進めることができます。
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 px-2">
                                {/* Feature Guide */}
                                <div className="bg-slate-800/30 p-4 md:p-5 rounded-2xl border border-slate-700/40">
                                    <h5 className="font-bold text-sky-400/70 mb-2 md:mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
                                        <span className="text-lg">⚡</span> Quick Actions
                                    </h5>
                                    <ul className="space-y-2 md:space-y-3 text-xs text-slate-400">
                                        <li className="flex items-center justify-between">
                                            <span>演習を開始</span>
                                            <kbd className="bg-slate-900/60 border border-slate-700/40 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">E / Enter</kbd>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <span>分析レポート</span>
                                            <kbd className="bg-slate-900/60 border border-slate-700/40 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">Q</kbd>
                                        </li>
                                        <li className="flex items-center justify-between">
                                            <span>弱点克服モード</span>
                                            <kbd className="bg-slate-900/60 border border-slate-700/40 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">W</kbd>
                                        </li>
                                    </ul>
                                </div>
                                
                                {/* Community Guidelines */}
                                <div className="bg-slate-800/30 p-4 md:p-5 rounded-2xl border border-slate-700/40">
                                    <h5 className="font-bold text-emerald-400/70 mb-2 md:mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
                                        <span className="text-lg">🤝</span> Guidelines
                                    </h5>
                                    <ul className="space-y-2 md:space-y-3 text-xs text-slate-400">
                                        <li className="flex items-start gap-2">
                                            <span className="opacity-70 translate-y-0.5">📢</span>
                                            <span className="leading-snug">
                                                <strong className="block mb-0.5 text-slate-300">進捗をシェア</strong>
                                                今日の学習成果を報告しましょう。
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="opacity-70 translate-y-0.5">💡</span>
                                            <span className="leading-snug">
                                                <strong className="block mb-0.5 text-slate-300">質問・相談</strong>
                                                分からない用語はここで解決。
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-3 md:p-4 rounded-xl border border-indigo-500/20 text-center mx-2">
                                <p className="text-[10px] text-indigo-300/60 font-mono mb-2 uppercase tracking-wider">System Ready</p>
                                <p className="text-xs text-slate-400">
                                    最初の一言を投稿して、セッションを開始してください。
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ) : null}

                <AnimatePresence>
                    {messages.map((msg) => {
                        const isMe = msg.userId === currentUser?.userId;
                        const isAdmin = msg.role === 'admin';
                        const isMentioned = currentUser && msg.message.includes(`@${currentUser.nickname}`);
                        const canDelete = currentUser?.role === 'admin';
                        
                        return (
                            <motion.div 
                                key={msg.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                className={clsx("flex gap-3 group/msg p-1", isMe ? "flex-row-reverse" : "flex-row")}
                            >
                                {/* Avatar */}
                                <div 
                                    onClick={() => !isMe && handleMention(msg.nickname)}
                                    className={clsx(
                                        "w-8 h-8 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all hover:scale-110",
                                        isAdmin 
                                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                                            : isMe 
                                                ? "bg-accent/10 border-accent/30 text-accent" 
                                                : "bg-slate-800 border-slate-700 text-slate-400"
                                    )}
                                >
                                    {msg.nickname.substring(0, 2).toUpperCase()}
                                </div>

                                <div className={clsx("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        {isAdmin && <Shield className="w-3 h-3 text-amber-500" />}
                                        <span className={clsx("text-[11px] font-bold", isAdmin ? "text-amber-500" : "text-slate-500")}>
                                            {msg.nickname}
                                        </span>
                                        <span className="text-[9px] text-slate-700 font-mono">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {canDelete && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMessage(msg.id);
                                                }}
                                                className="md:opacity-0 md:group-hover/msg:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg text-red-400/70 hover:text-red-500 transition-all ml-auto border border-transparent hover:border-red-500/30"
                                                title="メッセージを削除"
                                                aria-label="メッセージを削除"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className={clsx(
                                        "p-3 rounded-2xl text-sm leading-relaxed shadow-lg",
                                        isMe 
                                            ? "bg-accent text-primary rounded-tr-none font-bold" 
                                            : clsx(
                                                "bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800",
                                                isMentioned && "ring-1 ring-accent bg-accent/10"
                                              )
                                    )}>
                                        {formatMessage(msg.message, isMe)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/30 backdrop-blur">
                {!currentUser ? (
                    <div className="flex items-center justify-center gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
                        <LogIn className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-400 font-medium">チャットに参加するにはログインが必要です</span>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            disabled={loading}
                            placeholder="メッセージを入力... (@でメンション可能)"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50 z-10"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputText.trim()}
                            className="bg-accent text-primary p-3 rounded-xl disabled:opacity-50 hover:bg-sky-400 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="メッセージ削除"
                message="このメッセージを完全に削除しますか？この操作は取り消すことができません。"
                confirmText="削除"
                cancelText="キャンセル"
                type="danger"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowDeleteDialog(false);
                    setMessageToDelete(null);
                }}
            />
        </div>
    );
};
