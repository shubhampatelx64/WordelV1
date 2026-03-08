import { DailyGameClient } from '@/components/DailyGameClient';

export default function DailyPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-wide text-white">Daily Challenge</h1>
        <p className="text-sm text-gray-500 mt-2">{today}</p>
      </div>
      <DailyGameClient />
    </div>
  );
}
