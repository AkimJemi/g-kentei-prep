import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Send, Shield, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
                setMessages(data);
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
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">コミュニティ・チャット</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Global Access</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={chatContainerRef}>
                {messages.length === 0 ? (
                    <div className="py-8 px-6 text-slate-400 text-sm space-y-8">
                        <div className="text-center mb-8">
                            <h4 className="text-xl font-black text-white mb-3 tracking-tight">
                                <span className="mr-2">🚀</span>
                                G-KENTEI COMMUNITY
                            </h4>
                            <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-sm mx-auto">
                                ここは、G検定合格を目指す学習者のためのコミュニティです。<br/>
                                学習の進捗状況を共有したり、分からない問題を相談し合うことで、<br/>
                                互いに高め合いながら効率的に学習を進めることができます。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Feature Guide */}
                            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                                <h5 className="font-bold text-sky-400 mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
                                    <span className="text-lg">⚡</span> Quick Actions
                                </h5>
                                <ul className="space-y-3 text-xs">
                                    <li className="flex items-center justify-between group">
                                        <span className="group-hover:text-sky-300 transition-colors">演習を開始</span>
                                        <kbd className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono shadow-sm group-hover:border-sky-500/30 transition-colors">E / Enter</kbd>
                                    </li>
                                    <li className="flex items-center justify-between group">
                                        <span className="group-hover:text-sky-300 transition-colors">分析レポート</span>
                                        <kbd className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono shadow-sm group-hover:border-sky-500/30 transition-colors">Q</kbd>
                                    </li>
                                    <li className="flex items-center justify-between group">
                                        <span className="group-hover:text-sky-300 transition-colors">弱点克服モード</span>
                                        <kbd className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono shadow-sm group-hover:border-sky-500/30 transition-colors">W</kbd>
                                    </li>
                                </ul>
                            </div>
                            
                            {/* Community Guidelines */}
                            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                                <h5 className="font-bold text-emerald-400 mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
                                    <span className="text-lg">🤝</span> Guidelines
                                </h5>
                                <ul className="space-y-3 text-xs">
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-500 translate-y-0.5">📢</span>
                                        <span className="opacity-90 leading-snug">
                                            <strong className="text-slate-300 block mb-0.5">進捗をシェア</strong>
                                            今日の学習成果や模試の結果を報告しましょう。
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-500 translate-y-0.5">💡</span>
                                        <span className="opacity-90 leading-snug">
                                            <strong className="text-slate-300 block mb-0.5">質問・相談</strong>
                                            分からない用語や問題はここで解決。
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-indigo-500/20 text-center">
                            <p className="text-[10px] text-indigo-300 font-mono mb-2 uppercase tracking-wider">System Ready</p>
                            <p className="text-xs text-slate-400">
                                <span className="animate-pulse mr-2">🟢</span>
                                最初の一言を投稿して、セッションを開始してください。
                            </p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.userId === currentUser?.userId;
                        const isAdmin = msg.role === 'admin';
                        const isMentioned = currentUser && msg.message.includes(`@${currentUser.nickname}`);
                        
                        return (
                            <motion.div 
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}
                            >
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    {isAdmin && <Shield className="w-3 h-3 text-amber-500" />}
                                    <span 
                                        onClick={() => !isMe && handleMention(msg.nickname)} 
                                        className={clsx(
                                            "text-xs font-bold cursor-pointer hover:text-accent transition-colors",
                                            isAdmin ? "text-amber-500" : "text-slate-400"
                                        )}
                                    >
                                        {msg.nickname}
                                    </span>
                                    <span className="text-[10px] text-slate-600">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                
                                <div className={clsx(
                                    "p-3 rounded-2xl text-sm leading-relaxed max-w-[85%]",
                                    isMe 
                                        ? "bg-accent text-primary rounded-tr-sm font-medium" 
                                        : clsx(
                                            "bg-slate-800/80 text-slate-200 rounded-tl-sm border border-slate-700/50",
                                            isMentioned && "ring-2 ring-accent/50 bg-accent/5"
                                          )
                                )}>
                                    {formatMessage(msg.message, isMe)}
                                </div>
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/30 backdrop-blur">
                <div className="flex gap-2 relative">
                    {!currentUser ? (
                         <div className="absolute inset-x-0 -top-12 text-center">
                             <span className="text-xs bg-slate-900 border border-slate-700 px-3 py-1 rounded-full text-slate-400">
                                 Please login to chat
                             </span>
                         </div>
                    ) : null}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={!currentUser || loading}
                        placeholder={currentUser ? "メッセージを入力... (@でメンション可能)" : "ログインして参加"}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!currentUser || loading || !inputText.trim()}
                        className="bg-accent text-primary p-3 rounded-xl disabled:opacity-50 hover:bg-sky-400 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};
