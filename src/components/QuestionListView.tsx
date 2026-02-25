/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [focusedIdx, setFocusedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // カテゴリに該当する問題のみ（元のインデックスを保持）
  const categoryQuestions = allQuestions
    .map((q, globalIdx) => ({ ...q, globalIdx }))
    .filter((q) => q.category === categoryId);

  const filtered = categoryQuestions.filter((q) =>
    q.question.toLowerCase().includes(search.toLowerCase())
  );

  // フォーカス変更時に自動スクロール
  useEffect(() => {
    itemRefs.current[focusedIdx]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [focusedIdx]);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Tab → 検索バーにフォーカス
    if (e.key === 'Tab') {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }

    // 入力中は q/w/e を通常入力として扱う
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Escape') {
        setSearch('');
        (e.target as HTMLElement).blur();
      }
      return;
    }

    const key = e.key.toLowerCase();

    if (key === 'b' || e.key === 'Escape') { onBack(); return; }
    // w → 次の問題、q → 前の問題
    if (key === 'w') { setFocusedIdx(prev => Math.min(prev + 1, filtered.length - 1)); return; }
    if (key === 'q') { setFocusedIdx(prev => Math.max(prev - 1, 0)); return; }
    // e → 選択してクイズ開始
    if (key === 'e') {
      const q = filtered[focusedIdx];
      if (q) onStartFromQuestion(categoryId, q.globalIdx);
      return;
    }
  }, [onBack, onStartFromQuestion, filtered, focusedIdx, categoryId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 検索が変わったらフォーカスをリセット
  useEffect(() => {
    setFocusedIdx(0);
  }, [search]);

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
          ref={searchRef}
          type="text"
          placeholder="問題を検索... (Tab でフォーカス)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 focus:border-accent/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-700 hidden xl:block">
          [Tab]
        </span>
      </div>

      {/* Shortcut hint */}
      <div className="hidden xl:flex items-center gap-4 text-[9px] font-black text-slate-700 uppercase tracking-widest">
        <span><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono">Q</kbd> 次</span>
        <span><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono">W</kbd> 前</span>
        <span><kbd className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono">E</kbd> ここから開始</span>
      </div>

      {/* Question List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((q, idx) => (
            <motion.div
              key={q.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.015 }}
              className={`group flex items-start gap-4 border rounded-2xl p-4 transition-all cursor-pointer ${
                idx === focusedIdx
                  ? 'bg-accent/10 border-accent/40 shadow-lg shadow-accent/10'
                  : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-800/60 hover:border-accent/30'
              }`}
              onClick={() => setFocusedIdx(idx)}
            >
              {/* Number */}
              <div className={`shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                idx === focusedIdx ? 'bg-accent/20 border-accent/50' : 'bg-slate-800 border-slate-700'
              }`}>
                <span className={`text-[10px] font-black font-mono transition-colors ${
                  idx === focusedIdx ? 'text-accent' : 'text-slate-400'
                }`}>
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
                  {idx === focusedIdx && (
                    <span className="text-[9px] font-black text-accent/70 uppercase tracking-widest">
                      ← E キーで開始
                    </span>
                  )}
                </div>
              </div>

              {/* Start from this question button */}
              <button
                onClick={(e) => { e.stopPropagation(); onStartFromQuestion(categoryId, q.globalIdx); }}
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
