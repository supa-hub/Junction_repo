interface Student {
  rank: number
  name: string
  score: number
}

const students: Student[] = [
  { rank: 1, name: 'Alex Chen', score: 1450 },
  { rank: 2, name: 'Maria Garcia', score: 1320 },
  { rank: 3, name: 'Jordan Smith', score: 1180 },
  { rank: 4, name: 'Taylor Johnson', score: 1050 },
  { rank: 5, name: 'Sam Wilson', score: 980 },
  { rank: 6, name: 'Casey Brown', score: 920 },
  { rank: 7, name: 'Riley Davis', score: 850 },
  { rank: 8, name: 'Morgan Lee', score: 780 },
  { rank: 9, name: 'Jamie Martinez', score: 1240 },
  { rank: 10, name: 'Chris Anderson', score: 1100 },
  { rank: 11, name: 'Pat Taylor', score: 990 },
  { rank: 12, name: 'Drew Thomas', score: 880 },
  { rank: 13, name: 'Avery Moore', score: 1350 },
  { rank: 14, name: 'Quinn Jackson', score: 1020 },
  { rank: 15, name: 'Skylar White', score: 940 },
  { rank: 16, name: 'Harper Harris', score: 810 },
  { rank: 17, name: 'Cameron Clark', score: 1190 },
  { rank: 18, name: 'Dakota Lewis', score: 1060 },
  { rank: 19, name: 'Reese Walker', score: 970 },
  { rank: 20, name: 'Sage Hall', score: 890 },
  { rank: 21, name: 'Phoenix Allen', score: 1280 },
  { rank: 22, name: 'River Young', score: 1140 },
  { rank: 23, name: 'Eden King', score: 1010 },
  { rank: 24, name: 'Rowan Wright', score: 950 },
  { rank: 25, name: 'Oakley Lopez', score: 870 },
  { rank: 26, name: 'Lennon Hill', score: 1380 },
  { rank: 27, name: 'Azure Scott', score: 1090 },
  { rank: 28, name: 'Indigo Green', score: 1030 },
  { rank: 29, name: 'Sage Adams', score: 960 },
  { rank: 30, name: 'Atlas Baker', score: 840 },
]

export function Leaderboard() {
  const topStudents = [...students]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }))

  const maxScore = Math.max(...topStudents.map((student) => student.score))
  const minScore = Math.min(...topStudents.map((student) => student.score))
  const scoreRange = maxScore - minScore || 1

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-5xl text-white">Top 10 Leaderboard</h1>
          <div className="flex items-center justify-center gap-3 text-lg text-slate-300">
            <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
            <span>Live</span>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          {topStudents.map((student) => {
            const isTopThree = student.rank <= 3
            const barWidth = Math.max(20, ((student.score - minScore) / scoreRange) * 80 + 20)

            return (
              <div key={student.rank} className="relative">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-2xl ${
                      isTopThree
                        ? 'bg-yellow-500 text-slate-900 ring-4 ring-yellow-400'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    #{student.rank}
                  </div>
                  <div className="w-48 flex-shrink-0 text-xl text-white">{student.name}</div>
                  <div className="relative flex h-14 flex-1 overflow-hidden rounded-full border-2 border-slate-700 bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
