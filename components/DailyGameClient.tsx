'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';

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
    'flex items-center justify-center font-bold uppercase select-none border-2 rounded transition-all duration-300';
  switch (state) {
    case 'correct':
      return `${base} bg-correct text-white border-correct`;
    case 'present':
      return `${base} bg-present text-white border-present`;
    case 'absent':
      return `${base} bg-absent text-white border-absent`;
    case 'tbd':
      return `${base} bg-transparent text-white border-gray-500`;
    default:
      return `${base} bg-transparent text-white border-gray-700`;
  }
}

function keyClass(state: LetterState, wide: boolean): string {
  const base =
    'rounded-lg font-bold text-sm h-14 flex items-center justify-center cursor-pointer select-none transition-all duration-200 active:scale-95';
  const width = wide ? 'min-w-[58px] px-2 text-xs' : 'w-11';
  switch (state) {
    case 'correct':
      return `${base} ${width} bg-correct text-white`;
    case 'present':
      return `${base} ${width} bg-present text-white`;
    case 'absent':
      return `${base} ${width} bg-gray-700 text-gray-400`;
    default:
      return `${base} ${width} bg-gray-500 text-white hover:bg-gray-400`;
  }
}

const KEYBOARD_ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  ['ENTER', ...'ZXCVBNM'.split(''), 'BACKSPACE'],
];

// Stats stored per-user in localStorage
interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>;
  lastGameDate: string;
}

function getStats(): GameStats {
  try {
    const raw = localStorage.getItem('wordel-stats');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: {}, lastGameDate: '' };
}

function saveStats(stats: GameStats) {
  try {
    localStorage.setItem('wordel-stats', JSON.stringify(stats));
  } catch {}
}

interface Props {
  shareCode?: string;
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
  const [hints, setHints] = useState<any[]>([]);
  const [loading, setLoading] = useState(!externalGameId);
  const [submitting, setSubmitting] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [answer, setAnswer] = useState<string>('');

  // Toast messages
  const [toasts, setToasts] = useState<{ id: number; text: string; exiting: boolean }[]>([]);
  const toastIdRef = useRef(0);

  // Animation state
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [poppedTile, setPoppedTile] = useState<string>('');

  // Stats modal
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<GameStats>(getStats);

  const prevGuessCountRef = useRef(0);

