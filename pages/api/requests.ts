// pages/api/requests.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { MOCK_DB } from './approval'; 

// Важно: Счетчик ID должен быть глобальным и использовать данные из MOCK_DB
let lastId = Object.keys(MOCK_DB).length > 0 ? Math.max(...Object.keys(MOCK_DB).map(id => parseInt(id))) : 0;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // --- ОБРАБОТКА GET (Получение списка) ---
        const requestsArray = Object.values(MOCK_DB);
        return res.status(200).json(requestsArray);
    } 
    
    if (req.method === 'POST') {
        // --- ОБРАБОТКА POST (Создание новой заявки) ---
        const { created_by_id, created_by_role, destination, purpose, start_date, end_date, cost_estimate } = req.body;

        if (!created_by_id || !created_by_role || !destination) {
             return res.status(400).json({ message: 'Missing required fields for new request.' });
        }

        // 1. Генерируем новый ID
        lastId += 1;
        const newId = lastId;

        // 2. Создаем новую заявку
        const newRequest = {
            id: newId,
            created_by_id: created_by_id,
            created_by_role: created_by_role,
            status: 'awaiting_manager' as const, 
            current_approver_role: 'manager' as const,
            approvals: [],
            // Поля из формы
            destination,
            purpose,
            start_date,
            end_date,
            cost_estimate,
        };

        // 3. Добавляем в моковую базу данных
        MOCK_DB[newId] = newRequest;
        
        console.log(`[API]: New Request ID ${newId} created by ${created_by_role}. Status: awaiting_manager`);

        return res.status(201).json({ 
            message: 'Request created and sent for approval.',
            new_id: newId,
            request: newRequest
        });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}