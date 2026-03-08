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

function tileClass(state: TileState, hasLetter: boolean): string {
  const base =
    'flex items-center justify-center font-extrabold uppercase select-none border-2 rounded-lg transition-all duration-300';
  switch (state) {
    case 'correct':
      return `${base} bg-correct text-white border-correct tile-correct-glow`;
    case 'present':
      return `${base} bg-present text-white border-present tile-present-glow`;
    case 'absent':
      return `${base} bg-absent text-white border-absent tile-absent-glow`;
    case 'tbd':
      return `${base} bg-transparent text-white ${hasLetter ? 'border-gray-400 tile-filled' : 'border-gray-600'}`;
    default:
      return `${base} bg-transparent text-white border-gray-700/50`;
  }
}

function keyClass(state: LetterState, wide: boolean): string {
  const base =
    'rounded-lg font-bold text-sm h-14 flex items-center justify-center cursor-pointer select-none transition-all duration-200 active:scale-90';
  const width = wide ? 'min-w-[62px] px-2 text-xs' : 'w-11';
  switch (state) {
    case 'correct':
      return `${base} ${width} bg-correct text-white key-correct hover:brightness-110`;
    case 'present':
      return `${base} ${width} bg-present text-white key-present hover:brightness-110`;
    case 'absent':
      return `${base} ${width} bg-gray-700/80 text-gray-500`;
    default:
      return `${base} ${width} bg-gray-500 text-white hover:bg-gray-400 hover:scale-105`;
  }
}

const KEYBOARD_ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  ['ENTER', ...'ZXCVBNM'.split(''), 'BACKSPACE'],
];

const CONFETTI_COLORS = ['#538d4e', '#b59f3b', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe'];

function spawnConfetti(): { id: number; left: string; color: string; delay: string; size: number; rotation: number }[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: `${Math.random() * 1.5}s`,
    size: 6 + Math.random() * 10,
    rotation: Math.random() * 360,
  }));
}

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
  onGameEnd?: (status: 'WIN' | 'LOSS', attempts: number) => void;
}

