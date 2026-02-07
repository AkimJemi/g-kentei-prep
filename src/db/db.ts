export interface User {
    userId: string;            // Primary key - login ID
    nickname: string;          // Display name
    role: 'user' | 'admin';
    status?: 'active' | 'suspended';
    joinedAt: Date;
}

export interface QuizAttempt {
    id?: number;
    userId: string;            // Foreign key to users.userId
    date: Date;
    score: number;
    totalQuestions: number;
    category: string;
    wrongQuestionIds: number[];
    userAnswers: { [questionId: number]: number };
}

export interface QuizSession {
    userId: string;            // Foreign key to users.userId
    category: string;
    currentQuestionIndex: number;
    answers: (number | undefined)[];
    lastUpdated: Date;
}

class TableMock<T> {
    endpoint: string;
    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    private convertDates(item: any): T {
        if (!item) return item;
        const dateFields = ['date', 'joinedAt', 'lastUpdated'];
        dateFields.forEach(field => {
            if (item[field] && typeof item[field] === 'string') {
                item[field] = new Date(item[field]);
            }
        });
        return item;
    }

    async get(id: any): Promise<T | null> {
        console.log(`[Neural DB] GET ${this.endpoint}`, id);
        let res;
        if (typeof id === 'object' && id !== null) {
            const query = new URLSearchParams(id).toString();
            res = await fetch(`/api${this.endpoint}?${query}`);
        } else {
            res = await fetch(`/api${this.endpoint}/${id}`);
        }
        if (!res.ok) return null;
        const data = await res.json();
        return Array.isArray(data) ? data.map(i => this.convertDates(i))[0] : this.convertDates(data);
    }

    async add(item: T): Promise<string> {
        console.log(`[Neural DB] ADD ${this.endpoint}`, item);
        const res = await fetch(`/api${this.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const data = await res.json();
        return data.userId; // Return userId instead of id
    }

    async put(item: T): Promise<void> {
        console.log(`[Neural DB] PUT ${this.endpoint}`, item);
        await fetch(`/api${this.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
    }

    async update(id: any, changes: Partial<T>): Promise<void> {
        console.log(`[Neural DB] UPDATE ${this.endpoint}`, id, changes);
        const idKey = Array.isArray(id) ? id.join(',') : id;
        await fetch(`/api${this.endpoint}/${idKey}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes)
        });
    }

    async delete(id: any): Promise<void> {
        console.log(`[Neural DB] DELETE ${this.endpoint}`, id);
        const idKey = Array.isArray(id) ? id.join(',') : id;
        await fetch(`/api${this.endpoint}/${idKey}`, {
            method: 'DELETE'
        });
    }

    async toArray(): Promise<T[]> {
        console.log(`[Neural DB] TO_ARRAY ${this.endpoint}`);
        const res = await fetch(`/api${this.endpoint}`);
        const data = await res.json();
        return Array.isArray(data) ? data.map((i: any) => this.convertDates(i)) : [];
    }

    where(field: string) {
        const endpoint = this.endpoint;
        const convertDates = this.convertDates.bind(this);

        const chain = {
            equalsIgnoreCase: (value: string) => ({
                first: async () => {
                    console.log(`[Neural DB] WHERE_EQ_IGNORE_CASE ${endpoint}`, field, value);
                    const res = await fetch(`/api${endpoint}/${value}`);
                    if (!res.ok) return null;
                    return convertDates(await res.json());
                }
            }),
            equals: (value: any) => {
                const queryObj: any = {};
                queryObj[field] = value;

                const queryChain: any = {
                    reverse: () => queryChain,
                    sortBy: async (sortField: string) => {
                        console.log(`[Neural DB] WHERE_EQ_SORT_BY ${endpoint}`, queryObj, sortField);
                        const query = new URLSearchParams(queryObj).toString();
                        const res = await fetch(`/api${endpoint}?${query}&sort=${sortField}`);
                        const data = await res.json();
                        return Array.isArray(data) ? data.map(convertDates) : [];
                    },
                    toArray: async () => {
                        console.log(`[Neural DB] WHERE_EQ_TO_ARRAY ${endpoint}`, queryObj);
                        const query = new URLSearchParams(queryObj).toString();
                        const res = await fetch(`/api${endpoint}?${query}`);
                        const data = await res.json();
                        return Array.isArray(data) ? data.map(convertDates) : [];
                    },
                    delete: async () => {
                        console.log(`[Neural DB] WHERE_EQ_DELETE ${endpoint}`, queryObj);
                        const query = new URLSearchParams(queryObj).toString();
                        await fetch(`/api${endpoint}?${query}`, { method: 'DELETE' });
                    },
                    then: (onSuccess: any) => queryChain.toArray().then(onSuccess)
                };
                return queryChain;
            }
        };
        return chain;
    }
}

export class GKenteiDatabase {
    users: TableMock<User>;
    attempts: TableMock<QuizAttempt>;
    sessions: TableMock<QuizSession>;

    constructor() {
        this.users = new TableMock<User>('/users');
        this.attempts = new TableMock<QuizAttempt>('/attempts');
        this.sessions = new TableMock<QuizSession>('/sessions');
    }

    isOpen() { return true; }
    async open() { return Promise.resolve(); }
}

export const db = new GKenteiDatabase();
