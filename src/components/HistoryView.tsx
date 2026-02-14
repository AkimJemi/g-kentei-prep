/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { db, type QuizAttempt } from '../db/db';
import { normalizeKeys } from '../utils/normalize';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQuestions } from '../hooks/useQuestions';
import { Calendar, ChevronDown, CheckCircle2, XCircle, BookOpen, Radio, Database, History, Zap, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const HistoryView: React.FC = () => {
    const { t } = useLanguageStore();
    const { currentUser, isAuthenticated } = useAuthStore();
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
    const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'sessions' | 'questions'>('sessions');
    const { data: allQuestions = [] } = useQuestions();
    // const [allQuestions, setAllQuestions] = useState<Question[]>([]); // Replaced by hook
    const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

    useEffect(() => {
        // fetch('/api/questions') REMOVED

        fetch('/api/categories')
            .then(res => res.json())
            .then(data => {
                const normalized = normalizeKeys(data);
                const mapping: Record<string, string> = {};
                normalized.forEach((cat: any) => {
                    mapping[cat.id] = cat.title;
                });
                setCategoryMap(mapping);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
       if (isAuthenticated && (!currentUser || !currentUser.userId)) {
            setTimeout(() => setLoading(false), 0);
            return;
        }
        // If not authenticated or currentUser/userId is available, proceed to fetch.
        // If isAuthenticated is false, and currentUser is null, this block won't be entered,
        // and the subsequent db query will use a null userId, which is handled by Dexie.
        // However, if isAuthenticated is true but currentUser/userId is not yet available,
        // we wait.
        const userId = currentUser?.userId;
        if (!userId) { // This handles the case where isAuthenticated is true but userId is still null/undefined
            setTimeout(() => setLoading(false), 0);
            return;
        }

        db.attempts.where('userId').equals(userId).reverse().sortBy('date').then((data: QuizAttempt[]) => {
            setAttempts(data);
            setLoading(false);
        }).catch((error: any) => {
            console.error("Failed to load attempts:", error);
            setLoading(false);
        });
    }, [currentUser]);

    const handleClearHistory = async () => {
        if (!currentUser?.userId) return;
        if (window.confirm('Permanently delete all neural records for this profile?')) {
            await db.attempts.where('userId').equals(currentUser.userId).delete();
            setAttempts([]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            const key = e.key.toLowerCase();
            if (key === 's') setActiveTab('sessions');
            if (key === 'n') setActiveTab('questions');
            if (key === 'w' || key === 'x') handleClearHistory();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClearHistory]); // Added dependency which is now safe since it's defined before

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{t('accessing_archives')}</p>
            </div>
        );
    }

    if (attempts.length === 0) {
        return (
            <div className="text-center py-24 space-y-8 animate-fade-in">
                <div className="inline-flex p-8 bg-slate-900 border border-slate-800 rounded-full">
                    <History className="w-16 h-16 text-slate-700" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{t('empty_archive')}</h2>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">
                        {t('empty_archive_desc')}
                    </p>
                </div>
            </div>
        );
    }

    // Calculate Question-level stats
    const questionStats: { [id: number]: { correct: number; total: number } } = {};
    attempts.forEach(attempt => {
        if (!attempt.userAnswers) return;
        Object.keys(attempt.userAnswers).forEach(qIdStr => {
            const qId = Number(qIdStr);
            if (!questionStats[qId]) questionStats[qId] = { correct: 0, total: 0 };
            questionStats[qId].total += 1;
            if (!attempt.wrongQuestionIds?.includes(qId)) {
                questionStats[qId].correct += 1;
            }
        });
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto px-4 md:px-0 space-y-8 md:space-y-12 pb-20"
        >
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.04] pb-8 md:pb-12">
                <div className="space-y-4">
                    <button 
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('abort_scan')}</span>
                        <span className="hidden xl:inline text-[8px] font-black text-slate-800">[B / Esc]</span>
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-xl md:text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3 md:gap-4 leading-none">
                            <History className="w-5 h-5 md:w-8 md:h-8 text-accent shrink-0" />
                            {t('neural_logs')}
                        </h1>
                        <p className="text-[11px] md:text-base text-slate-500 font-medium tracking-tight">過去の評価とノード習熟度データの永続的なストレージ。</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <button 
                            onClick={handleClearHistory}
                            className="px-6 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 hover:text-white hover:bg-rose-500 transition-all border border-rose-500/30 rounded-lg flex items-center gap-2"
                        >
                            {t('wipe_archive')}
                        </button>
                        <span className="hidden xl:inline absolute -top-1 -right-1 text-[8px] font-black text-rose-500/60 bg-primary/50 px-1 rounded-sm border border-rose-500/20 transition-colors group-hover:text-rose-400 group-hover:border-rose-400/40">[W]</span>
                    </div>
                </div>
             </div>

             <div className="flex w-full sm:w-auto bg-slate-900 border border-slate-800 p-1 rounded-2xl">
                <TabButton 
                    active={activeTab === 'sessions'} 
                    onClick={() => setActiveTab('sessions')} 
                    icon={Radio} 
                    label={t('session_logs')} 
                />
                <TabButton 
                    active={activeTab === 'questions'} 
                    onClick={() => setActiveTab('questions')} 
                    icon={Database} 
                    label={t('node_mastery')} 
                />
             </div>

             <AnimatePresence mode="wait">
                {activeTab === 'sessions' ? (
                    <motion.div 
                        key="sessions"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid gap-4"
                    >
                        {attempts.map((attempt) => {
                            const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
                            const isSuccess = percentage >= 80;
                            const isExpanded = expandedSessionId === attempt.id;
                            
                            return (
                                <div key={attempt.id} className="bg-secondary/10 border border-white/[0.04] rounded-3xl overflow-hidden group hover:border-accent/20 transition-all shadow-lg">
                                    <button 
                                        onClick={() => setExpandedSessionId(isExpanded ? null : attempt.id!)}
                                        className="w-full text-left p-5 md:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6"
                                    >
                                        <div className="flex items-center gap-4 md:gap-8">
                                            <div className={clsx(
                                                "w-1 md:w-1.5 h-12 md:h-16 rounded-full", 
                                                isSuccess ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                            )} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 md:gap-3 text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2 italic">
                                                    <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                                    <span>{attempt.date.toLocaleString()}</span>
                                                </div>
                                                <div className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-accent transition-colors truncate">
                                                    {attempt.category === 'All' ? t('system_evolution') : (categoryMap[attempt.category] || attempt.category)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 border-t border-white/[0.04] md:border-0 pt-4 md:pt-0">
                                            <div className="text-left md:text-right">
                                                <div className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5 md:mb-1">{t('nodes_visited')}</div>
                                                <div className="font-mono text-xl md:text-2xl text-white font-black italic">
                                                    {attempt.score}<span className="text-slate-700"> / {attempt.totalQuestions}</span>
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[80px] md:min-w-[100px]">
                                                <div className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5 md:mb-1">{t('efficiency')}</div>
                                                <div className={clsx("font-black text-2xl md:text-4xl font-mono italic", isSuccess ? "text-emerald-500" : "text-amber-500")}>
                                                    {percentage}%
                                                </div>
                                            </div>
                                            <div className={clsx("text-slate-700 transition-transform duration-300 hidden sm:block", isExpanded && "rotate-180 text-accent")}>
                                                <ChevronDown className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-slate-950/50 border-t border-white/[0.04] overflow-hidden"
                                            >
                                                <div className="p-4 md:p-10 space-y-6">
                                                    <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3 mb-8">
                                                        <Zap className="w-3.5 h-3.5 text-accent" />
                                                        {t('trace_log')}
                                                    </h4>
                                                    
                                                    <div className="grid gap-4">
                                                        {Object.entries(attempt.userAnswers || {}).map(([qIdStr, userAnswIdx]) => {
                                                            const qId = Number(qIdStr);
                                                            const question = allQuestions.find(q => q.id === qId);
                                                            const isCorrectNode = !attempt.wrongQuestionIds?.includes(qId);
                                                            
                                                            if (!question) return null;

                                                            const locQ = { 
                                                                question: question.question, 
                                                                options: question.options, 
                                                                explanation: question.explanation 
                                                            };

                                                            return (
                                                                <div key={qId} className={clsx(
                                                                    "border-l-4 p-6 bg-secondary/5 rounded-r-2xl transition-all group/node relative overflow-hidden", 
                                                                    isCorrectNode ? "border-emerald-500/30" : "border-rose-500/30"
                                                                )}>
                                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[30px] rounded-full translate-x-12 -translate-y-12" />
                                                                    
                                                                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4 md:mb-6 min-w-0">
                                                                        <p className="font-bold text-slate-200 leading-tight text-sm md:text-lg min-w-0 break-words">{locQ.question}</p>
                                                                        <div className={clsx(
                                                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 border whitespace-nowrap self-end sm:self-auto", 
                                                                            isCorrectNode ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                                        )}>
                                                                            {isCorrectNode ? t('verified') : t('breached')}
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className={clsx(
                                                                            "p-4 rounded-xl text-xs font-bold flex items-center gap-3 border", 
                                                                            isCorrectNode ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" : "bg-rose-500/5 text-rose-400 border-rose-500/10"
                                                                        )}>
                                                                            {isCorrectNode ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                                             <span className="opacity-60 mr-1 uppercase">{t('input')}:</span>
                                                                             <span>{locQ.options[userAnswIdx as number]}</span>
                                                                         </div>
                                                                        {!isCorrectNode && (
                                                                            <div className="p-4 rounded-xl text-xs font-bold bg-slate-800/30 text-slate-500 flex items-center gap-3 border border-slate-700/50">
                                                                                <BookOpen className="w-5 h-5 text-emerald-600" />
                                                                                <span className="opacity-60 mr-1 uppercase">{t('required')}:</span>
                                                                                <span>{locQ.options[question.correctAnswer]}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-6 p-4 bg-slate-800/20 rounded-xl text-xs text-slate-500 italic leading-relaxed font-medium">
                                                                        {locQ.explanation}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="questions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid gap-4"
                    >
                        {Object.entries(questionStats)
                            .sort((a, b) => (a[1].correct/a[1].total) - (b[1].correct/b[1].total)) // Lower accuracy first
                            .map(([qIdStr, stat]) => {
                                const qId = Number(qIdStr);
                                const question = allQuestions.find(q => q.id === qId);
                                if (!question) return null;
                                const accuracy = Math.round((stat.correct / stat.total) * 100);
                                const isExpanded = expandedQuestionId === qId;
                                
                                const locQ = { 
                                    question: question.question, 
                                    options: question.options, 
                                    explanation: question.explanation, 
                                    category: question.category 
                                };

                                return (
                                    <div key={qId} className="bg-secondary/10 border border-white/[0.04] rounded-3xl overflow-hidden group hover:border-accent/20 transition-all shadow-lg">
                                        <button 
                                            onClick={() => setExpandedQuestionId(isExpanded ? null : qId)}
                                            className="w-full text-left p-6 md:p-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-8"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2 md:mb-3">
                                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-accent/60 bg-accent/5 px-2 py-0.5 rounded border border-accent/10">{categoryMap[locQ.category || question.category] || (locQ.category || question.category)}</span>
                                                </div>
                                                <p className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-slate-200 line-clamp-1 group-hover:text-white transition-colors">{locQ.question}</p>
                                            </div>
                                            <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10 border-t border-white/[0.04] md:border-0 pt-4 md:pt-0">
                                                <div className="text-left md:text-right">
                                                    <div className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5 md:mb-1">スキャン回数</div>
                                                    <div className="font-mono text-xl md:text-2xl font-black text-white italic">{stat.total}</div>
                                                </div>
                                                <div className="text-right min-w-[70px] md:min-w-[90px]">
                                                    <div className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5 md:mb-1">{t('node_mastery')}</div>
                                                    <div className={clsx("text-2xl md:text-4xl font-black font-mono italic", accuracy >= 80 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-500')}>
                                                        {accuracy}%
                                                    </div>
                                                </div>
                                                <div className={clsx("text-slate-700 transition-transform duration-300 hidden sm:block", isExpanded && "rotate-180 text-accent")}>
                                                    <ChevronDown className="w-6 h-6" />
                                                </div>
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-slate-950/50 border-t border-white/[0.04] overflow-hidden"
                                                >
                                                    <div className="p-10 space-y-10">
                                                        <div className="space-y-4">
                                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                                                                <Zap className="w-4 h-4 text-accent" />
                                                                {t('sector_definition')}
                                                            </p>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {locQ.options.map((opt, i) => (
                                                                    <div key={i} className={clsx(
                                                                        "p-5 rounded-2xl text-xs font-black border transition-all relative overflow-hidden", 
                                                                        i === question.correctAnswer 
                                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                                                            : "bg-slate-800/30 border-slate-700/50 text-slate-600"
                                                                    )}>
                                                                        <div className="flex justify-between items-center relative z-10">
                                                                            <span>{opt}</span>
                                                                            {i === question.correctAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                                                        </div>
                                                                        {i === question.correctAnswer && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-[20px] rounded-full" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="p-6 bg-accent/5 border-l-4 border-accent rounded-r-2xl relative">
                                                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                                                <Database className="w-12 h-12" />
                                                            </div>
                                                            <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                                                                <span className="text-accent font-black not-italic mr-3 font-mono">{t('root_analysis')}</span>
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
                    </motion.div>
                )}
             </AnimatePresence>
        </motion.div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
    <button 
        onClick={onClick}
        className={clsx(
            "relative flex-1 sm:flex-none px-3 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center gap-2 sm:gap-3 active:scale-95 group min-w-0 justify-center",
            active ? "text-primary shadow-xl" : "text-slate-500 hover:text-slate-200"
        )}
    >
        <span className="relative z-10 flex items-center gap-3">
            <Icon className={clsx("w-4 h-4 transition-transform group-hover:scale-110", active ? "text-primary" : "text-slate-600")} />
            {label}
        </span>
        {active && (
            <motion.div 
                layoutId="active-tab"
                className="absolute inset-0 bg-accent rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
    </button>
);
