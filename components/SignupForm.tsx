'use client';
import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <form
      className="space-y-4 w-full max-w-sm mx-auto"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName }),
        });
        const json = await res.json();
        setLoading(false);
        if (!json.ok) {
          setMessage(json.error?.message ?? 'Sign up failed');
          return;
        }
        setSuccess(true);
        const loginRes = await signIn('credentials', { email, password, redirect: false });
        if (loginRes?.ok) router.push('/daily');
      }}
    >
      {success ? (
        <div className="text-center py-6">
          <p className="text-3xl mb-3">&#127881;</p>
          <p className="text-correct font-bold">Account created! Redirecting...</p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Display Name</label>
            <input
              required
              className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-correct focus:border-transparent transition-all"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
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
              minLength={8}
              className="bg-gray-800 border border-gray-700 rounded-lg p-3 w-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-correct focus:border-transparent transition-all"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && <p className="text-red-400 text-sm bg-red-900/30 px-3 py-2 rounded-lg">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-correct hover:bg-green-600 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-correct hover:underline font-medium">
              Log in
            </Link>
          </p>
        </>
      )}
    </form>
  );
}
