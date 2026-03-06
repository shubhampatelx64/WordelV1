'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

type GuessRow = { guessText: string; resultPattern: string };
type LetterState = 'correct' | 'present' | 'absent' | 'unused';
type TileState = 'correct' | 'present' | 'absent' | 'tbd' | 'empty';

function getTileState(ch: string, pattern: string, isSubmitted: boolean): TileState {
  if (!isSubmitted) return ch.trim() ? 'tbd' : 'empty';
  if (pattern === 'G') return 'correct';
  if (pattern === 'Y') return 'present';
  return 'absent';
}

function tileClass(state: TileState): string {
  const base =
    'flex items-center justify-center font-bold text-xl uppercase select-none border-2 transition-colors duration-300';
  switch (state) {
    case 'correct':
      return `${base} bg-green-600 text-white border-green-600`;
    case 'present':
      return `${base} bg-yellow-500 text-white border-yellow-500`;
    case 'absent':
      return `${base} bg-gray-600 text-white border-gray-600`;
    case 'tbd':
      return `${base} bg-white text-gray-900 border-gray-400`;
    default:
      return `${base} bg-white text-gray-900 border-gray-300`;
  }
}

function keyClass(state: LetterState, wide: boolean): string {
  const base =
    'rounded font-bold text-sm h-14 flex items-center justify-center cursor-pointer select-none transition-colors duration-200 active:opacity-75';
  const width = wide ? 'min-w-[56px] px-2 text-xs' : 'w-10';
  switch (state) {
    case 'correct':
      return `${base} ${width} bg-green-600 text-white`;
    case 'present':
      return `${base} ${width} bg-yellow-500 text-white`;
    case 'absent':
      return `${base} ${width} bg-gray-500 text-white`;
    default:
      return `${base} ${width} bg-gray-200 text-gray-900 hover:bg-gray-300`;
  }
}

const KEYBOARD_ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  ['ENTER', ...'ZXCVBNM'.split(''), 'BACKSPACE'],
];

interface Props {
  shareCode?: string;
  /** Pass gameId directly to skip the game-fetch step (used by practice mode) */
  gameId?: string;
  gameMeta?: { length: number; maxAttempts: number };
}

