import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock components that might cause issues or are heavy
vi.mock('../components/LoginView', () => ({
  LoginView: () => <div data-testid="login-view">Login View Mock</div>
}));

vi.mock('../components/NeuralBackground', () => ({
    NeuralBackground: () => <div data-testid="neural-bg">Background</div>
}));

// Mock stores
vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    isAdmin: false,
    logout: vi.fn(),
    currentUser: null,
  }),
}));

vi.mock('../store/useLanguageStore', () => ({
  useLanguageStore: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../store/useQuizStore', () => ({
    useQuizStore: (selector: any) => {
        const state = {
            startQuiz: vi.fn(),
            isActive: false,
            endQuiz: vi.fn(),
        };
        return selector ? selector(state) : state;
    }
}));

vi.mock('../store/useDashboardStore', () => ({
    useDashboardStore: (selector: any) => {
        const state = {
             reset: vi.fn()
        };
        return selector ? selector(state) : state;
    }
}));

describe('App Component', () => {
  it('renders login view when not authenticated', () => {
    render(<App />);
    expect(screen.getByTestId('login-view')).toBeInTheDocument();
  });
});
