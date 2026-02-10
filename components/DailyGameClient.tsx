'use client';

import { useEffect, useMemo, useState } from 'react';

type GuessRow = { guessText: string; resultPattern: string };

export function DailyGameClient({ shareCode }: { shareCode?: string }) {
  const [game, setGame] = useState<any>(null);
  const [gameplayId, setGameplayId] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [status, setStatus] = useState('IN_PROGRESS');
  const [input, setInput] = useState('');
  const [hardMode, setHardMode] = useState(false);
  const [message, setMessage] = useState('');
  const [hints, setHints] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const url = shareCode ? `/api/g/${shareCode}` : '/api/daily';
      const daily = await fetch(url).then((r) => r.json());
      if (!daily.ok) return setMessage(daily.error.message);
      setGame(daily.data);
    })();
  }, [shareCode]);

  useEffect(() => {
    if (!game) return;
    (async () => {
      const res = await fetch(`/api/games/${game.id}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hardMode }) });
      const json = await res.json();
      if (!json.ok) return setMessage(json.error.message);
      setGameplayId(json.data.gameplayId);
      const state = await fetch(`/api/games/${game.id}/state`).then((r) => r.json());
      if (state.ok) {
        setGuesses(state.data.guesses);
        setStatus(state.data.status);
      }
    })();
  }, [game, hardMode]);

  const rows = useMemo(() => {
    const max = game?.maxAttempts ?? 6;
    const len = game?.length ?? 5;
    const out = [...guesses];
    while (out.length < max) out.push({ guessText: ''.padEnd(len, ' '), resultPattern: ''.padEnd(len, 'B') });
    return out;
  }, [guesses, game]);

  async function submitGuess(guessText: string) {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guessText }) });
    const json = await res.json();
    if (!json.ok) return setMessage(json.error.message);
    setMessage('');
    const state = await fetch(`/api/games/${game.id}/state`).then((r) => r.json());
    if (state.ok) {
      setGuesses(state.data.guesses);
      setStatus(state.data.status);
    }
    setInput('');
  }

  async function requestHint() {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/hint`, { method: 'POST' });
    const json = await res.json();
    if (!json.ok) return setMessage(json.error.message);
    setHints((prev) => [...prev, json.data.hint]);
  }

  const keyboard = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
  const len = game?.length ?? 5;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2"><input type="checkbox" checked={hardMode} onChange={(e) => setHardMode(e.target.checked)} /> Hard Mode</label>
      {message && <p className="text-red-600">{message}</p>}
      <button className="bg-purple-600 text-white px-3 py-1" onClick={requestHint}>Get hint</button>
      <ul>{hints.map((h) => <li key={h.id}>{h.type}: {h.content} (-{h.cost})</li>)}</ul>
      <div className="grid gap-1">
        {rows.map((row, i) => (
          <div className="grid gap-1" key={i} style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
            {Array.from({ length: len }).map((_, j) => {
              const ch = row.guessText[j] ?? '';
              const pattern = row.resultPattern[j] ?? 'B';
              const color = pattern === 'G' ? 'bg-green-500' : pattern === 'Y' ? 'bg-yellow-500' : 'bg-gray-300';
              return <div key={j} className={`h-12 border flex items-center justify-center font-bold ${ch.trim() ? color : 'bg-white'}`}>{ch}</div>;
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} maxLength={len} className="border p-2" />
        <button className="bg-black text-white px-3" onClick={() => submitGuess(input)}>Guess</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {keyboard.map((k) => (
          <button key={k} className="border px-2" onClick={() => setInput((v) => (v + k).slice(0, len))}>{k}</button>
        ))}
        <button className="border px-2" onClick={() => setInput((v) => v.slice(0, -1))}>⌫</button>
      </div>
      {status !== 'IN_PROGRESS' && (
        <button
          className="bg-blue-600 text-white px-3 py-1"
          onClick={async () => {
            const lines = guesses.map((g) => g.resultPattern.replace(/G/g, '🟩').replace(/Y/g, '🟨').replace(/B/g, '⬛')).join('\n');
            await navigator.clipboard.writeText(lines);
            setMessage('Copied result');
          }}
        >
          Share result
        </button>
      )}
      <p data-testid="status">{status}</p>
      {gameplayId && <p className="text-xs text-gray-500">Gameplay: {gameplayId}</p>}
    </div>
  );
}
