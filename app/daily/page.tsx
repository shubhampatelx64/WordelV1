import { DailyGameClient } from '@/components/DailyGameClient';

export default function DailyPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Daily Word</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>
      <DailyGameClient />
    </div>
  );
}
