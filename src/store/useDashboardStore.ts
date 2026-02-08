import { create } from 'zustand';

interface DashboardStats {
    attempts: number;
    avgAccuracy: number;
    weakQuestionIds: number[];
    rank: string;
    activeSessions: any[];
    totalQuestions: number;
}

interface DashboardState {
    stats: DashboardStats;
    initialDataLoaded: boolean;
    setStats: (stats: Partial<DashboardStats>) => void;
    setInitialDataLoaded: (loaded: boolean) => void;
    reset: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    stats: {
        attempts: 0,
        avgAccuracy: 0,
        weakQuestionIds: [],
        rank: 'Beginner',
        activeSessions: [],
        totalQuestions: 0
    },
    initialDataLoaded: false,
    setStats: (newStats) => set((state) => ({
        stats: { ...state.stats, ...newStats }
    })),
    setInitialDataLoaded: (loaded) => set({ initialDataLoaded: loaded }),
    reset: () => set({
        stats: {
            attempts: 0,
            avgAccuracy: 0,
            weakQuestionIds: [],
            rank: 'Beginner',
            activeSessions: [],
            totalQuestions: 0
        },
        initialDataLoaded: false
    })
}));