export function DailyGameClient({ shareCode, gameId: externalGameId, gameMeta }: Props) {
  const [gameId, setGameId] = useState<string | null>(externalGameId ?? null);
  const [gameLength, setGameLength] = useState<number>(gameMeta?.length ?? 5);
  const [maxAttempts, setMaxAttempts] = useState<number>(gameMeta?.maxAttempts ?? 6);
  const [difficulty, setDifficulty] = useState<string>('');
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [status, setStatus] = useState<string>('IN_PROGRESS');
  const [input, setInput] = useState('');
  const [hardMode, setHardMode] = useState(false);
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState<any[]>([]);
  const [loading, setLoading] = useState(!externalGameId);
  const [submitting, setSubmitting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Step 1: Fetch the game (unless gameId provided directly)
  useEffect(() => {
    if (externalGameId) return;
    (async () => {
      setLoading(true);
      const url = shareCode ? `/api/g/${shareCode}` : '/api/daily';
      const res = await fetch(url).then((r) => r.json());
      if (!res.ok) {
        setMessage(res.error?.message ?? 'Failed to load game.');
        setLoading(false);
        return;
      }
      setGameId(res.data.id);
      setGameLength(res.data.length ?? 5);
      setMaxAttempts(res.data.maxAttempts ?? 6);
      setDifficulty(res.data.difficulty ?? '');
      setLoading(false);
    })();
  }, [shareCode, externalGameId]);

  // Step 2: Start the game once we have a gameId
  useEffect(() => {
    if (!gameId || gameStarted) return;
    (async () => {
      const res = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hardMode }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.error?.code === 'UNAUTHORIZED') {
          setMessage('Please log in to play.');
        } else if (json.error?.code === 'REPLAY_FORBIDDEN') {
          setMessage('You already completed this game.');
        } else {
          setMessage(json.error?.message ?? 'Failed to start game.');
        }
        return;
      }
      setGameStarted(true);
      // Fetch current game state (for resumed games)
      const state = await fetch(`/api/games/${gameId}/state`).then((r) => r.json());
      if (state.ok) {
        setGuesses(state.data.guesses ?? []);
        setStatus(state.data.status ?? 'IN_PROGRESS');
        if (state.data.hints?.length) setHints(state.data.hints);
      }
    })();
  }, [gameId, gameStarted, hardMode]);

  // Keyboard letter states derived from submitted guesses
  const letterStates = useMemo<Record<string, LetterState>>(() => {
    const map: Record<string, LetterState> = {};
    for (const g of guesses) {
      for (let i = 0; i < g.guessText.length; i++) {
        const ch = g.guessText[i];
        const p = g.resultPattern[i];
        const current = map[ch];
        if (p === 'G') {
          map[ch] = 'correct';
        } else if (p === 'Y' && current !== 'correct') {
          map[ch] = 'present';
        } else if (!current) {
          map[ch] = 'absent';
        }
      }
    }
    return map;
  }, [guesses]);

  // Board: submitted guesses + current input row + empty rows
  const rows = useMemo(() => {
    const out: { guessText: string; resultPattern: string; isSubmitted: boolean }[] = [];
    for (const g of guesses) {
      out.push({ ...g, isSubmitted: true });
    }
    if (status === 'IN_PROGRESS' && out.length < maxAttempts) {
      out.push({
        guessText: input.padEnd(gameLength, ' '),
        resultPattern: 'B'.repeat(gameLength),
        isSubmitted: false,
      });
    }
    while (out.length < maxAttempts) {
      out.push({ guessText: ' '.repeat(gameLength), resultPattern: 'B'.repeat(gameLength), isSubmitted: false });
    }
    return out;
  }, [guesses, input, status, maxAttempts, gameLength]);

  const submitGuess = useCallback(async () => {
    if (!gameId || submitting || status !== 'IN_PROGRESS') return;
    const word = input.trim();
    if (word.length !== gameLength) {
      setMessage(`Word must be ${gameLength} letters`);
      return;
    }
    setSubmitting(true);
    setMessage('');
    const res = await fetch(`/api/games/${gameId}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessText: word }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!json.ok) {
      setMessage(json.error?.message ?? 'Error submitting guess');
      return;
    }
    const state = await fetch(`/api/games/${gameId}/state`).then((r) => r.json());
    if (state.ok) {
      setGuesses(state.data.guesses ?? []);
      setStatus(state.data.status ?? 'IN_PROGRESS');
    }
    setInput('');
  }, [gameId, input, gameLength, status, submitting]);

  const handleKey = useCallback(
    (key: string) => {
      if (status !== 'IN_PROGRESS') return;
      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        setInput((v) => v.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && input.length < gameLength) {
        setInput((v) => v + key);
      }
    },
    [status, input, gameLength, submitGuess]
  );

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') handleKey('ENTER');
      else if (e.key === 'Backspace') handleKey('BACKSPACE');
      else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const requestHint = async () => {
    if (!gameId) return;
    const res = await fetch(`/api/games/${gameId}/hint`, { method: 'POST' });
    const json = await res.json();
    if (!json.ok) {
      setMessage(json.error?.message ?? 'No hints available');
      return;
    }
    setHints((prev) => [...prev, json.data.hint]);
    setMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm animate-pulse">Loading game...</p>
      </div>
    );
  }

  const tileSize = gameLength <= 5 ? 'w-14 h-14' : gameLength <= 7 ? 'w-11 h-11' : 'w-9 h-9';

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Game meta */}
      {(difficulty || gameLength) && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {difficulty && <span className="capitalize">Difficulty: {difficulty}</span>}
          <span>{gameLength} letters &bull; {maxAttempts} tries</span>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hardMode}
              disabled={guesses.length > 0 || gameStarted}
              onChange={(e) => setHardMode(e.target.checked)}
              className="accent-green-600"
            />
            Hard mode
          </label>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`px-4 py-2 rounded text-sm font-medium ${
            message.includes('log in') || message.includes('Log in') || message.includes('login')
              ? 'bg-blue-100 text-blue-800'
              : message.includes('Copied')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
          {(message.includes('log in') || message.includes('login')) && (
            <a href="/login" className="ml-2 underline font-bold">
              Log in
            </a>
          )}
        </div>
      )}

      {/* Hints panel */}
      {hints.length > 0 && (
        <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Hints</p>
          {hints.map((h) => (
            <p key={h.id} className="text-sm text-blue-900">
              <span className="font-medium">{h.type}:</span> {h.content}
              <span className="text-xs text-blue-500 ml-1">(-{h.cost} pts)</span>
            </p>
          ))}
        </div>
      )}

      {/* Game board */}
      <div className="grid gap-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {Array.from({ length: gameLength }).map((_, ci) => {
              const ch = row.guessText[ci]?.trim() ? row.guessText[ci] : '';
              const pattern = row.resultPattern[ci] ?? 'B';
              const state = getTileState(ch, pattern, row.isSubmitted);
              return (
                <div key={ci} className={`${tileClass(state)} ${tileSize}`}>
                  {ch}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Win / Loss message */}
      {status === 'WIN' && (
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-green-600">You won!</p>
          <p className="text-gray-600 text-sm">
            Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}
          </p>
        </div>
      )}
      {status === 'LOSS' && (
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-red-600">Game over</p>
          <p className="text-gray-500 text-sm">Better luck next time!</p>
        </div>
      )}

      {/* Share + Hint buttons */}
      <div className="flex gap-3">
        {status !== 'IN_PROGRESS' && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
            onClick={async () => {
              const header = `Wordel ${guesses.length}/${maxAttempts}`;
              const grid = guesses
                .map((g) =>
                  g.resultPattern
                    .replace(/G/g, '\u{1F7E9}')
                    .replace(/Y/g, '\u{1F7E8}')
                    .replace(/B/g, '\u2B1B')
                )
                .join('\n');
              await navigator.clipboard.writeText(`${header}\n\n${grid}`);
              setMessage('Copied to clipboard!');
            }}
          >
            Share result
          </button>
        )}
        {status === 'IN_PROGRESS' && gameStarted && (
          <button
            className="text-sm text-purple-700 hover:text-purple-900 underline transition-colors"
            onClick={requestHint}
          >
            Get a hint (costs points)
          </button>
        )}
      </div>

      {/* On-screen keyboard */}
      <div className="w-full max-w-lg space-y-1.5 mt-2">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map((k) => {
              const state: LetterState = letterStates[k] ?? 'unused';
              const isWide = k === 'ENTER' || k === 'BACKSPACE';
              return (
                <button key={k} className={keyClass(state, isWide)} onClick={() => handleKey(k)}>
                  {k === 'BACKSPACE' ? '\u232B' : k}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Hidden status for tests */}
      <p data-testid="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}
