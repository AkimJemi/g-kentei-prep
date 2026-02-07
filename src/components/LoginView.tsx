import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, Shield, ArrowRight, UserPlus, LogIn, Database } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup } = useAuthStore();
  const { t } = useLanguageStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setError('');
    setIsLoading(true);
    
    try {
        if (isLogin) {
            const success = await login(username);
            if (!success) setError(t('user_not_found'));
        } else {
            const result = await signup(username, username.toLowerCase().includes('admin') ? 'admin' : 'user');
            if (!result.success) {
                if (result.error === 'exists') setError(t('user_exists'));
                else setError(`${t('conn_failure')} [${result.error}]`);
            }
        }
    } catch (err) {
        setError(t('conn_failure'));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex p-4 bg-accent/10 rounded-2xl border border-accent/20 mb-4">
             {isLogin ? <Cpu className="w-10 h-10 text-accent animate-pulse" /> : <UserPlus className="w-10 h-10 text-emerald-500 animate-pulse" />}
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white">
            {isLogin ? t('login_interface') : t('signup_interface')}
          </h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">
            {isLogin ? t('establish_downlink') : t('register_profile')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Terminal className="w-4 h-4 text-slate-500 group-focus-within:text-accent transition-colors" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('identifier_placeholder')}
              className="block w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all font-mono text-sm shadow-inner"
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest"
              >
                  <Shield className="w-4 h-4 shrink-0" />
                  {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full group relative overflow-hidden bg-accent hover:bg-sky-400 disabled:bg-slate-800 text-primary font-black uppercase tracking-widest py-4 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all active:scale-[0.98] disabled:scale-100"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
             <div className="flex items-center justify-center gap-3">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    <span>{isLogin ? t('establish_link') : t('register_profile')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
             </div>
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/[0.04] text-center">
            <button 
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                }}
                className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 mx-auto"
            >
                {isLogin ? (
                    <>
                        <Database className="w-3 h-3" />
                        {t('need_register')}
                    </>
                ) : (
                    <>
                        <Shield className="w-3 h-3" />
                        {t('already_active')}
                    </>
                )}
            </button>
        </div>

        <div className="mt-12 text-center">
            <p className="text-[8px] font-mono text-slate-700 uppercase tracking-widest leading-relaxed">
                {t('security_warning')}<br />
                Neural-Link Version: 4.0.2_SECURE
            </p>
        </div>
      </motion.div>
    </div>
  );
};
