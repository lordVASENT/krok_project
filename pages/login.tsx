import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { mockLogin, getMockUser } from '@/utils/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const router = useRouter();

    // Проверяем, вошел ли пользователь, сразу перенаправляем на Dashboard
    useEffect(() => {
        if (getMockUser()) {
            router.replace('/dashboard');
        }
    }, [router]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        const user = mockLogin(email);

        if (user) {
            console.log(`Успешный вход как ${user.name} (${user.role}).`);
            router.push('/dashboard'); // Redirect to dashboard after successful login
        } else {
            alert('Неверный логин. Используйте anna, ivan, olga или petr.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-sky-700 mb-6">SkyWay Travel Portal</h1>
                <p className="text-center text-sm text-gray-500 mb-4">Демо-логины: anna, ivan, olga, petr (введите часть почты)</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        className="w-full p-3 border border-gray-300 rounded focus:ring-sky-500 focus:border-sky-500" 
                        placeholder="Email (напр. anna@skyway.com)" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                    />
                    <button 
                        type="submit" 
                        className="w-full bg-sky-600 text-white p-3 rounded-lg font-semibold hover:bg-sky-700 transition duration-200"
                    >
                        Войти
                    </button>
                </form>
            </div>
        </div>
    );
}