async function getData() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/leaderboard/daily`, { cache: 'no-store' });
  return res.json();
}

export default async function LeaderboardPage() {
  const data = await getData();
  const entries: any[] = data.ok ? data.data.entries : [];
  const dateKey: string = data.ok ? data.data.dateKey : '';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Daily Leaderboard</h1>
        {dateKey && <p className="text-sm text-gray-500 mt-1">{dateKey}</p>}
      </div>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No scores yet today. Be the first to play!</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Player</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Score</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Guesses</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={`${e.rank}-${e.displayName}`} data-testid="leaderboard-entry" className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-400">#{e.rank}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.displayName}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{e.score}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{e.attemptsUsed}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{Math.round(e.timeMs / 1000)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
