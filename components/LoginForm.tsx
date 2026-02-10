'use client';

import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('player@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const router = useRouter();

  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault();
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) setError('Invalid credentials');
      else router.push('/daily');
    }}>
      <input type="email" className="border p-2 block" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border p-2 block" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="bg-black text-white px-3 py-1" type="submit">Login</button>
      <button className="border px-3 py-1 ml-2" type="button" onClick={() => signOut({ callbackUrl: '/login' })}>Logout</button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
