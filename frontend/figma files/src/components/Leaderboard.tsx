interface Student {
  rank: number;
  name: string;
  score: number;
}

// Mock data - in real app this would come from live data
const students: Student[] = [
  { rank: 1, name: "Alex Chen", score: 1450 },
  { rank: 2, name: "Maria Garcia", score: 1320 },
  { rank: 3, name: "Jordan Smith", score: 1180 },
  { rank: 4, name: "Taylor Johnson", score: 1050 },
  { rank: 5, name: "Sam Wilson", score: 980 },
  { rank: 6, name: "Casey Brown", score: 920 },
  { rank: 7, name: "Riley Davis", score: 850 },
  { rank: 8, name: "Morgan Lee", score: 780 },
  { rank: 9, name: "Jamie Martinez", score: 1240 },
  { rank: 10, name: "Chris Anderson", score: 1100 },
  { rank: 11, name: "Pat Taylor", score: 990 },
  { rank: 12, name: "Drew Thomas", score: 880 },
  { rank: 13, name: "Avery Moore", score: 1350 },
  { rank: 14, name: "Quinn Jackson", score: 1020 },
  { rank: 15, name: "Skylar White", score: 940 },
  { rank: 16, name: "Harper Harris", score: 810 },
  { rank: 17, name: "Cameron Clark", score: 1190 },
  { rank: 18, name: "Dakota Lewis", score: 1060 },
  { rank: 19, name: "Reese Walker", score: 970 },
  { rank: 20, name: "Sage Hall", score: 890 },
  { rank: 21, name: "Phoenix Allen", score: 1280 },
  { rank: 22, name: "River Young", score: 1140 },
  { rank: 23, name: "Eden King", score: 1010 },
  { rank: 24, name: "Rowan Wright", score: 950 },
  { rank: 25, name: "Oakley Lopez", score: 870 },
  { rank: 26, name: "Lennon Hill", score: 1380 },
  { rank: 27, name: "Azure Scott", score: 1090 },
  { rank: 28, name: "Indigo Green", score: 1030 },
  { rank: 29, name: "Sage Adams", score: 960 },
  { rank: 30, name: "Atlas Baker", score: 840 },
];

export function Leaderboard() {
  // Sort by score and take top 10
  const topStudents = [...students]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((student, index) => ({
      ...student,
      rank: index + 1
    }));
  
  // Find max score for scaling the bars
  const maxScore = Math.max(...topStudents.map(s => s.score));
  const minScore = Math.min(...topStudents.map(s => s.score));
  const scoreRange = maxScore - minScore;

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-white text-5xl">
            Top 10 Leaderboard
          </h1>

          <div className="flex items-center justify-center gap-3 text-slate-300 text-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>

        {/* Leaderboard Bars */}
        <div className="space-y-4 mt-12">
          {topStudents.map((student) => {
            const isTopThree = student.rank <= 3;
            // Calculate bar width percentage (minimum 20% for visibility)
            const barWidth = scoreRange > 0 
              ? Math.max(20, ((student.score - minScore) / scoreRange) * 80 + 20)
              : 100;
            
            return (
              <div
                key={student.rank}
                className="relative"
              >
                <div className="flex items-center gap-4">
                  {/* Rank indicator */}
                  <div className={`w-16 h-16 rounded-full ${isTopThree ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-white'} flex items-center justify-center flex-shrink-0 ${isTopThree ? 'ring-4 ring-yellow-400' : ''}`}>
                    <span className="text-2xl">
                      #{student.rank}
                    </span>
                  </div>

                  {/* Name - fixed width */}
                  <div className="w-48 text-white text-xl flex-shrink-0">
                    {student.name}
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 bg-slate-800 rounded-full h-14 relative overflow-hidden border-2 border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%` }}
                    >
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}