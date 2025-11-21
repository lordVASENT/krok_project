import type { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@/utils/auth';

// ==========================================
// ТИПЫ ДАННЫХ (ИСПОЛЬЗУЮТСЯ ВЕЗДЕ)
// ==========================================

export type RequestStatus = 
    | 'awaiting_manager' | 'awaiting_hr' | 'awaiting_finance' 
    | 'rejected' | 'created' | 'awaiting_employee_action' 
    | 'awaiting_report_approval' | 'completed';

export type FulfillmentStatus = 'waiting_dates' | 'in_progress' | 'returned';

export interface FileAttachment { name: string; data: string; }

export interface Approval {
    approver_role: UserRole | 'employee'; 
    action: 'approved' | 'rejected' | 'modified' | 'resubmitted';
    comment?: string;
    date: string;
}

export interface ChangeLog {
    date: string;
    actor_role: UserRole | 'employee';
    field_name: string;
    old_value: string;
    new_value: string;
}

export interface RequestData {
    id: number;
    employee_id: number;
    destination: string;
    purpose: string;
    start_date: string;
    end_date: string;
    cost_estimate: number;
    status: RequestStatus;
    current_approver_role: UserRole | 'archive' | 'employee';
    approvals: Approval[];
    created_by_role: UserRole; 
    
    fulfillment_status: FulfillmentStatus;
    report_added: boolean; 
    report_text: string;
    receipt_files: FileAttachment[];

    passport_photos?: FileAttachment[]; 
    travel_tickets?: FileAttachment[];  
    hotel_bookings?: FileAttachment[]; 
    
    is_modified: boolean;
    change_history: ChangeLog[]; 
    last_modified_actor_id?: number; 
    viewed_by_ids: number[];
}

// ==========================================
// ИНИЦИАЛИЗАЦИЯ DB (GLOBAL SCOPE)
// ==========================================

declare global {
    var requestStore: RequestData[];
    var nextRequestId: number;
}

if (!global.requestStore) {
    global.requestStore = [
        {
            id: 1,
            employee_id: 1,
            destination: 'Париж, Франция',
            purpose: 'Переговоры',
            start_date: '2025-12-01',
            end_date: '2025-12-05',
            cost_estimate: 500000,
            status: 'awaiting_manager',
            current_approver_role: 'manager',
            approvals: [{ approver_role: 'employee', action: 'resubmitted', date: '2025-11-20', comment: 'Создана заявка.' }],
            created_by_role: 'employee',
            fulfillment_status: 'waiting_dates',
            report_added: false,
            report_text: '',
            receipt_files: [],
            passport_photos: [],
            travel_tickets: [],
            hotel_bookings: [],
            is_modified: false,
            change_history: [],
            viewed_by_ids: []
        },
        {
            id: 2,
            employee_id: 1,
            destination: 'Берлин, Германия',
            purpose: 'Конференция',
            start_date: '2025-11-20',
            end_date: '2025-11-25',
            cost_estimate: 200000,
            status: 'awaiting_hr',
            current_approver_role: 'hr',
            approvals: [
                { approver_role: 'employee', action: 'resubmitted', date: '2025-11-18', comment: 'Создана заявка.' },
                { approver_role: 'manager', action: 'approved', date: '2025-11-19', comment: 'Согласовано.' }
            ],
            created_by_role: 'employee',
            fulfillment_status: 'waiting_dates',
            report_added: false,
            report_text: '',
            receipt_files: [],
            passport_photos: [],
            travel_tickets: [],
            hotel_bookings: [],
            is_modified: false,
            change_history: [],
            viewed_by_ids: []
        },
        {
            id: 3,
            employee_id: 1,
            destination: 'Лондон, Англия',
            purpose: 'Инспекция',
            start_date: '2026-01-10',
            end_date: '2026-01-15',
            cost_estimate: 700000,
            status: 'created', // Статус на доработке
            current_approver_role: 'employee',
            approvals: [
                { approver_role: 'employee', action: 'resubmitted', date: '2025-11-10', comment: 'Создана заявка.' },
                { approver_role: 'manager', action: 'rejected', date: '2025-11-11', comment: 'Слишком большой бюджет.' }
            ],
            created_by_role: 'employee',
            fulfillment_status: 'waiting_dates',
            report_added: false,
            report_text: '',
            receipt_files: [],
            passport_photos: [],
            travel_tickets: [],
            hotel_bookings: [],
            is_modified: true, // Включим колокольчик для демонстрации
            change_history: [{ date: '2025-11-11', actor_role: 'manager', field_name: 'Статус', old_value: 'awaiting_manager', new_value: 'rejected' }],
            viewed_by_ids: []
        }
    ];
    global.nextRequestId = 4;
}

// ==========================================
// API HANDLER
// ==========================================

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return res.status(200).json(global.requestStore);
    }
    
    if (req.method === 'POST') {
        const { action, request_id, user_id, ...data } = req.body;

        // 1. Снять колокольчик
        if (action === 'mark_seen') {
            const reqIndex = global.requestStore.findIndex(r => r.id === request_id);
            if (reqIndex > -1 && user_id) {
                const r = global.requestStore[reqIndex];
                if (!r.viewed_by_ids.includes(user_id)) {
                    r.viewed_by_ids.push(user_id);
                }
                return res.status(200).json({ message: 'Seen' });
            }
            return res.status(404).json({ message: 'Not found' });
        }

        // 2. Создать новую заявку
        if (!action) {
            const { employee_id, destination, purpose, start_date, end_date, cost_estimate, passport_photos } = data;
            
            if (!employee_id || !destination) return res.status(400).json({ message: 'Missing fields' });

            const newRequest: RequestData = {
                id: global.nextRequestId++,
                employee_id, destination, purpose, start_date, end_date, cost_estimate,
                status: 'awaiting_manager',
                current_approver_role: 'manager',
                approvals: [{ approver_role: 'employee', action: 'resubmitted', date: new Date().toISOString().split('T')[0], comment: 'Создана заявка.' }],
                created_by_role: 'employee',
                fulfillment_status: 'waiting_dates',
                report_added: false,
                report_text: '',
                receipt_files: [],
                passport_photos: passport_photos || [], 
                travel_tickets: [], hotel_bookings: [],
                
                is_modified: false,
                change_history: [],
                viewed_by_ids: [employee_id],
                last_modified_actor_id: employee_id
            };

            global.requestStore.push(newRequest);
            return res.status(201).json(newRequest);
        }
    }
    res.status(405).end();
}