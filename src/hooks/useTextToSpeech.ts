import { useState, useEffect, useRef, useCallback } from 'react';

interface TTSOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceURI?: string;
    lang?: string;
}

interface TTSState {
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
    currentWord: string;
}

export const useTextToSpeech = () => {
    const [state, setState] = useState<TTSState>({
        isPlaying: false,
        isPaused: false,
        progress: 0,
        currentWord: ''
    });

    const synth = useRef<SpeechSynthesis | null>(null);
    const utterance = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synth.current = window.speechSynthesis;
        }
    }, []);

    const speak = useCallback((text: string, options: TTSOptions = {}) => {
        if (!synth.current) return;

        synth.current.cancel();

        utterance.current = new SpeechSynthesisUtterance(text);

        utterance.current.rate = options.rate || 1.0;
        utterance.current.pitch = options.pitch || 1.0;
        utterance.current.volume = options.volume || 1.0;
        utterance.current.lang = options.lang || 'ja-JP'; // Default to Japanese for G-Kentei

        const voices = synth.current.getVoices();

        // Priority ranking for Japanese voices to get the most human-like experience
        const rankedVoices = voices
            .filter(v => v.lang.startsWith('ja'))
            .sort((a, b) => {
                const getScore = (v: SpeechSynthesisVoice) => {
                    let score = 0;
                    if (v.name.includes('Natural')) score += 100; // Edge Natural voices are amazing
                    if (v.name.includes('Online')) score += 80;  // High quality online voices
                    if (v.name.includes('Google')) score += 50;  // Google voices are decent
                    if (v.name.includes('Microsoft')) score += 30; // Microsoft's standard are better than system defaults
                    return score;
                };
                return getScore(b) - getScore(a);
            });

        const preferredVoice = rankedVoices[0];

        if (preferredVoice) {
            utterance.current.voice = preferredVoice;
        }

        utterance.current.onstart = () => {
            setState(prev => ({ ...prev, isPlaying: true, isPaused: false, progress: 0 }));
        };

        utterance.current.onend = () => {
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false, progress: 1, currentWord: '' }));
        };

        utterance.current.onpause = () => {
            setState(prev => ({ ...prev, isPaused: true }));
        };

        utterance.current.onresume = () => {
            setState(prev => ({ ...prev, isPaused: false }));
        };

        utterance.current.onboundary = (event) => {
            const current = event.charIndex;
            // Simple progress estimation
            const progress = text.length > 0 ? current / text.length : 0;
            setState(prev => ({
                ...prev,
                progress,
                currentWord: text.substring(current, current + 5) // Rough approximation
            }));
        };

        synth.current.speak(utterance.current);
    }, []);

    const pause = useCallback(() => {
        if (synth.current?.speaking && !synth.current.paused) {
            synth.current.pause();
        }
    }, []);

    const resume = useCallback(() => {
        if (synth.current?.paused) {
            synth.current.resume();
        }
    }, []);

    const stop = useCallback(() => {
        if (synth.current) {
            synth.current.cancel();
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false, progress: 0 }));
        }
    }, []);

    return {
        speak,
        pause,
        resume,
        stop,
        ...state
    };
};
