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
  const [gamesPlayed, setGamesPlayed] = useState(0);

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
    setGamesPlayed((p) => p + 1);
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-wide text-gradient">Practice Mode</h1>
        <p className="text-sm text-gray-500 mt-2">Sharpen your skills with unlimited rounds</p>
        {gamesPlayed > 0 && (
          <p className="text-xs text-gray-600 mt-1">Games this session: {gamesPlayed}</p>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 glass rounded-xl text-red-400 text-sm text-center animate-fade-in">
          {error}
          {error.includes('log in') && (
            <a href="/login" className="ml-2 underline font-bold text-correct hover:text-green-400 transition-colors">
              Log in
            </a>
          )}
        </div>
      )}

      {!practiceGame ? (
        <div className="flex flex-col items-center gap-6 py-16">
          <div className="flex gap-2">
            {['P', 'L', 'A', 'Y', '!'].map((letter, i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-lg flex items-center justify-center text-white font-extrabold text-2xl border-2 transition-all duration-300 hover:scale-110 cursor-default ${
                  i === 0
                    ? 'bg-correct border-correct tile-correct-glow'
                    : i === 1
                    ? 'bg-present border-present tile-present-glow'
                    : i === 2
                    ? 'bg-absent border-absent'
                    : i === 3
                    ? 'bg-correct border-correct tile-correct-glow'
                    : 'bg-present border-present tile-present-glow'
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {letter}
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-center max-w-xs text-sm leading-relaxed">
            Practice with random 5-letter words. No limits, no pressure. Play as many as you want.
          </p>

          {/* Color guide */}
          <div className="glass rounded-xl p-4 max-w-xs w-full space-y-2.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">How it works</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-correct flex items-center justify-center text-white font-bold text-sm tile-correct-glow shrink-0">W</div>
              <p className="text-xs text-gray-400"><span className="text-correct font-semibold">Green</span> — letter is in the correct spot</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-present flex items-center justify-center text-white font-bold text-sm tile-present-glow shrink-0">O</div>
              <p className="text-xs text-gray-400"><span className="text-present font-semibold">Yellow</span> — letter is in the word but wrong spot</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-absent flex items-center justify-center text-white font-bold text-sm shrink-0">X</div>
              <p className="text-xs text-gray-400"><span className="text-gray-400 font-semibold">Gray</span> — letter is not in the word</p>
            </div>
          </div>

          <button
            onClick={startPractice}
            disabled={loading}
            className="bg-correct hover:bg-green-600 disabled:opacity-60 text-white font-bold px-10 py-3.5 rounded-xl text-lg transition-all hover:scale-105 active:scale-95 glow-green flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Start Practice
              </>
            )}
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
              className="text-sm text-gray-400 hover:text-white font-medium transition-all glass px-5 py-2.5 rounded-xl hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Play another word
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