  const showToast = useCallback((text: string, duration = 2000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, exiting: false }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
      }, duration);
    }
  }, []);

  // Step 1: Fetch the game
  useEffect(() => {
    if (externalGameId) return;
    (async () => {
      setLoading(true);
      const url = shareCode ? `/api/g/${shareCode}` : '/api/daily';
      const res = await fetch(url).then((r) => r.json());
      if (!res.ok) {
        showToast(res.error?.message ?? 'Failed to load game.', 5000);
        setLoading(false);
        return;
      }
      setGameId(res.data.id);
      setGameLength(res.data.length ?? 5);
      setMaxAttempts(res.data.maxAttempts ?? 6);
      setDifficulty(res.data.difficulty ?? '');
      setLoading(false);
    })();
  }, [shareCode, externalGameId, showToast]);

  // Step 2: Start the game
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
          showToast('Please log in to play.', 0);
        } else if (json.error?.code === 'REPLAY_FORBIDDEN') {
          showToast('You already completed this game.', 0);
        } else {
          showToast(json.error?.message ?? 'Failed to start game.', 5000);
        }
        return;
      }
      setGameStarted(true);
      const state = await fetch(`/api/games/${gameId}/state`).then((r) => r.json());
      if (state.ok) {
        const loadedGuesses = state.data.guesses ?? [];
        setGuesses(loadedGuesses);
        prevGuessCountRef.current = loadedGuesses.length;
        setStatus(state.data.status ?? 'IN_PROGRESS');
        if (state.data.hints?.length) setHints(state.data.hints);
        if (state.data.answer) setAnswer(state.data.answer);
      }
    })();
  }, [gameId, gameStarted, hardMode, showToast]);

  // Keyboard letter states
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

  // Board rows
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
      showToast('Not enough letters');
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(-1), 400);
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/games/${gameId}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guessText: word }),
    });
    const json = await res.json();
    if (!json.ok) {
      setSubmitting(false);
      const msg = json.error?.message ?? 'Error submitting guess';
      showToast(msg);
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(-1), 400);
      return;
    }

    const currentRow = guesses.length;
    setRevealingRow(currentRow);

    const flipDuration = gameLength * 100 + 500;
    setTimeout(async () => {
      const state = await fetch(`/api/games/${gameId}/state`).then((r) => r.json());
      if (state.ok) {
        const newGuesses = state.data.guesses ?? [];
        setGuesses(newGuesses);
        setStatus(state.data.status ?? 'IN_PROGRESS');
        if (state.data.answer) setAnswer(state.data.answer);

        if (state.data.status === 'WIN' || state.data.status === 'LOSS') {
          const currentStats = getStats();
          const today = new Date().toISOString().split('T')[0];

          if (currentStats.lastGameDate !== today || !shareCode) {
            currentStats.gamesPlayed += 1;
            if (state.data.status === 'WIN') {
              currentStats.gamesWon += 1;
              currentStats.currentStreak += 1;
              currentStats.maxStreak = Math.max(currentStats.maxStreak, currentStats.currentStreak);
              const attempts = newGuesses.length;
              currentStats.guessDistribution[attempts] = (currentStats.guessDistribution[attempts] ?? 0) + 1;
            } else {
              currentStats.currentStreak = 0;
            }
            currentStats.lastGameDate = today;
            saveStats(currentStats);
            setStats(currentStats);
          }

          if (state.data.status === 'WIN') {
            setBounceRow(newGuesses.length - 1);
            setTimeout(() => setBounceRow(-1), 1500);
            const winMessages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
            const msgIndex = Math.min(newGuesses.length - 1, winMessages.length - 1);
            showToast(winMessages[msgIndex], 3000);
          } else {
            showToast(state.data.answer ?? 'Better luck next time!', 5000);
          }

          setTimeout(() => setShowStats(true), state.data.status === 'WIN' ? 2500 : 3000);
        }
      }
      setRevealingRow(-1);
      setSubmitting(false);
    }, flipDuration);

    setInput('');
  }, [gameId, input, gameLength, status, submitting, guesses.length, showToast, shareCode]);

  const handleKey = useCallback(
    (key: string) => {
      if (status !== 'IN_PROGRESS' || submitting) return;
      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        setInput((v) => v.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && input.length < gameLength) {
        const newLen = input.length;
        setInput((v) => v + key);
        const tileKey = `${guesses.length}-${newLen}`;
        setPoppedTile(tileKey);
        setTimeout(() => setPoppedTile(''), 100);
      }
    },
    [status, input, gameLength, submitGuess, submitting, guesses.length]
  );

  // Physical keyboard
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
      showToast(json.error?.message ?? 'No hints available');
      return;
    }
    setHints((prev) => [...prev, json.data.hint]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-correct animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-present animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  const tileSize = gameLength <= 5 ? 'w-16 h-16' : gameLength <= 7 ? 'w-12 h-12' : 'w-10 h-10';
  const fontSize = gameLength <= 5 ? 'text-2xl' : gameLength <= 7 ? 'text-xl' : 'text-lg';
  const maxDist = Math.max(1, ...Object.values(stats.guessDistribution));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Toast container */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm shadow-2xl pointer-events-auto ${
              t.exiting ? 'toast-exit' : 'toast-enter'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Game meta bar */}
      {(difficulty || gameLength) && (
        <div className="flex items-center gap-3 text-xs">
          {difficulty && (
            <span className={`px-2.5 py-1 rounded-full font-semibold capitalize ${
              difficulty === 'easy' ? 'bg-green-900/50 text-green-400' :
              difficulty === 'hard' ? 'bg-red-900/50 text-red-400' :
              'bg-yellow-900/50 text-yellow-400'
            }`}>
              {difficulty}
            </span>
          )}
          <span className="text-gray-500">{gameLength} letters</span>
          <span className="text-gray-600">&bull;</span>
          <span className="text-gray-500">{maxAttempts} tries</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none ml-2">
            <input
              type="checkbox"
              checked={hardMode}
              disabled={guesses.length > 0 || gameStarted}
              onChange={(e) => setHardMode(e.target.checked)}
              className="accent-correct w-3.5 h-3.5"
            />
            <span className="text-gray-500">Hard</span>
          </label>
        </div>
      )}

      {/* Hints panel */}
      {hints.length > 0 && (
        <div className="w-full max-w-sm glass rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-present uppercase tracking-wider">Hints</p>
          {hints.map((h) => (
            <p key={h.id} className="text-sm text-gray-300">
              <span className="font-semibold text-white">{h.type}:</span> {h.content}
              <span className="text-xs text-gray-500 ml-1">(-{h.cost} pts)</span>
            </p>
          ))}
        </div>
      )}

      {/* GAME BOARD */}
      <div className="grid gap-1.5 my-2">
        {rows.map((row, ri) => {
          const isCurrentInputRow = !row.isSubmitted && ri === guesses.length && status === 'IN_PROGRESS';
          return (
            <div
              key={ri}
              className={`flex gap-1.5 ${shakeRow === ri ? 'row-shake' : ''}`}
            >
              {Array.from({ length: gameLength }).map((_, ci) => {
                const ch = row.guessText[ci]?.trim() ? row.guessText[ci] : '';
                const pattern = row.resultPattern[ci] ?? 'B';
                const state = getTileState(ch, pattern, row.isSubmitted);
                const tileKey = `${ri}-${ci}`;
                const isRevealing = revealingRow === ri && row.isSubmitted;
                const isBouncing = bounceRow === ri;
                const isPopping = poppedTile === tileKey;
                const isNextInput = isCurrentInputRow && ci === input.length && !ch;

                let animClass = '';
                if (isRevealing) animClass = `tile-flip tile-delay-${ci}`;
                else if (isBouncing) animClass = `tile-bounce bounce-delay-${ci}`;
                else if (isPopping) animClass = 'tile-pop';
                else if (isNextInput) animClass = 'tile-active-input';

                return (
                  <div
                    key={ci}
                    className={`${tileClass(state)} ${tileSize} ${fontSize} ${animClass}`}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Win / Loss message */}
      {status === 'WIN' && (
        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-3xl font-black text-correct">You won!</p>
          <p className="text-gray-400 text-sm">
            Solved in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}
          </p>
        </div>
      )}
      {status === 'LOSS' && (
        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-3xl font-black text-red-500">Game over</p>
          {answer && (
            <p className="text-gray-400 text-sm">
              The word was <span className="font-black uppercase tracking-widest text-white text-lg">{answer}</span>
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        {status !== 'IN_PROGRESS' && (
          <>
            <button
              className="bg-correct hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 glow-green"
              onClick={async () => {
                const header = status === 'WIN'
                  ? `Wordel ${guesses.length}/${maxAttempts}`
                  : `Wordel X/${maxAttempts}`;
                const grid = guesses
                  .map((g) =>
                    g.resultPattern
                      .replace(/G/g, '\u{1F7E9}')
                      .replace(/Y/g, '\u{1F7E8}')
                      .replace(/B/g, '\u2B1B')
                  )
                  .join('\n');
                await navigator.clipboard.writeText(`${header}\n\n${grid}`);
                showToast('Copied to clipboard!');
              }}
            >
              Share Result
            </button>
            <button
              className="glass text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
              onClick={() => setShowStats(true)}
            >
              Statistics
            </button>
          </>
        )}
        {status === 'IN_PROGRESS' && gameStarted && (
          <button
            className="text-sm text-present hover:text-yellow-400 font-medium transition-colors"
            onClick={requestHint}
          >
            Get a hint (costs points)
          </button>
        )}
      </div>

      {/* ON-SCREEN KEYBOARD */}
      <div className="w-full max-w-lg space-y-1.5 mt-1">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1.5">
            {row.map((k) => {
              const state: LetterState = letterStates[k] ?? 'unused';
              const isWide = k === 'ENTER' || k === 'BACKSPACE';
              return (
                <button key={k} className={keyClass(state, isWide)} onClick={() => handleKey(k)}>
                  {k === 'BACKSPACE' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                    </svg>
                  ) : k}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-correct" />
          <span>Correct spot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-present" />
          <span>Wrong spot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-absent" />
          <span>Not in word</span>
        </div>
      </div>

      {/* STATISTICS MODAL */}
      {showStats && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowStats(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black tracking-wider uppercase text-white">Statistics</h2>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-500 hover:text-white text-2xl font-bold leading-none transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {[
                { value: stats.gamesPlayed, label: 'Played' },
                { value: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0, label: 'Win %' },
                { value: stats.currentStreak, label: 'Current Streak' },
                { value: stats.maxStreak, label: 'Max Streak' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="text-[10px] text-gray-500 leading-tight mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Guess distribution */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Guess Distribution</h3>
            {stats.gamesPlayed === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No data yet</p>
            ) : (
              <div className="space-y-1.5">
                {Array.from({ length: maxAttempts }).map((_, i) => {
                  const count = stats.guessDistribution[i + 1] ?? 0;
                  const width = Math.max(10, (count / maxDist) * 100);
                  const isLastGuess = status === 'WIN' && guesses.length === i + 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm font-bold w-3 text-right text-gray-400">{i + 1}</span>
                      <div
                        className={`h-6 flex items-center justify-end px-2 text-xs font-bold text-white rounded transition-all ${
                          isLastGuess ? 'bg-correct' : 'bg-gray-700'
                        }`}
                        style={{ width: `${width}%` }}
                      >
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden status for tests */}
      <p data-testid="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}
