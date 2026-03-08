'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';

// ─── Types ───
interface WordRecord {
  id: string;
  text: string;
  length: number;
  difficulty: string;
  tags: string[];
  isActive: boolean;
  hints: HintRecord[];
}

interface HintRecord {
  id?: string;
  type: string;
  content: string;
  cost: number;
  order: number;
}

interface GameRecord {
  id: string;
  shareCode: string | null;
  answerWordId: string;
  length: number;
  maxAttempts: number;
  difficulty: string;
  hardModeAllowed: boolean;
  dictionaryMode: string;
  allowReplay: boolean;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: string;
  bannedAt: string | null;
  createdAt: string;
}

// ─── Reusable UI ───
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>{children}</span>;
}

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const cls = type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-blue-800 border-blue-200';
  return <div className={`px-4 py-2 rounded border text-sm ${cls}`}>{message}</div>;
}

// ─── Words Tab ───
function WordsTab() {
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<WordRecord | null>(null);

  // Form state
  const [formText, setFormText] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('medium');
  const [formTags, setFormTags] = useState('');
  const [formHints, setFormHints] = useState<HintRecord[]>([]);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const fetchWords = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/words').then(r => r.json());
    if (res.ok) setWords(res.data);
    else setMsg({ text: res.error?.message ?? 'Failed to load words', type: 'error' });
    setLoading(false);
  }, []);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  function resetForm() {
    setFormText('');
    setFormDifficulty('medium');
    setFormTags('');
    setFormHints([]);
    setEditingWord(null);
    setShowForm(false);
  }

  function startEdit(w: WordRecord) {
    setEditingWord(w);
    setFormText(w.text);
    setFormDifficulty(w.difficulty);
    setFormTags(w.tags.join(', '));
    setFormHints(w.hints.map(h => ({ type: h.type, content: h.content, cost: h.cost, order: h.order })));
    setShowForm(true);
  }

  function addHint() {
    setFormHints(prev => [...prev, { type: 'DEFINITION', content: '', cost: 50, order: prev.length + 1 }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const text = formText.toUpperCase().trim();
    const tags = formTags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingWord) {
      const res = await fetch('/api/admin/words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingWord.id, text, length: text.length, difficulty: formDifficulty, tags, hints: formHints }),
      }).then(r => r.json());
      if (res.ok) { setMsg({ text: 'Word updated', type: 'success' }); resetForm(); fetchWords(); }
      else setMsg({ text: res.error?.message ?? 'Update failed', type: 'error' });
    } else {
      const res = await fetch('/api/admin/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, length: text.length, difficulty: formDifficulty, tags, hints: formHints }),
      }).then(r => r.json());
      if (res.ok) { setMsg({ text: 'Word created', type: 'success' }); resetForm(); fetchWords(); }
      else setMsg({ text: res.error?.message ?? 'Create failed', type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this word? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/words?id=${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.ok) { setMsg({ text: 'Word deleted', type: 'success' }); fetchWords(); }
    else setMsg({ text: res.error?.message ?? 'Delete failed', type: 'error' });
  }

  async function handleImport() {
    setMsg(null);
    const lines = importText.trim().split('\n').filter(Boolean);
    const rows = lines.map(line => {
      const parts = line.split(',').map(s => s.trim());
      return { text: parts[0].toUpperCase(), difficulty: parts[1] || 'medium', tags: parts.slice(2) };
    });
    const res = await fetch('/api/admin/words/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    }).then(r => r.json());
    if (res.ok) {
      setMsg({ text: `Imported ${res.data.inserted.length} words, ${res.data.errors.length} errors`, type: 'success' });
      setImportText('');
      setShowImport(false);
      fetchWords();
    } else {
      setMsg({ text: res.error?.message ?? 'Import failed', type: 'error' });
    }
  }

  if (loading) return <p className="text-gray-500 animate-pulse">Loading words...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Words ({words.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(!showImport)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Import CSV
          </button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
            + Add Word
          </button>
        </div>
      </div>

      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      {/* Import panel */}
      {showImport && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
          <p className="text-sm text-blue-800 font-medium">Paste words (one per line): WORD,difficulty,tag1,tag2</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            className="w-full border rounded p-2 text-sm font-mono"
            placeholder="APPLE,easy,fruit&#10;BRAIN,medium,body&#10;CRANE,hard"
          />
          <div className="flex gap-2">
            <button onClick={handleImport} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Import</button>
            <button onClick={() => setShowImport(false)} className="px-4 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded p-4 space-y-3">
          <h3 className="font-semibold text-sm">{editingWord ? 'Edit Word' : 'New Word'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Word</label>
              <input
                value={formText}
                onChange={(e) => setFormText(e.target.value.toUpperCase())}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono uppercase"
                required
                pattern="[A-Za-z]{4,10}"
                placeholder="APPLE"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
              <select value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma-sep)</label>
              <input value={formTags} onChange={(e) => setFormTags(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="fruit, food" />
            </div>
          </div>

          {/* Hints */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Hints (max 3)</label>
              {formHints.length < 3 && (
                <button type="button" onClick={addHint} className="text-xs text-blue-600 hover:text-blue-800">+ Add hint</button>
              )}
            </div>
            {formHints.map((h, i) => (
              <div key={i} className="flex gap-2 items-start">
                <select
                  value={h.type}
                  onChange={(e) => setFormHints(prev => prev.map((hh, j) => j === i ? { ...hh, type: e.target.value } : hh))}
                  className="border rounded px-2 py-1 text-xs w-32"
                >
                  {['DEFINITION', 'CATEGORY', 'SYNONYM', 'RIDDLE', 'FIRST_LETTER'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  value={h.content}
                  onChange={(e) => setFormHints(prev => prev.map((hh, j) => j === i ? { ...hh, content: e.target.value } : hh))}
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  placeholder="Hint text..."
                  required
                />
                <input
                  type="number"
                  value={h.cost}
                  onChange={(e) => setFormHints(prev => prev.map((hh, j) => j === i ? { ...hh, cost: Number(e.target.value) } : hh))}
                  className="border rounded px-2 py-1 text-xs w-16"
                  min={0}
                />
                <button
                  type="button"
                  onClick={() => setFormHints(prev => prev.filter((_, j) => j !== i).map((hh, j) => ({ ...hh, order: j + 1 })))}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
              {editingWord ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      )}

      {/* Words table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Word</th>
              <th className="text-left px-3 py-2 font-medium">Length</th>
              <th className="text-left px-3 py-2 font-medium">Difficulty</th>
              <th className="text-left px-3 py-2 font-medium">Tags</th>
              <th className="text-left px-3 py-2 font-medium">Hints</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {words.map(w => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono font-bold">{w.text}</td>
                <td className="px-3 py-2">{w.length}</td>
                <td className="px-3 py-2"><Badge color={w.difficulty === 'easy' ? 'green' : w.difficulty === 'hard' ? 'red' : 'yellow'}>{w.difficulty}</Badge></td>
                <td className="px-3 py-2 text-gray-500">{w.tags.join(', ') || '-'}</td>
                <td className="px-3 py-2">{w.hints.length}</td>
                <td className="px-3 py-2"><Badge color={w.isActive ? 'green' : 'gray'}>{w.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button onClick={() => startEdit(w)} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                  <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {words.length === 0 && <p className="text-center text-gray-400 py-8">No words yet. Add some above.</p>}
      </div>
    </div>
  );
}

// ─── Schedule Tab ───
function ScheduleTab() {
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);

  // Assign form
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignWordId, setAssignWordId] = useState('');
  const [assignDifficulty, setAssignDifficulty] = useState('medium');
  const [assignLength, setAssignLength] = useState(5);

  // Autofill form
  const [autofillDays, setAutofillDays] = useState(7);
  const [autofillLength, setAutofillLength] = useState(5);
  const [autofillDifficulty, setAutofillDifficulty] = useState('medium');

  useEffect(() => {
    (async () => {
      setLoadingWords(true);
      const res = await fetch('/api/admin/words').then(r => r.json());
      if (res.ok) setWords(res.data);
      setLoadingWords(false);
    })();
  }, []);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/admin/daily/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'assign', dateKey: assignDate, wordId: assignWordId, length: assignLength, difficulty: assignDifficulty }),
    }).then(r => r.json());
    if (res.ok) setMsg({ text: `Daily game scheduled for ${assignDate}`, type: 'success' });
    else setMsg({ text: res.error?.message ?? 'Failed to assign', type: 'error' });
  }

  async function handleAutofill(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/admin/daily/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'autofill', days: autofillDays, length: autofillLength, difficulty: autofillDifficulty }),
    }).then(r => r.json());
    if (res.ok) setMsg({ text: `Auto-filled ${res.data.createdCount} days`, type: 'success' });
    else setMsg({ text: res.error?.message ?? 'Autofill failed', type: 'error' });
  }

  const filteredWords = words.filter(w => w.length === assignLength && w.isActive);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Daily Schedule</h2>
      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      {/* Assign a specific word to a date */}
      <div className="bg-gray-50 border rounded p-4 space-y-3">
        <h3 className="font-semibold text-sm">Assign Word to Date</h3>
        <form onSubmit={handleAssign} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Word Length</label>
            <select value={assignLength} onChange={(e) => setAssignLength(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
              {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} letters</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Word</label>
            {loadingWords ? (
              <p className="text-xs text-gray-400">Loading words...</p>
            ) : (
              <select value={assignWordId} onChange={(e) => setAssignWordId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required>
                <option value="">Select a word</option>
                {filteredWords.map(w => <option key={w.id} value={w.id}>{w.text} ({w.difficulty})</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
            <select value={assignDifficulty} onChange={(e) => setAssignDifficulty(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">Assign</button>
          </div>
        </form>
      </div>

      {/* Autofill */}
      <div className="bg-gray-50 border rounded p-4 space-y-3">
        <h3 className="font-semibold text-sm">Auto-fill Schedule</h3>
        <p className="text-xs text-gray-500">Automatically assign random words for the next N days.</p>
        <form onSubmit={handleAutofill} className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
            <input type="number" value={autofillDays} onChange={(e) => setAutofillDays(Number(e.target.value))} min={1} max={30} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Word Length</label>
            <select value={autofillLength} onChange={(e) => setAutofillLength(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
              {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} letters</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
            <select value={autofillDifficulty} onChange={(e) => setAutofillDifficulty(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="col-span-3">
            <button type="submit" className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Auto-fill</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Custom Games Tab ───
function GamesTab() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formWordId, setFormWordId] = useState('');
  const [formLength, setFormLength] = useState(5);
  const [formMaxAttempts, setFormMaxAttempts] = useState(6);
  const [formDifficulty, setFormDifficulty] = useState('medium');
  const [formDictMode, setFormDictMode] = useState<'STRICT' | 'RELAXED'>('STRICT');
  const [formHardMode, setFormHardMode] = useState(true);
  const [formReplay, setFormReplay] = useState(false);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const [gamesRes, wordsRes] = await Promise.all([
      fetch('/api/admin/games').then(r => r.json()),
      fetch('/api/admin/words').then(r => r.json()),
    ]);
    if (gamesRes.ok) setGames(gamesRes.data);
    if (wordsRes.ok) setWords(wordsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answerWordId: formWordId,
        length: formLength,
        maxAttempts: formMaxAttempts,
        difficulty: formDifficulty,
        dictionaryMode: formDictMode,
        hardModeAllowed: formHardMode,
        allowReplay: formReplay,
      }),
    }).then(r => r.json());
    if (res.ok) {
      setMsg({ text: `Game created! Share code: ${res.data.shareCode}`, type: 'success' });
      setShowForm(false);
      fetchGames();
    } else {
      setMsg({ text: res.error?.message ?? 'Failed to create game', type: 'error' });
    }
  }

  async function toggleActive(game: GameRecord) {
    const res = await fetch('/api/admin/games', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: game.id, isActive: !game.isActive }),
    }).then(r => r.json());
    if (res.ok) fetchGames();
    else setMsg({ text: res.error?.message ?? 'Failed to update', type: 'error' });
  }

  const filteredWords = words.filter(w => w.length === formLength && w.isActive);

  if (loading) return <p className="text-gray-500 animate-pulse">Loading games...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Custom Games ({games.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
          + Create Game
        </button>
      </div>

      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 border rounded p-4 space-y-3">
          <h3 className="font-semibold text-sm">New Custom Game</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Word Length</label>
              <select value={formLength} onChange={(e) => setFormLength(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
                {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} letters</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Answer Word</label>
              <select value={formWordId} onChange={(e) => setFormWordId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required>
                <option value="">Select word</option>
                {filteredWords.map(w => <option key={w.id} value={w.id}>{w.text}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Attempts</label>
              <input type="number" value={formMaxAttempts} onChange={(e) => setFormMaxAttempts(Number(e.target.value))} min={1} max={12} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
              <select value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dictionary Mode</label>
              <select value={formDictMode} onChange={(e) => setFormDictMode(e.target.value as any)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="STRICT">Strict (only dictionary words)</option>
                <option value="RELAXED">Relaxed (any letters)</option>
              </select>
            </div>
            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={formHardMode} onChange={(e) => setFormHardMode(e.target.checked)} className="accent-green-600" />
                Hard mode
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={formReplay} onChange={(e) => setFormReplay(e.target.checked)} className="accent-green-600" />
                Allow replay
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">Create Game</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      )}

      {/* Games table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Share Code</th>
              <th className="text-left px-3 py-2 font-medium">Length</th>
              <th className="text-left px-3 py-2 font-medium">Attempts</th>
              <th className="text-left px-3 py-2 font-medium">Difficulty</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Created</th>
              <th className="text-right px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {games.map(g => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono">{g.shareCode ?? '-'}</td>
                <td className="px-3 py-2">{g.length}</td>
                <td className="px-3 py-2">{g.maxAttempts}</td>
                <td className="px-3 py-2"><Badge color={g.difficulty === 'easy' ? 'green' : g.difficulty === 'hard' ? 'red' : 'yellow'}>{g.difficulty}</Badge></td>
                <td className="px-3 py-2"><Badge color={g.isActive ? 'green' : 'gray'}>{g.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-3 py-2 text-gray-500">{new Date(g.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  {g.shareCode && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/g/${g.shareCode}`); setMsg({ text: 'Link copied!', type: 'success' }); }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Copy Link
                    </button>
                  )}
                  <button onClick={() => toggleActive(g)} className={`text-xs ${g.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                    {g.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {games.length === 0 && <p className="text-center text-gray-400 py-8">No custom games yet.</p>}
      </div>
    </div>
  );
}

// ─── Users Tab ───
function UsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users').then(r => r.json());
    if (res.ok) setUsers(res.data);
    else setMsg({ text: res.error?.message ?? 'Failed to load users', type: 'error' });
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(userId: string, role: string) {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    }).then(r => r.json());
    if (res.ok) { setMsg({ text: 'Role updated', type: 'success' }); fetchUsers(); }
    else setMsg({ text: res.error?.message ?? 'Failed to update role', type: 'error' });
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    const action = isBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ban: !isBanned }),
    }).then(r => r.json());
    if (res.ok) { setMsg({ text: `User ${action}ned`, type: 'success' }); fetchUsers(); }
    else setMsg({ text: res.error?.message ?? `Failed to ${action}`, type: 'error' });
  }

  if (loading) return <p className="text-gray-500 animate-pulse">Loading users...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Users ({users.length})</h2>
      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Role</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Joined</th>
              <th className="text-right px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{u.displayName}</td>
                <td className="px-3 py-2 text-gray-500">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    <option value="USER">USER</option>
                    <option value="CREATOR">CREATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Badge color={u.bannedAt ? 'red' : 'green'}>
                    {u.bannedAt ? 'Banned' : 'Active'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => toggleBan(u.id, !!u.bannedAt)}
                    className={`text-xs ${u.bannedAt ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
                  >
                    {u.bannedAt ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Audit Tab ───
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/admin/audit').then(r => r.json());
      if (res.ok) setLogs(res.data);
      else setMsg({ text: res.error?.message ?? 'Failed to load audit logs', type: 'error' });
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-gray-500 animate-pulse">Loading audit logs...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Audit Logs ({logs.length})</h2>
      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Time</th>
              <th className="text-left px-3 py-2 font-medium">Actor</th>
              <th className="text-left px-3 py-2 font-medium">Action</th>
              <th className="text-left px-3 py-2 font-medium">Target</th>
              <th className="text-left px-3 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{l.actor?.displayName ?? 'Unknown'}</td>
                <td className="px-3 py-2"><Badge color="blue">{l.action}</Badge></td>
                <td className="px-3 py-2 text-gray-500">{l.targetType}{l.targetId ? ` #${l.targetId.slice(0, 8)}` : ''}</td>
                <td className="px-3 py-2 text-gray-400 text-xs font-mono max-w-xs truncate">{JSON.stringify(l.metadata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-center text-gray-400 py-8">No audit logs yet.</p>}
      </div>
    </div>
  );
}

// ─── Main Admin Page ───
const TABS = [
  { key: 'words', label: 'Words' },
  { key: 'schedule', label: 'Daily Schedule' },
  { key: 'games', label: 'Custom Games' },
  { key: 'users', label: 'Users' },
  { key: 'audit', label: 'Audit Logs' },
];

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') ?? 'words';

  function renderTab() {
    switch (activeTab) {
      case 'words': return <WordsTab />;
      case 'schedule': return <ScheduleTab />;
      case 'games': return <GamesTab />;
      case 'users': return <UsersTab />;
      case 'audit': return <AuditTab />;
      default: return <WordsTab />;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
      <aside className="bg-white rounded-lg shadow p-4 space-y-1">
        <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Admin Panel</h2>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => router.push(`/admin?tab=${tab.key}`)}
            className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-green-50 text-green-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </aside>
      <section className="bg-white rounded-lg shadow p-6 min-h-[400px]">
        {renderTab()}
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-gray-500 animate-pulse">Loading admin...</p>}>
      <AdminContent />
    </Suspense>
  );
}
