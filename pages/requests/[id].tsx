import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link'; 
import { getMockUser } from '@/utils/auth'; 
import { RequestData, FulfillmentStatus, FileAttachment } from '../api/requests';

interface RequestDetail extends RequestData { employee_name: string; }

const INITIAL_STATE: RequestDetail = {
    id: 0, employee_id: 0, employee_name: '', destination: '', purpose: '', start_date: '', end_date: '', 
    cost_estimate: 0, status: 'created', current_approver_role: 'employee', approvals: [], created_by_role: 'employee', 
    fulfillment_status: 'waiting_dates', report_added: false, report_text: '', receipt_files: [], is_modified: false, 
    change_history: [], viewed_by_ids: [], passport_photos: [], travel_tickets: [], hotel_bookings: []
};

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
    'waiting_dates': 'Ждет даты', 'in_progress': 'В командировке', 'returned': 'Вернулся'
};

// 🔥 УЛУЧШЕННЫЙ КОМПОНЕНТ ДЛЯ ДОКУМЕНТОВ
const DocumentSection = ({ title, files, canEdit, type, handleUpload, handleDelete }: any) => {
    // Вспомогательная функция для обработки выбора файла
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleUpload(type, e.target.files);
            // Сброс значения инпута для повторной загрузки того же файла
            e.target.value = '';
        }
    };

    return (
        <div className="mb-4 p-4 border rounded bg-gray-50">
            <h4 className="font-bold text-sm mb-2">{title} ({files?.length || 0})</h4>
            
            {canEdit && (
                <div className="mb-3 border-dashed border-2 border-gray-300 p-2 text-center hover:bg-gray-100 cursor-pointer relative">
                    <span className="text-xs text-gray-600">Нажмите или перетащите файл для загрузки</span>
                    <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                </div>
            )}

            <div className="flex flex-col gap-1">
                {files?.map((f: FileAttachment, i: number) => (
                    <div key={i} className="flex justify-between text-xs bg-white p-1 border rounded">
                        <a href={f.data} download={f.name} className="text-blue-600 truncate max-w-[80%]">📄 {f.name}</a>
                        {canEdit && <button onClick={() => handleDelete(type, i)} className="text-red-500 ml-2 hover:text-red-700">✕</button>}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function RequestDetailsPage() {
    const router = useRouter();
    const { id } = router.query; 
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [user, setUser] = useState<any>(null);
    
    // Состояния для Отчета
    const [reportText, setReportText] = useState('');
    const [selectedReportFiles, setSelectedReportFiles] = useState<FileList | null>(null);
    const [fulfillmentStatus, setFulfillmentStatus] = useState<FulfillmentStatus>('waiting_dates');
    
    // Состояния для формы редактирования (Менеджер/Финансист)
    const [editCost, setEditCost] = useState(0);
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    
    // Состояния для формы доработки (Сотрудник)
    const [empEditDest, setEmpEditDest] = useState('');
    const [empEditCost, setEmpEditCost] = useState(0);
    const [empEditPurpose, setEmpEditPurpose] = useState('');
    const [empEditStart, setEmpEditStart] = useState('');
    const [empEditEnd, setEmpEditEnd] = useState('');

    const fetchData = async () => {
        const u = getMockUser();
        if (!u) { router.replace('/login'); return; }
        setUser(u);
        
        if (id) {
            const res = await fetch('/api/requests');
            if(res.ok) {
                const all = await res.json();
                const found = all.find((r: RequestData) => r.id === parseInt(id as string));
                
                if (found) {
                    setRequest({ ...INITIAL_STATE, ...found, employee_name: 'Сотрудник' });
                    setReportText(found.report_text || '');
                    setFulfillmentStatus(found.fulfillment_status);
                    
                    setEditCost(found.cost_estimate); setEditStart(found.start_date); setEditEnd(found.end_date);
                    setEmpEditDest(found.destination); setEmpEditCost(found.cost_estimate); setEmpEditPurpose(found.purpose); setEmpEditStart(found.start_date); setEmpEditEnd(found.end_date);
                    
                    // Mark seen: Отметка о просмотре для снятия колокольчика
                    if (found.is_modified && found.last_modified_actor_id !== u.id && !found.viewed_by_ids.includes(u.id)) {
                        fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_seen', request_id: found.id, user_id: u.id }) });
                    }
                } else router.replace('/dashboard');
            }
        }
    };

    useEffect(() => { fetchData(); }, [id, router]);

    const convertFiles = (files: FileList): Promise<FileAttachment[]> => {
        return Promise.all(Array.from(files).map(file => new Promise<FileAttachment>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({ name: file.name, data: reader.result as string });
            reader.onerror = () => resolve({ name: file.name, data: 'Error reading file' });
        })));
    };

    // ФУНКЦИЯ ДЛЯ ОТПРАВКИ ДОКУМЕНТОВ
    const handleDoc = async (type: string, files: FileAttachment[], shouldReload = true) => {
        await fetch('/api/documents', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ request_id: request?.id, user_role: user.role, user_id: user.id, document_type: type, action: 'update', files }) 
        });
        if (shouldReload) fetchData();
    };

    const handleUpload = async (type: string, files: FileList) => {
        const newFiles = await convertFiles(files);
        // Получаем текущие файлы, чтобы добавить к ним новые
        const current = request?.[type === 'travel' ? 'travel_tickets' : type === 'hotel' ? 'hotel_bookings' : type === 'passport' ? 'passport_photos' : 'receipt_files'] || [];
        
        // ВАЖНО: handleDoc заменит весь массив. Мы должны отправить объединенный массив.
        handleDoc(type, [...current, ...newFiles]);
    };
    
    const handleDelete = (type: string, idx: number) => {
        if(!confirm('Удалить выбранный файл?')) return;
        const current = request?.[type === 'travel' ? 'travel_tickets' : type === 'hotel' ? 'hotel_bookings' : type === 'passport' ? 'passport_photos' : 'receipt_files'] || [];
        handleDoc(type, current.filter((_: any, i: number) => i !== idx));
    };


    // ACTION: Согласование (Approved/Rejected)
    const handleAction = async (action: string) => {
        const comment = prompt('Комментарий (необязательно):'); 
        if(comment === null) return;
        
        await fetch('/api/approval', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ request_id: request?.id, approver_role: user.role, approver_id: user.id, action_status: action, comment }) 
        });
        router.push('/dashboard');
    };

    // ACTION: Изменение и Одобрение (Менеджер/Финансист)
    const handleModify = async () => {
        const comment = prompt('Комментарий к изменению:'); 
        if(comment === null) return;
        
        await fetch('/api/approval', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                request_id: request?.id, 
                approver_role: user.role, 
                approver_id: user.id, 
                comment, 
                new_cost_estimate: editCost, 
                new_start_date: editStart, 
                new_end_date: editEnd 
            }) 
        });
        router.push('/dashboard');
    };

    // ACTION: Переотправка (Сотрудник, статус 'created')
    const handleResubmit = async () => {
        if(!confirm('Повторно отправить заявку?')) return;

        await fetch('/api/approval', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                request_id: request?.id, 
                approver_role: user.role, 
                approver_id: user.id,
                action_type: 'resubmit', 
                resubmit_destination: empEditDest, 
                resubmit_purpose: empEditPurpose, 
                resubmit_cost_estimate: empEditCost,
                resubmit_start_date: empEditStart,
                resubmit_end_date: empEditEnd
            }) 
        });
        router.push('/dashboard');
    };

    // ACTION: Статус выполнения (Сотрудник)
    const handleFulfillment = async (status: FulfillmentStatus) => {
        if(!confirm(`Сменить статус выполнения на "${status}"?`)) { setFulfillmentStatus(request!.fulfillment_status); return; }
        
        await fetch('/api/fulfillment', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ request_id: request?.id, user_id: user.id, fulfillment_status: status }) 
        });
        fetchData(); // Обновляем данные
    };

    // ACTION: Отправка/Переотправка отчета (Сотрудник)
    const handleReportSubmit = async () => {
        if (!reportText) {
            alert('Пожалуйста, заполните текст отчета.');
            return;
        }
        
        if(!confirm('Отправить Отчет на проверку?')) return;

        // 1. Сначала грузим файлы (если есть)
        let finalReportFiles = request?.receipt_files || [];
        if (selectedReportFiles && selectedReportFiles.length > 0) {
            const newFiles = await convertFiles(selectedReportFiles);
            // Если была выбрана опция добавления, добавляем новые файлы
            finalReportFiles = [...(request?.receipt_files || []), ...newFiles];
        }
        
        // 1.1. Отправляем файлы, но не перезагружаем UI
        await handleDoc('receipts', finalReportFiles, false); 

        // 2. Затем отправляем текст и меняем статус 
        const res = await fetch('/api/fulfillment', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ request_id: request?.id, user_id: user.id, action: 'add_report', report_text: reportText }) 
        });

        if (res.ok) {
            router.push('/dashboard');
        } else {
            alert("Ошибка при отправке отчета.");
            fetchData();
        }
    };


    if (!request || !user) return <div className="p-8">Загрузка деталей заявки...</div>;
    
    const isCreator = user.id === request.employee_id;
    const isManager = user.role === 'manager'; 
    const isTC = user.role === 'hr'; 
    const isFinance = user.role === 'finance';
    const canModify = (isManager && request.status === 'awaiting_manager') || (isFinance && request.status === 'awaiting_finance');
    const canApprove = request.current_approver_role === user.role && !['completed', 'rejected', 'created', 'awaiting_employee_action', 'awaiting_report_approval'].includes(request.status) && !canModify;
    const isAwaitingReportApproval = request.status === 'awaiting_report_approval';
    const canEditReport = isCreator && (request.fulfillment_status === 'returned' && !request.report_added);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="bg-white shadow-xl rounded-lg p-8 max-w-4xl mx-auto">
                <Link href="/dashboard" className="text-sky-600 mb-4 inline-block text-sm font-semibold hover:underline">← Назад к списку</Link>
                
                <h1 className="text-3xl font-bold text-sky-800 mb-2">Заявка №{request.id}: {request.destination}</h1>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <p className="text-xl font-semibold text-orange-600">
                        Текущий статус: {request.status.toUpperCase()}
                    </p>
                    <span className="text-sm text-gray-500">
                        {FULFILLMENT_LABELS[request.fulfillment_status]}
                    </span>
                </div>
                
                {request.is_modified && (
                    <div className="mb-4 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
                        <p className="font-bold">⚠️ Внимание! В заявку были внесены изменения.</p>
                        <ul className="list-disc list-inside text-sm mt-2">
                            {request.change_history.slice(-3).map((c, i) => (
                                <li key={i}>{c.field_name}: **{c.old_value}** → **{c.new_value}** ({c.actor_role})</li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <h2 className="text-xl font-bold text-gray-800 mb-3">Документы</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <DocumentSection title="Паспортные данные" files={request.passport_photos} type="passport" canEdit={isCreator} handleUpload={handleUpload} handleDelete={handleDelete} />
                    <DocumentSection title="Билеты и маршрут" files={request.travel_tickets} type="travel" canEdit={isTC} handleUpload={handleUpload} handleDelete={handleDelete} />
                    <DocumentSection title="Бронирование отеля" files={request.hotel_bookings} type="hotel" canEdit={isTC} handleUpload={handleUpload} handleDelete={handleDelete} />
                    <DocumentSection title="Чеки и расходы (Отчет)" files={request.receipt_files} type="receipts" canEdit={canEditReport} handleUpload={handleUpload} handleDelete={handleDelete} />
                </div>
                
                {/* БЛОК ДОРАБОТКИ (Сотрудник) */}
                {isCreator && request.status === 'created' && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
                        <h3 className="font-bold text-orange-800 mb-3">🛠️ Доработка заявки</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                             <input className="border p-2 rounded" placeholder="Направление" value={empEditDest} onChange={e=>setEmpEditDest(e.target.value)} />
                             <input className="border p-2 rounded" type="number" placeholder="Бюджет" value={empEditCost} onChange={e=>setEmpEditCost(Number(e.target.value))} />
                        </div>
                        <button onClick={handleResubmit} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition">
                            Повторно отправить на согласование
                        </button>
                    </div>
                )}

                {/* БЛОК ИЗМЕНЕНИЯ И ОДОБРЕНИЯ (Менеджер/Финансист) */}
                {canModify && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
                        <h3 className="font-bold text-yellow-800 mb-3">⚙️ Корректировка и Согласование</h3>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <input className="border p-2 rounded" type="number" placeholder="Бюджет (₽)" value={editCost} onChange={e=>setEditCost(Number(e.target.value))} />
                            {isManager && <input className="border p-2 rounded" type="date" placeholder="Начало" value={editStart} onChange={e=>setEditStart(e.target.value)} />}
                            {isManager && <input className="border p-2 rounded" type="date" placeholder="Конец" value={editEnd} onChange={e=>setEditEnd(e.target.value)} />}
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={handleModify} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-sky-700 transition">
                                Изменить и Одобрить
                            </button>
                            <button onClick={()=>handleAction('approved')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">
                                Одобрить без изменений
                            </button>
                            <button onClick={()=>handleAction('rejected')} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition">
                                Отклонить
                            </button>
                        </div>
                    </div>
                )}
                
                {/* БЛОК СТАНДАРТНОГО ОДОБРЕНИЯ */}
                {canApprove && (
                    <div className="mb-6">
                        <button onClick={()=>handleAction('approved')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition mr-3">Одобрить</button>
                        <button onClick={()=>handleAction('rejected')} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition">Отклонить</button>
                    </div>
                )}

                {/* БЛОК УПРАВЛЕНИЯ ВЫПОЛНЕНИЕМ (Сотрудник) */}
                {isCreator && request.status === 'awaiting_employee_action' && (
                    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-sm">
                        <h3 className="font-bold text-purple-800 mb-3">✈️ Управление выполнением</h3>
                        <div className="flex items-center mb-4">
                            <span className="mr-3 text-sm font-medium">Статус:</span>
                            <select value={fulfillmentStatus} onChange={e => handleFulfillment(e.target.value as FulfillmentStatus)} className="border p-2 rounded">
                                <option value="waiting_dates">Ожидает дат/документов</option>
                                <option value="in_progress">В поездке</option>
                                <option value="returned">Вернулся</option>
                            </select>
                        </div>

                        {(fulfillmentStatus === 'returned' || !request.report_added) && (
                            <div className="mt-4 border-t pt-4">
                                <h4 className="font-semibold mb-2">Отчет о выполнении</h4>
                                <textarea 
                                    className="w-full border p-2 rounded mb-2 h-32" 
                                    placeholder="Детальный отчет о поездке..." 
                                    value={reportText} 
                                    onChange={e=>setReportText(e.target.value)} 
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-1">Приложить новые чеки/файлы (добавятся к текущим):</label>
                                <input type="file" multiple onChange={e=>setSelectedReportFiles(e.target.files)} className="text-sm w-full file:py-1 mb-3" />
                                
                                <button onClick={handleReportSubmit} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition">
                                    Отправить Отчет на проверку
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* БЛОК ПРОСМОТРА ОТЧЕТА */}
                {request.report_added && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                        <h3 className="font-bold text-blue-800 mb-3">📄 Отчет о выполнении</h3>
                        <p className="whitespace-pre-wrap text-gray-700 mb-3 border-b pb-3">{request.report_text || 'Текстовый отчет не предоставлен.'}</p>
                        
                        {/* Файлы отчета отображаются выше в DocumentSection */}

                        {isAwaitingReportApproval && isFinance && (
                             <div className="mt-4 pt-4 border-t flex space-x-3">
                                <button onClick={()=>handleAction('approved')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Утвердить</button>
                                <button onClick={()=>handleAction('rejected')} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition">На доработку</button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* ИСТОРИЯ СОГЛАСОВАНИЙ */}
                <div className="mt-6 border-t pt-4">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">История Согласований ({request.approvals.length})</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {request.approvals.map((a, i) => (
                            <div key={i} className={`text-sm p-3 rounded ${a.action === 'rejected' ? 'bg-red-50' : a.action === 'approved' ? 'bg-green-50' : a.action === 'modified' ? 'bg-yellow-50' : 'bg-gray-100'}`}>
                                <span className="font-bold uppercase">{a.action}</span> ({a.approver_role}) {a.date}
                                {a.comment && <p className="text-gray-600 italic mt-1">Комментарий: "{a.comment}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}