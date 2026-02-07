export const normalizeKeys = (item: any): any => {
    if (!item || typeof item !== 'object') return item;

    // Handle Arrays
    if (Array.isArray(item)) {
        return item.map(i => normalizeKeys(i));
    }

    const mapping: { [key: string]: string } = {
        userid: 'userId',
        joinedat: 'joinedAt',
        totalquestions: 'totalQuestions',
        wrongquestionids: 'wrongQuestionIds',
        useranswers: 'userAnswers',
        currentquestionindex: 'currentQuestionIndex',
        lastupdated: 'lastUpdated',
        displayorder: 'displayOrder',
        isread: 'isRead',
        createdat: 'createdAt',
        correctanswer: 'correctAnswer',
        repliedat: 'repliedAt'
    };

    const newItem: any = {};
    for (const [key, value] of Object.entries(item)) {
        const normalizedKey = mapping[key.toLowerCase()] || key;
        let finalValue = value;

        // Handle nested objects (excluding null and Date)
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            finalValue = normalizeKeys(value);
        }

        // Handle dates
        if (['date', 'joinedat', 'lastupdated', 'createdat', 'repliedat'].includes(key.toLowerCase()) && typeof value === 'string') {
            finalValue = new Date(value);
        }

        // Handle JSON strings (Postgres sometimes returns them as strings if not using jsonb)
        if (typeof value === 'string' && ['wrongquestionids', 'useranswers', 'options', 'translations', 'answers'].includes(key.toLowerCase())) {
            try {
                finalValue = JSON.parse(value);
            } catch (e) {
                // Not a JSON string after all
            }
        }

        newItem[normalizedKey] = finalValue;
    }
    return newItem;
};
