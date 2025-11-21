import type { NextApiRequest, NextApiResponse } from 'next';
import { FileAttachment, ChangeLog } from './requests'; 

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { request_id, user_role, user_id, document_type, files, action } = req.body;
    const request = global.requestStore?.find(r => r.id === request_id);

    if (!request) return res.status(404).json({ message: 'Not found' });

    const fileAttachments: FileAttachment[] = files || [];
    const today = new Date().toISOString().split('T')[0];
    const isEmployee = request.employee_id === user_id;

    // Логика для триггера колокольчика и is_modified
    const logChange = (fieldName: string) => {
        request.is_modified = true;
        request.last_modified_actor_id = user_id;
        // Уведомление: если это сотрудник, уведомляем всех согласующих. Если это TC, уведомляем сотрудника.
        request.viewed_by_ids = [user_id]; 
        request.change_history.push({
            date: today, actor_role: user_role, field_name: fieldName, old_value: 'Файлы', new_value: 'Обновлены'
        });
    };

    if (action === 'update') {
        if (document_type === 'passport') {
            if (user_role !== 'employee') return res.status(403).json({ message: 'Forbidden' });
            request.passport_photos = fileAttachments;
            return res.status(200).json({ message: 'Ok' });
        }
        
        if (document_type === 'receipts') {
            if (user_role !== 'employee') return res.status(403).json({ message: 'Forbidden' });
            request.receipt_files = fileAttachments;
            logChange('Чеки/Отчет');
            return res.status(200).json({ message: 'Ok' });
        }
        
        if (document_type === 'travel' || document_type === 'hotel') {
            if (user_role !== 'hr') return res.status(403).json({ message: 'Forbidden' });
            
            const docName = document_type === 'travel' ? 'Билеты' : 'Бронь отеля';
            if (document_type === 'travel') request.travel_tickets = fileAttachments;
            if (document_type === 'hotel') request.hotel_bookings = fileAttachments;
            
            logChange(docName); 
            return res.status(200).json({ message: 'Updated' });
        }
    }
    return res.status(400).json({ message: 'Invalid doc action.' });
}