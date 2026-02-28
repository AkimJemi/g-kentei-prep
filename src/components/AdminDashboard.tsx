/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { db, type User, type QuizAttempt } from '../db/db';
import { normalizeKeys } from '../utils/normalize';

import { motion } from 'framer-motion';
import { Users, BarChart3, ShieldAlert, Trash2, UserCog, TrendingUp, Activity, Database, RefreshCw, Search, ChevronLeft, ChevronRight, ArrowUpDown, Clock, CheckSquare, Plus } from 'lucide-react';
import clsx from 'clsx';
import { MetricCard } from './MetricCard';

interface AdminMessage {
    id: number;
    userId: string | null;
    nickname: string;
    topic: string;
    name: string;
    email: string;
    message: string;
    createdAt: string;
    reply?: string;
    status?: 'replied' | 'unread';
}

interface AdminSubmission {
    id: number;
    category: string;
    question: string;
    options: string[] | string;
    correctAnswer: number;
    explanation: string;
    createdAt: string;
}

interface AdminTodo {
    id: number;
    task: string;
    priority: string;
    status: string;
    category: string;
    createdAt?: string | Date;
}

interface ErrorLog {
    errorId: string;
    status: '未確認' | '確認中' | '対応済';
    screenId: string;
    errorMessage: string;
    errorStack: string;
    createdAt: string;
}

