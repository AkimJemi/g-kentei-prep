import { useState } from 'react';
import { useWeakPoints } from '../hooks/useWeakPoints';
import { useQuizStore } from '../store/useQuizStore';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export const WeakPointQuizStart = ({ userId, onStart }: { userId: string, onStart: () => void }) => {
    const { data: weakPoints } = useWeakPoints(userId);
    const startWeakPointQuiz = useQuizStore(state => state.startWeakPointQuiz);
    const [isLoading, setIsLoading] = useState(false);

    if (!weakPoints || weakPoints.length === 0) return null;

    const handleStart = async () => {
        setIsLoading(true);
        const qIds = weakPoints.map(wp => wp.questionId);
        await startWeakPointQuiz(qIds);
        setIsLoading(false);
        onStart();
    };

    return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-red-500 uppercase tracking-tight">Weak Points Detected</h3>
                    <p className="text-xs text-slate-400 font-medium">
                        {weakPoints.length} questions identified needing reinforcement.
                    </p>
                </div>
            </div>
            <button 
                onClick={handleStart}
                disabled={isLoading}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
                {isLoading ? 'Loading...' : 'Start Review'}
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};
