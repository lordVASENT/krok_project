// pages/api/approval.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@/utils/auth'; 

// --- ОБНОВЛЕННЫЙ ТИП RequestData С ПОЛЯМИ ФОРМЫ ---
interface RequestData {
    id: number;
    created_by_id: number;
    created_by_role: 'employee' | 'manager' | 'hr' | 'finance';
    status: 'awaiting_manager' | 'awaiting_hr' | 'awaiting_finance' | 'approved' | 'rejected' | 'created';
    current_approver_role: UserRole;
    approvals: Array<{ role: UserRole; status: 'approved' | 'rejected'; comment: string }>;
    
    // Поля из формы создания заявки:
    destination?: string;
    purpose?: string;
    start_date?: string;
    end_date?: string;
    cost_estimate?: number;
}

// ЭКСПОРТИРУЕМ MOCK_DB, чтобы его могли использовать pages/api/requests.ts
export const MOCK_DB: Record<number, RequestData> = {
    1: { id: 1, created_by_id: 1, created_by_role: 'employee', status: 'awaiting_manager', current_approver_role: 'manager', approvals: [], destination: 'Нью-Йорк, США', purpose: 'Конференция', cost_estimate: 80000 },
    2: { id: 2, created_by_id: 5, created_by_role: 'manager', status: 'awaiting_hr', current_approver_role: 'hr', approvals: [{ role: 'manager', status: 'approved', comment: 'Согласовано менеджером' }], destination: 'Лондон, Великобритания', purpose: 'Продажи', cost_estimate: 120000 },
    3: { id: 3, created_by_id: 1, created_by_role: 'employee', status: 'approved', current_approver_role: 'finance', approvals: [], destination: 'Берлин, Германия', purpose: 'Обучение', cost_estimate: 55000 },
    4: { id: 4, created_by_id: 7, created_by_role: 'hr', status: 'rejected', current_approver_role: 'hr', approvals: [], destination: 'Токио, Япония', purpose: 'Развитие', cost_estimate: 95000 },
    5: { id: 5, created_by_id: 1, created_by_role: 'employee', status: 'awaiting_finance', current_approver_role: 'finance', approvals: [{ role: 'manager', status: 'approved', comment: 'ОК' }, { role: 'hr', status: 'approved', comment: 'ОК' }], destination: 'Париж, Франция', purpose: 'Встреча с клиентом', cost_estimate: 70000 },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { request_id, approver_role, action_status, comment } = req.body;

    if (!request_id || !approver_role || !action_status) {
        return res.status(400).json({ message: 'Missing required fields in request body.' });
    }

    const request = MOCK_DB[request_id];

    if (!request) {
        return res.status(404).json({ message: 'Request not found.' });
    }

    // Проверка, является ли текущий пользователь нужным согласующим
    if (request.current_approver_role !== approver_role) {
        return res.status(403).json({ message: `Access denied. Expected role: ${request.current_approver_role}` });
    }

    // Логика перехода к следующему этапу
    let nextStatus: RequestData['status'];
    let nextApproverRole: UserRole;

    if (action_status === 'rejected') {
        nextStatus = 'rejected';
        nextApproverRole = request.current_approver_role; // Остается на последнем согласующем, но статус 'rejected'
    } else {
        switch (approver_role) {
            case 'manager':
                nextStatus = 'awaiting_hr';
                nextApproverRole = 'hr';
                break;
            case 'hr':
                nextStatus = 'awaiting_finance';
                nextApproverRole = 'finance';
                break;
            case 'finance':
                nextStatus = 'approved';
                nextApproverRole = 'finance'; // Конечный статус
                break;
            default:
                return res.status(400).json({ message: 'Invalid approver role for approval logic.' });
        }
    }

    // Имитация обновления "Базы Данных"
    request.status = nextStatus;
    request.current_approver_role = nextApproverRole;
    request.approvals.push({ role: approver_role, status: action_status, comment });

    console.log(`[API]: Request ID ${request_id} updated. New Status: ${nextStatus}`);

    // Успешный ответ
    return res.status(200).json({ 
        message: 'Approval action processed successfully.',
        new_status: nextStatus 
    });
}