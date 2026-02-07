import React, { useEffect, useState } from 'react';
import { db, type User, type QuizAttempt } from '../db/db';
import { useLanguageStore } from '../store/useLanguageStore';
import { motion } from 'framer-motion';
import { Users, BarChart3, ShieldAlert, Trash2, UserCog, TrendingUp, Activity, Database } from 'lucide-react';
import clsx from 'clsx';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguageStore();

  useEffect(() => {
    const fetchData = async () => {
      const [u, a] = await Promise.all([
        db.users.toArray(),
        db.attempts.toArray()
      ]);
      setUsers(u);
      setAllAttempts(a);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleDeleteUser = async (id: number) => {
    if (confirm('警告: このユーザープロトコルとすべての関連データを永久に削除しますか？')) {
      await Promise.all([
        db.users.delete(id),
        db.attempts.where('userId').equals(id).delete(),
        db.sessions.where('userId').equals(id).delete()
      ]);
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const getGlobalStats = () => {
    const totalQuestions = allAttempts.reduce((acc, curr) => acc + curr.totalQuestions, 0);
    const totalScore = allAttempts.reduce((acc, curr) => acc + curr.score, 0);
    const avgAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    
    return {
      totalUsers: users.length,
      totalAttempts: allAttempts.length,
      avgAccuracy,
      activeNodes: totalQuestions
    };
  };

  const stats = getGlobalStats();

  if (isLoading) return <div className="p-12 text-center animate-pulse text-accent font-black uppercase tracking-widest">{t('accessing_archives')}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.04] pb-12">
        <div className="space-y-2">
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
              <span className="text-red-500">ROOT</span> ACCESS <span className="text-slate-500">DASHBOARD</span>
            </h1>
            <p className="text-slate-500 font-medium tracking-tight">{t('system_monitoring')}</p>
        </div>
        <div className="flex gap-4">
             <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{t('override_enabled')}</span>
            </div>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard icon={Users} label={t('total_protocols')} value={stats.totalUsers.toString()} color="text-blue-400" />
        <MetricCard icon={Activity} label={t('system_cycles')} value={stats.totalAttempts.toString()} color="text-purple-400" />
        <MetricCard icon={TrendingUp} label={t('global_precision')} value={`${stats.avgAccuracy}%`} color="text-emerald-400" />
        <MetricCard icon={Database} label={t('data_points')} value={stats.activeNodes.toString()} color="text-amber-400" />
      </div>

      {/* User Management */}
      <div className="bg-secondary/10 border border-white/[0.04] rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <UserCog className="w-6 h-6 text-accent" />
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{t('active_neural_profiles')}</h2>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="border-b border-white/[0.02] bg-slate-900/30">
                          <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('identifier')}</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('authority')}</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('link_date')}</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                      {users.map(user => (
                          <motion.tr 
                              key={user.id} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="group hover:bg-white/[0.02] transition-colors"
                          >
                              <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-accent font-black uppercase tracking-tighter shadow-inner">
                                          {user.username.substring(0, 2)}
                                      </div>
                                      <span className="font-bold text-white tracking-tight">{user.username}</span>
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <span className={clsx(
                                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                      user.role === 'admin' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                  )}>
                                      {user.role === 'admin' ? t('admin') : 'USER'}
                                  </span>
                              </td>
                              <td className="px-8 py-6 text-slate-500 font-mono text-xs">
                                  {new Date(user.joinedAt).toLocaleDateString()}
                              </td>
                              <td className="px-8 py-6 text-right">
                                  {user.role !== 'admin' && (
                                    <button 
                                        onClick={() => user.id && handleDeleteUser(user.id)}
                                        className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                              </td>
                          </motion.tr>
                      ))}
                  </tbody>
              </table>
              {users.length === 0 && (
                  <div className="p-20 text-center space-y-4">
                      <Users className="w-12 h-12 text-slate-800 mx-auto" />
                      <p className="text-slate-600 font-black uppercase tracking-widest text-xs">{t('zero_profiles')}</p>
                  </div>
              )}
          </div>
      </div>

      {/* Visualizations (Placeholder Illustration) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-secondary/20 border border-slate-800 p-8 rounded-3xl h-[400px] flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">{t('efficiency_matrix')}</h3>
                </div>
                <div className="flex-1 flex items-end gap-4 px-4 pb-8">
                    {[65, 45, 85, 30, 95, 60, 75].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-2 items-center group">
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                className="w-full bg-gradient-to-t from-purple-500/20 to-purple-400 rounded-t-xl group-hover:to-accent transition-all duration-500"
                            />
                            <span className="text-[8px] font-black text-slate-700 uppercase">S-{i + 1}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-secondary/20 border border-slate-800 p-8 rounded-3xl h-[400px] flex flex-col">
                 <div className="flex items-center gap-4 mb-8">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-white">{t('system_growth')}</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-12">
                     <div className="relative w-full h-full border-b border-l border-white/5">
                        <svg className="w-full h-full overflow-visible">
                            <motion.path 
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5 }}
                                d="M 0 100 Q 50 80, 100 90 T 200 60 T 300 70 T 400 30 T 500 40 T 600 10" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3"
                                className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                     </div>
                </div>
            </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: any, label: string, value: string, color: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] blur-xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <Icon className={clsx("w-6 h-6 mb-6", color)} />
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</div>
        <div className="text-4xl font-black italic tracking-tighter text-white group-hover:scale-105 transition-transform origin-left">{value}</div>
    </div>
);
