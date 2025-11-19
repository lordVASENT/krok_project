// pages/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Перенаправляем на страницу входа при загрузке корневого адреса
    router.replace('/login'); 
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Загрузка...</p>
    </div>
  );
}