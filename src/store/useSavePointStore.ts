import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SaveableView =
    | 'dashboard'
    | 'study'
    | 'studySector'
    | 'selfStudy'
    | 'history'
    | 'quiz'
    | 'stats'
    | 'admin'
    | 'contact'
    | 'submit'
    | 'notifications'
    | 'flashcards'
    | 'questionList';

export interface SavePoint {
    view: SaveableView;
    scrollTop: number;          // legacy: main container
    scrollPositions: Record<string, number>; // all registered scroll containers
    savedAt: string; // ISO string
    label: string;   // 表示ラベル
    // 付随状態
    questionListCategory?: { id: string; title: string } | null;
    selfStudyGuide?: string | null;
}

interface SavePointStore {
    savePoint: SavePoint | null;
    setSavePoint: (point: SavePoint) => void;
    clearSavePoint: () => void;
}

export const useSavePointStore = create<SavePointStore>()(
    persist(
        (set) => ({
            savePoint: null,
            setSavePoint: (point) => set({ savePoint: point }),
            clearSavePoint: () => set({ savePoint: null }),
        }),
        {
            name: 'g-kentei-savepoint',
        }
    )
);

// View の日本語ラベルマップ
export const VIEW_LABELS: Record<SaveableView, string> = {
    dashboard: 'ホーム',
    study: '学習モード',
    studySector: 'セクター選択',
    selfStudy: '自習モード',
    history: '履歴',
    quiz: 'クイズ',
    stats: '統計',
    admin: '管理',
    contact: 'お問い合わせ',
    submit: '問題投稿',
    notifications: '通知',
    flashcards: 'フラッシュカード',
    questionList: '問題一覧',
};
