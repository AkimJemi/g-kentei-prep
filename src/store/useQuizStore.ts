import { create } from 'zustand';
import type { QuizState } from '../types';
import { questions as allQuestions } from '../data/questions';
import { db } from '../db/db';
import { useAuthStore } from './useAuthStore';

interface ExtendedQuizState extends QuizState {
    isActive: boolean; // Track if a quiz is currently active
    startQuiz: (category: string) => Promise<void>;
    startWeakPointQuiz: (questionIds: number[]) => void;
    saveProgress: (finalScore?: number) => Promise<void>;
    endQuiz: () => void;
    discardSession: () => void;
    getActiveSessions: () => Promise<any[]>;
}

export const useQuizStore = create<ExtendedQuizState>((set, get) => ({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    showResults: false,
    answers: [],
    isActive: false,

    startQuiz: async (category: string) => {
        const filtered = category === 'All'
            ? allQuestions
            : allQuestions.filter(q => q.category === category);

        // Check for existing session
        const userId = useAuthStore.getState().currentUser?.id;
        if (!userId) return;

        const session = await db.sessions.get({ userId, category });

        if (session) {
            set({
                questions: filtered,
                currentQuestionIndex: session.currentQuestionIndex,
                score: 0,
                showResults: false,
                answers: session.answers,
                isActive: true,
            });
        } else {
            set({
                questions: filtered,
                currentQuestionIndex: 0,
                score: 0,
                showResults: false,
                answers: [],
                isActive: true,
            });
        }
    },

    startWeakPointQuiz: (questionIds: number[]) => {
        const filtered = allQuestions.filter(q => questionIds.includes(q.id));

        set({
            questions: filtered,
            currentQuestionIndex: 0,
            score: 0,
            showResults: false,
            answers: [],
            isActive: true,
        });
    },

    setAnswer: (qIndex, aIndex) => {
        set((state) => {
            const newAnswers = [...state.answers];
            newAnswers[qIndex] = aIndex;

            // Sync session to DB
            const userId = useAuthStore.getState().currentUser?.id;
            const category = state.questions[0]?.category || 'All';
            if (userId) {
                db.sessions.put({
                    userId,
                    category,
                    currentQuestionIndex: state.currentQuestionIndex,
                    answers: newAnswers,
                    lastUpdated: new Date()
                });
            }

            return { answers: newAnswers };
        });
    },

    nextQuestion: () => {
        const state = get();
        if (state.currentQuestionIndex < state.questions.length - 1) {
            const nextIndex = state.currentQuestionIndex + 1;
            set({ currentQuestionIndex: nextIndex });

            // Sync session to DB
            const userId = useAuthStore.getState().currentUser?.id;
            const category = state.questions[0]?.category || 'All';
            if (userId) {
                db.sessions.update([userId, category], {
                    currentQuestionIndex: nextIndex,
                    lastUpdated: new Date()
                });
            }
        } else {
            let score = 0;
            state.answers.forEach((ans, idx) => {
                if (ans === state.questions[idx].correctAnswer) {
                    score++;
                }
            });
            // Clear session on finish
            const userId = useAuthStore.getState().currentUser?.id;
            const category = state.questions[0]?.category || 'All';
            if (userId) {
                db.sessions.delete([userId, category]);
            }

            // Auto-save full results when finished
            const finalize = async () => {
                console.log("[Neural Store] Protocol Finished. Finalizing scores...", { score });
                await get().saveProgress(score);
                set({ showResults: true, score, isActive: false });
            };
            finalize();
        }
    },

    prevQuestion: () => {
        const state = get();
        if (state.currentQuestionIndex > 0) {
            const prevIndex = state.currentQuestionIndex - 1;
            set({ currentQuestionIndex: prevIndex });

            // Sync session to DB
            const userId = useAuthStore.getState().currentUser?.id;
            const category = state.questions[0]?.category || 'All';
            if (userId) {
                db.sessions.update([userId, category], {
                    currentQuestionIndex: prevIndex,
                    lastUpdated: new Date()
                });
            }
        }
    },

    saveProgress: async (finalScore?: number) => {
        const state = get();
        const { questions, answers, score, showResults } = state;
        const answeredCount = answers.filter(a => a !== undefined).length;

        console.log("[Neural Store] saveProgress protocol check:", { answeredCount, finalScore, currentScore: score });

        if (answeredCount > 0) {
            const wrongQuestionIds: number[] = [];
            const userAnswers: { [id: number]: number } = {};
            let localCalculatedScore = 0;

            questions.forEach((q, idx) => {
                if (answers[idx] !== undefined) {
                    userAnswers[q.id] = answers[idx];
                    if (answers[idx] === q.correctAnswer) {
                        localCalculatedScore++;
                    } else {
                        wrongQuestionIds.push(q.id);
                    }
                }
            });

            const scoreToPersist = finalScore !== undefined ? finalScore : (showResults ? score : localCalculatedScore);

            try {
                const userId = useAuthStore.getState().currentUser?.id;
                if (!userId) {
                    console.warn("[Neural Store] Link Aborted: Primary identifier (userId) not detected");
                    return;
                }

                console.log("[Neural Store] Syncing attempts to SQLite infrastructure...", { userId, score: scoreToPersist });
                await db.attempts.add({
                    userId,
                    date: new Date(),
                    score: scoreToPersist,
                    totalQuestions: questions.length,
                    category: questions[0]?.category || 'All',
                    wrongQuestionIds,
                    userAnswers
                });
                console.log("[Neural Store] Neural Record Synchronized successfully.");
            } catch (err) {
                console.error("[Neural Store] Synchronization failure:", err);
            }
        } else {
            console.log("[Neural Store] Sync bypassed: Insufficient data points detected.");
        }
    },

    endQuiz: () => {
        set({ isActive: false, showResults: false });
    },

    discardSession: () => {
        const state = get();
        const userId = useAuthStore.getState().currentUser?.id;
        const category = state.questions[0]?.category || 'All';
        if (userId) {
            db.sessions.delete([userId, category]);
        }
        set({
            isActive: false,
            showResults: false,
            currentQuestionIndex: 0,
            answers: [],
            score: 0
        });
    },

    resetQuiz: () => {
        const state = get();
        const userId = useAuthStore.getState().currentUser?.id;
        const category = state.questions[0]?.category || 'All';
        if (userId) {
            db.sessions.delete([userId, category]);
        }

        set({
            currentQuestionIndex: 0,
            score: 0,
            showResults: false,
            answers: [],
            isActive: true
        });
    },

    getActiveSessions: async () => {
        const userId = useAuthStore.getState().currentUser?.id;
        if (!userId) return [];
        return await db.sessions.where('userId').equals(userId).toArray();
    }
}));
