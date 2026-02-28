import React, { useEffect } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { BookOpen, Target, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudyModeProps {
  onNavigateSector: () => void;
  onNavigateSelfStudy: () => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({ onNavigateSector, onNavigateSelfStudy }) => {
  const { t } = useLanguageStore();

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        onNavigateSector();
      } else if (e.key === '2') {
        e.preventDefault();
        onNavigateSelfStudy();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateSector, onNavigateSelfStudy]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-4xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.04] pb-12">
        <div className="space-y-4">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('abort_scan') || 'HOME'}</span>
            <span className="hidden xl:inline text-[8px] font-black text-slate-800">[B / Esc]</span>
          </button>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-white">
              STUDY <span className="text-accent ring-accent/20">HUB</span>
            </h1>
            <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-tight leading-relaxed">学習モードを選択してください</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Sector Practice Option */}
        <motion.div
          variants={itemVariants}
          onClick={onNavigateSector}
          className="group relative p-6 md:p-10 bg-secondary/10 hover:bg-secondary/20 border border-white/[0.04] rounded-3xl text-left cursor-pointer transition-all hover:border-accent/30 shadow-xl overflow-hidden flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[40px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-accent/10 transition-colors" />

          <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-blue-500/10 text-blue-400">
                <Target className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-900/80 border border-white/5 text-[10px] font-black text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                1
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-white mb-2 group-hover:text-accent transition-colors">
                分野別演習
              </h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                カテゴリごとに問題演習を行い、理解度を測ります。苦手分野の克服に最適です。
              </p>
            </div>
          </div>
        </motion.div>

        {/* Self Study Option */}
        <motion.div
          variants={itemVariants}
          onClick={onNavigateSelfStudy}
          className="group relative p-6 md:p-10 bg-secondary/10 hover:bg-secondary/20 border border-white/[0.04] rounded-3xl text-left cursor-pointer transition-all hover:border-emerald-500/30 shadow-xl overflow-hidden flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-emerald-500/10 transition-colors" />

          <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner bg-emerald-500/10 text-emerald-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-900/80 border border-white/5 text-[10px] font-black text-slate-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                2
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-white mb-2 group-hover:text-emerald-400 transition-colors">
                自己学習（テキスト＆メモ）
              </h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                公式テキストやガイドラインを読みながら、自分専用の学習メモを作成できます。
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
