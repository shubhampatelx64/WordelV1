'use client';

import { useState } from 'react';
import { DailyGameClient } from '@/components/DailyGameClient';

interface PracticeGame {
  gameId: string;
  length: number;
  maxAttempts: number;
}

export default function PracticePage() {
  const [practiceGame, setPracticeGame] = useState<PracticeGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startPractice() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/practice/start', { method: 'POST' });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error?.message ?? 'Failed to start practice game. Please log in first.');
      return;
    }
    setPracticeGame({ gameId: json.data.gameId, length: json.data.length, maxAttempts: json.data.maxAttempts });
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-wide text-white">Practice Mode</h1>
        <p className="text-sm text-gray-500 mt-2">Sharpen your skills with unlimited rounds</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 glass rounded-xl text-red-400 text-sm text-center">
          {error}
          {error.includes('log in') && (
            <a href="/login" className="ml-2 underline font-bold text-correct">
              Log in
            </a>
          )}
        </div>
      )}

      {!practiceGame ? (
        <div className="flex flex-col items-center gap-6 py-16">
          <div className="flex gap-2">
            <div className="w-12 h-12 rounded bg-correct flex items-center justify-center text-white font-bold text-xl">P</div>
            <div className="w-12 h-12 rounded bg-present flex items-center justify-center text-white font-bold text-xl">L</div>
            <div className="w-12 h-12 rounded bg-absent flex items-center justify-center text-white font-bold text-xl">A</div>
            <div className="w-12 h-12 rounded bg-correct flex items-center justify-center text-white font-bold text-xl">Y</div>
          </div>
          <p className="text-gray-400 text-center max-w-xs text-sm">
            Practice with random 5-letter words. No limits, no pressure. Play as many as you want.
          </p>
          <button
            onClick={startPractice}
            disabled={loading}
            className="bg-correct hover:bg-green-600 disabled:opacity-60 text-white font-bold px-10 py-3.5 rounded-xl text-lg transition-all hover:scale-105 active:scale-95 glow-green"
          >
            {loading ? 'Starting...' : 'Start Practice'}
          </button>
        </div>
      ) : (
        <div>
          <DailyGameClient
            gameId={practiceGame.gameId}
            gameMeta={{ length: practiceGame.length, maxAttempts: practiceGame.maxAttempts }}
          />
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => { setPracticeGame(null); setError(''); }}
              className="text-sm text-gray-500 hover:text-white font-medium transition-colors glass px-4 py-2 rounded-lg"
            >
              Play another word
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
