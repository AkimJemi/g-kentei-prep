import React, { useEffect, useState } from 'react';
import { Play, BookOpen, TrendingUp, Zap, Target, AlertTriangle, ArrowRight } from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../db/db';
import { motion } from 'framer-motion';

interface DashboardProps {
  onStartQuiz: () => void;
  onViewStats: () => void;
  onStartWeakPointQuiz: () => void;
  onResumeSession: (category: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartQuiz, onViewStats, onStartWeakPointQuiz, onResumeSession }) => {
  const { questions, startWeakPointQuiz } = useQuizStore();
  const { t } = useLanguageStore();
  const { currentUser } = useAuthStore();
  const [stats, setStats] = useState({
      attempts: 0,
      avgAccuracy: 0,
      weakQuestionIds: [] as number[],
      rank: 'Beginner',
      activeSessions: [] as any[]
  });

  useEffect(() => {
      if (!currentUser?.id) return;

      db.attempts.where('userId').equals(currentUser.id).toArray().then((data: any[]) => {
          if (data.length === 0) return;
          
          let totalScore = 0;
          let totalQuestions = 0;
          const errorMap: { [id: number]: number } = {};

          data.forEach((a: any) => {
              totalScore += a.score;
              totalQuestions += a.totalQuestions;
              a.wrongQuestionIds?.forEach((id: number) => {
                  errorMap[id] = (errorMap[id] || 0) + 1;
              });
          });

          const weakIds = Object.entries(errorMap)
              .filter(([_, count]) => count >= 1)
              .sort((a, b) => b[1] - a[1])
              .map(([id]) => Number(id))
              .slice(0, 10);

          const acc = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
          
          setStats(prev => ({
              ...prev,
              attempts: data.length,
              avgAccuracy: acc,
              weakQuestionIds: weakIds,
              rank: acc > 90 ? 'Expert' : acc > 70 ? 'Advanced' : acc > 40 ? 'Learner' : 'Beginner'
          }));
      });

      db.sessions.where('userId').equals(currentUser.id).toArray().then((sessions: any[]) => {
          setStats(prev => ({ ...prev, activeSessions: sessions }));
      });
  }, [currentUser]);

  const handleWeakPointReview = () => {
      if (stats.weakQuestionIds.length > 0) {
          startWeakPointQuiz(stats.weakQuestionIds);
          onStartWeakPointQuiz();
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      if (key === 'e' || e.key === 'Enter') {
        onStartQuiz();
      } else if (key === 'q') {
        onViewStats();
      } else if (key === 'w' && stats.weakQuestionIds.length > 0) {
        handleWeakPointReview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stats.weakQuestionIds, onStartQuiz, onViewStats]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12 pb-20"
    >
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12 relative">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 blur-[120px] rounded-full -z-10" />
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
          {t('master_gkentei')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-indigo-400 to-purple-500 animate-gradient">G-KENTEI</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
          {t('jdla_sub')}
          <span className="block text-slate-500 text-sm mt-2 uppercase tracking-[0.3em] font-black">{t('neural_status')} // {t('optimized').toUpperCase()}</span>
        </motion.p>

        <motion.div variants={itemVariants} className="pt-8 flex flex-wrap justify-center gap-4">
          <button 
            onClick={onStartQuiz}
            className="group relative px-10 py-5 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all duration-300 flex items-center space-x-3 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{t('engage_practice')}</span>
            <span className="text-[10px] font-black text-primary/60 ml-2 group-hover:text-primary transition-colors">[E]</span>
          </button>
          
          <button 
            onClick={onViewStats}
            className="group px-10 py-5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all duration-300 flex items-center space-x-3 active:scale-95 shadow-xl"
          >
            <Zap className="w-5 h-5 text-amber-500" />
            <span>{t('quick_analytics')}</span>
            <span className="text-[10px] font-black text-slate-500 ml-2 group-hover:text-slate-300 transition-colors">[Q]</span>
          </button>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            icon={Target} 
            color="text-accent" 
            bg="bg-accent/10" 
            label={t('neural_status')} 
            value={stats.rank} 
            sublabel={t('mastery_basis')}
        />
        <StatCard 
            icon={TrendingUp} 
            color="text-emerald-400" 
            bg="bg-emerald-400/10" 
            label={t('efficiency')} 
            value={`${stats.avgAccuracy}%`} 
            sublabel={`${t('session_count')}: ${stats.attempts}`}
        />
        <StatCard 
            icon={BookOpen} 
            color="text-indigo-400" 
            bg="bg-indigo-400/10" 
            label={t('total_nodes')} 
            value={questions.length.toString()} 
            sublabel={t('db_items')}
        />
      </motion.div>

      {/* Resume Session Banner */}
      {stats.activeSessions.length > 0 && (
        <motion.div 
            variants={itemVariants} 
            className="bg-accent/10 border border-accent/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] -z-10" />
            <div className="flex gap-6 items-start">
                <div className="p-4 bg-accent/20 rounded-2xl border border-accent/30">
                    <Zap className="w-8 h-8 text-accent animate-pulse" />
                </div>
                <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-accent mb-2">{t('unfinished_session')}</h3>
                    <p className="text-slate-400 max-w-md text-sm leading-relaxed">
                        <span className="text-white font-bold">{stats.activeSessions[0].category}</span> {t('partial_scan_detected')}
                    </p>
                </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                <button 
                    onClick={() => {
                        if (currentUser?.id) {
                            db.sessions.delete([currentUser.id, stats.activeSessions[0].category]);
                            setStats(prev => ({ ...prev, activeSessions: prev.activeSessions.slice(1) }));
                        }
                    }}
                    className="px-6 py-4 bg-slate-900 border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-500 font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                >
                    {t('discard')}
                </button>
                <button 
                    onClick={() => onResumeSession(stats.activeSessions[0].category)} 
                    className="px-8 py-4 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <span>{t('resume_seq')}</span>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
      )}

      {/* Recommended Section */}
      {stats.weakQuestionIds.length > 0 && (
        <motion.div 
            variants={itemVariants} 
            className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] -z-10" />
            <div className="flex gap-6 items-start">
                <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-amber-500 mb-2">{t('weak_spot_detected')}</h3>
                    <p className="text-slate-400 max-w-md text-sm leading-relaxed">
                        <span className="text-white font-bold">{stats.weakQuestionIds.length}{t('critical_nodes_id')}</span>
                    </p>
                </div>
            </div>
            <button 
                onClick={handleWeakPointReview}
                className="group w-full md:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-primary font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
                <span>{t('weakness_protocol')}</span>
                <ArrowRight className="w-5 h-5" />
                <span className="text-[10px] font-black text-primary/60 ml-2 group-hover:text-primary transition-colors">[W]</span>
            </button>
        </motion.div>
      )}
    </motion.div>
  );
};

const StatCard: React.FC<{ icon: any, color: string, bg: string, label: string, value: string, sublabel: string }> = ({ icon: Icon, color, bg, label, value, sublabel }) => (
    <div className="bg-secondary/20 border border-slate-800 p-8 rounded-3xl hover:bg-secondary/40 transition-all group">
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</div>
        <div className="text-3xl font-black italic uppercase tracking-tight text-white mb-1">{value}</div>
        <div className="text-xs text-slate-600 font-medium">{sublabel}</div>
    </div>
);
