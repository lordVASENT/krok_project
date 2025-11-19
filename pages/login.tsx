// pages/login.tsx
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
// Импорт из utils/auth.ts, который находится на один уровень выше
import { mockLogin, getMockUser } from '../utils/auth'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  // Проверяем, если пользователь уже вошел, сразу перенаправляем на Dashboard
  useEffect(() => {
    if (getMockUser()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockLogin(email);

    if (user) {
      // Использование Tailwind CSS для стилей, как в вашем плане
      console.log(`Успешный вход как ${user.name} (${user.role})`);
      router.push('/dashboard'); 
    } else {
      alert('Неверный Email. Попробуйте один из тестовых: anna.s@skyway.com или diana.r@skyway.com');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-sky-700">SkyWay: Вход</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Введите тестовый Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-sky-500 focus:border-sky-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-sky-600 text-white p-3 rounded-lg hover:bg-sky-700 font-semibold transition duration-200"
          >
            Войти
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-500">
            Тестовые логины: anna.s@skyway.com (employee), diana.r@skyway.com (manager)
        </p>
      </div>
    </div>
  );
}