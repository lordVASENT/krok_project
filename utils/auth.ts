// utils/auth.ts

export type UserRole = 'employee' | 'manager' | 'hr' | 'finance';

export interface User {
    id: number;
    role: UserRole;
    name: string;
}

const MOCK_USERS: Record<string, User> = {
    'anna': { id: 1, role: 'employee', name: 'Анна Сотрудник' },
    'ivan': { id: 2, role: 'manager', name: 'Иван Руководитель' },
    'olga': { id: 3, role: 'hr', name: 'Ольга Travel Coordinator' },
    'petr': { id: 4, role: 'finance', name: 'Петр Бухгалтер' },
};

const STORAGE_KEY = 'skyway_user_v2';

export const mockLogin = (email: string): User | null => {
    // Простая имитация входа по началу email (например, "anna")
    const key = Object.keys(MOCK_USERS).find(k => email.includes(k));
    const user = key ? MOCK_USERS[key] : null;
    
    if (user && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    return user;
};

export const getMockUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
};

export const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        // Принудительный редирект для сброса состояния
        window.location.href = '/login'; 
    }
};