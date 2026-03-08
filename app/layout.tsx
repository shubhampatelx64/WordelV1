import './globals.css';
import { ReactNode } from 'react';
import { Providers } from '@/components/Providers';
import { NavBar } from '@/components/NavBar';

export const metadata = {
  title: 'Wordel - Daily Word Guessing Game',
  description: 'Play Wordel - guess the hidden word in 6 tries. A daily word game with hints, hard mode, and leaderboards.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <NavBar />
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
