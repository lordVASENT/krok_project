// pages/requests/[id].tsx

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link'; 
import { getMockUser, UserRole } from '@/utils/auth'; 

// --- Типы (Должны совпадать с типами в pages/api/approval.ts) ---
type RequestStatus = 'awaiting_manager' | 'awaiting_hr' | 'awaiting_finance' | 'approved' | 'rejected' | 'created';

// Минимальная структура
const MOCK_REQUEST_DETAILS = {
    id: 0,
    employee_id: 0,
    employee_name: '', // Моковая заглушка
    destination: '',
    purpose: '',
    start_date: '',
    end_date: '',
    cost_estimate: 0,
    status: 'created' as RequestStatus, 
    current_approver_role: 'employee' as UserRole, 
    approvals: [] as any[], 
};

type RequestDetail = typeof MOCK_REQUEST_DETAILS & {
    status: RequestStatus;
};


export default function RequestDetailsPage() {
    const router = useRouter();
    const { id } = router.query; 
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [user, setUser] = useState<any>(null);

    // 1. Загрузка данных (теперь ИЗ API для получения АКТУАЛЬНОГО СТАТУСА)
    useEffect(() => {
        const loggedInUser = getMockUser();
        if (!loggedInUser) {
            router.replace('/login');
            return;
        }
        setUser(loggedInUser);
        
        if (id) {
            const requestId = parseInt(id as string);
            
            if (isNaN(requestId)) {
                 router.replace('/dashboard');
                 return;
            }

            const fetchRequestDetails = async () => {
                try {
                    // 1. Получаем ВЕСЬ список из API
                    const response = await fetch('/api/requests');
                    if (!response.ok) {
                        throw new Error('Failed to fetch requests from API.');
                    }
                    const allRequests: RequestDetail[] = await response.json();
                    
                    // 2. Ищем нужную заявку по ID
                    const foundRequest = allRequests.find(r => r.id === requestId);

                    if (foundRequest) {
                        // Устанавливаем актуальные данные из API.
                        // !ВАЖНО: УДАЛЕНА ЖЕСТКАЯ ЗАГЛУШКА ДЛЯ cost_estimate!
                        setRequest({
                            ...MOCK_REQUEST_DETAILS, 
                            ...foundRequest, 
                            employee_name: 'Анна Сотрудник', // Моковая заглушка (имя)
                            destination: foundRequest.destination || `Маршрут ID ${requestId}`, // Используем данные из API
                            purpose: foundRequest.purpose || 'Цель не указана',
                            start_date: foundRequest.start_date || 'Не указана',
                            end_date: foundRequest.end_date || 'Не указана',
                        } as RequestDetail);
                    } else {
                        alert('Заявка не найдена или была удалена.');
                        router.replace('/dashboard');
                    }

                } catch (error) {
                    console.error("Error fetching request details:", error);
                    alert('Ошибка загрузки данных заявки.');
                    router.replace('/dashboard');
                }
            };
            
            fetchRequestDetails();
        }
    }, [id, router]);

    // -------------------------------------------------------------------
    // ПРОВЕРКА ЗАГРУЗКИ
    if (!request || !user) {
        return <div className="min-h-screen bg-gray-50 p-8">Загрузка деталей заявки...</div>;
    }
    // -------------------------------------------------------------------
    
    // 2. Логика для кнопок действий
    const handleAction = async (action: 'approved' | 'rejected') => {
        const comment = prompt(`Введите комментарий для ${action === 'approved' ? 'Согласования' : 'Отклонения'}:`);

        if (comment === null) return; 

        const payload = {
            request_id: request.id,
            approver_id: user.id,
            approver_role: user.role,
            action_status: action,
            comment: comment || (action === 'rejected' ? 'Без комментария' : undefined),
        };
        
        try {
            const response = await fetch('/api/approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка обработки запроса');
            }

            const result = await response.json();
            alert(`Действие '${action.toUpperCase()}' для заявки ID ${request.id} обработано. Новый статус: ${result.new_status.toUpperCase()}`);

            // Перенаправляем на Dashboard
            router.push('/dashboard');

        } catch (error: any) {
            console.error('Ошибка при отправке действия:', error.message);
            alert(`Ошибка: ${error.message}`);
        }
    };
    
    // --- Условие отображения кнопок ---
    const canApprove = request!.status !== 'approved' && 
                       request!.status !== 'rejected' &&
                       request!.current_approver_role === user!.role;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="bg-white shadow-xl rounded-lg p-8 max-w-4xl mx-auto">
                <Link href="/dashboard" className="text-sky-600 hover:text-sky-800 text-sm mb-6 inline-block">
                    ← Назад к Dashboard
                </Link>
                
                <h1 className="text-3xl font-bold mb-2 text-sky-800">
                    Заявка №{request.id}: {request.destination}
                </h1>
                
                <p className={`text-lg font-semibold mb-6 ${canApprove ? 'text-orange-600' : 'text-gray-600'}`}>
                    Текущий статус: {request.status.toUpperCase()}
                </p>

                {/* --- Кнопки действий --- */}
                {canApprove && (
                    <div className="mb-8 border-2 border-dashed border-sky-300 p-4 rounded-lg bg-sky-50 flex justify-start space-x-4">
                        <button
                            onClick={() => handleAction('approved')}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                        >
                            Согласовать
                        </button>
                        <button
                            onClick={() => handleAction('rejected')}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                        >
                            Отклонить
                        </button>
                    </div>
                )}
                
                {/* --- Основные Детали --- */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-gray-700">
                    <div className="border-b pb-2">
                        <span className="text-gray-500 text-sm block">Сотрудник</span>
                        <span className="font-medium">{request.employee_name}</span>
                    </div>
                    <div className="border-b pb-2">
                        <span className="text-gray-500 text-sm block">Цель поездки</span>
                        <span className="font-medium">{request.purpose}</span>
                    </div>
                    <div className="border-b pb-2">
                        <span className="text-gray-500 text-sm block">Даты</span>
                        <span className="font-medium">{request.start_date} – {request.end_date}</span>
                    </div>
                    <div className="border-b pb-2">
                        <span className="text-gray-500 text-sm block">Бюджет</span>
                        <span className="font-medium">{request.cost_estimate?.toLocaleString('ru-RU')} ₽</span>
                    </div>
                </div>

                {/* --- История согласования --- */}
                <h2 className="2xl font-semibold mt-10 mb-4 text-sky-800">
                    История согласования
                </h2>
                {request.approvals.length === 0 ? (
                    <p className="text-gray-500">История пока пуста. Ожидает первого действия.</p>
                ) : (
                    <p className="text-gray-500">История будет отображена здесь после реализации Backend.</p>
                )}
            </div>
        </div>
    );
}