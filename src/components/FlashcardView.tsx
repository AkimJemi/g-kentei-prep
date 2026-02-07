import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react';
import clsx from 'clsx';

interface Flashcard {
    id: number;
    category: string;
    question: string;
    answer: string;
    explanation: string;
}

export const FlashcardView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/questions')
            .then(res => res.json())
            .then(data => {
                // Convert questions to simple flashcards
                const formatted = (data.data || data).map((q: any) => ({
                    id: q.id,
                    category: q.category,
                    question: q.question,
                    answer: q.options[q.correctAnswer],
                    explanation: q.explanation
                }));
                // Shuffle cards
                setCards(formatted.sort(() => Math.random() - 0.5));
                setIsLoading(false);
            })
            .catch(console.error);
    }, []);

    const handleFlip = () => setIsFlipped(!isFlipped);
    
    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % cards.length);
        }, 150);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);
        }, 150);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') handleFlip();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onBack();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cards, currentIndex, isFlipped]);

    if (isLoading) return <div className="p-12 text-center animate-pulse text-accent font-black uppercase tracking-widest">Neural Memory Loading...</div>;

    const currentCard = cards[currentIndex];

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-24 h-[calc(100vh-200px)] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                    <X className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">記憶終了 (Exit)</span>
                </button>
                <div className="flex items-center gap-4">
                    <Brain className="w-5 h-5 text-accent" />
                    <span className="text-xs font-bold text-slate-400">CARD {currentIndex + 1} / {cards.length}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-12">
                <div 
                    className="relative w-full max-w-2xl aspect-[1.6/1] cursor-pointer group perspective-1000"
                    onClick={handleFlip}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isFlipped ? 'back' : 'front'}
                            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className={clsx(
                                "absolute inset-0 w-full h-full rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl border-2 backface-hidden",
                                isFlipped 
                                    ? "bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border-emerald-500/30" 
                                    : "bg-gradient-to-br from-slate-900 via-secondary/20 to-slate-950 border-white/[0.05] group-hover:border-accent/30"
                            )}
                        >
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                {isFlipped ? 'CORRECT_DATA' : `SECTOR: ${currentCard?.category || 'UNKNOWN'}`}
                            </div>

                            <div className="space-y-6">
                                <h3 className={clsx(
                                    "font-black italic tracking-tighter uppercase leading-tight",
                                    isFlipped ? "text-3xl text-emerald-400" : "text-3xl text-white"
                                )}>
                                    {isFlipped ? currentCard?.answer : currentCard?.question}
                                </h3>
                                
                                {isFlipped && (
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-md mx-auto line-clamp-4">
                                        {currentCard?.explanation}
                                    </p>
                                )}
                            </div>

                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-600">
                                <RotateCw className="w-3 h-3 animate-spin-slow" />
                                <span className="text-[8px] font-black uppercase tracking-widest">[Space to flip]</span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-8">
                    <button 
                        onClick={handlePrev}
                        className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all hover:scale-110"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    
                    <button 
                        onClick={handleFlip}
                        className="px-12 py-5 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95"
                    >
                        {isFlipped ? 'NEXT (次へ)' : 'REVEAL (回答表示)'}
                    </button>

                    <button 
                        onClick={handleNext}
                        className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all hover:scale-110"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex gap-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    <span>← PREV</span>
                    <span className="w-1 h-1 rounded-full bg-slate-800" />
                    <span>SPACE : FLIP</span>
                    <span className="w-1 h-1 rounded-full bg-slate-800" />
                    <span>NEXT →</span>
                </div>
            </div>
        </div>
    );
};
