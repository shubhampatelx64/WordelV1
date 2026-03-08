'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailyGameClient } from '@/components/DailyGameClient';

interface EndlessGame {
  gameId: string;
  level: number;
  length: number;
  maxAttempts: number;
  difficulty: string;
}

interface EndlessStats {
  highestLevel: number;
  totalWins: number;
  totalGames: number;
}

function getEndlessStats(): EndlessStats {
  try {
    const raw = localStorage.getItem('wordel-endless-stats');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { highestLevel: 0, totalWins: 0, totalGames: 0 };
}

function saveEndlessStats(stats: EndlessStats) {
  try {
    localStorage.setItem('wordel-endless-stats', JSON.stringify(stats));
  } catch {}
}

export default function EndlessPage() {
  const [game, setGame] = useState<EndlessGame | null>(null);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameEnded, setGameEnded] = useState<'WIN' | 'LOSS' | null>(null);
  const [stats, setStats] = useState<EndlessStats>(getEndlessStats);
  const [gameKey, setGameKey] = useState(0);

  async function startLevel(lvl: number) {
    setLoading(true);
    setError('');
    setGameEnded(null);
    const res = await fetch('/api/endless/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: lvl }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error?.message ?? 'Failed to start level. Please log in first.');
      return;
    }
    setGame({
      gameId: json.data.gameId,
      level: json.data.level,
      length: json.data.length,
      maxAttempts: json.data.maxAttempts,
      difficulty: json.data.difficulty,
    });
    setLevel(lvl);
    setGameKey((k) => k + 1);
  }

  const handleGameEnd = useCallback((status: 'WIN' | 'LOSS', attempts: number) => {
    setGameEnded(status);
    const current = getEndlessStats();
    current.totalGames += 1;
    if (status === 'WIN') {
      current.totalWins += 1;
      const nextLevel = level + 1;
      current.highestLevel = Math.max(current.highestLevel, level);
      setLevel(nextLevel);
    }
    saveEndlessStats(current);
    setStats(current);
  }, [level]);

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-green-900/50 text-green-400';
    if (d === 'hard') return 'bg-red-900/50 text-red-400';
    return 'bg-yellow-900/50 text-yellow-400';
  };

  const levelProgress = game ? Math.min(100, ((level - 1) / 25) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black tracking-wide text-gradient">Endless Mode</h1>
        <p className="text-sm text-gray-500 mt-2">Beat each level to advance. How far can you go?</p>
      </div>

      {/* Stats bar */}
      <div className="max-w-md mx-auto mb-6">
        <div className="glass rounded-xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-white">{stats.highestLevel}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Best Level</p>
            </div>
            <div>
              <p className="text-2xl font-black text-correct">{stats.totalWins}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Wins</p>
            </div>
            <div>
              <p className="text-2xl font-black text-present">
                {stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0}%
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Win Rate</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-6 px-4 py-3 glass rounded-xl text-red-400 text-sm text-center animate-fade-in">
          {error}
          {error.includes('log in') && (
            <a href="/login" className="ml-2 underline font-bold text-correct hover:text-green-400 transition-colors">
              Log in
            </a>
          )}
        </div>
      )}

      {!game ? (
        <div className="flex flex-col items-center gap-6 py-12">
          {/* Level display */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-correct flex items-center justify-center glow-green">
              <div className="text-center">
                <p className="text-4xl font-black text-white">{level}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Level</p>
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-center max-w-xs text-sm leading-relaxed">
            Complete each word to level up. Words get longer and harder as you progress. Losing resets you to level 1.
          </p>

          <button
            onClick={() => startLevel(level)}
            disabled={loading}
            className="bg-correct hover:bg-green-600 disabled:opacity-60 text-white font-bold px-10 py-3.5 rounded-xl text-lg transition-all hover:scale-105 active:scale-95 glow-green flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                {level === 1 ? 'Start Endless' : `Continue Level ${level}`}
              </>
            )}
          </button>
        </div>
      ) : (
        <div>
          {/* Level header */}
          <div className="max-w-md mx-auto mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">Level {game.level}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${difficultyColor(game.difficulty)}`}>
                  {game.difficulty}
                </span>
              </div>
              <span className="text-xs text-gray-500">{game.length} letters &bull; {game.maxAttempts} tries</span>
            </div>
            {/* Level progress bar */}
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-correct to-present transition-all duration-700 ease-out"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>

          <DailyGameClient
            key={gameKey}
            gameId={game.gameId}
            gameMeta={{ length: game.length, maxAttempts: game.maxAttempts }}
            onGameEnd={handleGameEnd}
          />

          {/* Next level / retry buttons */}
          {gameEnded && (
            <div className="mt-6 flex flex-col items-center gap-3 animate-fade-in">
              {gameEnded === 'WIN' ? (
                <button
                  onClick={() => startLevel(level)}
                  disabled={loading}
                  className="bg-correct hover:bg-green-600 disabled:opacity-60 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 glow-green flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  )}
                  Next Level ({level})
                </button>
              ) : (
                <button
                  onClick={() => { setLevel(1); startLevel(1); }}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  )}
                  Restart from Level 1
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
