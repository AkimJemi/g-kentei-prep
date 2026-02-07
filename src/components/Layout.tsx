import React from 'react';
import { Brain, MessageCircleQuestion, PlusCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate?: (view: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
  return (
    <div className="min-h-screen bg-primary text-slate-200 flex flex-col font-sans selection:bg-accent selection:text-primary">
      {/* Header */}
      <header className="border-b border-slate-800 bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center space-x-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent group-hover:to-white transition-all">
              AI G-Kentei Prep
            </span>
          </div>

          <nav className="flex items-center space-x-6 text-sm font-medium">
            <button onClick={() => onNavigate?.('submit')} className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">問題を投稿</span>
            </button>
            <button onClick={() => onNavigate?.('contact')} className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors relative">
              <MessageCircleQuestion className="w-4 h-4" />
              <span className="hidden sm:inline">お問い合わせ</span>

            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} G-Kentei Prep. Designed by Akim.</p>
        </div>
      </footer>
    </div>
  );
};
