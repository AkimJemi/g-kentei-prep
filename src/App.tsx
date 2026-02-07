import { useState, useEffect } from 'react';
import { useQuizStore } from './store/useQuizStore';
import { useLanguageStore } from './store/useLanguageStore';
import { NeuralBackground } from './components/NeuralBackground';
import { useAuthStore } from './store/useAuthStore';
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

export default function App() {
  const { t } = useLanguageStore();
  const [view, setView] = useState<'dashboard' | 'study' | 'history' | 'quiz' | 'stats' | 'admin' | 'contact' | 'submit' | 'notifications' | 'flashcards'>('dashboard');
  const [isBooting, setIsBooting] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [unreadNotifications, setUnreadNotifications] = useState(0);


  const { isAuthenticated, isAdmin, logout, currentUser } = useAuthStore();
  const startQuiz = useQuizStore((state) => state.startQuiz);
  const isActive = useQuizStore((state) => state.isActive);
  const endQuiz = useQuizStore((state) => state.endQuiz);

  const fetchData = async () => {
    try {
      // Fetch notifications for the current user
      const notifUrl = currentUser ? `/api/notifications?userId=${currentUser.userId}` : '/api/notifications';
      const res = await fetch(notifUrl);
      const data = await res.json();
      const unread = data.filter((n: any) => !n.isRead);
      setUnreadNotifications(unread.length);
      
      // If there are unread urgent notifications, notify the user
      const urgent = unread.find((n: any) => n.type === 'warning' || n.type === 'error');
      if (urgent) {
        showToast(`未読の重要通知があります: ${urgent.title}`, 'error');
      }


    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
      // Refresh unread count every 60 seconds
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser, isAdmin]);
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (newView: typeof view) => {
    if (view === 'quiz' && isActive && newView !== 'quiz') {
      endQuiz();
    }
    setView(newView);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      
      if (key === 'b' || key === 'escape') {
        if (isActive) {
          // Quiz specific back is handled in Quiz.tsx usually
        } else {
          handleNavigate('dashboard');
        }
      }

      switch (key) {
        case 'h': handleNavigate('dashboard'); break;
        case 's': handleNavigate('study'); break;
        case 'l': handleNavigate('history'); break;
        case 'm': handleNavigate('stats'); break;
        case 'a': if (isAdmin) handleNavigate('admin'); break;
        case 'f': handleNavigate('flashcards'); break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [view, isActive]);

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
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/[0.04] bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-12">
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
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'dashboard', icon: LayoutIcon, label: t('home'), shortcut: 'H' },
                { id: 'study', icon: Database, label: t('study'), shortcut: 'S' },
                { id: 'history', icon: Clock, label: t('logs'), shortcut: 'L' },
                { id: 'stats', icon: BarChart3, label: t('metrics'), shortcut: 'M' },
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
                  <span className="text-[8px] font-black text-slate-700/60 group-hover:text-slate-500 transition-colors">[{item.shortcut}]</span>
                </button>
              ))}
            </nav>
          </div>
          
            <div className="flex items-center gap-4">
            {currentUser && (
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{currentUser.nickname}</span>
                <span className="text-[7px] font-mono text-accent uppercase tracking-[0.2em]">{currentUser.role === 'admin' ? t('admin') : 'USER'} PROTOCOL</span>
              </div>
            )}
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-red-500 transition-colors group relative"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="absolute -bottom-1 right-0 text-[7px] font-black text-slate-700/60 group-hover:text-red-500/40 transition-colors">[ESC]</span>
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse flex items-center gap-2 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                {t('optimized')}
              </div>
              <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">v4.0.0_STABLE</div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {view === 'dashboard' && (
                <Dashboard 
                  onStartQuiz={() => handleNavigate('study')} 
                  onViewStats={() => handleNavigate('stats')}
                  onStartWeakPointQuiz={() => setView('quiz')}
                  onResumeSession={async (category) => {
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
                const result = await startQuiz(cat);
                if (result.success) {
                    setView('quiz');
                } else {
                    showToast(result.error || 'Failed to initialize sector', 'error');
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
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {toast.type && (
              <Toast 
                  message={toast.message} 
                  type={toast.type} 
                  onClose={() => setToast({ message: '', type: null })} 
              />
            )}
          </AnimatePresence>
        </main>

        <footer className="px-6 py-6 border-t border-white/[0.04] bg-slate-900/30 relative z-10">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <Shield className="w-3 h-3 text-accent" />
                {t('encrypted_store')}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                {t('syllabus_version')}
              </div>
            </div>
            <div className="flex items-center gap-6">
               <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors">
                  <Github className="w-4 h-4" />
               </a>
               <p 
                 onClick={() => setView('admin')}
                 className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] cursor-pointer hover:text-red-500 transition-colors"
               >
                 &copy; {new Date().getFullYear()} {t('copyright')}
               </p>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
