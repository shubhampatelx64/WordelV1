async function getData() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/leaderboard/daily`, { cache: 'no-store' });
  return res.json();
}

export default async function LeaderboardPage() {
  const data = await getData();
  const entries = data.ok ? data.data.entries : [];
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Leaderboard</h1>
      <ul>
        {entries.map((e: any) => (
          <li key={`${e.rank}-${e.displayName}`} data-testid="leaderboard-entry">#{e.rank} {e.displayName} - {e.score}</li>
        ))}
      </ul>
    </div>
  );
}