export const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'messages' | 'submissions' | 'questions' | 'notifications' | 'tasks' | 'categories' | 'errors'>('users');
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const [dbCategories, setDbCategories] = useState<any[]>([]); // Keep any for categories for now as it matches db.ts somewhat
    const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
    const [questions, setQuestions] = useState<any[]>([]); // Keep for questions
    const [allNotifications, setAllNotifications] = useState<any[]>([]);
    const [todos, setTodos] = useState<AdminTodo[]>([]);
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
    const [notifications, setAppNotifications] = useState<{ id: string, type: 'success' | 'error' | 'info', message: string }[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title?: string, message: string, onConfirm: () => (void | Promise<void>) } | null>(null);

    // Modals State
    const [replyModal, setReplyModal] = useState<{ isOpen: boolean, messageId: number, replyText: string } | null>(null);
    const [questionModal, setQuestionModal] = useState<{ isOpen: boolean, data: any } | null>(null);
    const [noteModal, setNoteModal] = useState<{ isOpen: boolean, data: any } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchInputValue, setSearchInputValue] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [adminStats, setAdminStats] = useState({ unreadMessages: 0, pendingSubmissions: 0, totalUsers: 0, totalQuestions: 0 });
    const [totalFilteredItems, setTotalFilteredItems] = useState(0);
    const [filters, setFilters] = useState<Record<string, string>>({});

    const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setAppNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setAppNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Admin Data with individual error handling
            const fetchSafe = async (url: string, params: any = {}, defaultValue: any = []) => {
                try {
                    const queryParams = new URLSearchParams({
                        ...params,
                        ...filters,
                        page: page.toString(),
                        search: searchQuery,
                        sortBy,
                        order: sortOrder,
                        limit: params.limit || (activeTab === 'questions' ? '50' : '10')
                    });
                    const res = await fetch(`${url}?${queryParams}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const result = await res.json();
                    const normalized = normalizeKeys(result);

                    // Handle both legacy (array) and new (paginated object) responses
                    if (normalized.data) {
                        setTotalPages(normalized.pagination.pages);
                        setTotalFilteredItems(normalized.pagination.total);
                        return normalized.data;
                    }
                    setTotalPages(1);
                    setTotalFilteredItems(normalized.length || 0);
                    return normalized;
                } catch (err) {
                    console.error(`Failed to fetch ${url}:`, err);
                    return defaultValue;
                }
            };

            const statsRes = await fetch('/api/admin/stats');
            if (statsRes.ok) setAdminStats(await statsRes.json());

            if (activeTab === 'users') {
                const u = await fetchSafe('/api/users');
                setUsers(u);
            } else if (activeTab === 'messages') {
                const msgs = await fetchSafe('/api/admin/messages');
                setMessages(msgs);
            } else if (activeTab === 'submissions') {
                const subs = await fetchSafe('/api/admin/submissions');
                setSubmissions(subs);
            } else if (activeTab === 'questions') {
                const ques = await fetchSafe('/api/questions');
                setQuestions(ques);
            } else if (activeTab === 'notifications') {
                const notes = await fetchSafe('/api/notifications', { admin: 'true' });
                setAllNotifications(notes);
            } else if (activeTab === 'tasks') {
                try {
                    const res = await fetch('/api/admin/todos');
                    const t = await res.json();
                    if (Array.isArray(t)) {
                        setTodos(t);
                        setTotalPages(1);
                        setTotalFilteredItems(t.length);
                    }
                } catch (e) {
                    console.error(e);
                }
            } else if (activeTab === 'categories') {
                const cats = await fetchSafe('/api/categories');
                setDbCategories(cats);
            } else if (activeTab === 'errors') {
                const errs = await fetchSafe('/api/errors');
                setErrorLogs(errs);
            }

            try {
                const a = await db.attempts.toArray();
                setAllAttempts(a);
            } catch (e) {
                console.error('[Admin] Failed to fetch attempts:', e);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, page, sortBy, sortOrder, searchQuery, JSON.stringify(filters)]);

    // Keyboard shortcuts 1-7 for admin tabs
    useEffect(() => {
        const tabIds = ['users', 'messages', 'submissions', 'questions', 'categories', 'notifications', 'tasks'];
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const num = parseInt(e.key);
            if (num >= 1 && num <= 7 && tabIds[num - 1]) {
                setActiveTab(tabIds[num - 1] as any);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Reset state on tab change
    useEffect(() => {
        setPage(1);
        setSearchQuery('');
        setSearchInputValue('');
        setFilters({});
        // Set default sortBy based on tab
        if (activeTab === 'users') setSortBy('joinedAt');
        else if (activeTab === 'messages') setSortBy('createdAt');
        else if (activeTab === 'notifications') setSortBy('createdAt');
        else if (activeTab === 'errors') setSortBy('createdAt');
        else setSortBy('id');
    }, [activeTab]);

    // Reset page logic
    useEffect(() => {
        // When search is cleared or changed, reset to page 1
        setPage(1);
    }, [searchQuery]);

    const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
            addNotification('success', `ユーザーを${newStatus === 'active' ? '復帰' : '一時停止'}しました`);
        } catch {
            addNotification('error', 'ステータス更新に失敗しました');
        }
    };

    const handleToggleTodoStatus = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
        try {
            await fetch(`/api/admin/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            setTodos(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
            addNotification('success', `タスクを${newStatus === 'completed' ? '完了' : '未完了'}にしました`);
        } catch {
            addNotification('error', 'タスクの更新に失敗しました');
        }
    };

    const handleDeleteTodo = async (id: number) => {
        try {
            await fetch(`/api/admin/todos/${id}`, { method: 'DELETE' });
            setTodos(prev => prev.filter(t => t.id !== id));
            addNotification('info', 'タスクを削除しました');
        } catch {
            addNotification('error', '削除に失敗しました');
        }
    };

    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const task = (form.elements.namedItem('task') as HTMLInputElement).value;
        if (!task) return;

        try {
            const res = await fetch('/api/admin/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task, priority: 'medium', category: 'general' })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'タスクの追加に失敗しました');
            }

            const newTodo = await res.json();
            setTodos(prev => [newTodo, ...prev]);
            setTotalFilteredItems(prev => prev + 1);
            form.reset();
            addNotification('success', '新しいタスクを追加しました');
        } catch (e) {
            console.error('Add todo error:', e);
            addNotification('error', e instanceof Error ? e.message : 'タスクの追加に失敗しました');
        }
    };

    const handleSendReply = async () => {
        if (!replyModal || !replyModal.replyText.trim()) return;
        try {
            await fetch(`/api/admin/messages/${replyModal.messageId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply: replyModal.replyText })
            });
            setMessages(prev => prev.map(m => m.id === replyModal.messageId ? { ...m, reply: replyModal.replyText, status: 'replied' } : m));
            addNotification('success', '返信を送信しました');
            setReplyModal(null);
        } catch {
            addNotification('error', '返信送信に失敗しました');
        }
    };

    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionModal) return;
        const { data } = questionModal;
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/api/admin/questions/${data.id}` : '/api/admin/questions';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                addNotification('success', '問題を保存しました');
                setQuestionModal(null);
                fetchData();
            }
        } catch {
            addNotification('error', '問題の保存に失敗しました');
        }
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteModal) return;
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteModal.data)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || '通知の送信に失敗しました');
            }

            addNotification('success', '通知を送信しました');
            setNoteModal(null);
            fetchData();
        } catch (e) {
            console.error('Send notification error:', e);
            addNotification('error', e instanceof Error ? e.message : '通知の送信に失敗しました');
        }
    };

    const handleApproveSubmission = async (id: number) => {
        try {
            await fetch(`/api/admin/submissions/${id}/approve`, { method: 'POST' });
            setSubmissions(prev => prev.filter(s => s.id !== id));
            addNotification('success', '承認しました (Submission Approved)');
            fetchData();
        } catch {
            addNotification('error', '承認中にエラーが発生しました');
        }
    };

    const handleRejectSubmission = (id: number) => {
        setConfirmModal({
            isOpen: true,
            message: '【検証失敗】この投稿データをパージしますか？この操作はニューラル・データベースから完全に取り消せなくなります。',
            onConfirm: async () => {
                try {
                    await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
                    setSubmissions(prev => prev.filter(s => s.id !== id));
                    addNotification('info', '投稿を削除しました');
                } catch {
                    addNotification('error', '削除中にエラーが発生しました');
                }
                setConfirmModal(null);
            }
        });
    };

    const handleDeleteQuestion = (id: number) => {
        setConfirmModal({
            isOpen: true,
            message: 'この学習ノード（問題）をマトリックスから完全に削除しますか？',
            onConfirm: async () => {
                try {
                    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
                    setQuestions(prev => prev.filter(q => q.id !== id));
                    addNotification('success', '問題を削除しました');
                } catch {
                    addNotification('error', '削除エラー');
                }
                setConfirmModal(null);
            }
        });
    };

    const handleDeleteUser = (userId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'ユーザーデータ削除',
            message: '【警告】対象ユーザーの全ニューラル・レコード（学習履歴、セッション等）を完全に消去しますか？',
            onConfirm: async () => {
                await Promise.all([
                    db.users.delete(userId),
                    db.attempts.where('userId').equals(userId).delete(),
                    db.sessions.where('userId').equals(userId).delete()
                ]);
                setUsers(users.filter(u => u.userId !== userId));
                addNotification('info', 'ユーザーデータをパージしました');
                setConfirmModal(null);
            }
        });
    };

    const getGlobalStats = () => {
        const totalQuestions = allAttempts.reduce((acc, curr) => acc + curr.totalQuestions, 0);
        const totalScore = allAttempts.reduce((acc, curr) => acc + curr.score, 0);
        const avgAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

        return {
            totalUsers: users.length,
            totalAttempts: allAttempts.length,
            avgAccuracy,
            activeNodes: totalQuestions
        };
    };

    const stats = getGlobalStats();
    const dynamicCategoryMap = Object.fromEntries(dbCategories.map(c => [c.id, c.title]));

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const isEdit = !!data.oldId;
        const url = isEdit ? `/api/admin/categories/${data.oldId}` : '/api/admin/categories';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                addNotification('success', 'カテゴリを保存しました');
                fetchData();
                form.reset();
            }
        } catch {
            addNotification('error', 'カテゴリの保存に失敗しました');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            message: 'このカテゴリを削除しますか？関連する問題のカテゴリ名も手動で更新する必要があります。',
            onConfirm: async () => {
                try {
                    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
                    addNotification('success', 'カテゴリを削除しました');
                    fetchData();
                } catch {
                    addNotification('error', '削除に失敗しました');
                }
                setConfirmModal(null);
            }
        });
    };

    const handleUpdateErrorStatus = async (errorId: string, status: string) => {
        try {
            const res = await fetch(`/api/errors/${errorId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!res.ok) throw new Error('Failed to update status');

            // Update local state
            setErrorLogs(prev => prev.map(err =>
                err.errorId === errorId ? { ...err, status: status as any } : err
            ));
            addNotification('success', 'ステータスを更新しました');
        } catch (err) {
            console.error(err);
            addNotification('error', 'ステータスの更新に失敗しました');
        }
    };

    if (isLoading) return <div className="p-12 text-center animate-pulse text-accent font-black uppercase tracking-widest">データ読み込み中...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-12 pb-20 px-4">
            <div className="flex flex-col gap-6 border-b border-white/[0.04] pb-8 md:pb-12">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white">
                        管理者ダッシュボード
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium tracking-tight">システム管理・ログ解析・コンテンツ承認</p>
                </div>

                {/* Tab Navigation - Mobile Scrollable */}
                <div className="-mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div className="flex gap-1 min-w-max">
                            {[
                                { id: 'users', label: 'ユーザー管理', icon: Users, shortcut: '1' },
                                { id: 'messages', label: '受信トレイ', icon: Activity, shortcut: '2' },
                                { id: 'submissions', label: '承認待ち', icon: Database, shortcut: '3' },
                                { id: 'questions', label: '問題データ', icon: BarChart3, shortcut: '4' },
                                { id: 'categories', label: 'カテゴリ', icon: Plus, shortcut: '5' },
                                { id: 'notifications', label: '通知管理', icon: ShieldAlert, shortcut: '6' },
                                { id: 'tasks', label: 'タスク管理', icon: Clock, shortcut: '7' },
                                { id: 'errors', label: 'エラーログ', icon: ShieldAlert, shortcut: '8' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={clsx(
                                        "px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] md:text-xs font-bold transition-all whitespace-nowrap",
                                        activeTab === tab.id ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="hidden xl:inline text-[8px] text-slate-700 group-hover:text-slate-500 font-mono ml-0.5">[{tab.shortcut}]</span>
                                    {tab.id === 'messages' && adminStats.unreadMessages > 0 && (
                                        <span className="bg-blue-500 text-white text-[9px] px-1.5 rounded-full">{adminStats.unreadMessages}</span>
                                    )}
                                    {tab.id === 'submissions' && adminStats.pendingSubmissions > 0 && (
                                        <span className="bg-emerald-500 text-white text-[9px] px-1.5 rounded-full">{adminStats.pendingSubmissions}</span>
                                    )}
                                </button>
                            ))}            </div>
                    </div>
                </div>
            </div>

            {/* Global Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard icon={Users} label="総ユーザー数" value={adminStats.totalUsers.toString()} color="text-blue-400" />
                <MetricCard icon={Activity} label="総学習回数" value={stats.totalAttempts.toString()} color="text-purple-400" />
                <MetricCard icon={TrendingUp} label="平均正答率" value={`${stats.avgAccuracy}%`} color="text-emerald-400" />
                <MetricCard icon={Database} label="DB登録問題数" value={adminStats.totalQuestions.toString()} color="text-amber-400" />
            </div>

            {/* CONTENT AREA */}
            <div className="bg-secondary/10 border border-white/[0.04] rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">

                {/* Common Toolbar */}
                <div className="px-4 md:px-8 py-3 md:py-4 border-b border-white/[0.04] bg-slate-900/20 backdrop-blur-md flex flex-col gap-4 sticky top-0 z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 w-full md:max-w-xl">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
                                <input
                                    type="text"
                                    value={searchInputValue}
                                    onChange={(e) => setSearchInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setSearchQuery(searchInputValue);
                                        }
                                    }}
                                    placeholder={`${activeTab === 'users' ? '名まえで検索' : activeTab === 'questions' ? '問題文で検索' : activeTab === 'errors' ? 'エラー内容で検索' : '検索...'}`}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-11 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setSearchQuery(searchInputValue)}
                                className="whitespace-nowrap px-4 py-2 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest text-[9px] rounded-lg transition-all shadow-lg shadow-accent/20"
                            >
                                検索実行
                            </button>
                            <button
                                onClick={() => fetchData()}
                                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:rotate-180 duration-500"
                                title="更新"
                            >
                                <RefreshCw className={clsx("w-3.5 h-3.5", isLoading && "animate-spin")} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 pr-2 mr-2 border-r border-white/10">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ソート:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-white focus:outline-none focus:border-accent"
                                >
                                    <option value="id">ID</option>
                                    {['questions', 'submissions'].includes(activeTab) && <option value="category">カテゴリ</option>}
                                    {activeTab === 'users' && (
                                        <>
                                            <option value="nickname">ユーザー名</option>
                                            <option value="joinedAt">登録日</option>
                                        </>
                                    )}
                                    {activeTab === 'messages' && (
                                        <>
                                            <option value="createdAt">受信日</option>
                                            <option value="status">状態</option>
                                        </>
                                    )}
                                    {activeTab === 'notifications' && (
                                        <>
                                            <option value="title">タイトル</option>
                                            <option value="type">種別</option>
                                            <option value="createdAt">配信日</option>
                                        </>
                                    )}
                                    {activeTab === 'submissions' && (
                                        <>
                                            <option value="question">問題文</option>
                                            <option value="createdAt">申請日</option>
                                        </>
                                    )}
                                    {activeTab === 'questions' && (
                                        <>
                                            <option value="id">ID</option>
                                            <option value="category">カテゴリ</option>
                                            <option value="question">問題文</option>
                                        </>
                                    )}
                                    {activeTab === 'errors' && (
                                        <>
                                            <option value="errorId">エラーID</option>
                                            <option value="createdAt">発生日時</option>
                                            <option value="status">状態</option>
                                        </>
                                    )}
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white"
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">フィルタ:</label>

                                {/* Tab Specific Filters */}
                                {activeTab === 'users' && (
                                    <select
                                        value={filters.role || ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                                        className="bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                                    >
                                        <option value="">全ての権限</option>
                                        <option value="user">一般ユーザー</option>
                                        <option value="admin">管理者</option>
                                    </select>
                                )}

                                {activeTab === 'messages' && (
                                    <>
                                        <select
                                            value={filters.status || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                            className="bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                                        >
                                            <option value="">全ての状態</option>
                                            <option value="unread">未読</option>
                                            <option value="replied">返信済み</option>
                                        </select>
                                        <select
                                            value={filters.topic || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, topic: e.target.value }))}
                                            className="bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[10px] text-white max-w-[120px]"
                                        >
                                            <option value="">全トピック</option>
                                            <option value="一般的なお問い合わせ">一般</option>
                                            <option value="不具合・バグ報告">不具合</option>
                                            <option value="機能の提案">機能</option>
                                            <option value="問題・解説の訂正">訂正</option>
                                            <option value="その他">その他</option>
                                        </select>
                                    </>
                                )}

                                {['questions', 'submissions'].includes(activeTab) && (
                                    <select
                                        value={filters.category || ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                        className="bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[10px] text-white max-w-[150px]"
                                    >
                                        {dbCategories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                )}

                                {activeTab === 'notifications' && (
                                    <select
                                        value={filters.type || ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                        className="bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                                    >
                                        <option value="">全種別</option>
                                        <option value="info">お知らせ</option>
                                        <option value="warning">重要/警告</option>
                                    </select>
                                )}

                                {activeTab === 'errors' && (
                                    <select
                                        value={filters.status || ''}
                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                        className="bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                                    >
                                        <option value="">全ての状態</option>
                                        <option value="未確認">未確認</option>
                                        <option value="確認中">確認中</option>
                                        <option value="対応済">対応済</option>
                                    </select>
                                )}

                                <button
                                    onClick={() => setFilters({})}
                                    className="text-[8px] font-black text-slate-600 hover:text-red-500 uppercase tracking-tighter ml-1"
                                >
                                    × リセット
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <>
                        <div className="p-8 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <UserCog className="w-6 h-6 text-accent" />
                                <h2 className="text-xl font-bold text-white">登録ユーザー管理 ({totalFilteredItems})</h2>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.02] bg-slate-900/30">
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">ユーザー名</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">権限</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">状態</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500">登録日</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-500 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {users.map(user => (
                                        <motion.tr
                                            key={user.userId}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="group hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-accent font-bold shadow-inner">
                                                        {user.nickname.substring(0, 2)}
                                                    </div>
                                                    <span className="font-bold text-white tracking-tight">{user.nickname}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={clsx(
                                                    "px-3 py-1 rounded-lg text-xs font-bold border",
                                                    user.role === 'admin' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                )}>
                                                    {user.role === 'admin' ? '管理者' : '一般'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 uppercase font-black text-[9px] tracking-widest">
                                                <span className={clsx(
                                                    user.status === 'suspended' ? "text-red-500" : "text-emerald-500"
                                                )}>
                                                    ● {user.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-slate-500 font-mono text-xs">
                                                {new Date(user.joinedAt).toLocaleDateString('ja-JP')}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {user.role !== 'admin' && (
                                                        <>
                                                            <button
                                                                onClick={() => user.userId && handleToggleUserStatus(user.userId, user.status || 'active')}
                                                                className={clsx(
                                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-widest transition-all",
                                                                    user.status === 'suspended' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                                                                )}
                                                            >
                                                                {user.status === 'suspended' ? '復元' : '停止'}
                                                            </button>
                                                            <button
                                                                onClick={() => user.userId && handleDeleteUser(user.userId)}
                                                                className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* MESSAGES TAB */}
                {activeTab === 'messages' && (
                    <div className="p-8 space-y-6">
                        <h2 className="text-xl font-bold text-white mb-6">受信メッセージ ({totalFilteredItems})</h2>
                        {messages.length === 0 ? (
                            <p className="text-slate-500">新しいメッセージはありません。</p>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className="text-xs font-bold text-blue-400">{msg.topic}</div>
                                                    {(msg.userId !== null && msg.userId !== undefined) ? (
                                                        <div className="flex items-center gap-2">
                                                            {msg.nickname && (
                                                                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/30 font-bold">
                                                                    @{msg.nickname}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
                                                                ID: {msg.userId}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] bg-slate-900/50 text-slate-600 px-2 py-0.5 rounded border border-white/5 font-mono italic">ゲスト</span>
                                                    )}
                                                    {msg.status === 'replied' && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">返信済み</span>}
                                                </div>
                                                <h3 className="text-lg font-bold text-white">{msg.name} <span className="text-slate-500 text-sm font-normal">&lt;{msg.email}&gt;</span></h3>
                                            </div>
                                            <div className="text-xs text-slate-600 font-mono">{new Date(msg.createdAt).toLocaleString('ja-JP')}</div>
                                        </div>
                                        <div className="p-4 bg-slate-950/50 rounded-xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                                            {msg.message}
                                        </div>
                                        {msg.reply && (
                                            <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-300 text-sm italic">
                                                <span className="block text-[10px] font-black uppercase text-emerald-600 mb-1">管理者からの返信:</span>
                                                {msg.reply}
                                            </div>
                                        )}
                                        {!msg.reply && (
                                            <button
                                                onClick={() => setReplyModal({ isOpen: true, messageId: msg.id, replyText: '' })}
                                                className="mt-2 text-xs font-black text-accent hover:underline uppercase tracking-widest flex items-center gap-2"
                                            >
                                                返信する
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SUBMISSIONS TAB */}
                {activeTab === 'submissions' && (
                    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-6">承認待ちの問題 ({totalFilteredItems})</h2>
                        {submissions.length === 0 ? (
                            <p className="text-slate-500">承認待ちの問題はありません。</p>
                        ) : (
                            <div className="grid gap-6">
                                {submissions.map((sub) => {
                                    const options = Array.isArray(sub.options) ? sub.options : JSON.parse(sub.options || '[]');
                                    return (
                                        <div key={sub.id} className="bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">{dynamicCategoryMap[sub.category] || sub.category}</span>
                                                        <span className="text-xs text-slate-600 font-mono">{new Date(sub.createdAt).toLocaleDateString('ja-JP')}</span>
                                                    </div>
                                                    <div className="font-bold text-white text-base md:text-lg">{sub.question}</div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {options.map((opt: string, i: number) => (
                                                            <div key={i} className={clsx(
                                                                "p-3 rounded-lg text-sm border",
                                                                i === sub.correctAnswer
                                                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"
                                                                    : "bg-slate-950/50 border-slate-800 text-slate-400"
                                                            )}>
                                                                {i === sub.correctAnswer && <span className="text-emerald-500 font-bold mr-2">✓</span>}
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="p-4 bg-slate-950/30 rounded-xl text-xs text-slate-400 border border-slate-800/50">
                                                        <span className="font-bold text-slate-300 block mb-1">解説:</span>
                                                        {sub.explanation}
                                                    </div>
                                                </div>
                                                <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                                                    <button
                                                        onClick={() => handleApproveSubmission(sub.id)}
                                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg text-xs transition-colors"
                                                    >
                                                        承認
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectSubmission(sub.id)}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 text-slate-400 font-bold rounded-lg text-xs transition-colors"
                                                    >
                                                        却下
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && (
                    <div className="overflow-x-auto">
                        <div className="p-8 border-b border-white/[0.04] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Database className="w-6 h-6 text-accent" />
                                <h2 className="text-xl font-bold text-white">問題データ管理 ({totalFilteredItems})</h2>
                            </div>
                            <button
                                onClick={() => setQuestionModal({ isOpen: true, data: { category: 'AI Fundamentals', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' } })}
                                className="px-4 py-2 bg-accent text-primary font-black uppercase tracking-widest text-[10px] rounded-lg transition-all hover:bg-sky-400"
                            >
                                新規追加
                            </button>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/[0.02] bg-slate-900/30">
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">ID</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">カテゴリ</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">問題文</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {questions.map(q => (
                                    <motion.tr
                                        key={q.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-8 py-6 text-slate-500 font-mono text-xs">
                                            #{q.id}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-bold border border-slate-700">
                                                {dynamicCategoryMap[q.category] || q.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 max-w-md">
                                            <div className="font-bold text-white text-sm mb-1 line-clamp-2">{q.question}</div>
                                            <div className="text-xs text-slate-500 line-clamp-1">{q.explanation}</div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setQuestionModal({ isOpen: true, data: q })}
                                                    className="p-2 text-slate-500 hover:text-accent transition-colors"
                                                >
                                                    <UserCog className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">通知・アラート配信</h2>
                            <button
                                onClick={() => setNoteModal({ isOpen: true, data: { title: '', content: '', userId: '', type: 'info' } })}
                                className="px-4 py-2 bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-lg"
                            >
                                新規通知配信
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {allNotifications.length === 0 ? (
                                <p className="text-slate-500">送信済みの通知はありません。</p>
                            ) : (
                                allNotifications.map((note) => (
                                    <div key={note.id} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex justify-between items-center group">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={clsx(
                                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                                    note.type === 'warning' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                                                )}>{note.type === 'warning' ? '警告' : 'お知らせ'}</span>
                                                <span className="text-[9px] font-bold text-slate-600">{note.userId ? `対象ユーザーID: ${note.userId}` : '全体配信'}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white">{note.title}</h3>
                                            <p className="text-sm text-slate-400">{note.content}</p>
                                        </div>
                                        <div className="text-[10px] text-slate-700 font-mono">
                                            {new Date(note.createdAt).toLocaleString('ja-JP')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* TASKS TAB - Simplified Visualization */}
                {activeTab === 'tasks' && (
                    <div className="p-8 space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <CheckSquare className="w-8 h-8 text-accent" />
                                <div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">タスク管理センター</h2>
                                    <p className="text-slate-500 text-xs font-medium">プロジェクトの進捗を簡略的に可視化・管理します</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">進捗率:</span>
                                    <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-accent transition-all duration-1000"
                                            style={{ width: `${todos.length > 0 ? Math.round((todos.filter(t => t.status === 'completed').length / todos.length) * 100) : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-accent">
                                        {todos.length > 0 ? Math.round((todos.filter(t => t.status === 'completed').length / todos.length) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Add Task Form */}
                        <form onSubmit={handleAddTodo} className="flex gap-4 p-4 bg-accent/5 border border-accent/10 rounded-2xl">
                            <input
                                name="task"
                                type="text"
                                placeholder="新しい課題を入力してください..."
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-accent transition-all"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest text-xs rounded-xl flex items-center gap-2 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                追加
                            </button>
                        </form>

                        <div className="grid gap-4">
                            {todos.length === 0 ? (
                                <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">タスクがありません</p>
                                </div>
                            ) : (
                                todos.map((todo) => (
                                    <motion.div
                                        key={todo.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={clsx(
                                            "p-6 rounded-2xl border transition-all flex items-center gap-6 group",
                                            todo.status === 'completed'
                                                ? "bg-slate-900/10 border-white/[0.02] opacity-50"
                                                : "bg-slate-900/40 border-white/[0.06] hover:border-accent/20"
                                        )}
                                    >
                                        <button
                                            onClick={() => handleToggleTodoStatus(todo.id, todo.status)}
                                            className={clsx(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                todo.status === 'completed'
                                                    ? "bg-accent border-accent text-primary"
                                                    : "border-slate-700 hover:border-accent"
                                            )}
                                        >
                                            {todo.status === 'completed' && <CheckSquare className="w-4 h-4" />}
                                        </button>

                                        <div className="flex-1">
                                            <h3 className={clsx(
                                                "font-bold transition-all",
                                                todo.status === 'completed' ? "text-slate-500 line-through" : "text-white text-lg"
                                            )}>
                                                {todo.task}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">
                                                    {todo.createdAt ? new Date(todo.createdAt).toLocaleDateString('ja-JP') : ''}
                                                </span>
                                                {todo.status !== 'completed' && (
                                                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-[8px] font-black uppercase rounded">In Progress</span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteTodo(todo.id)}
                                            className="p-3 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* CATEGORIES TAB */}
                {activeTab === 'categories' && (
                    <div className="p-8 space-y-8">
                        <h2 className="text-xl font-bold text-white mb-6">カテゴリ管理</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Category List */}
                            <div className="lg:col-span-2 space-y-4">
                                {dbCategories.map((cat) => (
                                    <div key={cat.id} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center font-bold", cat.bg)}>
                                                <span className={cat.color}>{cat.icon.substring(0, 1)}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{cat.title} <span className="text-xs text-slate-500 font-normal">({cat.id})</span></h3>
                                                <p className="text-xs text-slate-500 line-clamp-1">{cat.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const form = document.getElementById('category-form') as HTMLFormElement;
                                                    if (form) {
                                                        (form.elements.namedItem('oldId') as HTMLInputElement).value = cat.id;
                                                        (form.elements.namedItem('id') as HTMLInputElement).value = cat.id;
                                                        (form.elements.namedItem('title') as HTMLInputElement).value = cat.title;
                                                        (form.elements.namedItem('icon') as HTMLInputElement).value = cat.icon;
                                                        (form.elements.namedItem('color') as HTMLInputElement).value = cat.color;
                                                        (form.elements.namedItem('bg') as HTMLInputElement).value = cat.bg;
                                                        (form.elements.namedItem('description') as HTMLTextAreaElement).value = cat.description;
                                                        (form.elements.namedItem('displayOrder') as HTMLInputElement).value = cat.displayOrder;
                                                    }
                                                }}
                                                className="p-2 text-slate-500 hover:text-accent transition-colors"
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add/Edit Form */}
                            <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/[0.06] h-fit">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">カテゴリ作成・編集</h3>
                                <form id="category-form" onSubmit={handleSaveCategory} className="space-y-4">
                                    <input type="hidden" name="oldId" />
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">ID (Internal)</label>
                                        <input name="id" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="AI Fundamentals" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">表示タイトル</label>
                                        <input name="title" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="AIの基礎" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">アイコン (Lucide名)</label>
                                            <input name="icon" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="Brain" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">表示順</label>
                                            <input name="displayOrder" type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">文字色クラス</label>
                                            <input name="color" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="text-blue-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">背景色クラス</label>
                                            <input name="bg" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="bg-blue-400/10" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">説明文</label>
                                        <textarea name="description" rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" placeholder="カテゴリの説明..." />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="reset" className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all">リセット</button>
                                        <button type="submit" className="flex-1 py-3 bg-accent hover:bg-sky-400 text-primary font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-accent/20 transition-all">保存実行</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-8 py-4 border-t border-white/[0.04] bg-slate-900/10 flex items-center justify-between mt-auto">
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                            ページ <span className="text-accent">{page}</span> / <span className="text-slate-400">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = page;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={clsx(
                                                "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                                                page === pageNum ? "bg-accent text-primary shadow-[0_0_15px_rgba(56,189,248,0.3)]" : "text-slate-500 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all active:scale-95"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ERRORS TAB */}
            {activeTab === 'errors' && (
                <>
                    <div className="p-8 border-b border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <ShieldAlert className="w-6 h-6 text-red-500" />
                            <h2 className="text-xl font-bold text-white">エラーログ ({totalFilteredItems})</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/[0.02] bg-slate-900/30">
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">エラーID</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">発生画面</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">エラー内容</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500">発生日時</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-500 text-right">ステータス</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {errorLogs.map(err => (
                                    <motion.tr
                                        key={err.errorId}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">{err.errorId}</span>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-300">
                                            {err.screenId}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-bold text-red-400 mb-1">{err.errorMessage}</div>
                                            <pre className="text-[10px] text-slate-500 font-mono bg-slate-900/50 p-2 rounded max-w-[400px] overflow-x-auto max-h-[100px] scrollbar-thin scrollbar-thumb-slate-700">
                                                {err.errorStack}
                                            </pre>
                                        </td>
                                        <td className="px-8 py-6 text-slate-500 font-mono text-xs whitespace-nowrap">
                                            {new Date(err.createdAt).toLocaleString('ja-JP')}
                                        </td>
                                        <td className="px-8 py-6 text-right whitespace-nowrap">
                                            <select
                                                value={err.status}
                                                onChange={(e) => handleUpdateErrorStatus(err.errorId, e.target.value)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-all cursor-pointer outline-none",
                                                    err.status === '未確認' && "bg-red-500/10 border-red-500/30 text-red-500",
                                                    err.status === '確認中' && "bg-amber-500/10 border-amber-500/30 text-amber-500",
                                                    err.status === '対応済' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                                )}
                                            >
                                                <option value="未確認" className="bg-slate-900 text-red-500">未確認</option>
                                                <option value="確認中" className="bg-slate-900 text-amber-500">確認中</option>
                                                <option value="対応済" className="bg-slate-900 text-emerald-500">対応済</option>
                                            </select>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                        {errorLogs.length === 0 && (
                            <div className="p-12 text-center text-slate-500 font-bold tracking-widest">
                                エラーは記録されていません
                            </div>
                        )}
                    </div>
                </>
            )
            }

            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-secondary/20 border border-slate-800 p-4 md:p-8 rounded-3xl h-[300px] md:h-[400px] flex flex-col">
                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
                        <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                        <h3 className="text-base md:text-lg font-bold text-white">学習効率分析</h3>
                    </div>
                    <div className="flex-1 flex items-end gap-2 md:gap-4 px-2 md:px-4 pb-4 md:pb-8">
                        {[65, 45, 85, 30, 95, 60, 75].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col gap-1 md:gap-2 items-center group">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className="w-full bg-gradient-to-t from-purple-500/20 to-purple-400 rounded-t-lg md:rounded-t-xl group-hover:to-accent transition-all duration-500"
                                />
                                <span className="text-[7px] md:text-[8px] font-black text-slate-700 uppercase">S-{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-secondary/20 border border-slate-800 p-4 md:p-8 rounded-3xl h-[300px] md:h-[400px] flex flex-col">
                    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                        <h3 className="text-base md:text-lg font-bold text-white">システム成長推移</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2 md:p-12">
                        <div className="relative w-full h-full border-b border-l border-white/5">
                            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <motion.path
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5 }}
                                    d="M 0,80 C 20,70 40,90 60,60 S 80,40 100,20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <motion.path
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                    d="M 0,80 C 20,70 40,90 60,60 S 80,40 100,20 V 100 H 0 Z"
                                    fill="url(#growthGradient)"
                                    stroke="none"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reply Modal */}
            {
                replyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full space-y-6">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">返信を作成する</h3>
                            <textarea
                                value={replyModal.replyText}
                                onChange={(e) => setReplyModal({ ...replyModal, replyText: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white min-h-[150px] outline-none focus:border-accent transition-all"
                                placeholder="ここにメッセージを入力してください..."
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setReplyModal(null)} className="px-6 py-2 text-slate-500 font-bold hover:text-white">キャンセル</button>
                                <button onClick={handleSendReply} className="px-8 py-2 bg-accent text-primary font-black uppercase rounded-lg">送信する</button>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {/* Question Form Modal */}
            {
                questionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full overflow-y-auto max-h-[90vh]">
                            <h3 className="text-2xl font-black text-white italic mb-6">問題データエディタ</h3>
                            <form onSubmit={handleSaveQuestion} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">カテゴリ</label>
                                        <select
                                            value={questionModal!.data.category}
                                            onChange={(e) => setQuestionModal(prev => prev ? { ...prev, data: { ...prev.data, category: e.target.value } } : null)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white"
                                        >
                                            {dbCategories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase">正解インデックス (0-3)</label>
                                        <input type="number" min="0" max="3" value={questionModal!.data.correctAnswer} onChange={(e) => setQuestionModal(prev => prev ? { ...prev, data: { ...prev.data, correctAnswer: parseInt(e.target.value) } } : null)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">問題文</label>
                                    <textarea rows={3} value={questionModal!.data.question} onChange={(e) => setQuestionModal(prev => prev ? { ...prev, data: { ...prev.data, question: e.target.value } } : null)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {questionModal!.data.options.map((opt: string, i: number) => (
                                        <div key={i} className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">選択肢 {i + 1}</label>
                                            <input type="text" value={opt} onChange={(e) => {
                                                setQuestionModal(prev => {
                                                    if (!prev) return null;
                                                    const newOpts = [...prev.data.options];
                                                    newOpts[i] = e.target.value;
                                                    return { ...prev, data: { ...prev.data, options: newOpts } };
                                                });
                                            }} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">解説</label>
                                    <textarea rows={3} value={questionModal.data.explanation} onChange={(e) => setQuestionModal({ ...questionModal, data: { ...questionModal.data, explanation: e.target.value } })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                </div>
                                <div className="flex justify-end gap-3 pt-6">
                                    <button type="button" onClick={() => setQuestionModal(null)} className="px-6 py-2 text-slate-500 font-bold">閉じる</button>
                                    <button type="submit" className="px-8 py-2 bg-emerald-500 text-slate-900 font-black uppercase rounded-lg">保存を適用</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Notification Form Modal */}
            {
                noteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full">
                            <h3 className="text-2xl font-black text-white italic mb-6">通知作成</h3>
                            <form onSubmit={handleSendNotification} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">対象ユーザーID (空欄で全ユーザー)</label>
                                    <input type="text" value={noteModal!.data.userId} onChange={(e) => setNoteModal(prev => prev ? { ...prev, data: { ...prev.data, userId: e.target.value } } : null)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">タイトル</label>
                                    <input type="text" required value={noteModal!.data.title} onChange={(e) => setNoteModal(prev => prev ? { ...prev, data: { ...prev.data, title: e.target.value } } : null)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">内容</label>
                                    <textarea rows={3} required value={noteModal!.data.content} onChange={(e) => setNoteModal(prev => prev ? { ...prev, data: { ...prev.data, content: e.target.value } } : null)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" />
                                </div>
                                <div className="flex justify-end gap-3 pt-6">
                                    <button type="button" onClick={() => setNoteModal(null)} className="px-6 py-2 text-slate-500 font-bold">キャンセル</button>
                                    <button type="submit" className="px-8 py-2 bg-blue-500 text-white font-black uppercase rounded-lg">配信実行</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Notifications App Area */}
            <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[200] flex flex-col gap-2 pointer-events-none">
                {notifications.map(n => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={clsx(
                            "pointer-events-auto px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
                            n.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 backdrop-blur-md" :
                                n.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400 backdrop-blur-md" :
                                    "bg-blue-500/10 border-blue-500/20 text-blue-400 backdrop-blur-md"
                        )}
                    >
                        {n.type === 'success' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        {n.type === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                        {n.type === 'info' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        <span className="font-bold text-sm">{n.message}</span>
                    </motion.div>
                ))}
            </div>

            {/* Confirm Modal */}
            {
                confirmModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center gap-4 text-amber-500">
                                <ShieldAlert className="w-8 h-8" />
                                <h3 className="text-xl font-bold text-white">{confirmModal!.title || '確認 (Confirmation)'}</h3>
                            </div>
                            <p className="text-slate-400 leading-relaxed">
                                {confirmModal!.message}
                            </p>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={confirmModal!.onConfirm}
                                    className="px-6 py-3 rounded-xl font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                                >
                                    実行する
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};
