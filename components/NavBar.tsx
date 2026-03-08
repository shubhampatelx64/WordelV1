'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export function NavBar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/daily' as const, label: 'Daily' },
    { href: '/practice' as const, label: 'Practice' },
    { href: '/leaderboard' as const, label: 'Leaderboard' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/daily" className="font-black text-2xl tracking-[0.2em] text-gradient select-none">
            WORDEL
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop auth */}
        <div className="hidden sm:flex items-center gap-2">
          {session ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all">
                {session.user?.name ?? 'Profile'}
              </Link>
              {(session.user as any)?.role === 'ADMIN' && (
                <Link href="/admin" className="text-sm font-medium text-yellow-500 hover:text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all">
                  Admin
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm font-medium text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-all">
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-correct hover:bg-green-600 text-white px-4 py-1.5 rounded-lg transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden text-gray-400 hover:text-white p-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-800 px-4 py-3 space-y-1 animate-fade-in">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-all"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-800 pt-2 mt-2">
            {session ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800">
                  {session.user?.name ?? 'Profile'}
                </Link>
                {(session.user as any)?.role === 'ADMIN' && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-yellow-500 px-3 py-2 rounded-lg hover:bg-gray-800">
                    Admin
                  </Link>
                )}
                <button onClick={() => { signOut({ callbackUrl: '/login' }); setMobileOpen(false); }} className="block w-full text-left text-sm text-gray-500 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-gray-800">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 px-3 py-2 rounded-lg hover:bg-gray-800">Login</Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="block text-sm text-correct font-semibold px-3 py-2 rounded-lg hover:bg-gray-800">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
