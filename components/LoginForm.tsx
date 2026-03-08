'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <form
      className="space-y-4 w-full max-w-sm mx-auto"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await signIn('credentials', { email, password, redirect: false });
        setLoading(false);
        if (res?.error) setError('Invalid email or password');
        else router.push('/daily');
      }}
    >
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
        <input
          type="email"
          required
          className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-correct focus:border-transparent transition-all"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
        <input
          type="password"
          required
          className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-correct focus:border-transparent transition-all"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-red-400 text-sm bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-correct hover:bg-green-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
      <p className="text-sm text-center text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-correct hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </form>
  );
}
