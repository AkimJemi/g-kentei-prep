# Implementation Plan - G-Kentei Client-Side Caching

Implement client-side caching using `@tanstack/react-query` to improve user experience and reduce server load.

## User Review Required
- [IMPORTANT] This change introduces a new dependency: `@tanstack/react-query`.
- [NOTE] `staleTime` will be set to 5 minutes (300000ms). Questions are assumed to be relatively static during a user session.

## Proposed Changes

### Core Infrastructure
#### [NEW] [src/lib/react-query.ts](file:///c:/antigravity_workspace/g-kentei-prep/src/lib/react-query.ts)
- Create `queryClient` instance with default options (`staleTime: 5 * 60 * 1000`, `gcTime: 10 * 60 * 1000`).

#### [MODIFY] [src/main.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/main.tsx)
- Wrap `App` with `QueryClientProvider`.

### Custom Hooks
#### [NEW] [src/hooks/useQuestions.ts](file:///c:/antigravity_workspace/g-kentei-prep/src/hooks/useQuestions.ts)
- Create `useQuestions` hook wrapping `useQuery`.
- Create `usePrefetchQuestions` hook or helper if needed.

### Component Refactoring
#### [MODIFY] [src/store/useQuizStore.ts](file:///c:/antigravity_workspace/g-kentei-prep/src/store/useQuizStore.ts)
- Import `queryClient` from `src/lib/react-query.ts`.
- Replace direct `fetch` in `fetchAllQuestions` with `queryClient.fetchQuery`.

#### [MODIFY] [src/components/Dashboard.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/components/Dashboard.tsx)
- Replace `fetch` with `useQuestions`.

#### [MODIFY] [src/components/StudyMode.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/components/StudyMode.tsx)
- Replace `fetch` with `useQuestions`.

#### [MODIFY] [src/components/Statistics.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/components/Statistics.tsx)
- Replace `fetch` with `useQuestions`.

#### [MODIFY] [src/components/HistoryView.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/components/HistoryView.tsx)
- Replace `fetch` with `useQuestions`.

#### [MODIFY] [src/components/FlashcardView.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/components/FlashcardView.tsx)
- Replace `fetch` with `useQuestions`.

#### [MODIFY] [src/components/AdminDashboard.tsx](file:///c:/antigravity_workspace/g-kentei-prep/src/components/AdminDashboard.tsx)
- Replace `fetchSafe` logic with `useQuestions` (or keep `fetchSafe` but wrap in query if needed, likely straight replacement for GET).

## Verification Plan

### Manual Verification
1.  **Network Activity**:
    - Open "Study Mode". Verify `api/questions` request.
    - Navigate to Dashboard.
    - Return to "Study Mode". Verify **NO** new `api/questions` request (served from cache).
2.  **Functionality**:
    - Verify Quiz starts correctly.
    - Verify Statistics load correctly.
    - Verify Admin Dashboard loads questions.
3.  **Refetching**:
    - Verify that explicitly refreshing via "Reload" button (if available) or wait > 5 mins triggers new fetch.
