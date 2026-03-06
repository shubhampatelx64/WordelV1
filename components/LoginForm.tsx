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
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          className="border border-gray-300 rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          required
          className="border border-gray-300 rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
      <p className="text-sm text-center text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-green-600 hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </form>
  );
}
