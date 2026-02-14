/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';


const topics = [
  '一般的なお問い合わせ',
  '不具合・バグ報告',
  '機能の提案',
  '問題・解説の訂正',
  'その他'
];

export const ContactView: React.FC = () => {
    const { currentUser } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        topic: topics[0],
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, userId: currentUser?.userId })
            });
            
            if (res.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', topic: topics[0], message: '' });
                // Reset status after a delay
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 md:px-0 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-6 md:p-10 shadow-xl"
            >
                <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Mail className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            お問い合わせ
                        </h2>
                        <p className="text-slate-400">ご意見・ご要望をお聞かせください。</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">お名前</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all"
                                placeholder="山田 太郎"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">メールアドレス (任意)</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">件名</label>
                        <select
                            value={formData.topic}
                            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all [&>option]:bg-slate-900"
                        >
                            {topics.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">お問い合わせ内容</label>
                        <textarea
                            required
                            rows={5}
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all resize-none"
                            placeholder="具体的な内容をご記入ください..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'submitting' ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                <span>送信完了！</span>
                            </>
                        ) : status === 'error' ? (
                            <>
                                <AlertCircle className="w-5 h-5" />
                                <span>エラーが発生しました</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                <span>メッセージを送信</span>
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};
