export type Language = 'ja';

export interface Question {
    id: number;
    category: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    optionExplanations?: string[];
    translations?: {
        [key: string]: {
            question: string;
            options: string[];
            explanation: string;
            optionExplanations?: string[];
            category?: string;
        }
    };
}

export interface QuizState {
    questions: Question[];
    currentQuestionIndex: number;
    score: number;
    showResults: boolean;
    answers: (number | undefined)[]; // Index of selected answers
    setAnswer: (questionIndex: number, answerIndex: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    resetQuiz: () => void;
}
