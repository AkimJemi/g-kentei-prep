import React from 'react';

import { useLanguageStore } from '../store/useLanguageStore';
import { 
    Brain, Cpu, Database, Zap, Layers, Globe, 
    Shield, Terminal, BookOpen, Award, 
    ChevronLeft, ChevronRight, HelpCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { type Category } from '../db/db';

const ICON_MAP: Record<string, any> = {
    Brain, Cpu, Database, Zap, Layers, Globe, 
    Shield, Terminal, BookOpen, Award
};

interface StudyModeProps {
  onStartPractice: (category: string) => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({ onStartPractice }) => {
  const { t } = useLanguageStore();
  const [totalQuestions, setTotalQuestions] = React.useState(0);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
        try {
            const [qRes, cRes] = await Promise.all([
                fetch('/api/questions'),
                fetch('/api/categories')
            ]);
            const qData = await qRes.json();
            const cData = await cRes.json();
            setTotalQuestions(qData.length);
            setCategories(cData);
        } catch (error) {
            console.error("Failed to load study data", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

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
    const shortcuts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const index = shortcuts.indexOf(key);
      
      if (index !== -1 && categories[index]) {
        onStartPractice(categories[index].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartPractice, categories]);

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-t-2 border-accent rounded-full animate-spin" />
          </div>
      );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-6xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.04] pb-12">
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
                <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                    {t('study')} <span className="text-accent ring-accent/20">分野</span>
                </h1>
                <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-tight leading-relaxed">{t('initialize_targeted')}</p>
            </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button 
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))}
                className="flex items-center gap-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 px-4 md:px-6 py-3 rounded-2xl transition-all group"
            >
                <Brain className="w-5 h-5 text-accent animate-pulse" />
                <div className="text-left flex-1 min-w-0">
                    <div className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">暗記カード</div>
                    <div className="text-[8px] font-medium text-slate-500 uppercase tracking-widest truncate">重要用語の総復習 <span className="hidden xl:inline">[F]</span></div>
                </div>
            </button>
            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 px-6 py-3 rounded-2xl">
                <Cpu className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('total_nodes')}: {totalQuestions}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {categories.map((cat, idx) => {
          const CategoryIcon = ICON_MAP[cat.icon] || HelpCircle;
          const shortcuts = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
          const shortcut = shortcuts[idx] || (idx + 1).toString();
 
          return (
            <motion.button
              key={cat.id}
              variants={itemVariants}
              onClick={() => onStartPractice(cat.id)}
              className="group relative p-4 md:p-8 bg-secondary/10 hover:bg-secondary/20 border border-white/[0.04] rounded-2xl md:rounded-3xl text-left transition-all hover:border-accent/30 shadow-xl overflow-hidden active:scale-95 flex flex-col h-full"
            >
              <div className="absolute top-4 right-6 text-[10px] font-black text-slate-600/60 group-hover:text-slate-400 transition-colors hidden xl:block">
                [{shortcut}]
              </div>
              <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-accent/5 blur-[30px] md:blur-[40px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-accent/10 transition-colors" />
              
              <div className="relative z-10 flex-1">
                <div className={clsx("w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 shadow-inner", cat.bg)}>
                  <CategoryIcon className={clsx("w-5 h-5 md:w-7 md:h-7", cat.color)} />
                </div>
                <div>
                  <h3 className="text-sm md:text-xl font-black italic uppercase tracking-tighter text-white mb-1 md:mb-2 group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                    {cat.title}
                  </h3>
                  <p className="hidden md:block text-slate-500 text-xs font-medium leading-relaxed mb-6 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>
 
              <div className="flex items-center justify-between mt-auto relative z-10 pt-2">
                  <div className="flex items-center gap-2 text-[7px] md:text-[10px] font-bold text-slate-400 bg-slate-800/50 px-2 md:px-3 py-0.5 md:py-1 rounded-full truncate mr-2">
                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
                    <span className="truncate">{t('optimized')} セクタ</span>
                  </div>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-700 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
