// pages/requests/new.tsx

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getMockUser } from '@/utils/auth'; 
import Link from 'next/link';

export default function NewRequestPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    
    // Состояние для полей формы
    const [destination, setDestination] = useState('');
    const [purpose, setPurpose] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [costEstimate, setCostEstimate] = useState('');

    useEffect(() => {
        const loggedInUser = getMockUser();
        // Разрешаем создавать заявки только сотрудникам
        if (!loggedInUser || loggedInUser.role !== 'employee') {
            router.replace('/dashboard');
            return;
        }
        setUser(loggedInUser);
    }, [router]);

    if (!user) {
        return <div className="min-h-screen bg-gray-50 p-8">Загрузка...</div>;
    }
    
    // --- Логика отправки формы ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Простая валидация
        if (!destination || !purpose || !startDate || !endDate || !costEstimate) {
            alert('Пожалуйста, заполните все поля.');
            return;
        }

        const payload = {
            created_by_id: user.id,
            created_by_role: user.role,
            destination,
            purpose,
            start_date: startDate,
            end_date: endDate,
            cost_estimate: parseFloat(costEstimate),
        };
        
        try {
            // POST-запрос на /api/requests для создания новой заявки
            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при создании заявки');
            }

            const result = await response.json();
            alert(`Заявка №${result.new_id} успешно создана и отправлена на согласование!`);

            // Перенаправляем на Dashboard
            router.push('/dashboard');

        } catch (error: any) {
            console.error('Ошибка при создании заявки:', error.message);
            alert(`Ошибка: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg p-8">
                <Link href="/dashboard" className="text-sky-600 hover:text-sky-800 text-sm mb-6 inline-block">
                    ← Назад к Dashboard
                </Link>
                <h1 className="text-3xl font-bold mb-6 text-sky-800">Создание новой заявки</h1>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
                            Место назначения (Город/Страна)
                        </label>
                        <input
                            type="text"
                            id="destination"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-sky-500 focus:border-sky-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
                            Цель поездки
                        </label>
                        <textarea
                            id="purpose"
                            rows={3}
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-sky-500 focus:border-sky-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                                Дата начала
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-sky-500 focus:border-sky-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                                Дата окончания
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-sky-500 focus:border-sky-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="costEstimate" className="block text-sm font-medium text-gray-700">
                            Предварительный бюджет (₽)
                        </label>
                        <input
                            type="number"
                            id="costEstimate"
                            value={costEstimate}
                            onChange={(e) => setCostEstimate(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-sky-500 focus:border-sky-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition duration-150"
                    >
                        Отправить на согласование
                    </button>
                </form>
            </div>
        </div>
    );
}