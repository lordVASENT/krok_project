import { getMockUser, logout } from '@/utils/auth'; 
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { RequestData } from './api/requests';

const RequestCard = ({ request, userId }: { request: RequestData, userId: number }) => {
    let statusColor = 'bg-orange-100 text-orange-800';
    let statusText = '';
    
    // Определяем статус и цвет
    if (request.status === 'rejected') { statusColor = 'bg-red-100 text-red-800'; statusText = 'ОТКЛОНЕНА'; } 
    else if (request.status === 'awaiting_employee_action') { statusColor = 'bg-purple-100 text-purple-800'; statusText = 'НА ВЫПОЛНЕНИИ'; } 
    else if (request.status === 'awaiting_report_approval') { statusColor = 'bg-yellow-100 text-yellow-800'; statusText = 'ОТЧЕТ НА ПРОВЕРКЕ'; } 
    else if (request.status === 'completed') { statusColor = 'bg-green-100 text-green-800'; statusText = 'ЗАВЕРШЕНА'; } 
    else if (request.status === 'created') { statusColor = 'bg-red-200 text-red-900'; statusText = `ТРЕБУЕТ ДОРАБОТКИ`; } 
    else if (request.status.startsWith('awaiting')) { statusColor = 'bg-blue-100 text-blue-800'; statusText = `ОЖИДАЕТ ${request.current_approver_role.toUpperCase()}`; }
    else { statusText = request.status.toUpperCase(); }

    // Логика колокольчика: есть изменения И изменены не мной И я еще не видел
    const showBell = request.is_modified && request.last_modified_actor_id !== userId && !request.viewed_by_ids.includes(userId);

    return (
        <Link href={`/requests/${request.id}`} className="block border rounded-lg shadow hover:shadow-lg transition bg-white p-4">
            <div className="flex justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${statusColor}`}>{statusText}</span>
                {showBell && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">🔔 Обновлено</span>}
            </div>
            <h3 className="font-bold text-gray-800 mt-2">{request.destination}</h3>
            <p className="text-sm text-gray-500">{request.start_date} — {new Intl.NumberFormat('ru-RU').format(request.cost_estimate)} ₽</p>
        </Link>
    );
};

export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('my_requests');
    const [requests, setRequests] = useState<RequestData[]>([]);
    const router = useRouter();

    const fetchData = () => {
        fetch('/api/requests')
            .then(r => r.json())
            .then(setRequests)
            .catch(err => {
                console.error("Ошибка загрузки заявок:", err);
                alert("Не удалось загрузить данные. Проверьте серверные API.");
            });
    };

    useEffect(() => {
        const u = getMockUser();
        if (!u) { router.replace('/login'); return; }
        setUser(u);
        
        if (u.role !== 'employee') setActiveTab('awaiting_approval');

        fetchData();
    }, [router]);
    
    const getFilteredRequests = (tab: string) => {
        if (!user) return [];
        return requests.filter(req => {
            const isCreator = req.employee_id === user.id;
            
            // Заявка, в которой согласующий участвовал
            const isParticipated = req.approvals.some(a => a.approver_role === user.role);
            
            // Мои заявки: Те, что я создал
            if (tab === 'my_requests') {
                return isCreator && req.status !== 'completed' && req.status !== 'rejected';
            }
            
            // Ожидают меня: Те, где я текущий согласующий
            if (tab === 'awaiting_approval') {
                return req.current_approver_role === user.role && req.status !== 'completed';
            }
            
            // Все, что касается моей работы (для согласующих)
            if (tab === 'all_active_by_role') {
                // Отображаем все, что ожидает меня И все, что я когда-либо одобрял/отклонял/модифицировал
                return (isParticipated || isCreator) && req.status !== 'completed' && req.status !== 'rejected';
            }
            
            // Архив: Завершенные или отклоненные
            if (tab === 'archive') {
                return (isCreator || isParticipated) && (req.status === 'completed' || req.status === 'rejected');
            }
            return false;
        });
    };
    
    // В зависимости от роли, устанавливаем вкладки
    const isApproverRole = user && user.role !== 'employee';
    const activeRequestsKey = isApproverRole ? 'all_active_by_role' : 'my_requests';
    if (isApproverRole && activeTab === 'my_requests') setActiveTab('all_active_by_role');
    
    const displayRequests = getFilteredRequests(activeTab);

    if (!user) return <div className="p-8">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold text-sky-700">Рабочий стол ({user.role === 'hr' ? 'Travel Coordinator' : user.role})</h1>
                    <div className='flex items-center gap-4'>
                        <span className='text-sm text-gray-600'>Привет, {user.name}!</span>
                        <button onClick={logout} className="text-red-600 border px-3 py-1 rounded hover:bg-red-50 transition">Выход</button>
                    </div>
                </header>
                
                <div className="flex gap-4 mb-6 border-b">
                    {user.role === 'employee' && (
                        <button onClick={() => setActiveTab('my_requests')} className={`pb-2 ${activeTab === 'my_requests' ? 'border-b-2 border-sky-500 font-semibold' : 'text-gray-600'}`}>Мои заявки</button>
                    )}
                    {isApproverRole && (
                        <>
                            <button onClick={() => setActiveTab('awaiting_approval')} className={`pb-2 ${activeTab === 'awaiting_approval' ? 'border-b-2 border-sky-500 font-semibold' : 'text-gray-600'}`}>Ожидают меня ({getFilteredRequests('awaiting_approval').length})</button>
                            <button onClick={() => setActiveTab('all_active_by_role')} className={`pb-2 ${activeTab === 'all_active_by_role' ? 'border-b-2 border-sky-500 font-semibold' : 'text-gray-600'}`}>Все активные</button>
                        </>
                    )}
                    <button onClick={() => setActiveTab('archive')} className={`pb-2 ${activeTab === 'archive' ? 'border-b-2 border-sky-500 font-semibold' : 'text-gray-600'}`}>Архив</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayRequests.map(req => <RequestCard key={req.id} request={req} userId={user.id} />)}
                    {displayRequests.length === 0 && (
                        <div className="col-span-full p-10 text-center text-gray-500 bg-white rounded-lg border">
                            Нет заявок в этой категории.
                            {user.role === 'employee' && activeTab === 'my_requests' && (
                                <p className='mt-2'>Нажмите '+' для создания новой заявки.</p>
                            )}
                        </div>
                    )}
                </div>
                {user.role === 'employee' && (
                    <Link href="/requests/new" className="fixed bottom-8 right-8 bg-sky-600 text-white p-4 rounded-full shadow-lg text-2xl hover:bg-sky-700 transition">
                        +
                    </Link>
                )}
            </div>
        </div>
    );
}