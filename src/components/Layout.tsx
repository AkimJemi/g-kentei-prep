/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate?: (view: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-primary text-slate-200 flex flex-col font-sans selection:bg-accent selection:text-primary relative overflow-hidden">
      {/* 
          Main shell. 
          The background and scrolling are handled by components inside 
          to allow for specific layouts per view (like fixed headers).
      */}
      <div className="flex-grow flex flex-col">
        {children}
      </div>

      {/* Footer is moved to its own component or handled inside App.tsx to avoid fixed layout issues */}
    </div>
  );
};
