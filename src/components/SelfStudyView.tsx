import React, { useState, useEffect, useRef } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { ChevronLeft, Save, Book, FileText, Loader2, PanelsTopLeft, ListTree } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { Toast } from './Toast'; // Assuming you have Toast component exported from Toast.tsx

interface SelfStudyViewProps {
    onBack: () => void;
}

export const SelfStudyView: React.FC<SelfStudyViewProps> = ({ onBack }) => {
    const { t } = useLanguageStore();
    const currentUser = useAuthStore((state) => state.currentUser);

    const [guides, setGuides] = useState<string[]>([]);
    const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
    const [content, setContent] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Toggle for Layouts
    const [showNotes, setShowNotes] = useState(true);
    const [showSectors, setShowSectors] = useState(true);

    const markdownContainerRef = useRef<HTMLDivElement>(null);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: null }), 3000);
    };

    useEffect(() => {
        const fetchGuides = async () => {
            try {
                setIsLoadingList(true);
                const res = await fetch('/api/study-guides');
                if (!res.ok) throw new Error('Failed to fetch guide list');
                const data = await res.json();
                setGuides(data);
                if (data.length > 0) {
                    handleSelectGuide(data[0]);
                }
            } catch (error) {
                console.error("Error fetching guides:", error);
                showToast('学習資料の取得に失敗しました', 'error');
            } finally {
                setIsLoadingList(false);
            }
        };
        fetchGuides();
    }, []);

    const handleSelectGuide = async (filename: string) => {
        setSelectedGuide(filename);
        try {
            setIsLoadingContent(true);
            // Fetch content
            const resContent = await fetch(`/api/study-guides/${filename}`);
            if (!resContent.ok) throw new Error('Failed to load content');
            const dataContent = await resContent.json();
            setContent(dataContent.content);

            // Fetch user specfic notes
            if (currentUser?.userId) {
                const resNotes = await fetch(`/api/notes/${currentUser.userId}/${filename}`);
                if (resNotes.ok) {
                    const notesData = await resNotes.json();
                    setNotes(notesData.noteContent || '');
                }
            } else {
                setNotes('');
            }

        } catch (error) {
            console.error("Error loading guide or notes:", error);
            showToast('テキストの読み込みに失敗しました', 'error');
            setContent('');
            setNotes('');
        } finally {
            setIsLoadingContent(false);
        }
    };

    const saveNotes = async (contentToSave: string, documentId: string, showSuccessToast: boolean = true) => {
        if (!currentUser?.userId) return;
        try {
            setIsSaving(true);
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.userId,
                    documentId: documentId,
                    noteContent: contentToSave
                })
            });
            if (!res.ok) throw new Error('Failed to save notes');
            if (showSuccessToast) {
                showToast('メモを保存しました', 'success');
            }
        } catch (error) {
            console.error("Error saving notes:", error);
            showToast('メモの保存に失敗しました', 'error');
        } finally {
            setTimeout(() => setIsSaving(false), 500); // Small delay for UX
        }
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);

        // Auto save with debounce
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            if (selectedGuide) {
                saveNotes(newNotes, selectedGuide, false);
            }
        }, 2000); // Auto-save after 2 seconds of inactivity
    };

    // cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    // Keyboard navigation for sectors
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is in an input or textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            if (e.key === 'b' || e.key === 'B' || e.key === 'Escape') {
                e.preventDefault();
                onBack();
                return;
            }

            if (guides.length === 0 || !selectedGuide) return;

            const currentIndex = guides.indexOf(selectedGuide);
            if (currentIndex === -1) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (currentIndex < guides.length - 1) {
                    handleSelectGuide(guides[currentIndex + 1]);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentIndex > 0) {
                    handleSelectGuide(guides[currentIndex - 1]);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (markdownContainerRef.current) {
                    markdownContainerRef.current.scrollBy({ top: 200, behavior: 'auto' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (markdownContainerRef.current) {
                    markdownContainerRef.current.scrollBy({ top: -200, behavior: 'auto' });
                }
            } else {
                // Toggles for panels: "[" for Sectors, "]" for Notes
                if (e.key === '[') {
                    e.preventDefault();
                    setShowSectors(prev => !prev);
                    return;
                }
                if (e.key === ']') {
                    e.preventDefault();
                    setShowNotes(prev => !prev);
                    return;
                }

                // Check for number shortcuts: 1, 2, ..., 9, 0, -
                const shortcutKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'];
                const shortcutIndex = shortcutKeys.indexOf(e.key);

                if (shortcutIndex !== -1 && shortcutIndex < guides.length) {
                    e.preventDefault();
                    handleSelectGuide(guides[shortcutIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [guides, selectedGuide, onBack]);

    // Map index to shortcut label
    const getShortcutLabel = (index: number) => {
        if (index < 9) return String(index + 1);
        if (index === 9) return '0';
        if (index === 10) return '-';
        return '';
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-[1400px] mx-auto px-4 md:px-6 h-[calc(100vh-140px)] flex flex-col"
        >
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('back') || '戻る'}</span>
                        <span className="hidden xl:inline text-[8px] font-black text-slate-500 group-hover:text-slate-300 transition-colors">[B / Esc]</span>
                    </button>
                    <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white flex items-center gap-3">
                        <Book className="w-6 h-6 text-emerald-500" />
                        SELF STUDY <span className="text-emerald-500">MODE</span>
                    </h1>
                    <button
                        onClick={() => setShowSectors(!showSectors)}
                        className={clsx(
                            "ml-4 p-2 rounded-xl transition-all border flex items-center gap-2 group/toggle",
                            showSectors
                                ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        )}
                        title={showSectors ? "リストを非表示" : "リストを表示"}
                    >
                        <ListTree className="w-4 h-4" />
                        <span className="text-xs font-bold hidden sm:block">リスト</span>
                        <div className="hidden sm:flex items-center justify-center w-5 h-5 rounded bg-slate-900 border border-white/10 text-[10px] font-black text-slate-500 ml-1">
                            [
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">

                {/* Sidebar: Document List */}
                <AnimatePresence initial={false}>
                    {showSectors && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "16rem", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar overflow-hidden"
                        >
                            {isLoadingList ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                                </div>
                            ) : (
                                guides.map((guide, index) => {
                                    const shortcut = getShortcutLabel(index);

                                    return (
                                        <button
                                            key={guide}
                                            onClick={() => handleSelectGuide(guide)}
                                            className={clsx(
                                                "flex items-center justify-between p-4 rounded-xl text-left transition-all border shrink-0 group/btn",
                                                selectedGuide === guide
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                    : "bg-slate-900/50 border-white/[0.04] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <FileText className={clsx("w-4 h-4 shrink-0 transition-colors", selectedGuide === guide ? "text-emerald-500" : "text-slate-500 group-hover/btn:text-emerald-500/50")} />
                                                <span className="text-xs font-bold truncate">
                                                    {guide.replace('.md', '')}
                                                </span>
                                            </div>

                                            {shortcut && (
                                                <div className={clsx(
                                                    "w-5 h-5 rounded flex justify-center items-center text-[10px] font-black shrink-0 transition-all",
                                                    selectedGuide === guide
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "bg-slate-800 text-slate-500 border border-white/5 opacity-0 group-hover/btn:opacity-100"
                                                )}>
                                                    {shortcut}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area: Split View */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 bg-slate-900/30 rounded-3xl border border-white/[0.04] p-1 overflow-hidden">

                    {/* Left Box: Markdown Content */}
                    <div className="flex-1 flex flex-col bg-slate-950 rounded-2xl border border-white/[0.02] overflow-hidden min-h-0">
                        <div className="p-4 border-b border-white/[0.04] bg-slate-900/50 flex items-center justify-between shrink-0">
                            <h2 className="text-sm font-black text-slate-300 flex items-center gap-2">
                                <Book className="w-4 h-4 text-slate-500" />
                                {selectedGuide ? selectedGuide.replace('.md', '') : 'テキストを選択'}
                            </h2>
                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all border flex items-center gap-2",
                                    showNotes
                                        ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                )}
                                title={showNotes ? "メモを非表示" : "メモを表示"}
                            >
                                <span className="text-[10px] font-black tracking-widest uppercase hidden sm:block pl-1">Note</span>
                                <div className="hidden sm:flex items-center justify-center w-5 h-5 rounded bg-slate-900 border border-white/10 text-[10px] font-black text-slate-500">
                                    ]
                                </div>
                                <PanelsTopLeft className="w-4 h-4" />
                            </button>
                        </div>
                        <div ref={markdownContainerRef} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                            {isLoadingContent ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                            ) : content ? (
                                <div className="prose prose-invert prose-emerald max-w-none prose-sm md:prose-base 
                            prose-headings:font-black prose-headings:tracking-tight 
                            prose-a:text-emerald-400 hover:prose-a:text-emerald-300
                            prose-code:bg-slate-800 prose-code:text-emerald-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                            prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800"
                                >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                    テキストがありません
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Box: Notes Area */}
                    {showNotes && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex-1 lg:max-w-md flex flex-col bg-slate-950 rounded-2xl border border-white/[0.02] overflow-hidden min-h-0"
                        >
                            <div className="p-4 border-b border-white/[0.04] bg-slate-900/50 flex items-center justify-between shrink-0">
                                <h2 className="text-sm font-black text-slate-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-500" />
                                    学習メモ {selectedGuide ? `(${selectedGuide.replace('.md', '')})` : ''}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <AnimatePresence>
                                        {isSaving && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"
                                            >
                                                <Loader2 className="w-3 h-3 animate-spin" /> Saving
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <button
                                        onClick={() => selectedGuide && saveNotes(notes, selectedGuide, true)}
                                        disabled={!selectedGuide || isSaving}
                                        className={clsx(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            selectedGuide && !isSaving
                                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent"
                                        )}
                                    >
                                        <Save className="w-3 h-3" />
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 p-4 flex flex-col">
                                {currentUser ? (
                                    <textarea
                                        value={notes}
                                        onChange={handleNotesChange}
                                        disabled={!selectedGuide || isLoadingContent}
                                        placeholder={selectedGuide ? "ここにメモを入力... (自動保存されます)" : "左側からテキストを選択してください"}
                                        className="flex-1 w-full bg-transparent text-slate-300 text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar custom-placeholder"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                                            <span className="text-2xl">🔒</span>
                                        </div>
                                        <p className="text-slate-400 text-sm font-bold">ログイン後使用可能</p>
                                        <p className="text-slate-600 text-xs">学習メモの保存にはログインが必要です</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {toast.type && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast({ message: '', type: null })}
                    />
                )}
            </AnimatePresence>
            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-placeholder::placeholder {
            color: #475569;
            font-style: italic;
        }
      `}} />
        </motion.div>
    );
};
