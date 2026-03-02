import React, { useState, useEffect, useRef } from 'react';
import { useLanguageStore } from '../store/useLanguageStore';
import { useAuthStore } from '../store/useAuthStore';
import { ChevronLeft, Save, Book, FileText, Loader2, PanelsTopLeft, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { Toast } from './Toast';
import { scrollRegistry } from '../utils/scrollRegistry';

interface SelfStudyViewProps {
    onBack: () => void;
    initialGuide?: string | null;
    onGuideChange?: (guide: string | null) => void;
    initialScrollTop?: number; // restore scroll after content loads
}

export const SelfStudyView: React.FC<SelfStudyViewProps> = ({ onBack, initialGuide, onGuideChange, initialScrollTop }) => {
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
    const [showToc, setShowToc] = useState(true);

    // Table of Contents
    interface TocItem { id: string; text: string; level: number; }
    const [toc, setToc] = useState<TocItem[]>([]);
    const [activeTocId, setActiveTocId] = useState<string | null>(null);

    const markdownContainerRef = useRef<HTMLDivElement>(null);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Holds a scroll position to apply after the next content load completes
    const pendingScrollRef = useRef<number | null>(initialScrollTop ?? null);

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
                // Use initialGuide if provided (from save point restore), otherwise default to first
                const guideToSelect = initialGuide && data.includes(initialGuide)
                    ? initialGuide
                    : data.length > 0 ? data[0] : null;
                if (guideToSelect) {
                    handleSelectGuide(guideToSelect);
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
        onGuideChange?.(filename);
        try {
            setIsLoadingContent(true);
            // Fetch content
            const resContent = await fetch(`/api/study-guides/${filename}`);
            if (!resContent.ok) throw new Error('Failed to load content');
            const dataContent = await resContent.json();
            setContent(dataContent.content);

            // Build Table of Contents from headings
            const headingRegex = /^(#{1,3})\s+(.+)$/gm;
            const items: TocItem[] = [];
            let match;
            while ((match = headingRegex.exec(dataContent.content)) !== null) {
                const level = match[1].length;
                const text = match[2].trim().replace(/[*_`]/g, '');
                const id = text
                    .toLowerCase()
                    .replace(/[^\w\u3000-\u9fff\uff00-\uffef]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                items.push({ id, text, level });
            }
            setToc(items);
            setActiveTocId(items[0]?.id ?? null);

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
            // Apply pending scroll restoration AFTER content renders
            if (pendingScrollRef.current !== null) {
                const targetTop = pendingScrollRef.current;
                pendingScrollRef.current = null; // consume it (only apply once)
                // RAF+timeout ensures the DOM has repainted with new content
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (markdownContainerRef.current) {
                            markdownContainerRef.current.scrollTop = targetTop;
                        }
                    }, 50);
                });
            }
        }
    };

    const saveNotes = async (contentToSave: string, documentId: string, showSuccessToast: boolean = true) => {
        if (!currentUser?.userId) {
            console.warn("[Neural Link] Save aborted: Authenticated session required.");
            return;
        }
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

    // User switch sync effect:
    // If user logs in/out or switches, we must reload or clear the notes for the current document
    useEffect(() => {
        const syncNotes = async () => {
            if (!selectedGuide) return;

            if (currentUser?.userId) {
                try {
                    const resNotes = await fetch(`/api/notes/${currentUser.userId}/${selectedGuide}`);
                    if (resNotes.ok) {
                        const notesData = await resNotes.json();
                        setNotes(notesData.noteContent || '');
                    } else {
                        setNotes('');
                    }
                } catch (e) {
                    console.error("Failed to sync notes on user change", e);
                    setNotes('');
                }
            } else {
                setNotes(''); // Clear notes when logged out
            }
        };

        syncNotes();
    }, [currentUser?.userId, selectedGuide]);

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

    // Register the markdown content panel in the global scroll registry
    useEffect(() => {
        scrollRegistry.register('selfStudy-markdown', {
            getScrollTop: () => markdownContainerRef.current?.scrollTop ?? 0,
            setScrollTop: (top) => {
                if (markdownContainerRef.current) markdownContainerRef.current.scrollTop = top;
            },
        });
        return () => scrollRegistry.unregister('selfStudy-markdown');
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
                        <List className="w-4 h-4" />
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
                            ) : (() => {
                                // Separate main guides from summary guides (_概要.md)
                                const mainGuides = guides.filter(g => !g.includes('_概要.'));
                                const summaryGuides = guides.filter(g => g.includes('_概要.'));
                                let mainIndex = 0;
                                return mainGuides.map((guide) => {
                                    const shortcut = getShortcutLabel(mainIndex++);
                                    // Find corresponding summary file
                                    const base = guide.replace('.md', '');
                                    const summaryFile = summaryGuides.find(s => s.startsWith(base + '_概要'));

                                    return (
                                        <div key={guide} className="flex flex-col gap-0.5">
                                            <button
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

                                            {/* Summary sub-button */}
                                            {summaryFile && (
                                                <button
                                                    onClick={() => handleSelectGuide(summaryFile)}
                                                    className={clsx(
                                                        "ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all border text-[10px] font-bold",
                                                        selectedGuide === summaryFile
                                                            ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                                                            : "bg-slate-900/30 border-white/[0.03] text-slate-500 hover:bg-slate-800/60 hover:text-violet-400"
                                                    )}
                                                >
                                                    <span className="text-[8px] opacity-60">📋</span>
                                                    <span>概要・用語集</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
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
                            <div className="flex items-center gap-2">
                                {/* TOC Toggle */}
                                <button
                                    onClick={() => setShowToc(!showToc)}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-all border flex items-center gap-2",
                                        showToc
                                            ? "bg-violet-500/15 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                    )}
                                    title="目次を表示/非表示"
                                >
                                    <span className="text-[10px] font-black tracking-widest uppercase hidden sm:block pl-1">TOC</span>
                                    <List className="w-4 h-4" />
                                </button>
                                {/* Notes Toggle */}
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
                        </div>

                        {/* TOC Panel */}
                        <AnimatePresence>
                            {showToc && toc.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden shrink-0 border-b border-violet-500/10 bg-slate-950/80"
                                >
                                    <div className="flex flex-wrap gap-1 p-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {toc.map(item => (
                                            <button
                                                key={`${item.id}-${item.level}`}
                                                onClick={() => {
                                                    const el = document.getElementById(`heading-${item.id}`);
                                                    if (el && markdownContainerRef.current) {
                                                        markdownContainerRef.current.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
                                                        setActiveTocId(item.id);
                                                    }
                                                }}
                                                className={clsx(
                                                    'flex items-center gap-1 px-2 py-1 rounded-lg text-left transition-all border text-[10px] font-bold leading-tight',
                                                    item.level === 1 && 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15',
                                                    item.level === 2 && 'ml-2 border-blue-500/15 bg-blue-500/5 hover:bg-blue-500/15',
                                                    item.level === 3 && 'ml-4 border-slate-600/20 bg-slate-800/40 hover:bg-slate-700/40',
                                                    activeTocId === item.id
                                                        ? 'text-violet-300 border-violet-400/40 bg-violet-500/20'
                                                        : item.level === 1 ? 'text-violet-400/80'
                                                            : item.level === 2 ? 'text-blue-400/70'
                                                                : 'text-slate-400'
                                                )}
                                            >
                                                <span className="text-[8px] opacity-40 shrink-0">
                                                    {item.level === 1 ? '▶' : item.level === 2 ? '▷' : '·'}
                                                </span>
                                                <span className="line-clamp-2">{item.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ children }) => {
                                                const text = String(children).replace(/[*_`]/g, '');
                                                const id = text.toLowerCase().replace(/[^\w\u3000-\u9fff\uff00-\uffef]+/g, '-').replace(/^-+|-+$/g, '');
                                                return <h1 id={`heading-${id}`} className="scroll-mt-4">{children}</h1>;
                                            },
                                            h2: ({ children }) => {
                                                const text = String(children).replace(/[*_`]/g, '');
                                                const id = text.toLowerCase().replace(/[^\w\u3000-\u9fff\uff00-\uffef]+/g, '-').replace(/^-+|-+$/g, '');
                                                return <h2 id={`heading-${id}`} className="scroll-mt-4">{children}</h2>;
                                            },
                                            h3: ({ children }) => {
                                                const text = String(children).replace(/[*_`]/g, '');
                                                const id = text.toLowerCase().replace(/[^\w\u3000-\u9fff\uff00-\uffef]+/g, '-').replace(/^-+|-+$/g, '');
                                                return <h3 id={`heading-${id}`} className="scroll-mt-4">{children}</h3>;
                                            },
                                        }}
                                    >
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
