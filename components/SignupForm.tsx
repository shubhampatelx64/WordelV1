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
        // Auto-login after signup
        const loginRes = await signIn('credentials', { email, password, redirect: false });
        if (loginRes?.ok) router.push('/daily');
      }}
    >
      {success ? (
        <div className="text-center py-4">
          <p className="text-green-700 font-medium">Account created! Redirecting...</p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              required
              className="border border-gray-300 rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
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
              minLength={8}
              className="border border-gray-300 rounded-lg p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && <p className="text-red-600 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </>
      )}
    </form>
  );
}
