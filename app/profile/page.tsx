async function getStats() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/me/stats`, { cache: 'no-store' });
  return res.json();
}

export default async function ProfilePage() {
  const stats = await getStats();
  if (!stats.ok) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Please log in to view your profile.</p>
        <a href="/login" className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors">
          Log in
        </a>
      </div>
    );
  }

  const { streak, winRate, last10Results } = stats.data;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-green-600">{streak}</p>
          <p className="text-sm text-gray-500 mt-1">Current Streak</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{winRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Win Rate</p>
        </div>
      </div>
      <h2 className="font-semibold text-gray-800 mb-3">Recent Games</h2>
      {last10Results.length === 0 ? (
        <p className="text-gray-500 text-sm">No completed games yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Result</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Guesses</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Score</th>
              </tr>
            </thead>
            <tbody>
              {last10Results.map((r: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 text-gray-600">{r.dateKey ?? '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-semibold ${r.status === 'WIN' ? 'text-green-600' : 'text-red-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{r.attemptsUsed}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
