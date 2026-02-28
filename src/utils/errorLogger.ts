export const logError = async ({
    message,
    screenId,
    stack,
}: {
    message: string;
    screenId?: string;
    stack?: string;
}): Promise<string | null> => {
    try {
        const res = await fetch('/api/errors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                errorMessage: message,
                screenId: screenId || 'UNKNOWN_SCREEN',
                errorStack: stack || new Error().stack || '',
            }),
        });

        if (res.ok) {
            const data = await res.json();
            return data.errorId;
        }
        return null;
    } catch (err) {
        console.error('Failed to report error to backend:', err);
        return null;
    }
};
