import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Share2, Mail, Check, Copy } from 'lucide-react';

const SUPPORT_EMAIL = 'rlawoals623@gmail.com';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const [shared, setShared] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyEmail = async () => {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShare = async () => {
        const shareText = 'G検定対策アプリ「G-Kentei Prep」で勉強中！無料で使えるのでぜひ 👉 https://g-kentei-prep.com';
        if (navigator.share) {
            try {
                await navigator.share({ text: shareText, url: window.location.href });
            } catch {
                // cancelled
            }
        } else {
            await navigator.clipboard.writeText(shareText);
            setShared(true);
            setTimeout(() => setShared(false), 2500);
        }
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
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-8 relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* 背景グロー */}
                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

                    {/* 閉じるボタン */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* アイコン */}
                    <div className="flex justify-center mb-5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-amber-500/20 border border-pink-500/30 flex items-center justify-center">
                            <Heart className="w-8 h-8 text-pink-400 animate-pulse" />
                        </div>
                    </div>

                    {/* タイトル */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white mb-2 tracking-wide">
                            開発を応援する ☕
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed text-center">
                            G-Kentei Prep は<span className="text-white font-semibold">完全無料</span>で運営しています。<br />
                            役に立ったと思ったら、メールで支援の一言をいただけると開発の励みになります！
                        </p>
                    </div>

                    {/* メール支援ボタン */}
                    <a
                        href={`mailto:${SUPPORT_EMAIL}?subject=G-Kentei Prep への支援&body=G-Kentei Prepを応援しています！`}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-base transition-all shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] mb-3"
                    >
                        <Mail className="w-5 h-5" />
                        メールで支援する
                    </a>

                    {/* メールアドレスコピーボタン */}
                    <button
                        onClick={handleCopyEmail}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-all border border-slate-700 hover:border-slate-600 mb-3"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-green-400">コピーしました！</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                {SUPPORT_EMAIL}
                            </>
                        )}
                    </button>

                    {/* SNS シェアボタン */}
                    <button
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-all border border-slate-700 hover:border-slate-600"
                    >
                        {shared ? (
                            <>
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-green-400">コピーしました！</span>
                            </>
                        ) : (
                            <>
                                <Share2 className="w-4 h-4" />
                                友達にシェアして応援する（無料）
                            </>
                        )}
                    </button>

                    {/* スキップテキスト */}
                    <p className="text-center mt-4 text-xs text-slate-600 hover:text-slate-500 cursor-pointer transition-colors" onClick={onClose}>
                        また今度にする
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
