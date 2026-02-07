import React, { useEffect, useState } from 'react';
import { db } from '../db/db';
import { questions } from '../data/questions';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { Brain, TrendingUp, BarChart3, AlertTriangle, CheckCircle2, Target, PieChart, Zap, ChevronLeft, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const Statistics: React.FC = () => {
    const [stats, setStats] = useState<{
        totalAttempts: number;
        avgScore: number;
        weakQuestions: { qId: number; count: number }[];
        categoryStats: { [cat: string]: { total: number; correct: number; mistakes: number } };
    } | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
    const { t, language } = useLanguageStore();
    const { currentUser } = useAuthStore();

    useEffect(() => {
        if (!currentUser?.id) {
            setStats(null);
            return;
        }

        db.attempts.where('userId').equals(currentUser.id).toArray().then((attempts: any[]) => {
            if (attempts.length === 0) {
                setStats(null);
                return;
            }

            const totalAttempts = attempts.length;
            let totalScore = 0;
            const errorMap: { [id: number]: number } = {};
            const catStats: { [cat: string]: { total: number; correct: number; mistakes: number } } = {};

            attempts.forEach((attempt: any) => {
                totalScore += (attempt.score / attempt.totalQuestions) * 100;
                
                if (!catStats[attempt.category]) {
                    catStats[attempt.category] = { total: 0, correct: 0, mistakes: 0 };
                }
                catStats[attempt.category].total += attempt.totalQuestions;
                catStats[attempt.category].correct += attempt.score;

                if (attempt.wrongQuestionIds) {
                    attempt.wrongQuestionIds.forEach((id: number) => {
                        errorMap[id] = (errorMap[id] || 0) + 1;
                        const q = questions.find(item => item.id === id);
                        if (q) {
                            if (!catStats[q.category]) {
                                catStats[q.category] = { total: 0, correct: 0, mistakes: 0 };
                            }
                            catStats[q.category].mistakes += 1;
                        }
                    });
                }
            });

            const weakQuestions = Object.entries(errorMap)
                .map(([id, count]) => ({ qId: Number(id), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setStats({
                totalAttempts,
                avgScore: Math.round(totalScore / totalAttempts),
                weakQuestions,
                categoryStats: catStats
            });
        });
    }, [currentUser]);

    if (!stats) {
        return (
            <div className="text-center py-24 space-y-6 animate-fade-in">
                <div className="inline-flex p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
                    <BarChart3 className="w-16 h-16 text-slate-700" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{t('no_neural_data')}</h2>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">
                        {t('no_neural_data_desc')}
                    </p>
                </div>
            </div>
        );
    }

    const totalMistakes = Object.values(stats.categoryStats).reduce((sum, c) => sum + c.mistakes, 0);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto space-y-12 pb-20"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.04] pb-12">
                <div className="space-y-4">
                    <button 
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('abort_scan')}</span>
                        <span className="text-[8px] font-black text-slate-800">[B / Esc]</span>
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4">
                            <Zap className="w-8 h-8 text-accent animate-pulse" />
                            {t('system_analytics')}
                        </h1>
                        <p className="text-slate-500 font-medium tracking-tight">Real-time performance metrics and cognitive pattern analysis.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('optimized_status')}</span>
                </div>
            </div>

            {/* Top Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    icon={Target} 
                    color="text-accent" 
                    bg="bg-accent/10" 
                    label={t('global_accuracy')} 
                    value={`${stats.avgScore}%`} 
                    sublabel={t('avg_precision')}
                />
                <StatCard 
                    icon={TrendingUp} 
                    color="text-emerald-400" 
                    bg="bg-emerald-400/10" 
                    label={t('neural_cycles')} 
                    value={stats.totalAttempts.toString()} 
                    sublabel={t('completed_sessions')}
                />
                <StatCard 
                    icon={PieChart} 
                    color="text-rose-400" 
                    bg="bg-rose-500/10" 
                    label={t('error_density')} 
                    value={`${totalMistakes}`} 
                    sublabel={t('total_errors')}
                />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Accuracy by Category */}
                <motion.div variants={itemVariants} className="bg-secondary/10 border border-white/[0.04] rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] rounded-full translate-x-10 -translate-y-10" />
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                        <Brain className="w-5 h-5 text-indigo-400" />
                        {t('sector_proficiency')}
                    </h3>
                    <div className="space-y-6">
                        {Object.entries(stats.categoryStats).map(([cat, data]) => {
                            const score = Math.round((data.correct / data.total) * 100);
                            return (
                                <div key={cat} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{cat}</span>
                                        <span className="text-sm font-mono font-black text-white">{score}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${score}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-accent to-indigo-500 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Mistake Distribution */}
                <motion.div variants={itemVariants} className="bg-secondary/10 border border-white/[0.04] rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[40px] rounded-full translate-x-10 -translate-y-10" />
                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3 text-rose-400">
                        <PieChart className="w-5 h-5" />
                        {t('network_fragility')}
                    </h3>
                    <div className="space-y-5">
                        {Object.entries(stats.categoryStats)
                            .sort((a, b) => b[1].mistakes - a[1].mistakes)
                            .map(([cat, data]) => {
                            const ratio = totalMistakes > 0 ? Math.round((data.mistakes / totalMistakes) * 100) : 0;
                            if (data.mistakes === 0) return null;
                            return (
                                <div key={cat} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{cat}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-[10px] font-mono text-slate-600 italic">{data.mistakes} pts</span>
                                        <span className="text-sm font-black text-rose-500 w-10 text-right">{ratio}%</span>
                                    </div>
                                </div>
                            );
                        })}
                        {totalMistakes === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-20" />
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Zero corruption detected.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Common Mistakes */}
            <motion.div variants={itemVariants} className="space-y-8">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                    {t('recalibration_points')}
                </h3>
                <div className="grid gap-4">
                    {stats.weakQuestions.map(({ qId, count }) => {
                        const question = questions.find(q => q.id === qId);
                        if (!question) return null;
                        const isExpanded = selectedQuestion === qId;

                        const locQ = language && question.translations?.[language] 
                            ? question.translations[language] 
                            : { question: question.question, options: question.options, explanation: question.explanation, category: question.category };

                        return (
                            <div key={qId} className="bg-secondary/10 border border-white/[0.04] rounded-2xl overflow-hidden group hover:border-accent/20 transition-all shadow-lg">
                                <button 
                                    onClick={() => setSelectedQuestion(isExpanded ? null : qId)}
                                    className="w-full text-left p-6 flex items-center justify-between gap-6"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                                Failed {count}x
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 italic">
                                                {locQ.category || question.category}
                                            </span>
                                        </div>
                                        <p className="font-bold text-slate-300 line-clamp-1 group-hover:text-white transition-colors">
                                            {locQ.question}
                                        </p>
                                    </div>
                                    <div className={clsx("p-2 text-slate-700 group-hover:text-accent transition-all", isExpanded && "rotate-180 text-accent")}>
                                        <ChevronDown className="w-5 h-5" />
                                    </div>
                                </button>
                                
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 pt-2 space-y-6 border-t border-white/[0.04] bg-slate-950/50">
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t('sector_definition')}</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {locQ.options.map((opt, i) => (
                                                            <div key={i} className={clsx("p-4 rounded-xl text-xs font-bold border transition-all", i === question.correctAnswer ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-slate-800/30 border-slate-700/50 text-slate-600")}>
                                                                <div className="flex justify-between items-center">
                                                                    <span>{opt}</span>
                                                                    {i === question.correctAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-accent/5 border-l-2 border-accent rounded-r-xl">
                                                    <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                                                        <span className="text-accent font-black not-italic mr-2 font-mono">[{t('root_analysis')}]</span>
                                                        {locQ.explanation}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
};

const StatCard: React.FC<{ icon: any, color: string, bg: string, label: string, value: string, sublabel: string }> = ({ icon: Icon, color, bg, label, value, sublabel }) => (
    <div className="bg-secondary/10 border border-white/[0.04] p-8 rounded-3xl hover:bg-secondary/20 transition-all group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[30px] rounded-full translate-x-8 -translate-y-8" />
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</div>
        <div className="text-3xl font-black italic uppercase tracking-tight text-white mb-1">{value}</div>
        <div className="text-xs text-slate-600 font-medium italic">{sublabel}</div>
    </div>
);
