import React, { useEffect, useState } from 'react';
import { Play, BookOpen, TrendingUp, Zap, Target, AlertTriangle, ArrowRight } from 'lucide-react';
import { useQuizStore } from '../store/useQuizStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../db/db';
import { normalizeKeys } from '../utils/normalize';
import { GroupChat } from './GroupChat';
import { motion } from 'framer-motion';

interface DashboardProps {
  onStartQuiz: () => void;
  onViewStats: () => void;
  onStartWeakPointQuiz: () => void;
  onResumeSession: (category: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartQuiz, onViewStats, onStartWeakPointQuiz, onResumeSession }) => {
  const { startWeakPointQuiz } = useQuizStore();
  const { t } = useLanguageStore();
  const { currentUser } = useAuthStore();
  const [stats, setStats] = useState({
      attempts: 0,
      avgAccuracy: 0,
      weakQuestionIds: [] as number[],
      rank: 'Beginner',
      activeSessions: [] as any[],
      totalQuestions: 0
  });

  useEffect(() => {
    // Fetch total question count
    fetch('/api/questions').then(res => res.json()).then((data: any[]) => {
        const normalized = normalizeKeys(data);
        setStats(prev => ({ ...prev, totalQuestions: normalized.length }));
    }).catch(console.error);
  }, []);

  useEffect(() => {
      const userId = currentUser?.userId || (currentUser as any)?.id;
      if (!userId) return;

      db.attempts.where('userId').equals(userId).toArray().then((data: any[]) => {
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
              rank: acc > 90 ? 'エキスパート' : acc > 70 ? '上級' : acc > 40 ? '初級' : '入門'
          }));
      });

      db.sessions.where('userId').equals(userId).toArray().then((sessions: any[]) => {
          setStats(prev => ({ ...prev, activeSessions: sessions }));
      });
  }, [currentUser]);

  const handleWeakPointReview = async () => {
      if (stats.weakQuestionIds.length > 0) {
          await startWeakPointQuiz(stats.weakQuestionIds);
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
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">{t('master_gkentei')}　　　<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-indigo-400 to-purple-500 animate-gradient">G-KENTEI</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
          {t('jdla_sub')}
          <span className="block text-slate-500 text-sm mt-2 uppercase tracking-[0.3em] font-black">{t('neural_status')} // {t('optimized').toUpperCase()}</span>
        </motion.p>

        <motion.div variants={itemVariants} className="pt-8 flex flex-wrap justify-center gap-4">
          <button 
            onClick={onStartQuiz}
            className="group relative px-6 py-4 md:px-10 md:py-5 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all duration-300 flex items-center space-x-3 active:scale-95 text-sm md:text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{t('engage_practice')}</span>
            <span className="hidden md:inline text-[10px] font-black text-primary/60 ml-2 group-hover:text-primary transition-colors">[E]</span>
          </button>
          
          <button 
            onClick={onViewStats}
            className="group px-6 py-4 md:px-10 md:py-5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all duration-300 flex items-center space-x-3 active:scale-95 shadow-xl text-sm md:text-base"
          >
            <Zap className="w-5 h-5 text-amber-500" />
            <span>{t('quick_analytics')}</span>
            <span className="hidden md:inline text-[10px] font-black text-slate-500 ml-2 group-hover:text-slate-300 transition-colors">[Q]</span>
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
            value={stats.totalQuestions.toString()} 
            sublabel={t('db_items')}
        />
      </motion.div>

      {/* Community Chat - Full Width */}
      <motion.div variants={itemVariants}>
          <GroupChat />
      </motion.div>

      {/* Site Guide & Shortcuts */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
          <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">✨</span>
                  学習効率を最大化する機能
              </h3>
              <ul className="space-y-3">
                  <li className="flex gap-4 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <div className="text-xl">🚀</div>
                      <div>
                          <div className="font-bold text-white text-sm">演習モード (Practice)</div>
                          <div className="text-xs text-slate-400 mt-1">本番形式の多肢選択問題で実戦力を養成します。</div>
                      </div>
                  </li>
                  <li className="flex gap-4 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <div className="text-xl">📊</div>
                      <div>
                          <div className="font-bold text-white text-sm">分析レポート (Analytics)</div>
                          <div className="text-xs text-slate-400 mt-1">現在のランク、学習推移、正答率を可視化します。</div>
                      </div>
                  </li>
                  <li className="flex gap-4 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <div className="text-xl">⚠️</div>
                      <div>
                          <div className="font-bold text-white text-sm">弱点克服 (Weakness Protocol)</div>
                          <div className="text-xs text-slate-400 mt-1">間違えた問題だけを抽出し、知識の穴を埋めます。</div>
                      </div>
                  </li>
              </ul>
          </div>

          <div className="space-y-4">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="bg-sky-500/20 p-2 rounded-lg text-sky-400">⌨️</span>
                  便利なショートカット
              </h3>
              <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                      <span className="text-sm text-slate-300 font-medium">演習スタート</span>
                      <div className="flex gap-2">
                          <kbd className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-slate-400 font-mono">E</kbd>
                          <span className="text-slate-600 text-xs py-1">or</span>
                          <kbd className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-slate-400 font-mono">Enter</kbd>
                      </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                      <span className="text-sm text-slate-300 font-medium">成績・分析を見る</span>
                      <kbd className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-slate-400 font-mono">Q</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                      <span className="text-sm text-slate-300 font-medium">弱点復習モード</span>
                      <kbd className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-slate-400 font-mono">W</kbd>
                  </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                  <h4 className="text-sm font-bold text-slate-400 mb-3">🛠️ コミュニティ機能</h4>
                  <div className="flex gap-2 text-xs text-slate-500">
                      <span className="px-3 py-1 bg-slate-800 rounded-full">問題投稿について</span>
                      <span className="px-3 py-1 bg-slate-800 rounded-full">フィードバック送信</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                      サイドメニューからオリジナルの問題を投稿したり、開発チームへ機能リクエストを送ることができます。
                  </p>
              </div>
          </div>
      </motion.div>

      {/* Action Grid: Resume, Weakness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resume Session Banner */}
            {stats.activeSessions.length > 0 && (
                <motion.div 
                    variants={itemVariants} 
                    className="bg-accent/10 border border-accent/20 rounded-3xl p-6 flex flex-col items-start gap-4 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] -z-10" />
                    <div className="flex gap-4 items-center mb-2">
                        <div className="p-3 bg-accent/20 rounded-xl border border-accent/30">
                            <Zap className="w-6 h-6 text-accent animate-pulse" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-accent">{t('unfinished_session')}</h3>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        <span className="text-white font-bold">{stats.activeSessions[0].category}</span> {t('partial_scan_detected')}
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => {
                                if (currentUser?.userId && confirm('【確認】現在の中断セッションを破棄してもよろしいですか？（進捗は保存されません）')) {
                                    db.sessions.delete([currentUser.userId, stats.activeSessions[0].category]);
                                    setStats(prev => ({ ...prev, activeSessions: prev.activeSessions.slice(1) }));
                                }
                            }}
                            className="px-4 py-3 bg-slate-900 border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-500 font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 text-xs"
                        >
                            {t('discard')}
                        </button>
                        <button 
                            onClick={() => onResumeSession(stats.activeSessions[0].category)} 
                            className="flex-1 px-4 py-3 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
                        >
                            <span>{t('resume_seq')}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Recommended Section (Weakness) */}
            {stats.weakQuestionIds.length > 0 && (
                <motion.div 
                    variants={itemVariants} 
                    className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] -z-10" />
                    <div className="flex gap-4 items-center mb-2">
                         <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter text-amber-500">{t('weak_spot_detected')}</h3>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        <span className="text-white font-bold">{stats.weakQuestionIds.length}{t('critical_nodes_id')}</span>
                    </p>
                    <button 
                        onClick={handleWeakPointReview}
                        className="group w-full px-6 py-4 bg-amber-500 hover:bg-amber-400 text-primary font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <span>{t('weakness_protocol')}</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </motion.div>
            )}
      </div>
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
