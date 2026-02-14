/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useQuizStore } from './store/useQuizStore';
import { useLanguageStore } from './store/useLanguageStore';
import { NeuralBackground } from './components/NeuralBackground';
import { useAuthStore } from './store/useAuthStore';
import { normalizeKeys } from './utils/normalize';
import { LoginView } from './components/LoginView';
import { Dashboard } from './components/Dashboard';
import { StudyMode } from './components/StudyMode';
import { HistoryView } from './components/HistoryView';
import { Statistics } from './components/Statistics';
import { Quiz } from './components/Quiz';
import { AdminDashboard } from './components/AdminDashboard';
import { Layout } from './components/Layout';
import { ContactView } from './components/ContactView';
import { SubmitQuestionView } from './components/SubmitQuestionView';
import { Toast } from './components/Toast';
import { NotificationView } from './components/NotificationView';
import { FlashcardView } from './components/FlashcardView';
import { Cpu, Database, Clock, BarChart3, Layout as LayoutIcon, Github, Shield, Radio, LogOut, Settings, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useDashboardStore } from './store/useDashboardStore';
import { useSubscriptionStore } from './store/useSubscriptionStore';
import { UpgradeModal } from './components/UpgradeModal';

export default function App() {
  const { t } = useLanguageStore();
  const { isAuthenticated, isAdmin, logout, currentUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
        useSubscriptionStore.getState().setup(currentUser);
    }
  }, [isAuthenticated, currentUser]);

  const [view, setView] = useState<'dashboard' | 'study' | 'history' | 'quiz' | 'stats' | 'admin' | 'contact' | 'submit' | 'notifications' | 'flashcards'>('dashboard');
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { status } = useSubscriptionStore();
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const isActive = useQuizStore((state) => state.isActive);
  const endQuiz = useQuizStore((state) => state.endQuiz);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  const fetchData = async () => {
    try {
      // Fetch notifications for the current user
      const notifUrl = currentUser ? `/api/notifications?userId=${currentUser.userId}` : '/api/notifications';
      const res = await fetch(notifUrl);
      const data = await res.json();
      const normalized = normalizeKeys(data) as Array<{ isRead: boolean; type: string; title: string }>;
      const unread = normalized.filter((n) => !n.isRead);
      setUnreadNotifications(unread.length);
      
      // If there are unread urgent notifications, notify the user
      const urgent = unread.find((n) => n.type === 'warning' || n.type === 'error');
      if (urgent) {
        showToast(`未読の重要通知があります: ${urgent.title}`, 'error');
      }


    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    // Sanity check: Ensure authenticated users have a valid userId
    if (isAuthenticated && (!currentUser || !currentUser.userId)) {
      console.warn("[Neural Link] Corrupted session detected. Emergency logout sequence initiated.");
      logout();
      return;
    }

    if (currentUser) {
      fetchData();
      // Refresh unread count every 60 seconds
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser, isAuthenticated, isAdmin]);
  


  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (newView: typeof view) => {
    // Always attempt to scroll to top on navigation to ensure SPA feel
    const scrollToTop = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    };

    if (view === newView) {
      scrollToTop();
      return;
    }

    if (view === 'quiz' && isActive && newView !== 'quiz') {
      endQuiz();
    }

    scrollToTop();
    setView(newView);
  };

  useEffect(() => {
    // Disable browser automatic scroll restoration to prevent jumps during login/navigation
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const scrollToTop = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    };

    // Immediate
    scrollToTop();
    
    // Multiple attempts to fight off late-rendering shifts or browser behavior
    const timers = [
      setTimeout(scrollToTop, 10),
      setTimeout(scrollToTop, 100),
      setTimeout(scrollToTop, 500)
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [view, isBooting, isAuthenticated]);

  const resetDashboard = useDashboardStore(state => state.reset);

  const handleLogout = () => {
    resetDashboard();
    logout();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      
      // B/ESC: Always goes to dashboard (unless in quiz, handled by Quiz component)
      if (key === 'b' || key === 'escape') {
        if (view !== 'quiz') {
          handleNavigate('dashboard');
        }
        return;
      }

      // ONLY allow navigation shortcuts globally
      // View-specific shortcuts (E, Q, W, 1-4, etc) are handled by individual components
      switch (key) {
        case 'h': 
          handleNavigate('dashboard'); 
          break;
        case 's': 
          handleNavigate('study'); 
          break;
        case 'p': 
          handleNavigate('submit'); 
          break;
        case 't': 
          handleNavigate('contact'); 
          break;
        case 'l': 
          handleNavigate('history'); 
          break;
        case 'm': 
          handleNavigate('stats'); 
          break;
        case 'a': 
          if (isAdmin && view !== 'quiz') handleNavigate('admin'); 
          break;
        case 'f': 
          handleNavigate('flashcards'); 
          break;
        // All other keys are handled by view-specific components
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [view, isAdmin]);

  // Language is now locked to 'ja'

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (isBooting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-8 overflow-hidden relative">
        <NeuralBackground />
        <div className="relative z-10 flex flex-col items-center space-y-8">
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 rounded-full border-t-2 border-r-2 border-accent/20"
            />
            <Cpu className="absolute inset-0 m-auto w-12 h-12 text-accent animate-pulse" />
          </div>
          
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">
              G-KENTEI <span className="text-accent underline decoration-accent/30 underline-offset-8">PREP</span>
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest h-4">
              {t('initialize_sequence')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout onNavigate={handleNavigate}>
      <div className="flex flex-col h-full overflow-hidden relative">
        <NeuralBackground />
        {/* Universal Header with Shortcuts */}
        <header className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-white/[0.04] bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4 md:gap-12">
                <div 
                  onClick={() => handleNavigate('dashboard')}
                  className="lg:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg cursor-pointer"
                >
                  <Cpu className="w-5 h-5 text-white" />
                </div>

                <button
                  onClick={() => handleNavigate('notifications')}
                  className={clsx(
                    "p-2 rounded-lg transition-all group relative",
                    view === 'notifications' ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-950 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  )}
                </button>

                {/* Mobile Quick Actions */}
                <div className="lg:hidden flex items-center gap-2">
                  <button
                    onClick={() => handleNavigate('submit')}
                    className={clsx(
                      "p-2 rounded-lg transition-all",
                      view === 'submit' ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-white"
                    )}
                    title="問題投稿"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleNavigate('contact')}
                    className={clsx(
                      "p-2 rounded-lg transition-all",
                      view === 'contact' ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-white"
                    )}
                    title="お問い合わせ"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                </div>
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { id: 'dashboard', icon: LayoutIcon, label: t('home'), shortcut: 'H' },
                { id: 'study', icon: Database, label: t('study'), shortcut: 'S' },
                { id: 'history', icon: Clock, label: t('logs'), shortcut: 'L' },
                { id: 'stats', icon: BarChart3, label: t('metrics'), shortcut: 'M' },
                { id: 'submit', icon: Radio, label: '問題投稿', shortcut: 'P' },
                { id: 'contact', icon: Shield, label: 'お問い合わせ', shortcut: 'T' },
                ...(isAdmin ? [{ id: 'admin', icon: Settings, label: t('admin'), shortcut: 'A' }] : [])
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id as any)}
                  className={clsx(
                    "px-4 py-2 rounded-lg flex items-center gap-2 transition-all group relative",
                    view === item.id ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                  <span className="hidden xl:inline text-[8px] font-black text-slate-700/60 group-hover:text-slate-500 transition-colors">[{item.shortcut}]</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {currentUser && (
              <div className="flex flex-col items-end mr-1 md:mr-2">
                <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest">{currentUser.nickname}</span>
                <span className="hidden xs:block text-[7px] font-mono text-accent uppercase tracking-[0.2em]">{currentUser.role === 'admin' ? t('admin') : 'USER'} PROTOCOL</span>
              </div>
            )}
            
            {status === 'free' && (
            <button 
                onClick={() => setUpgradeModalOpen(true)}
                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-indigo-500/30 transition-all flex items-center gap-2"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Upgrade
            </button>
            )}

            <motion.div 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-500 transition-colors group relative"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:block absolute -bottom-1 right-0 text-[7px] font-black text-slate-700/60 group-hover:text-red-500/40 transition-colors">[ESC]</span>
            </motion.div>
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse flex items-center gap-2 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                {t('optimized')}
              </div>
              <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">v4.1.0_STABLE</div>
            </div>
          </div>
        </header>

        <main 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 flex flex-col min-h-screen"
        >
          <AnimatePresence>
            <motion.div 
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 py-4 md:py-12"
            >
              {view === 'dashboard' && (
                <Dashboard 
                  onStartQuiz={() => handleNavigate('study')} 
                  onViewStats={() => handleNavigate('stats')}
                  onStartWeakPointQuiz={() => setView('quiz')}
                  onResumeSession={async (category: string) => {
                    const result = await startQuiz(category);
                    if (result.success) {
                        setView('quiz');
                    } else {
                        showToast(result.error || 'Failed to resume session', 'error');
                    }
                  }}
                />
              )}
              {view === 'study' && <StudyMode onStartPractice={async (cat) => {
                console.log('[App] Starting quiz for category:', cat);
                try {
                  const result = await startQuiz(cat);
                  console.log('[App] Quiz start result:', result);
                  if (result.success) {
                      setView('quiz');
                  } else {
                      const errorMsg = result.error || 'セクタの初期化に失敗しました';
                      console.error('[App] Quiz start failed:', errorMsg);
                      showToast(errorMsg, 'error');
                  }
                } catch (error) {
                  console.error('[App] Exception during quiz start:', error);
                  showToast('予期しないエラーが発生しました', 'error');
                }
              }} />}
              {view === 'history' && <HistoryView />}
              {view === 'stats' && <Statistics />}
              {view === 'admin' && <AdminDashboard />}
              {view === 'quiz' && <Quiz onBack={() => handleNavigate('study')} />}
              {view === 'notifications' && <NotificationView />}
              {view === 'flashcards' && <FlashcardView onBack={() => handleNavigate('study')} />}
              {view === 'contact' && <ContactView />}
              {view === 'submit' && <SubmitQuestionView />}
            <AnimatePresence>
              {toast.type && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast({ message: '', type: null })} 
                />
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <footer className="mt-auto px-2 md:px-6 py-6 md:py-8 border-t border-white/[0.04] bg-slate-900/50 backdrop-blur-sm relative z-10 mb-16 lg:mb-0">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                <Shield className="w-3 h-3 text-accent" />
                {t('encrypted_store')}
              </div>
              <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                {t('syllabus_version')}
              </div>
            </div>
            <div className="flex items-center gap-6 self-center md:self-auto">
               <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors">
                  <Github className="w-4 h-4" />
               </a>
               <p className="text-slate-700 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] cursor-pointer hover:text-red-500 transition-colors">
                 &copy; {new Date().getFullYear()} {t('copyright')}
               </p>
            </div>
          </div>
        </footer>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/[0.04] px-6 py-3 flex items-center justify-around z-[100] pb-safe">
          {[
            { id: 'dashboard', icon: LayoutIcon, label: t('home') },
            { id: 'study', icon: Database, label: t('study') },
            { id: 'stats', icon: BarChart3, label: t('metrics') },
            { id: 'history', icon: Clock, label: t('logs') },
            ...(isAdmin ? [{ id: 'admin', icon: Settings, label: t('admin') }] : [])
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id as any)}
              className={clsx(
                "flex flex-col items-center gap-1 transition-all",
                view === item.id ? "text-accent" : "text-slate-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              {view === item.id && (
                <motion.div 
                  layoutId="activeTabMobile"
                  className="w-1 h-1 bg-accent rounded-full mt-0.5"
                />
              )}
            </button>
          ))}
        </nav>
        
        <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      </div>
    </Layout>
  );
}
