// pages/dashboard.tsx

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
// ИМПОРТИРУЕМ mockLogout
import { getMockUser, UserRole, mockLogout } from '@/utils/auth'; 
import Link from 'next/link';

// --- Типы ---
interface RequestData {
    id: number;
    created_by_id: number;
    created_by_role: 'employee' | 'manager' | 'hr' | 'finance';
    status: 'awaiting_manager' | 'awaiting_hr' | 'awaiting_finance' | 'approved' | 'rejected' | 'created';
    current_approver_role: UserRole;
}

// --- Компонент Dashboard ---
export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'my' | 'awaiting' | 'archive'>('my');
    
    // Изначально пустой массив, данные будут загружаться из API
    const [requests, setRequests] = useState<RequestData[]>([]); 

    // --- ФУНКЦИЯ ВЫХОДА ---
    const handleLogout = () => {
        // ИСПОЛЬЗУЕМ ИМПОРТИРОВАННУЮ ФУНКЦИЮ ДЛЯ КОРРЕКТНОГО УДАЛЕНИЯ КЛЮЧА
        mockLogout(); 
        // Перенаправление на страницу входа
        router.push('/login');
    };
    // ------------------------

    // 1. Проверка авторизации и ЗАГРУЗКА ДАННЫХ ИЗ API
    useEffect(() => {
        const loggedInUser = getMockUser();
        if (!loggedInUser) {
            router.replace('/login');
            return;
        }
        setUser(loggedInUser);

        // Функция для загрузки данных
        const fetchRequests = async () => {
            try {
                const response = await fetch('/api/requests');
                if (!response.ok) {
                    throw new Error('Failed to fetch requests from API.');
                }
                const data: RequestData[] = await response.json();
                setRequests(data);
            } catch (error) {
                console.error("Error fetching requests:", error);
                setRequests([]);
            }
        };

        fetchRequests();
    }, [router]);
    
    // Ранний выход, пока user не загружен
    if (!user) {
        return <div className="min-h-screen bg-gray-50 p-8">Загрузка...</div>;
    }

    // --- Логика фильтрации ---
    const filteredRequests = requests.filter(request => {
        if (activeTab === 'my') {
            return request.created_by_id === user.id; 
        }
        if (activeTab === 'awaiting') {
            return (
                request.status.startsWith('awaiting_') &&
                request.current_approver_role === user.role
            );
        }
        if (activeTab === 'archive') {
            return request.status === 'approved' || request.status === 'rejected';
        }
        return false;
    });

    const isEmployee = user.role === 'employee';
    
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                
                {/* --- HEADER: Название и Выход --- */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold text-sky-800">Рабочий стол</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600">
                            {user.name} ({user.role.toUpperCase()})
                        </span>
                        <button
                            onClick={handleLogout}
                            className="text-red-600 hover:text-red-800 transition font-semibold"
                        >
                            Выход
                        </button>
                    </div>
                </div>

                {/* --- Кнопка создания заявки --- */}
                <div className="flex justify-end mb-6">
                    {isEmployee && (
                        <Link href="/requests/new" className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition font-semibold">
                            + Создать заявку
                        </Link>
                    )}
                </div>

                {/* --- Навигация по вкладкам --- */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition ${
                                activeTab === 'my'
                                    ? 'border-sky-500 text-sky-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Мои заявки ({requests.filter(r => r.created_by_id === user.id).length})
                        </button>

                        {user.role !== 'employee' && (
                            <button
                                onClick={() => setActiveTab('awaiting')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition ${
                                    activeTab === 'awaiting'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Ожидают согласования ({requests.filter(r => r.status.startsWith('awaiting_') && r.current_approver_role === user.role).length})
                            </button>
                        )}
                        
                        <button
                            onClick={() => setActiveTab('archive')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition ${
                                activeTab === 'archive'
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Архив
                        </button>
                    </nav>
                </div>
                
                {/* --- Список заявок --- */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    {filteredRequests.length === 0 ? (
                        <p className="p-6 text-gray-500">
                            {activeTab === 'my' ? 'У вас пока нет созданных заявок.' : 'Нет заявок, ожидающих вашего действия.'}
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {filteredRequests.map(request => (
                                <li key={request.id}>
                                    <Link href={`/requests/${request.id}`} className="block hover:bg-gray-50 transition duration-150">
                                        <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                            <div className="flex min-w-0 flex-1 items-center">
                                                <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-3 md:gap-4">
                                                    <p className="text-sm font-medium text-sky-600 truncate">Заявка №{request.id}</p>
                                                    <p className="mt-2 flex items-center text-sm text-gray-500">
                                                        <span>
                                                            Создана: {request.created_by_role.toUpperCase()}
                                                        </span>
                                                    </p>
                                                    <div className="mt-2 flex items-center text-sm text-gray-500">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {request.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}