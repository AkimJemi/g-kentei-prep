import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate?: (view: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-primary text-slate-200 flex flex-col font-sans selection:bg-accent selection:text-primary">
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
