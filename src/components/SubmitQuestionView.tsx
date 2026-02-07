import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, CheckCircle, AlertCircle, Save, Eye, Layout, Send, RefreshCw, ChevronLeft } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';
import clsx from 'clsx';

const CATEGORIES = [
    { id: 'cat_fundamentals', realId: 'AI Fundamentals' },
    { id: 'cat_trends', realId: 'AI Trends' },
    { id: 'cat_ml', realId: 'Machine Learning' },
    { id: 'cat_dl_basics', realId: 'Deep Learning Basics' },
    { id: 'cat_dl_tech', realId: 'Deep Learning Tech' },
    { id: 'cat_apps', realId: 'AI Applications' },
    { id: 'cat_social', realId: 'Social Implementation' },
    { id: 'cat_math', realId: 'Math & Statistics' },
    { id: 'cat_law', realId: 'Law & Contracts' },
    { id: 'cat_ethics', realId: 'Ethics & Governance' }
];

export const SubmitQuestionView: React.FC = () => {
    const { t } = useLanguageStore();
    const [formData, setFormData] = useState({
        category: CATEGORIES[0].realId,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [showPreview, setShowPreview] = useState(false);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const isFormValid = formData.question.trim() !== '' && 
                        formData.options.every(opt => opt.trim() !== '') && 
                        formData.explanation.trim() !== '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        
        setStatus('submitting');
        
        try {
            const res = await fetch('/api/submit-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                setStatus('success');
            } else {
                throw new Error('Failed to submit question');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    const resetForm = () => {
        setFormData({
            category: CATEGORIES[0].realId,
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: ''
        });
        setStatus('idle');
        setShowPreview(false);
    };

    if (status === 'success') {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto text-center space-y-8 py-20"
            >
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full" />
                    <div className="relative w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="w-12 h-12 text-emerald-400" />
                    </div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">
                        Submission <span className="text-emerald-400">Accepted</span>
                    </h2>
                    <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                        あなたの問題がニューラル・ネットワークにアップロードされました。管理者の承認後、データベースに統合されます。
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={resetForm}
                        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20"
                    >
                        <PlusCircle className="w-5 h-5" />
                        さらに問題を投稿
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))}
                        className="px-8 py-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                        ホームへ戻る
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 space-y-12 pb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.04] pb-12">
                <div className="space-y-4">
                    <button 
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">戻る</span>
                        <span className="text-[8px] font-black text-slate-800">[B / Esc]</span>
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                            Contribute <span className="text-accent underline decoration-accent/20 underline-offset-8">Logic</span>
                        </h1>
                        <p className="text-slate-500 font-medium tracking-tight">新しい学習ノードをデータベースに提案し、コミュニティの進化に貢献しましょう。</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setShowPreview(false)}
                        className={clsx(
                            "px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all",
                            !showPreview ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <Layout className="w-3.5 h-3.5" />
                        編集
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        className={clsx(
                            "px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all",
                            showPreview ? "bg-accent/10 text-accent" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        プレビュー
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form Section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={clsx("space-y-8", showPreview && "opacity-50 pointer-events-none lg:opacity-100 lg:pointer-events-auto")}
                >
                    <form onSubmit={handleSubmit} className="space-y-8 bg-secondary/10 border border-white/[0.04] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] rounded-full translate-x-20 -translate-y-20" />
                        
                        <div className="space-y-6 relative z-10">
                            {/* Category Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    カテゴリー / Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold appearance-none focus:ring-2 focus:ring-accent/50 focus:border-transparent outline-none transition-all cursor-pointer group"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c.id} value={c.realId} className="bg-slate-900">{t(c.id)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Question Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    問題文 / Question Statement
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.question}
                                    onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-accent/50 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-700"
                                    placeholder="ここに問題的内容を入力してください..."
                                />
                            </div>

                            {/* Options Input */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    選択肢の構成 / Logical Options
                                </label>
                                <div className="grid gap-3">
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} className="relative group">
                                            <input
                                                type="radio"
                                                name="correctAnswer"
                                                checked={formData.correctAnswer === idx}
                                                onChange={() => setFormData(prev => ({ ...prev, correctAnswer: idx }))}
                                                className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent bg-slate-950 border-slate-800 focus:ring-accent focus:ring-offset-0 z-10 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                required
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                className={clsx(
                                                    "w-full bg-slate-950/50 border rounded-2xl pl-16 pr-6 py-4 text-white font-medium transition-all outline-none",
                                                    formData.correctAnswer === idx 
                                                        ? "border-accent/40 bg-accent/5 shadow-[0_0_20px_rgba(34,211,238,0.05)]" 
                                                        : "border-slate-800 hover:border-slate-700 placeholder:text-slate-700"
                                                )}
                                                placeholder={`Option ${idx + 1}`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-800 group-hover:text-slate-600 transition-colors uppercase tracking-widest">
                                                {idx === formData.correctAnswer ? 'CORRECT' : `ID-0${idx + 1}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explanation Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    理論解説 / Rationale Analysis
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.explanation}
                                    onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-accent/50 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-700"
                                    placeholder="正解に至る論理的背景を記述してください..."
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-4 relative z-10">
                            <button
                                type="submit"
                                disabled={status === 'submitting' || !isFormValid}
                                className="flex-1 bg-gradient-to-r from-accent to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
                            >
                                {status === 'submitting' ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        <span>問題をネットワークに送信</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="p-5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-white rounded-2xl transition-all"
                                title="フォームをリセット"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Preview Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 1 }}
                    className={clsx("space-y-8 sticky top-24 h-fit", !showPreview && "hidden lg:block")}
                >
                    <div className="p-8 bg-slate-950 border border-white/[0.04] rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
                        <div className="absolute top-8 left-8 flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                        </div>
                        
                        <div className="mt-12 space-y-8 flex-1">
                            <div className="flex items-center gap-3">
                                <span className="bg-accent/10 text-accent px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-accent/20">
                                   {CATEGORIES.find(c => c.realId === formData.category)?.realId || 'ID-ALPHA'}
                                </span>
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Live Node Preview</span>
                            </div>

                            <h3 className="text-2xl font-black italic text-white leading-tight tracking-tight">
                                {formData.question || '問題文がここに入力されます...'}
                            </h3>

                            <div className="space-y-3">
                                {formData.options.map((opt, i) => (
                                    <div 
                                        key={i}
                                        className={clsx(
                                            "p-5 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between group",
                                            opt ? "border-white/[0.04] bg-white/[0.02]" : "border-dashed border-slate-800 bg-transparent text-slate-800"
                                        )}
                                    >
                                        <span className={clsx(opt ? "text-slate-300" : "text-slate-800")}>
                                            {opt || `選択肢 ${i + 1} 未入力`}
                                        </span>
                                        {opt && (
                                            <div className="w-5 h-5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-black text-slate-600 transition-colors">
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {formData.explanation && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 p-6 bg-accent/5 border border-accent/20 rounded-2xl space-y-2"
                            >
                                <div className="text-[8px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Save className="w-3 h-3" />
                                    Rational Analysis
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                                    {formData.explanation}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            <strong className="text-slate-300 block mb-0.5 uppercase">Submission Protocol</strong>
                            送信された内容は管理者のレビューを受け、品質基準を満たした場合のみ正式な学習ノードとしてマトリックスに追加されます。
                        </p>
                    </div>
                </motion.div>
            </div>
            
            <AnimatePresence>
                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl z-50 border border-red-400"
                    >
                        <AlertCircle className="w-5 h-5" />
                        トランスミッションエラー。再試行してください。
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
