import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useSubscriptionStore } from '../store/useSubscriptionStore';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
    const { status, upgrade } = useSubscriptionStore();

    const handleUpgrade = (plan: 'basic' | 'premium') => {
        // Upgrade logic (Redirect to Nexus Prime Checkout)
        // window.location.href = `http://localhost:3000/checkout?plan=${plan}`;
        upgrade(plan);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                            Access <span className="text-cyan-400">Premium Features</span>
                        </h2>
                        <p className="text-slate-400 text-sm">Unlock unlimited quizzes, AI analysis, and more.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Basic Plan */}
                        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-colors">
                            <h3 className="text-lg font-bold text-white mb-2">Pro Plan</h3>
                            <div className="text-3xl font-black text-white mb-4">¥980<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                            <ul className="space-y-2 mb-6 text-sm text-slate-300">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Unlimited Quizzes</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Detailed Analytics</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Ad-free Experience</li>
                            </ul>
                            <button 
                                onClick={() => handleUpgrade('basic')}
                                className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
                            >
                                Select Plan
                            </button>
                        </div>

                        {/* Premium Plan */}
                        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 rounded-xl p-6 border border-indigo-500/50 relative">
                            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Recommended</div>
                            <h3 className="text-lg font-bold text-white mb-2">AI Premium</h3>
                            <div className="text-3xl font-black text-white mb-4">¥1,980<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                            <ul className="space-y-2 mb-6 text-sm text-slate-300">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Everything in Pro</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> AI Weakness Analysis</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Mock Exams</li>
                            </ul>
                            <button 
                                onClick={() => handleUpgrade('premium')}
                                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
