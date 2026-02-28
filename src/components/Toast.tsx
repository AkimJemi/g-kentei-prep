import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | null;
    errorId?: string;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, errorId, onClose }) => {
    if (!type) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className={clsx(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl border shadow-2xl flex items-center gap-4 min-w-[300px] backdrop-blur-md",
                    type === 'error'
                        ? "bg-red-950/80 border-red-500/30 text-red-400"
                        : "bg-emerald-950/80 border-emerald-500/30 text-emerald-400"
                )}
            >
                <div className={clsx("p-2 rounded-full shrink-0", type === 'error' ? "bg-red-500/20" : "bg-emerald-500/20")}>
                    {type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div
                    className={clsx("flex-1", type === 'error' && "cursor-pointer group")}
                    onClick={() => {
                        if (type === 'error') {
                            const copyText = errorId ? `[${errorId}] ${message}` : message;
                            navigator.clipboard.writeText(copyText);
                        }
                    }}
                    title={type === 'error' ? "クリックしてエラー内容をコピー" : undefined}
                >
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 flex items-center gap-2">
                        {type === 'error' ? 'System Warning' : 'Operation Successful'}
                        {type === 'error' && <span className="hidden group-hover:inline-block text-[8px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-300">Click to Copy</span>}
                    </p>
                    <p className={clsx("text-sm font-bold tracking-tight text-white transition-colors", type === 'error' && "group-hover:text-red-300")}>
                        {errorId && <span className="mr-2 text-red-400 font-mono text-[11px] bg-red-950/50 px-1.5 py-0.5 rounded border border-red-500/20">{errorId}</span>}
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};
