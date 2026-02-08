import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'OK',
    cancelText = 'キャンセル',
    type = 'warning',
    onConfirm,
    onCancel
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
                    />
                    
                    {/* Dialog */}
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className={clsx(
                                "p-6 border-b border-slate-800 flex items-center gap-4",
                                type === 'danger' && "bg-red-500/5",
                                type === 'warning' && "bg-amber-500/5",
                                type === 'info' && "bg-blue-500/5"
                            )}>
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                    type === 'danger' && "bg-red-500/10 border border-red-500/20",
                                    type === 'warning' && "bg-amber-500/10 border border-amber-500/20",
                                    type === 'info' && "bg-blue-500/10 border border-blue-500/20"
                                )}>
                                    <AlertTriangle className={clsx(
                                        "w-6 h-6",
                                        type === 'danger' && "text-red-500",
                                        type === 'warning' && "text-amber-500",
                                        type === 'info' && "text-blue-500"
                                    )} />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-white flex-1">
                                    {title}
                                </h3>
                                <button
                                    onClick={onCancel}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <p className="text-slate-300 leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex gap-3 justify-end">
                                <button
                                    onClick={onCancel}
                                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 hover:border-slate-700"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onCancel();
                                    }}
                                    className={clsx(
                                        "px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                                        type === 'danger' && "bg-red-500 hover:bg-red-600 text-white border border-red-400",
                                        type === 'warning' && "bg-amber-500 hover:bg-amber-600 text-white border border-amber-400",
                                        type === 'info' && "bg-blue-500 hover:bg-blue-600 text-white border border-blue-400"
                                    )}
                                >
                                    <Check className="w-4 h-4" />
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
