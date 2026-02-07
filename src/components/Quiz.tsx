import React, { useEffect, useState } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { CheckCircle2, XCircle, RefreshCw, AlertCircle, Award, ChevronLeft, ChevronRight, LogOut, Terminal, Cpu, Volume2, VolumeX, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface QuizProps {
    onBack: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ onBack }) => {
  const { 
    questions, 
    currentQuestionIndex, 
    score, 
    showResults, 
    answers, 
    setAnswer, 
    nextQuestion, 
    prevQuestion,
    resetQuiz,
    isActive,
    endQuiz
  } = useQuizStore();

  const { t } = useLanguageStore();
  const [isReading, setIsReading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(questions.length * 60); // 60 seconds per question
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    if (!timerActive || showResults || timeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, showResults, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !showResults) {
        setTimerActive(false);
        // Force finish when time up? Or just show 0? 
        // For now, let's keep it visible at 0.
    }
  }, [timeLeft, showResults]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  
  const localizedContent = currentQuestion?.translations?.ja 
    ? currentQuestion.translations.ja 
    : { 
        question: currentQuestion?.question, 
        options: currentQuestion?.options, 
        explanation: currentQuestion?.explanation,
        category: currentQuestion?.category
    };

  const selectedAnswer = (answers as (number | undefined)[])[currentQuestionIndex];
  const hasAnswered = selectedAnswer !== undefined;
  const isCorrect = hasAnswered && selectedAnswer === currentQuestion?.correctAnswer;

  const handleReadAloud = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    if (!currentQuestion) return;

    const textToRead = `${localizedContent.question}。 ${t('options')} ${localizedContent.options.join('、')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Set language for voice
    // Set language for voice
    utterance.lang = 'ja-JP';

    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    window.speechSynthesis.speak(utterance);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResults) return;

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
          const optionIndex = parseInt(e.key) - 1;
          if (!hasAnswered) setAnswer(currentQuestionIndex, optionIndex);
          break;
        case 'ArrowRight':
        case 'Enter':
          if (hasAnswered) nextQuestion();
          break;
        case 'ArrowLeft':
          prevQuestion();
          break;
        case 'v':
        case 'V':
          handleReadAloud();
          break;
        case 'r':
        case 'R':
          resetQuiz();
          break;
        case 'b':
        case 'B':
        case 'Escape':
          handleQuit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, answers, showResults, hasAnswered]);

  const handleQuit = () => {
    // Just end the quiz status without saving to History (attempts table)
    // The session is already saved in DB per-answer/step in useQuizStore
    if (isActive) {
        endQuiz();
    }
    onBack();
  };

  if (showResults) {
    return (
        <QuizResults 
            score={score} 
            total={questions.length} 
            onRetry={resetQuiz} 
            onBack={onBack}
            t={t}
        />
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="max-w-3xl mx-auto py-4 md:py-8 px-2 md:px-0 pb-32 md:pb-8">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-8 overflow-hidden">
            <motion.button 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={handleQuit}
                className="flex items-center space-x-2 text-slate-500 hover:text-white transition-colors group px-2 py-1"
            >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden xs:inline">{t('abort_scan')}</span>
                <span className="text-[8px] font-black text-slate-700 hidden sm:inline ml-1">[B / Esc]</span>
            </motion.button>
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full"
            >
                <button 
                    disabled={currentQuestionIndex === 0}
                    onClick={prevQuestion}
                    className="p-1 rounded-lg text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.2em] px-1 md:px-2 flex items-center gap-2 md:gap-4 shrink-0">
                    <div className="hidden xs:flex items-center gap-1 md:gap-2 max-w-[80px] md:max-w-none truncate">
                        <Terminal className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{localizedContent.category || 'Neural Scan'}</span>
                    </div>
                    <div className={clsx(
                        "flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-lg border",
                        timeLeft < 60 ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse" : "bg-slate-800 border-slate-700 text-slate-300"
                    )}>
                        <Clock className="w-3 h-3" />
                        <span className="font-mono text-[10px] md:text-sm">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                <button 
                    disabled={!hasAnswered || currentQuestionIndex === questions.length - 1}
                    onClick={nextQuestion}
                    className="p-1 rounded-lg text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                <span className="text-accent flex items-center gap-2">
                    <Cpu className="w-3 h-3" />
                    {t('question')} {currentQuestionIndex + 1}
                </span>
                <span>{Math.round(((currentQuestionIndex) / questions.length) * 100)}% 進行度</span>
            </div>
            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-accent shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                />
            </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
            <motion.div 
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="bg-secondary/20 backdrop-blur-md border border-slate-800 rounded-3xl p-5 md:p-10 shadow-2xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[80px] -z-10 translate-x-32 -translate-y-32" />
                
                <div className="mb-10 relative">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="inline-block px-3 py-1 rounded-lg bg-accent/10 text-accent text-[9px] font-black tracking-[0.2em] uppercase border border-accent/20">
                            分野: {localizedContent.category}
                        </span>
                        <div className="h-[1px] flex-grow bg-slate-800/50" />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl md:text-3xl font-black italic tracking-tighter text-white leading-tight uppercase flex-grow">
                            {localizedContent.question}
                        </h2>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleReadAloud}
                            className={clsx(
                                "p-2 md:p-3 rounded-2xl border transition-all shrink-0 self-start",
                                isReading 
                                    ? "bg-accent/20 border-accent text-accent animate-pulse" 
                                    : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-accent hover:border-accent/50"
                            )}
                            title="Read Aloud"
                        >
                            <div className="flex flex-col items-center gap-1">
                                {isReading ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                <span className="hidden md:block text-[8px] font-black text-accent/60">[V]</span>
                            </div>
                        </motion.button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {localizedContent.options.map((option: string, idx: number) => {
                        const isSelected = selectedAnswer === idx;
                        const isThisCorrect = idx === currentQuestion?.correctAnswer;
                        const showWrong = hasAnswered && isSelected && idx !== currentQuestion?.correctAnswer;
                        
                        return (
                            <motion.button
                                key={idx}
                                initial={false}
                                animate={showWrong ? { x: [-5, 5, -5, 5, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                onClick={() => !hasAnswered && setAnswer(currentQuestionIndex, idx)}
                                disabled={hasAnswered}
                                className={clsx(
                                    "w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between relative overflow-hidden active:scale-[0.98] min-h-[64px]",
                                    hasAnswered 
                                        ? isThisCorrect 
                                            ? "border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                                            : showWrong 
                                                ? "border-red-500/50 bg-red-500/10 text-red-500" 
                                                : "border-transparent bg-slate-900/50 text-slate-600 opacity-60 scale-95"
                                        : isSelected
                                            ? "border-accent bg-accent/10 text-white shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                                            : "border-slate-800/50 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                                )}
                            >
                                <span className="font-bold tracking-tight text-sm md:text-base relative z-10">{option}</span>
                                <div className="relative z-10 flex items-center gap-2">
                                    {(hasAnswered && isThisCorrect) && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                    {showWrong && <XCircle className="w-5 h-5 text-red-500" />}
                                    <div className="text-[10px] font-black text-slate-600">
                                        [{idx + 1}]
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {hasAnswered && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, y: 20 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            className="mt-12 space-y-8"
                        >
                            <div className={clsx("p-6 rounded-2xl flex items-start gap-6 relative overflow-hidden", isCorrect ? "bg-green-500/5 border border-green-500/10" : "bg-red-500/5 border border-red-500/10")}>
                                <div className={clsx("p-3 rounded-xl shrink-0", isCorrect ? "bg-green-500/10" : "bg-red-500/10")}>
                                    <AlertCircle className={clsx("w-6 h-6", isCorrect ? "text-green-500" : "text-red-500")} />
                                </div>
                                <div className="space-y-2">
                                    <p className={clsx("text-xl font-black italic uppercase tracking-tighter leading-none", isCorrect ? "text-green-500" : "text-red-500")}>
                                        {isCorrect ? t('verified') : t('breached')}
                                    </p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-3 bg-accent rounded-full" />
                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest">{t('root_analysis')}</h4>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                        {localizedContent.explanation}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <motion.button
                                    whileHover={{ x: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={prevQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>{t('prev_phase')}</span>
                                    <span className="text-[8px] font-black text-slate-600 ml-1">[←]</span>
                                </motion.button>
                                <motion.button
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={nextQuestion}
                                    className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-accent text-primary font-black uppercase tracking-widest text-xs hover:bg-sky-400 transition-colors"
                                >
                                    <span>{currentQuestionIndex === questions.length - 1 ? t('verified') : t('next_phase')}</span>
                                    <ChevronRight className="w-4 h-4" />
                                    <span className="text-[8px] font-black text-primary/40 ml-1">[Enter/→]</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    </div>
  );
};

const QuizResults: React.FC<{ score: number, total: number, onRetry: () => void, onBack: () => void, t: (k: string) => string }> = ({ score, total, onRetry, onBack, t }) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl mx-auto py-12 text-center space-y-12"
      >
        <div className="space-y-6">
          <motion.div 
            initial={{ rotate: -20, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 1 }}
            className="inline-flex items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-full shadow-2xl relative"
          >
             <div className="absolute inset-0 bg-accent/10 blur-[40px] rounded-full animate-pulse" />
             <AwardBadge score={score} total={total} />
          </motion.div>
          <div className="space-y-2">
              <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">{t('scan_complete')}</h2>
              <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">G検定 模擬試験終了</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
             <div className="bg-secondary/20 p-6 rounded-3xl border border-slate-800 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-[20px] rounded-full" />
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">正答率</div>
                <div className="text-4xl font-black font-mono text-emerald-500 italic">
                    {Math.round((score / total) * 100)}%
                </div>
             </div>
             <div className="bg-secondary/20 p-6 rounded-3xl border border-slate-800 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 blur-[20px] rounded-full" />
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">問題数</div>
                <div className="text-4xl font-black font-mono text-white italic">
                    {total}
                </div>
             </div>
        </div>

        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="w-full py-4 bg-accent text-primary font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-accent/20 flex items-center justify-center gap-3"
        >
            <RefreshCw className="w-5 h-5" />
            <span>{t('reset')}</span>
            <span className="text-[10px] font-black text-primary/40">[R]</span>
        </motion.button>
        
        <motion.button
            whileHover={{ scale: 1.02, opacity: 0.8 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-700 hover:text-white flex items-center justify-center gap-3"
        >
            <LogOut className="w-5 h-5" />
            <span>{t('return_to_base')}</span>
            <span className="text-[10px] font-black text-slate-500">[B]</span>
        </motion.button>
      </motion.div>
    );
};

const AwardBadge: React.FC<{ score: number, total: number }> = ({ score, total }) => {
    const percentage = (score / total) * 100;
    if (percentage === 100) return <Award className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />;
    if (percentage >= 80) return <Award className="w-20 h-20 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]" />; 
    if (percentage >= 60) return <Award className="w-20 h-20 text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]" />; 
    return <Award className="w-20 h-20 text-slate-700 grayscale" />;
};
