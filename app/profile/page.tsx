async function getStats() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/me/stats`, { cache: 'no-store' });
  return res.json();
}

export default async function ProfilePage() {
  const stats = await getStats();
  if (!stats.ok) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <p className="text-6xl mb-4">&#128274;</p>
        <p className="text-gray-400 mb-6">Please log in to view your profile.</p>
        <a href="/login" className="bg-correct text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-600 transition-all hover:scale-105 active:scale-95">
          Log in
        </a>
      </div>
    );
  }

  const { streak, winRate, last10Results } = stats.data;

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-black text-white text-center mb-8 tracking-wide">My Profile</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-4xl font-black text-correct">{streak}</p>
          <p className="text-sm text-gray-500 mt-2">Current Streak</p>
        </div>
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-4xl font-black text-present">{winRate}%</p>
          <p className="text-sm text-gray-500 mt-2">Win Rate</p>
        </div>
      </div>

      <h2 className="font-bold text-gray-400 mb-4 text-xs uppercase tracking-wider">Recent Games</h2>
      {last10Results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-sm">No completed games yet.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-400 text-xs uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left font-bold text-gray-400 text-xs uppercase tracking-wider">Result</th>
                <th className="px-4 py-3 text-right font-bold text-gray-400 text-xs uppercase tracking-wider">Guesses</th>
                <th className="px-4 py-3 text-right font-bold text-gray-400 text-xs uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody>
              {last10Results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{r.dateKey ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                      r.status === 'WIN' ? 'bg-green-900/50 text-correct' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{r.attemptsUsed}</td>
                  <td className="px-4 py-3 text-right font-bold text-white">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
