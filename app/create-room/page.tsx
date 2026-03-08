'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function CreateRoomPage() {
  const { data: session } = useSession();
  const [word, setWord] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(6);
  const [hardModeAllowed, setHardModeAllowed] = useState(true);
  const [allowReplay, setAllowReplay] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ shareCode: string; gameId: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const trimmed = word.trim();
    if (trimmed.length < 4 || trimmed.length > 10) {
      setError('Word must be 4-10 letters long');
      return;
    }
    if (!/^[a-zA-Z]+$/.test(trimmed)) {
      setError('Word must contain only letters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: trimmed, maxAttempts, hardModeAllowed, allowReplay }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? 'Failed to create room');
        return;
      }
      setResult(json.data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = result ? `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${result.shareCode}` : '';

  if (!session) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-black text-gradient tracking-wider">Create Game Room</h1>
        <p className="text-gray-400">Please log in to create a custom game room.</p>
        <Link href="/login" className="inline-block bg-correct hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all">
          Login
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-gradient tracking-wider">Create Game Room</h1>
        <p className="text-gray-400 text-sm">Set your own word and challenge friends!</p>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6">
          {/* Word input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
              Secret Word
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z]/g, ''))}
              maxLength={10}
              placeholder="Enter your word (4-10 letters)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-bold text-lg tracking-[0.2em] uppercase placeholder:text-gray-600 placeholder:normal-case placeholder:tracking-normal placeholder:text-sm placeholder:font-normal focus:outline-none focus:border-correct focus:ring-1 focus:ring-correct transition-all"
              autoFocus
            />
            <p className="text-xs text-gray-500">{word.length}/10 letters</p>
          </div>

          {/* Max attempts */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-300 uppercase tracking-wider">
              Max Attempts
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={12}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="flex-1 accent-correct"
              />
              <span className="text-lg font-black text-white w-8 text-center">{maxAttempts}</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hardModeAllowed}
                onChange={(e) => setHardModeAllowed(e.target.checked)}
                className="accent-correct w-4 h-4"
              />
              <span className="text-sm text-gray-300">Allow Hard Mode</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReplay}
                onChange={(e) => setAllowReplay(e.target.checked)}
                className="accent-correct w-4 h-4"
              />
              <span className="text-sm text-gray-300">Allow Replay</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || word.trim().length < 4}
            className="w-full bg-correct hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] glow-green disabled:shadow-none"
          >
            {submitting ? 'Creating...' : 'Create Game Room'}
          </button>
        </form>
      ) : (
        <div className="glass rounded-2xl p-6 space-y-6 text-center">
          <div className="space-y-2">
            <div className="w-16 h-16 bg-correct/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-correct" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white">Room Created!</h2>
            <p className="text-sm text-gray-400">Share this link with friends to challenge them</p>
          </div>

          {/* Share code */}
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Room Code</p>
              <p className="text-2xl font-black tracking-[0.3em] text-correct">{result.shareCode}</p>
            </div>

            <div className="bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Share Link</p>
              <p className="text-sm text-white font-mono break-all">{shareUrl}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
              }}
              className="w-full bg-correct hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] glow-green flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Link
            </button>
            <Link
              href={`/g/${result.shareCode}`}
              className="w-full glass text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Play Your Game
            </Link>
            <button
              onClick={() => { setResult(null); setWord(''); setError(''); }}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Create Another Room
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
