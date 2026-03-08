import { DailyGameClient } from '@/components/DailyGameClient';

export default function SharedGamePage({ params }: { params: { shareCode: string } }) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-white tracking-wide">Challenge Mode</h1>
        <p className="text-sm text-gray-500 mt-2">Game code: <span className="font-mono text-gray-400">{params.shareCode}</span></p>
      </div>
      <DailyGameClient shareCode={params.shareCode} />
    </div>
  );
}
