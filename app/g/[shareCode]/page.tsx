import { DailyGameClient } from '@/components/DailyGameClient';

export default function SharedGamePage({ params }: { params: { shareCode: string } }) {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Shared Game {params.shareCode}</h1>
      <DailyGameClient shareCode={params.shareCode} />
    </div>
  );
}
