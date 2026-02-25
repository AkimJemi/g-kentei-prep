/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Play, Search } from 'lucide-react';
import { useQuestions } from '../hooks/useQuestions';
import { useAuthStore } from '../store/useAuthStore';

interface QuestionListViewProps {
  categoryId: string;
  categoryTitle: string;
  onStartFromQuestion: (categoryId: string, questionIndex: number) => void;
  onBack: () => void;
}

export const QuestionListView: React.FC<QuestionListViewProps> = ({
  categoryId,
  categoryTitle,
  onStartFromQuestion,
  onBack,
}) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { data: allQuestions = [] } = useQuestions(currentUser?.userId);
  const [search, setSearch] = useState('');

  // B / Escape で戻る
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'b' || e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // カテゴリに該当する問題のみ（元のインデックスを保持）
  const categoryQuestions = allQuestions
    .map((q, globalIdx) => ({ ...q, globalIdx }))
    .filter((q) => q.category === categoryId);

  const filtered = categoryQuestions.filter((q) =>
    q.question.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 md:px-6 pb-24 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">戻る</span>
          <span className="hidden xl:inline text-[8px] font-black text-slate-800 group-hover:text-slate-500 transition-colors">[B / Esc]</span>
        </button>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white leading-none">
          問題<span className="text-accent">一覧</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">{categoryTitle} · {categoryQuestions.length}問</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="問題を検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 focus:border-accent/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      {/* Question List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.015 }}
              className="group flex items-start gap-4 bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/60 hover:border-accent/30 rounded-2xl p-4 transition-all"
            >
              {/* Number */}
              <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <span className="text-[10px] font-black font-mono text-slate-400">
                  {categoryQuestions.indexOf(q) + 1}
                </span>
              </div>

              {/* Question text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 font-medium leading-relaxed line-clamp-2 group-hover:text-white transition-colors">
                  {q.question}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    #{q.id}
                  </span>
                </div>
              </div>

              {/* Start from this question button */}
              <button
                onClick={() => onStartFromQuestion(categoryId, q.globalIdx)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent/50 text-accent rounded-xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">ここから</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-600 font-medium">
            該当する問題が見つかりませんでした
          </div>
        )}
      </div>
    </motion.div>
  );
};
