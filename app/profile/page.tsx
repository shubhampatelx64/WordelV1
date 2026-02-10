async function getStats() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/me/stats`, { cache: 'no-store' });
  return res.json();
}

export default async function ProfilePage() {
  const stats = await getStats();
  if (!stats.ok) return <p>Please login to view profile.</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Profile</h1>
      <p>Streak: {stats.data.streak}</p>
      <p>Win Rate: {stats.data.winRate}%</p>
      <h2 className="font-semibold mt-3">Last 10 results</h2>
      <ul>
        {stats.data.last10Results.map((r: any) => (
          <li key={`${r.dateKey}-${r.status}`}>{r.dateKey} {r.status} attempts:{r.attemptsUsed} score:{r.score}</li>
        ))}
      </ul>
    </div>
  );
}
