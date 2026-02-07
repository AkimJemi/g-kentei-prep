import React, { useMemo } from 'react';

import { useLanguageStore } from '../store/useLanguageStore';
import { Brain, Cpu, Database, Zap, Layers, Globe, Shield, Terminal, BookOpen, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface StudyModeProps {
  onStartPractice: (category: string) => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({ onStartPractice }) => {
  const { t } = useLanguageStore();
  const [totalQuestions, setTotalQuestions] = React.useState(0);

  React.useEffect(() => {
    fetch('/api/questions').then(res => res.json()).then(data => setTotalQuestions(data.length)).catch(console.error);
  }, []);

  const categories = useMemo(() => [
    { id: 'cat_fundamentals', realId: 'AI Fundamentals', title: 'cat_fundamentals', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'cat_trends', realId: 'AI Trends', title: 'cat_trends', icon: Cpu, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { id: 'cat_ml', realId: 'Machine Learning', title: 'cat_ml', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'cat_dl_basics', realId: 'Deep Learning Basics', title: 'cat_dl_basics', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { id: 'cat_dl_tech', realId: 'Deep Learning Tech', title: 'cat_dl_tech', icon: Layers, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { id: 'cat_apps', realId: 'AI Applications', title: 'cat_apps', icon: Globe, color: 'text-sky-400', bg: 'bg-sky-400/10' },
    { id: 'cat_social', realId: 'Social Implementation', title: 'cat_social', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'cat_math', realId: 'Math & Statistics', title: 'cat_math', icon: Terminal, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    { id: 'cat_law', realId: 'Law & Contracts', title: 'cat_law', icon: BookOpen, color: 'text-teal-400', bg: 'bg-teal-400/10' },
    { id: 'cat_ethics', realId: 'Ethics & Governance', title: 'cat_ethics', icon: Award, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ], [t]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  React.useEffect(() => {
    const shortcuts = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's'];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const index = shortcuts.indexOf(key);
      
      if (index !== -1 && categories[index]) {
        onStartPractice(categories[index].realId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartPractice, categories]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-6xl mx-auto px-6 space-y-12 pb-24"
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
                <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                    {t('study')} <span className="text-accent ring-accent/20">分野</span>
                </h1>
                <p className="text-slate-500 font-medium tracking-tight">{t('initialize_targeted')}</p>
            </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button 
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))}
                className="flex items-center gap-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 px-6 py-3 rounded-2xl transition-all group"
            >
                <Brain className="w-5 h-5 text-accent animate-pulse" />
                <div className="text-left">
                    <div className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">暗記カード</div>
                    <div className="text-[8px] font-medium text-slate-500 uppercase tracking-widest">重要用語の総復習 [F]</div>
                </div>
            </button>
            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 px-6 py-3 rounded-2xl">
                <Cpu className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('total_nodes')}: {totalQuestions}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat, idx) => {
          const CategoryIcon = cat.icon;
          const shortcuts = ['1', '2', '3', '4', 'Q', 'W', 'E', 'R', 'A', 'S'];
          const shortcut = shortcuts[idx] || (idx + 1).toString();

          return (
            <motion.button
              key={cat.id}
              variants={itemVariants}
              onClick={() => onStartPractice(cat.realId)}
              className="group relative p-8 bg-secondary/10 hover:bg-secondary/20 border border-white/[0.04] rounded-3xl text-left transition-all hover:border-accent/30 shadow-xl overflow-hidden active:scale-95"
            >
              <div className="absolute top-4 right-6 text-[10px] font-black text-slate-600/60 group-hover:text-slate-400 transition-colors">
                [{shortcut}]
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-accent/10 transition-colors" />
              
              <div className="relative z-10">
                <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner", cat.bg)}>
                  <CategoryIcon className={clsx("w-7 h-7", cat.color)} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2 group-hover:text-accent transition-colors">
                    {t(cat.title)}
                  </h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 line-clamp-2">
                    {t('sector_definition_long')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto relative z-10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    {t('total_nodes')}: 20
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
