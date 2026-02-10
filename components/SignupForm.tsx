'use client';
import { useState } from 'react';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault();
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, displayName }) });
      const json = await res.json();
      setMessage(json.ok ? 'Account created' : json.error.message);
    }}>
      <input className="border p-2 block" placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <input className="border p-2 block" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 block" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-black text-white px-3 py-1" type="submit">Sign up</button>
      {message && <p>{message}</p>}
    </form>
  );
}
