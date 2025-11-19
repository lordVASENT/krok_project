// utils/auth.ts

// Тестовые пользователи с ролями из нашей БД
const MOCK_USERS = {
    'anna.s@skyway.com': { id: 1, role: 'employee', name: 'Анна Сотрудник' },
    'diana.r@skyway.com': { id: 5, role: 'manager', name: 'Диана Руководитель' },
    'zhanna.h@skyway.com': { id: 7, role: 'hr', name: 'Жанна HR' },
    'igor.f@skyway.com': { id: 8, role: 'finance', name: 'Игорь Финансист' },
  };
  
  // Ключ, под которым мы храним данные в браузере
  const USER_STORAGE_KEY = 'skyway_user_data';
  
  // --- Тип данных (ОБЯЗАТЕЛЬНО С EXPORT) ---
  export type UserRole = 'employee' | 'manager' | 'hr' | 'finance';
  
  /** * Имитирует вход: сохраняет данные пользователя в браузере (localStorage)
   * Возвращает данные пользователя или null
   */
  export const mockLogin = (email: string) => {
    const user = MOCK_USERS[email as keyof typeof MOCK_USERS];
    
    if (user) {
      // Сохраняем ID, Роль и Имя
      if (typeof window !== 'undefined') { // Проверка на браузерную среду
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }
    return null;
  };
  
  /** * Получает данные текущего пользователя из браузера (ОБЯЗАТЕЛЬНО С EXPORT)
   * Возвращает объект пользователя или null
   */
  export const getMockUser = () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(USER_STORAGE_KEY);
      if (data) {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error("Ошибка парсинга данных пользователя:", e);
          return null;
        }
      }
    }
    return null;
  };
  
  /** Имитирует выход (ОБЯЗАТЕЛЬНО С EXPORT) */
  export const mockLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };