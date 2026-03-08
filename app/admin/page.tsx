'use client';

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
    green: 'bg-green-900/50 text-green-400',
    red: 'bg-red-900/50 text-red-400',
    blue: 'bg-blue-900/50 text-blue-400',
    gray: 'bg-gray-800 text-gray-400',
    yellow: 'bg-yellow-900/50 text-yellow-400',
    purple: 'bg-purple-900/50 text-purple-400',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] ?? colors.gray}`}>{children}</span>;
}

function StatusMessage({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const cls = type === 'success' ? 'bg-green-900/30 text-green-400 border-green-800' : type === 'error' ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-blue-900/30 text-blue-400 border-blue-800';
  return <div className={`px-4 py-2 rounded-lg border text-sm ${cls}`}>{message}</div>;
}

function inputClass() {
  return 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-correct focus:border-transparent w-full transition-all';
}

function selectClass() {
  return 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-correct focus:border-transparent w-full transition-all';
}

// ─── Words Tab ───
function WordsTab() {
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<WordRecord | null>(null);

  const [formText, setFormText] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('medium');
  const [formTags, setFormTags] = useState('');
  const [formHints, setFormHints] = useState<HintRecord[]>([]);

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
    setFormText(''); setFormDifficulty('medium'); setFormTags(''); setFormHints([]);
    setEditingWord(null); setShowForm(false);
  }

  function startEdit(w: WordRecord) {
    setEditingWord(w); setFormText(w.text); setFormDifficulty(w.difficulty);
    setFormTags(w.tags.join(', ')); setFormHints(w.hints.map(h => ({ type: h.type, content: h.content, cost: h.cost, order: h.order })));
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingWord.id, text, length: text.length, difficulty: formDifficulty, tags, hints: formHints }),
      }).then(r => r.json());
      if (res.ok) { setMsg({ text: 'Word updated', type: 'success' }); resetForm(); fetchWords(); }
      else setMsg({ text: res.error?.message ?? 'Update failed', type: 'error' });
    } else {
      const res = await fetch('/api/admin/words', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    }).then(r => r.json());
    if (res.ok) {
      setMsg({ text: `Imported ${res.data.inserted.length} words, ${res.data.errors.length} errors`, type: 'success' });
      setImportText(''); setShowImport(false); fetchWords();
    } else {
      setMsg({ text: res.error?.message ?? 'Import failed', type: 'error' });
    }
  }

  if (loading) return <p className="text-gray-500 animate-pulse">Loading words...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Words ({words.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(!showImport)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all active:scale-95">Import CSV</button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-3 py-1.5 text-sm bg-correct text-white rounded-lg hover:bg-green-600 transition-all active:scale-95">+ Add Word</button>
        </div>
      </div>

      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      {showImport && (
        <div className="glass rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-300 font-medium">Paste words (one per line): WORD,difficulty,tag1,tag2</p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} className={`${inputClass()} font-mono`} placeholder={"APPLE,easy,fruit\nBRAIN,medium,body\nCRANE,hard"} />
          <div className="flex gap-2">
            <button onClick={handleImport} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500">Import</button>
            <button onClick={() => setShowImport(false)} className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="glass rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-white">{editingWord ? 'Edit Word' : 'New Word'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Word</label>
              <input value={formText} onChange={(e) => setFormText(e.target.value.toUpperCase())} className={`${inputClass()} font-mono uppercase`} required pattern="[A-Za-z]{4,10}" placeholder="APPLE" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Difficulty</label>
              <select value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} className={selectClass()}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tags (comma-sep)</label>
              <input value={formTags} onChange={(e) => setFormTags(e.target.value)} className={inputClass()} placeholder="fruit, food" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">Hints (max 3)</label>
              {formHints.length < 3 && <button type="button" onClick={addHint} className="text-xs text-correct hover:text-green-400">+ Add hint</button>}
            </div>
            {formHints.map((h, i) => (
              <div key={i} className="flex gap-2 items-start">
                <select value={h.type} onChange={(e) => setFormHints(prev => prev.map((hh, j) => j === i ? { ...hh, type: e.target.value } : hh))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white w-32">
                  {['DEFINITION', 'CATEGORY', 'SYNONYM', 'RIDDLE', 'FIRST_LETTER'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={h.content} onChange={(e) => setFormHints(prev => prev.map((hh, j) => j === i ? { ...hh, content: e.target.value } : hh))} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white" placeholder="Hint text..." required />
                <input type="number" value={h.cost} onChange={(e) => setFormHints(prev => prev.map((hh, j) => j === i ? { ...hh, cost: Number(e.target.value) } : hh))} className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white w-16" min={0} />
                <button type="button" onClick={() => setFormHints(prev => prev.filter((_, j) => j !== i).map((hh, j) => ({ ...hh, order: j + 1 })))} className="text-red-400 hover:text-red-300 text-sm">&times;</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 text-sm bg-correct text-white rounded-lg hover:bg-green-600">{editingWord ? 'Update' : 'Create'}</button>
            <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto glass rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Word</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Len</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Difficulty</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Tags</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Hints</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Status</th>
              <th className="text-right px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {words.map(w => (
              <tr key={w.id} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2.5 font-mono font-bold text-white">{w.text}</td>
                <td className="px-3 py-2.5 text-gray-400">{w.length}</td>
                <td className="px-3 py-2.5"><Badge color={w.difficulty === 'easy' ? 'green' : w.difficulty === 'hard' ? 'red' : 'yellow'}>{w.difficulty}</Badge></td>
                <td className="px-3 py-2.5 text-gray-500">{w.tags.join(', ') || '-'}</td>
                <td className="px-3 py-2.5 text-gray-400">{w.hints.length}</td>
                <td className="px-3 py-2.5"><Badge color={w.isActive ? 'green' : 'gray'}>{w.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-3 py-2.5 text-right space-x-2">
                  <button onClick={() => startEdit(w)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                  <button onClick={() => handleDelete(w.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {words.length === 0 && <p className="text-center text-gray-600 py-8">No words yet. Add some above.</p>}
      </div>
    </div>
  );
}

// ─── Schedule Tab ───
function ScheduleTab() {
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);

  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignWordId, setAssignWordId] = useState('');
  const [assignDifficulty, setAssignDifficulty] = useState('medium');
  const [assignLength, setAssignLength] = useState(5);

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
    e.preventDefault(); setMsg(null);
    const res = await fetch('/api/admin/daily/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'assign', dateKey: assignDate, wordId: assignWordId, length: assignLength, difficulty: assignDifficulty }),
    }).then(r => r.json());
    if (res.ok) setMsg({ text: `Daily game scheduled for ${assignDate}`, type: 'success' });
    else setMsg({ text: res.error?.message ?? 'Failed to assign', type: 'error' });
  }

  async function handleAutofill(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const res = await fetch('/api/admin/daily/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'autofill', days: autofillDays, length: autofillLength, difficulty: autofillDifficulty }),
    }).then(r => r.json());
    if (res.ok) setMsg({ text: `Auto-filled ${res.data.createdCount} days`, type: 'success' });
    else setMsg({ text: res.error?.message ?? 'Autofill failed', type: 'error' });
  }

  const filteredWords = words.filter(w => w.length === assignLength && w.isActive);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Daily Schedule</h2>
      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      <div className="glass rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white">Assign Word to Date</h3>
        <form onSubmit={handleAssign} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
            <input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} className={inputClass()} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Word Length</label>
            <select value={assignLength} onChange={(e) => setAssignLength(Number(e.target.value))} className={selectClass()}>
              {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} letters</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Word</label>
            {loadingWords ? <p className="text-xs text-gray-500">Loading...</p> : (
              <select value={assignWordId} onChange={(e) => setAssignWordId(e.target.value)} className={selectClass()} required>
                <option value="">Select a word</option>
                {filteredWords.map(w => <option key={w.id} value={w.id}>{w.text} ({w.difficulty})</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Difficulty</label>
            <select value={assignDifficulty} onChange={(e) => setAssignDifficulty(e.target.value)} className={selectClass()}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="px-4 py-1.5 text-sm bg-correct text-white rounded-lg hover:bg-green-600 transition-all active:scale-95">Assign</button>
          </div>
        </form>
      </div>

      <div className="glass rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white">Auto-fill Schedule</h3>
        <p className="text-xs text-gray-500">Automatically assign random words for the next N days.</p>
        <form onSubmit={handleAutofill} className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Days</label>
            <input type="number" value={autofillDays} onChange={(e) => setAutofillDays(Number(e.target.value))} min={1} max={30} className={inputClass()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Word Length</label>
            <select value={autofillLength} onChange={(e) => setAutofillLength(Number(e.target.value))} className={selectClass()}>
              {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} letters</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Difficulty</label>
            <select value={autofillDifficulty} onChange={(e) => setAutofillDifficulty(e.target.value)} className={selectClass()}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
          <div className="col-span-3">
            <button type="submit" className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all active:scale-95">Auto-fill</button>
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
    e.preventDefault(); setMsg(null);
    const res = await fetch('/api/admin/games', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerWordId: formWordId, length: formLength, maxAttempts: formMaxAttempts, difficulty: formDifficulty, dictionaryMode: formDictMode, hardModeAllowed: formHardMode, allowReplay: formReplay }),
    }).then(r => r.json());
    if (res.ok) { setMsg({ text: `Game created! Share code: ${res.data.shareCode}`, type: 'success' }); setShowForm(false); fetchGames(); }
    else setMsg({ text: res.error?.message ?? 'Failed to create game', type: 'error' });
  }

  async function toggleActive(game: GameRecord) {
    const res = await fetch('/api/admin/games', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
        <h2 className="text-lg font-bold text-white">Custom Games ({games.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-sm bg-correct text-white rounded-lg hover:bg-green-600 transition-all active:scale-95">+ Create Game</button>
      </div>

      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      {showForm && (
        <form onSubmit={handleCreate} className="glass rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-white">New Custom Game</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Word Length</label>
              <select value={formLength} onChange={(e) => setFormLength(Number(e.target.value))} className={selectClass()}>
                {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} letters</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Answer Word</label>
              <select value={formWordId} onChange={(e) => setFormWordId(e.target.value)} className={selectClass()} required>
                <option value="">Select word</option>
                {filteredWords.map(w => <option key={w.id} value={w.id}>{w.text}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Max Attempts</label>
              <input type="number" value={formMaxAttempts} onChange={(e) => setFormMaxAttempts(Number(e.target.value))} min={1} max={12} className={inputClass()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Difficulty</label>
              <select value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} className={selectClass()}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Dictionary Mode</label>
              <select value={formDictMode} onChange={(e) => setFormDictMode(e.target.value as any)} className={selectClass()}>
                <option value="STRICT">Strict</option><option value="RELAXED">Relaxed</option>
              </select>
            </div>
            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-300">
                <input type="checkbox" checked={formHardMode} onChange={(e) => setFormHardMode(e.target.checked)} className="accent-correct" />Hard mode
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-300">
                <input type="checkbox" checked={formReplay} onChange={(e) => setFormReplay(e.target.checked)} className="accent-correct" />Replay
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 text-sm bg-correct text-white rounded-lg hover:bg-green-600">Create Game</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto glass rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Code</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Len</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Tries</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Diff</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Created</th>
              <th className="text-right px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {games.map(g => (
              <tr key={g.id} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2.5 font-mono text-white">{g.shareCode ?? '-'}</td>
                <td className="px-3 py-2.5 text-gray-400">{g.length}</td>
                <td className="px-3 py-2.5 text-gray-400">{g.maxAttempts}</td>
                <td className="px-3 py-2.5"><Badge color={g.difficulty === 'easy' ? 'green' : g.difficulty === 'hard' ? 'red' : 'yellow'}>{g.difficulty}</Badge></td>
                <td className="px-3 py-2.5"><Badge color={g.isActive ? 'green' : 'gray'}>{g.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-3 py-2.5 text-gray-500">{new Date(g.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-right space-x-2">
                  {g.shareCode && (
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/g/${g.shareCode}`); setMsg({ text: 'Link copied!', type: 'success' }); }} className="text-blue-400 hover:text-blue-300 text-xs">Copy Link</button>
                  )}
                  <button onClick={() => toggleActive(g)} className={`text-xs ${g.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}>
                    {g.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {games.length === 0 && <p className="text-center text-gray-600 py-8">No custom games yet.</p>}
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
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    }).then(r => r.json());
    if (res.ok) { setMsg({ text: 'Role updated', type: 'success' }); fetchUsers(); }
    else setMsg({ text: res.error?.message ?? 'Failed to update role', type: 'error' });
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    const action = isBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ban: !isBanned }),
    }).then(r => r.json());
    if (res.ok) { setMsg({ text: `User ${action}ned`, type: 'success' }); fetchUsers(); }
    else setMsg({ text: res.error?.message ?? `Failed to ${action}`, type: 'error' });
  }

  if (loading) return <p className="text-gray-500 animate-pulse">Loading users...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Users ({users.length})</h2>
      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      <div className="overflow-x-auto glass rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Email</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Role</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Joined</th>
              <th className="text-right px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2.5 font-medium text-white">{u.displayName}</td>
                <td className="px-3 py-2.5 text-gray-400">{u.email}</td>
                <td className="px-3 py-2.5">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                    <option value="USER">USER</option><option value="CREATOR">CREATOR</option><option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-3 py-2.5"><Badge color={u.bannedAt ? 'red' : 'green'}>{u.bannedAt ? 'Banned' : 'Active'}</Badge></td>
                <td className="px-3 py-2.5 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => toggleBan(u.id, !!u.bannedAt)} className={`text-xs ${u.bannedAt ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}>
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
      <h2 className="text-lg font-bold text-white">Audit Logs ({logs.length})</h2>
      {msg && <StatusMessage message={msg.text} type={msg.type} />}

      <div className="overflow-x-auto glass rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800">
            <tr>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Time</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Actor</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Action</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Target</th>
              <th className="text-left px-3 py-2.5 font-bold text-gray-400 text-xs uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-white">{l.actor?.displayName ?? 'Unknown'}</td>
                <td className="px-3 py-2.5"><Badge color="blue">{l.action}</Badge></td>
                <td className="px-3 py-2.5 text-gray-400">{l.targetType}{l.targetId ? ` #${l.targetId.slice(0, 8)}` : ''}</td>
                <td className="px-3 py-2.5 text-gray-600 text-xs font-mono max-w-xs truncate">{JSON.stringify(l.metadata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="text-center text-gray-600 py-8">No audit logs yet.</p>}
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
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black text-white text-center mb-6 tracking-wide">Admin Panel</h1>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <aside className="glass rounded-xl p-4 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => router.push(`/admin?tab=${tab.key}`)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-correct/20 text-correct font-bold'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </aside>
        <section className="glass rounded-xl p-6 min-h-[400px]">
          {renderTab()}
        </section>
      </div>
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