export function DailyGameClient({ shareCode, gameId: externalGameId, gameMeta, onGameEnd }: Props) {
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
  const [toasts, setToasts] = useState<{ id: number; text: string; exiting: boolean; type?: string }[]>([]);
  const toastIdRef = useRef(0);

  // Animation state
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [poppedTile, setPoppedTile] = useState<string>('');
  const [confetti, setConfetti] = useState<ReturnType<typeof spawnConfetti>>([]);
  const [pressedKey, setPressedKey] = useState<string>('');

  // Stats modal
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<GameStats>(getStats);

  const prevGuessCountRef = useRef(0);

  const showToast = useCallback((text: string, duration = 2000, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, exiting: false, type }]);
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
        showToast(res.error?.message ?? 'Failed to load game.', 5000, 'error');
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
          showToast('Please log in to play.', 0, 'error');
        } else if (json.error?.code === 'REPLAY_FORBIDDEN') {
          showToast('You already completed this game.', 0, 'info');
        } else {
          showToast(json.error?.message ?? 'Failed to start game.', 5000, 'error');
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
      showToast('Not enough letters', 1500, 'warning');
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
      showToast(msg, 2000, 'error');
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(-1), 400);
      return;
    }

    const currentRow = guesses.length;
    setRevealingRow(currentRow);

    const flipDuration = gameLength * 150 + 500;
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
            setTimeout(() => setBounceRow(-1), 2000);
            setConfetti(spawnConfetti());
            setTimeout(() => setConfetti([]), 4000);
            const winMessages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
            const msgIndex = Math.min(newGuesses.length - 1, winMessages.length - 1);
            showToast(winMessages[msgIndex], 3000, 'win');
          } else {
            showToast(state.data.answer ?? 'Better luck next time!', 5000, 'loss');
          }

          setTimeout(() => setShowStats(true), state.data.status === 'WIN' ? 3000 : 3500);

          if (onGameEnd) {
            onGameEnd(state.data.status as 'WIN' | 'LOSS', newGuesses.length);
          }
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
      setPressedKey(key);
      setTimeout(() => setPressedKey(''), 100);

      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        setInput((v) => v.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && input.length < gameLength) {
        const newLen = input.length;
        setInput((v) => v + key);
        const tileKey = `${guesses.length}-${newLen}`;
        setPoppedTile(tileKey);
        setTimeout(() => setPoppedTile(''), 120);
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
      showToast(json.error?.message ?? 'No hints available', 2000, 'error');
      return;
    }
    setHints((prev) => [...prev, json.data.hint]);
    showToast('Hint revealed!', 1500, 'info');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-correct animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-present animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  const tileSize = gameLength <= 5 ? 'w-[62px] h-[62px]' : gameLength <= 7 ? 'w-12 h-12' : 'w-10 h-10';
  const fontSize = gameLength <= 5 ? 'text-[2rem]' : gameLength <= 7 ? 'text-xl' : 'text-lg';
  const maxDist = Math.max(1, ...Object.values(stats.guessDistribution));
  const attemptsUsed = guesses.length;
  const attemptsRemaining = maxAttempts - attemptsUsed;

  return (
    <div className="flex flex-col items-center gap-3 relative">
      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left: c.left,
            backgroundColor: c.color,
            animationDelay: c.delay,
            width: c.size,
            height: c.size,
            transform: `rotate(${c.rotation}deg)`,
          }}
        />
      ))}

      {/* Toast container */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-6 py-3 rounded-xl font-bold text-sm shadow-2xl pointer-events-auto ${
              t.exiting ? 'toast-exit' : 'toast-enter'
            } ${
              t.type === 'win'
                ? 'bg-correct text-white glow-green'
                : t.type === 'loss'
                ? 'bg-red-600 text-white'
                : t.type === 'error'
                ? 'bg-red-900 text-red-200 border border-red-700'
                : t.type === 'warning'
                ? 'bg-present text-white glow-yellow'
                : 'bg-white text-gray-900'
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

      {/* Attempts progress */}
      {status === 'IN_PROGRESS' && gameStarted && (
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Attempts</span>
            <span className="text-[10px] text-gray-400">
              {attemptsUsed}/{maxAttempts}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out relative ${
                attemptsRemaining <= 1
                  ? 'bg-red-500'
                  : attemptsRemaining <= 2
                  ? 'bg-present'
                  : 'bg-correct'
              }`}
              style={{ width: `${(attemptsUsed / maxAttempts) * 100}%` }}
            >
              <div className="absolute inset-0 progress-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Hints panel */}
      {hints.length > 0 && (
        <div className="w-full max-w-sm glass rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-present uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1zM10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12z"/></svg>
            Hints
          </p>
          {hints.map((h) => (
            <p key={h.id} className="text-sm text-gray-300">
              <span className="font-semibold text-white">{h.type}:</span> {h.content}
              <span className="text-xs text-gray-500 ml-1">(-{h.cost} pts)</span>
            </p>
          ))}
        </div>
      )}

      {/* GAME BOARD */}
      <div className="grid gap-[6px] my-2" role="grid" aria-label="Game board">
        {rows.map((row, ri) => {
          const isCurrentInputRow = !row.isSubmitted && ri === guesses.length && status === 'IN_PROGRESS';
          return (
            <div
              key={ri}
              className={`flex gap-[6px] ${shakeRow === ri ? 'row-shake' : ''}`}
              role="row"
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
                    className={`${tileClass(state, !!ch)} ${tileSize} ${fontSize} ${animClass}`}
                    role="cell"
                    aria-label={ch ? `${ch}, ${state}` : 'empty'}
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
        <div className="text-center space-y-3 celebrate-text">
          <p className="text-4xl font-black text-gradient tracking-wider">You Won!</p>
          <p className="text-gray-400 text-sm">
            Solved in <span className="font-black text-correct text-lg">{guesses.length}</span> {guesses.length === 1 ? 'guess' : 'guesses'}
          </p>
          {stats.currentStreak > 1 && (
            <p className="text-sm streak-fire font-bold">
              {stats.currentStreak} game streak!
            </p>
          )}
        </div>
      )}
      {status === 'LOSS' && (
        <div className="text-center space-y-3 loss-reveal">
          <p className="text-4xl font-black text-red-500">Game Over</p>
          {answer && (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">The word was</p>
              <p className="font-black uppercase tracking-[0.3em] text-white text-2xl bg-gray-800 px-4 py-2 rounded-xl inline-block">
                {answer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        {status !== 'IN_PROGRESS' && (
          <>
            <button
              className="bg-correct hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 glow-green flex items-center gap-2"
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
                showToast('Copied to clipboard!', 1500, 'info');
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share Result
            </button>
            <button
              className="glass text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              onClick={() => setShowStats(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Statistics
            </button>
          </>
        )}
        {status === 'IN_PROGRESS' && gameStarted && (
          <button
            className="text-sm text-present hover:text-yellow-400 font-medium transition-all hover:scale-105 flex items-center gap-1.5"
            onClick={requestHint}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            Get a hint (costs points)
          </button>
        )}
      </div>

      {/* ON-SCREEN KEYBOARD */}
      <div className="w-full max-w-lg space-y-1.5 mt-2">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-[5px]">
            {row.map((k) => {
              const state: LetterState = letterStates[k] ?? 'unused';
              const isWide = k === 'ENTER' || k === 'BACKSPACE';
              const isPressed = pressedKey === k;
              return (
                <button
                  key={k}
                  className={`${keyClass(state, isWide)} ${isPressed ? 'key-press' : ''}`}
                  onClick={() => handleKey(k)}
                  aria-label={k}
                >
                  {k === 'BACKSPACE' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                    </svg>
                  ) : k === 'ENTER' ? (
                    <span className="tracking-wider">ENTER</span>
                  ) : k}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-5 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-correct tile-correct-glow" />
          <span>Correct spot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-present tile-present-glow" />
          <span>Wrong spot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-absent" />
          <span>Not in word</span>
        </div>
      </div>

      {/* STATISTICS MODAL */}
      {showStats && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowStats(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl max-w-sm w-full p-6 modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black tracking-wider uppercase text-gradient">Statistics</h2>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-500 hover:text-white text-2xl font-bold leading-none transition-colors hover:rotate-90 duration-200"
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
                <div key={label} className="text-center group">
                  <p className="text-3xl font-black text-white group-hover:text-correct transition-colors">{value}</p>
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
                        className={`h-7 flex items-center justify-end px-2.5 text-xs font-bold text-white rounded-md transition-all duration-500 ${
                          isLastGuess ? 'bg-correct glow-green' : 'bg-gray-700'
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

            {/* Streak info */}
            {stats.currentStreak > 1 && (
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">Current streak</p>
                <p className="text-2xl font-black streak-fire">{stats.currentStreak}</p>
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
