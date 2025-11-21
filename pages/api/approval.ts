import type { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@/utils/auth'; 
import { RequestData, RequestStatus, Approval, ChangeLog } from './requests'; 

// Каскадная логика переходов статусов
const STATUS_TRANSITIONS: Record<string, Record<string, string>> = {
    'created': { 'resubmit': 'awaiting_manager' },
    'awaiting_manager': { 'approved': 'awaiting_hr', 'modified': 'awaiting_hr', 'rejected': 'created' },
    'awaiting_hr': { 'approved': 'awaiting_finance', 'rejected': 'awaiting_manager' },
    'awaiting_finance': { 'approved': 'awaiting_employee_action', 'modified': 'awaiting_employee_action', 'rejected': 'awaiting_hr' },
    'awaiting_employee_action': { 'report_added': 'awaiting_report_approval', 'rejected': 'awaiting_employee_action' },
    'awaiting_report_approval': { 'approved': 'completed', 'rejected': 'awaiting_employee_action' },
    'rejected': {}, 'completed': {},
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { 
        request_id, approver_role, approver_id, action_status, comment,
        new_cost_estimate, new_start_date, new_end_date,
        action_type, resubmit_destination, resubmit_purpose, resubmit_cost_estimate, resubmit_start_date, resubmit_end_date
    } = req.body;

    const request = global.requestStore?.find(r => r.id === request_id);
    if (!request) return res.status(404).json({ message: 'Not found' });

    const today = new Date().toISOString().split('T')[0];
    const originalStatus = request.status;

    // 1. ПЕРЕСОГЛАСОВАНИЕ (Сотрудник, когда статус 'created')
    if (action_type === 'resubmit' && request.current_approver_role === 'employee' && request.status === 'created') {
        request.is_modified = false; request.change_history = []; request.viewed_by_ids = [approver_id];
        request.last_modified_actor_id = approver_id;

        request.destination = resubmit_destination; request.purpose = resubmit_purpose;
        request.cost_estimate = resubmit_cost_estimate; request.start_date = resubmit_start_date; request.end_date = resubmit_end_date;

        request.approvals.push({ approver_role: 'employee', action: 'resubmitted', comment: comment || 'Повторная отправка после доработки', date: today });
        request.status = 'awaiting_manager'; request.current_approver_role = 'manager';
        return res.status(200).json(request);
    }

    // 2. ПОПЫТКА ИЗМЕНЕНИЯ (Менеджер/Финансист)
    let changes: ChangeLog[] = [];
    const isModifyIntent = (approver_role === 'manager' || approver_role === 'finance') && new_cost_estimate !== undefined;

    if (isModifyIntent) {
        if (new_cost_estimate != request.cost_estimate) {
            changes.push({ date: today, actor_role: approver_role, field_name: 'Бюджет', old_value: `${request.cost_estimate}`, new_value: `${new_cost_estimate}` });
            request.cost_estimate = new_cost_estimate;
        }
        if (approver_role === 'manager') {
            if (new_start_date && new_start_date !== request.start_date) {
                changes.push({ date: today, actor_role: approver_role, field_name: 'Начало', old_value: request.start_date, new_value: new_start_date });
                request.start_date = new_start_date;
            }
            if (new_end_date && new_end_date !== request.end_date) {
                changes.push({ date: today, actor_role: approver_role, field_name: 'Конец', old_value: request.end_date, new_value: new_end_date });
                request.end_date = new_end_date;
            }
        }
    }

    if (changes.length > 0) {
        request.is_modified = true; request.last_modified_actor_id = approver_id; request.viewed_by_ids = [approver_id];
        request.change_history.push(...changes);

        request.approvals.push({ approver_role, action: 'modified', comment: comment || 'Внесены правки', date: today });

        if (approver_role === 'manager') { request.status = 'awaiting_hr'; request.current_approver_role = 'hr'; } 
        else { request.status = 'awaiting_employee_action'; request.current_approver_role = 'employee'; }
        return res.status(200).json(request);
    } 
    
    // 3. СТАНДАРТНОЕ ДЕЙСТВИЕ (approved/rejected)
    const finalAction = (isModifyIntent && changes.length === 0) ? 'approved' : action_status;

    if (finalAction && ['approved', 'rejected'].includes(finalAction)) {
        const nextStatus = STATUS_TRANSITIONS[request.status]?.[finalAction] as RequestStatus;
        if (!nextStatus) return res.status(400).json({ message: 'Invalid transition' });

        request.approvals.push({ approver_role, action: finalAction, comment, date: today });
        request.status = nextStatus;

        // --- ЛОГИКА КОЛОКОЛЬЧИКА ДЛЯ ОТКЛОНЕНИЯ ---
        if (finalAction === 'rejected') {
            request.is_modified = true;
            request.last_modified_actor_id = approver_id;
            // Уведомляем только сотрудника
            request.viewed_by_ids = [approver_id]; 
            request.change_history.push({ 
                date: today, actor_role: approver_role, field_name: 'Статус', 
                old_value: originalStatus, new_value: nextStatus 
            });
            // Если это отклон отчета, обнуляем текст/файл, чтобы сотрудник мог редактировать
            if (originalStatus === 'awaiting_report_approval') {
                request.report_added = false;
            }
        }

        // Обновление текущего согласующего
        if (nextStatus === 'created' || nextStatus === 'awaiting_employee_action') request.current_approver_role = 'employee';
        else if (nextStatus === 'completed') request.current_approver_role = 'archive' as UserRole;
        else request.current_approver_role = nextStatus.split('_')[1] as UserRole;

        return res.status(200).json(request);
    }

    return res.status(400).json({ message: 'Invalid action.' });
}