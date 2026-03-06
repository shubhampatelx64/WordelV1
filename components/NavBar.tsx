'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/daily" className="font-bold text-xl tracking-widest text-gray-900">
            WORDEL
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/daily" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
              Daily
            </Link>
            <Link href="/practice" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
              Practice
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
              Leaderboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
                {session.user?.name ?? 'Profile'}
              </Link>
              {(session.user as any)?.role === 'ADMIN' && (
                <Link href="/admin" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
                  Admin
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
