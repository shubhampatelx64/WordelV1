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
    <div>
      <h1 className="text-xl font-bold mb-1">Practice Mode</h1>
      <p className="text-sm text-gray-500 mb-5">Practice with a random word - no limits, replay anytime.</p>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-100 text-red-800 rounded text-sm">
          {error}
          {error.includes('log in') && (
            <a href="/login" className="ml-2 underline font-bold">
              Log in
            </a>
          )}
        </div>
      )}

      {!practiceGame ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-600 text-center max-w-xs">
            Start a practice round to improve your Wordel skills. A random 5-letter word will be chosen for you.
          </p>
          <button
            onClick={startPractice}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
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
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => { setPracticeGame(null); setError(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              Play another word
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
