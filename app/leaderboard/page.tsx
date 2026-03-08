async function getData() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/leaderboard/daily`, { cache: 'no-store' });
  return res.json();
}

export default async function LeaderboardPage() {
  const data = await getData();
  const entries: any[] = data.ok ? data.data.entries : [];
  const dateKey: string = data.ok ? data.data.dateKey : '';

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-wide text-white">Leaderboard</h1>
        {dateKey && <p className="text-sm text-gray-500 mt-2">{dateKey}</p>}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">&#127942;</p>
          <p className="text-gray-400">No scores yet today. Be the first to play!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-4 mb-8 pt-4">
              {/* 2nd place */}
              <div className="text-center">
                <div className="glass rounded-xl p-4 w-24">
                  <p className="text-3xl mb-1">&#129352;</p>
                  <p className="text-sm font-bold text-white truncate">{entries[1].displayName}</p>
                  <p className="text-lg font-black text-present">{entries[1].score}</p>
                  <p className="text-[10px] text-gray-500">{entries[1].attemptsUsed} guesses</p>
                </div>
              </div>
              {/* 1st place */}
              <div className="text-center -mt-4">
                <div className="glass rounded-xl p-5 w-28 glow-green">
                  <p className="text-4xl mb-1">&#127942;</p>
                  <p className="text-sm font-bold text-white truncate">{entries[0].displayName}</p>
                  <p className="text-xl font-black text-correct">{entries[0].score}</p>
                  <p className="text-[10px] text-gray-500">{entries[0].attemptsUsed} guesses</p>
                </div>
              </div>
              {/* 3rd place */}
              <div className="text-center">
                <div className="glass rounded-xl p-4 w-24">
                  <p className="text-3xl mb-1">&#129353;</p>
                  <p className="text-sm font-bold text-white truncate">{entries[2].displayName}</p>
                  <p className="text-lg font-black text-orange-400">{entries[2].score}</p>
                  <p className="text-[10px] text-gray-500">{entries[2].attemptsUsed} guesses</p>
                </div>
              </div>
            </div>
          )}

          {/* Full table */}
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-400 text-xs uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-400 text-xs uppercase tracking-wider">Player</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-400 text-xs uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-400 text-xs uppercase tracking-wider">Guesses</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-400 text-xs uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => (
                  <tr key={`${e.rank}-${e.displayName}`} data-testid="leaderboard-entry" className="border-b border-gray-800/50 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${e.rank <= 3 ? 'text-correct' : 'text-gray-600'}`}>
                        #{e.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{e.displayName}</td>
                    <td className="px-4 py-3 text-right font-black text-correct">{e.score}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{e.attemptsUsed}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{Math.round(e.timeMs / 1000)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
