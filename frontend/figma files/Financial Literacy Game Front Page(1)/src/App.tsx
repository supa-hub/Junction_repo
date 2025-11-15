import { Button } from "./components/ui/button";
import { Users, LayoutDashboard } from "lucide-react";
import { Leaderboard } from "./components/Leaderboard";
import { GameView } from "./components/GameView";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "leaderboard" | "game" | "teacher">("home");

  if (currentView === "leaderboard") {
    return <Leaderboard />;
  }

  if (currentView === "game") {
    return <GameView />;
  }

  if (currentView === "teacher") {
    return <TeacherDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-5xl w-full text-center space-y-12">
          {/* Header */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-800 border border-purple-700 rounded-full">
              <span className="text-sm text-purple-200">Financial Literacy Game</span>
            </div>
            
            <h1 className="text-white">
              Money Masters
            </h1>
            
            <p className="text-slate-300 text-xl max-w-2xl mx-auto">
              Learn financial skills through interactive gameplay. Compete with classmates and track your progress.
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-4">
            {/* Student button */}
            <div className="group">
              <div className="relative">
                <Button
                  size="lg"
                  className="w-full h-auto flex flex-col items-center gap-5 p-8 bg-blue-600 hover:bg-blue-500 transition-all duration-300 transform group-hover:scale-[1.02] shadow-xl rounded-xl"
                  onClick={() => {
                    setCurrentView("game");
                  }}
                >
                  <div className="p-4 bg-blue-700 rounded-full">
                    <Users size={40} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl">Join Game</div>
                    <p className="text-blue-100">
                      Enter a game code to start playing
                    </p>
                  </div>
                </Button>
                <div className="absolute -top-2 -right-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-full border-2 border-slate-900 shadow-lg">
                  STUDENT
                </div>
              </div>
            </div>

            {/* Teacher button */}
            <div className="group">
              <div className="relative">
                <Button
                  size="lg"
                  className="w-full h-auto flex flex-col items-center gap-5 p-8 bg-purple-600 hover:bg-purple-500 transition-all duration-300 transform group-hover:scale-[1.02] shadow-xl rounded-xl"
                  onClick={() => {
                    setCurrentView("teacher");
                  }}
                >
                  <div className="p-4 bg-purple-700 rounded-full">
                    <LayoutDashboard size={40} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl">Teacher Dashboard</div>
                    <p className="text-purple-100">
                      Create games and monitor progress
                    </p>
                  </div>
                </Button>
                <div className="absolute -top-2 -right-2 px-3 py-1 bg-purple-500 text-white text-xs rounded-full border-2 border-slate-900 shadow-lg">
                  TEACHER
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-white">
                <div>Real-World Scenarios</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-white">
                <div>Live Competition</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-white">
                <div>Track Progress</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}