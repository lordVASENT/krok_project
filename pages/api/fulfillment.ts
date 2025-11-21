import type { NextApiRequest, NextApiResponse } from 'next';
import { FulfillmentStatus, Approval } from './requests'; 

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { request_id, user_id, fulfillment_status, action, report_text } = req.body;
    const request = global.requestStore?.find(r => r.id === request_id);

    if (!request) return res.status(404).json({ message: 'Request not found.' });
    
    const today = new Date().toISOString().split('T')[0];

    // Функция для включения колокольчика и логирования
    const triggerNotification = (field: string, oldV: string, newV: string) => {
        request.is_modified = true;
        request.last_modified_actor_id = user_id;
        // Уведомляем всех, кроме себя
        request.viewed_by_ids = [user_id]; 
        request.change_history.push({
            date: today, actor_role: 'employee', field_name: field, old_value: oldV, new_value: newV
        });
    };

    // 1. Смена статуса выполнения
    if (fulfillment_status) {
        if (fulfillment_status !== request.fulfillment_status) {
            const oldStatus = request.fulfillment_status;
            request.fulfillment_status = fulfillment_status as FulfillmentStatus;
            
            // 🔥 Включаем колокольчик при смене статуса
            triggerNotification('Статус выполнения', oldStatus, fulfillment_status);
        }
        return res.status(200).json(request);
    }

    // 2. Отправка отчета (текст и смена статуса)
    if (action === 'add_report') {
        request.report_text = report_text || '';
        request.report_added = true;
        request.status = 'awaiting_report_approval'; // Переход на проверку отчета
        request.current_approver_role = 'finance'; 

        // 🔥 Включаем колокольчик
        triggerNotification('Отчет', 'Не сдан', 'Отправлен на проверку');

        request.approvals.push({
            approver_role: 'employee', action: 'resubmitted', comment: 'Отчет отправлен.', date: today
        });
        return res.status(200).json(request);
    }

    return res.status(400).json({ message: 'Invalid action.' });
}