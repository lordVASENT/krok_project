import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getMockUser } from '@/utils/auth';

interface FileAttachment { name: string; data: string; }

const convertFilesToBase64 = (files: FileList | null): Promise<FileAttachment[]> => {
    return new Promise((resolve) => {
        if (!files || files.length === 0) return resolve([]);
        const filePromises = Array.from(files).map(file => {
            return new Promise<FileAttachment>((res) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => res({ name: file.name, data: reader.result as string });
                reader.onerror = () => res({ name: file.name, data: 'Error reading file' });
            });
        });
        Promise.all(filePromises).then(resolve);
    });
};

export default function NewRequestPage() {
    const router = useRouter();
    const [destination, setDestination] = useState('');
    const [purpose, setPurpose] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [costEstimate, setCostEstimate] = useState<number>(0);
    const [passportFiles, setPassportFiles] = useState<FileList | null>(null);

    const user = typeof window !== 'undefined' ? getMockUser() : null;
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Войдите в систему");

        let passportPayload: FileAttachment[] = [];
        if (passportFiles) passportPayload = await convertFilesToBase64(passportFiles);

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: user.id,
                    destination, purpose, start_date: startDate, end_date: endDate, 
                    cost_estimate: costEstimate, passport_photos: passportPayload
                }),
            });

            if (res.ok) { 
                alert('Заявка создана и отправлена менеджеру!'); 
                router.push('/dashboard'); 
            } 
            else { 
                const errorData = await res.json();
                alert(`Ошибка создания: ${errorData.message || res.statusText}`); 
            }
        } catch (error) { 
            alert('Ошибка сети или сервера.'); 
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="bg-white shadow p-8 max-w-2xl mx-auto rounded-lg">
                <Link href="/dashboard" className="text-sky-600 mb-4 inline-block">← Назад</Link>
                <h1 className="text-2xl font-bold mb-6 text-sky-800">Новая заявка на командировку</h1>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <label className="block text-sm font-medium text-gray-700">Направление</label>
                    <input 
                        className="w-full border p-3 rounded-lg focus:ring-sky-500 focus:border-sky-500" 
                        placeholder="Город, Страна" 
                        value={destination} 
                        onChange={e => setDestination(e.target.value)} 
                        required 
                    />

                    <label className="block text-sm font-medium text-gray-700">Цель командировки</label>
                    <textarea 
                        className="w-full border p-3 rounded-lg h-24 focus:ring-sky-500 focus:border-sky-500" 
                        placeholder="Подробное описание" 
                        value={purpose} 
                        onChange={e => setPurpose(e.target.value)} 
                        required 
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дата начала</label>
                            <input 
                                type="date" 
                                className="w-full border p-3 rounded-lg" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Дата окончания</label>
                            <input 
                                type="date" 
                                className="w-full border p-3 rounded-lg" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <label className="block text-sm font-medium text-gray-700">Ориентировочный бюджет (₽)</label>
                    <input 
                        type="number" 
                        className="w-full border p-3 rounded-lg focus:ring-sky-500 focus:border-sky-500" 
                        placeholder="Бюджет" 
                        value={costEstimate || ''} 
                        onChange={e => setCostEstimate(Number(e.target.value))} 
                        required 
                        min="1"
                    />

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <label className="block text-sm font-bold text-yellow-800 mb-2">Паспортные данные (сканы/фото)</label>
                        <input 
                            type="file" 
                            multiple 
                            onChange={e => setPassportFiles(e.target.files)} 
                            className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-sky-600 text-white p-3 rounded-lg font-semibold hover:bg-sky-700 transition"
                    >
                        Отправить на согласование
                    </button>
                </form>
            </div>
        </div>
    );
}