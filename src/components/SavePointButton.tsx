import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkCheck, RotateCcw, Trash2, Pin } from 'lucide-react';
import clsx from 'clsx';
import { useSavePointStore, VIEW_LABELS } from '../store/useSavePointStore';
import type { SaveableView } from '../store/useSavePointStore';
import { scrollRegistry } from '../utils/scrollRegistry';

interface SavePointButtonProps {
    currentView: SaveableView;
    questionListCategory?: { id: string; title: string } | null;
    selfStudyGuide?: string | null;
    onRestoreView: (view: SaveableView, extraState: {
        questionListCategory?: { id: string; title: string } | null;
        selfStudyGuide?: string | null;
    }) => void;
    onToast: (message: string, type: 'success' | 'error') => void;
}

export const SavePointButton: React.FC<SavePointButtonProps> = ({
    currentView,
    questionListCategory,
    selfStudyGuide,
    onRestoreView,
    onToast,
}) => {
    const { savePoint, setSavePoint, clearSavePoint } = useSavePointStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = () => {
        const viewLabel = VIEW_LABELS[currentView] || currentView;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

        let label = viewLabel;
        if (currentView === 'selfStudy' && selfStudyGuide) {
            label = `自習: ${selfStudyGuide.replace('.md', '')}`;
        } else if (currentView === 'questionList' && questionListCategory) {
            label = `問題一覧: ${questionListCategory.title}`;
        }

        // Capture ALL registered scroll containers at save time
        const scrollPositions = scrollRegistry.captureAll();

        setSavePoint({
            view: currentView,
            scrollTop: scrollPositions['main'] ?? 0, // backward compat
            scrollPositions,
            savedAt: now.toISOString(),
            label,
            questionListCategory,
            selfStudyGuide,
        });

        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
        onToast(`📌 セーブポイントを設定: ${label} (${timeStr})`, 'success');
        setDropdownOpen(false);
    };

    const handleRestore = () => {
        if (!savePoint) return;
        onRestoreView(savePoint.view, {
            questionListCategory: savePoint.questionListCategory,
            selfStudyGuide: savePoint.selfStudyGuide,
        });
        // Restore ALL scroll positions after view transition renders
        const positions = savePoint.scrollPositions ?? { main: savePoint.scrollTop };
        setTimeout(() => {
            scrollRegistry.restoreAll(positions);
        }, 300);
        onToast(`⏱ ${savePoint.label} に戻りました`, 'success');
        setDropdownOpen(false);
    };

    const handleClear = () => {
        clearSavePoint();
        onToast('セーブポイントを削除しました', 'success');
        setDropdownOpen(false);
    };

    const hasSavePoint = !!savePoint;

    // Format saved time
    const savedTimeLabel = savePoint
        ? new Date(savePoint.savedAt).toLocaleString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    return (
        <div ref={containerRef} className="relative">
            <motion.button
                onClick={() => {
                    if (!hasSavePoint) {
                        handleSave();
                    } else {
                        setDropdownOpen((prev) => !prev);
                    }
                }}
                whileTap={{ scale: 0.92 }}
                title={hasSavePoint ? `セーブポイント: ${savePoint?.label}` : '現在地をセーブ'}
                className={clsx(
                    'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all duration-300',
                    hasSavePoint
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                        : 'bg-slate-800/60 text-slate-400 border-white/[0.06] hover:bg-slate-700/60 hover:text-slate-200'
                )}
            >
                <AnimatePresence mode="wait">
                    {hasSavePoint ? (
                        <motion.span
                            key="saved"
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <Pin className="w-3.5 h-3.5 fill-amber-400" />
                        </motion.span>
                    ) : (
                        <motion.span key="unsaved" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Bookmark className="w-3.5 h-3.5" />
                        </motion.span>
                    )}
                </AnimatePresence>
                <span className="hidden sm:inline">
                    {hasSavePoint ? 'SAVE' : 'SAVE'}
                </span>

                {/* Pulse ring when saved */}
                {hasSavePoint && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-slate-950">
                        <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75" />
                    </span>
                )}

                {/* Just saved flash */}
                <AnimatePresence>
                    {justSaved && (
                        <motion.span
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.5, y: -10 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center text-amber-300 text-[9px] font-black"
                        >
                            ✓
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {dropdownOpen && hasSavePoint && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-[200]"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/[0.06] bg-slate-950/50">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">セーブポイント</span>
                            </div>
                            <div className="text-[10px] text-amber-400 font-bold truncate">{savePoint?.label}</div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">{savedTimeLabel}</div>
                        </div>

                        {/* Actions */}
                        <div className="p-2 flex flex-col gap-1">
                            <button
                                onClick={handleRestore}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-emerald-500/10 group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <div>
                                    <div className="text-[11px] font-black text-slate-200 group-hover:text-emerald-300 transition-colors">ここに戻る</div>
                                    <div className="text-[9px] text-slate-500">保存ポイントに移動</div>
                                </div>
                            </button>

                            <button
                                onClick={handleSave}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-amber-500/10 group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                                </div>
                                <div>
                                    <div className="text-[11px] font-black text-slate-200 group-hover:text-amber-300 transition-colors">現在地で上書き</div>
                                    <div className="text-[9px] text-slate-500">{VIEW_LABELS[currentView]} をセーブ</div>
                                </div>
                            </button>

                            <div className="border-t border-white/[0.04] mt-1 pt-1">
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all hover:bg-red-500/10 group w-full"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black text-slate-400 group-hover:text-red-300 transition-colors">削除</div>
                                        <div className="text-[9px] text-slate-600">セーブポイントを解除</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
