import { Button } from "./components/ui/button";
import { Users, LayoutDashboard } from "lucide-react";
import { GameView } from "./components/GameView";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { StudentJoin } from "./components/StudentJoin";
import { SimulationResults } from "./components/SimulationResults";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "game" | "teacher" | "results">("results");
  const [studentInfo, setStudentInfo] = useState<{ gameCode: string; name: string } | null>(null);

  const handleJoinGame = (gameCode: string, studentName: string) => {
    setStudentInfo({ gameCode, name: studentName });
    setCurrentView("game");
  };

  // Mock data for testing results view
  const mockScenarios = [
    {
      id: "1",
      title: "Emergency Car Repair",
      scenario: "Your car broke down and needs a $1,200 repair. You have $2,000 in your emergency fund. What do you do?",
      studentResponse: "I'll use my emergency fund to pay for the repair since that's exactly what it's for. I'll then focus on rebuilding my emergency fund over the next few months.",
      aiSummary: "Excellent decision! You correctly identified this as a genuine emergency and used your emergency fund appropriately. This is exactly what emergency funds are designed for. Your plan to rebuild the fund shows good financial discipline.",
      risks: [],
      goodDecisions: [
        "Used emergency fund for its intended purpose",
        "Avoided going into debt for the repair",
        "Had a plan to rebuild the emergency fund"
      ],
      wealthImpact: -1200,
      healthImpact: 5,
      happinessImpact: 10
    },
    {
      id: "2",
      title: "Credit Card Offer",
      scenario: "You receive a credit card offer with 0% APR for 12 months and a $500 sign-up bonus. The regular APR after that is 24.99%. Should you apply?",
      studentResponse: "I'll apply for the card to get the bonus, but I'll make sure to pay off the balance in full every month so I never pay interest.",
      aiSummary: "Good approach with some caution needed. The sign-up bonus is attractive, but you need to be very disciplined to avoid the high interest rate. Make sure you have a system in place to track due dates and pay in full each month.",
      risks: [
        "High APR after promotional period could be costly if you carry a balance",
        "Risk of overspending with new available credit"
      ],
      goodDecisions: [
        "Planned to pay balance in full to avoid interest",
        "Recognized the value of the sign-up bonus"
      ],
      wealthImpact: 500,
      healthImpact: 0,
      happinessImpact: 5
    },
    {
      id: "3",
      title: "Investment Opportunity",
      scenario: "A friend is starting a business and asks you to invest $5,000 for a 10% ownership stake. You have $8,000 in savings. What's your decision?",
      studentResponse: "I'll invest $2,000 instead of $5,000. That way I'm supporting my friend but not risking most of my savings on an unproven business.",
      aiSummary: "This shows balanced thinking, but there are still significant risks. You reduced your exposure, which is smart, but investing in a friend's business can strain relationships if things go wrong. Consider whether you can afford to lose this money entirely.",
      risks: [
        "Still investing a significant portion of your savings",
        "Mixing business and friendship can be complicated",
        "No mention of due diligence on the business plan"
      ],
      goodDecisions: [
        "Reduced investment amount to protect savings",
        "Maintained emergency fund cushion"
      ],
      wealthImpact: -2000,
      healthImpact: -5,
      happinessImpact: -5
    }
  ];

  if (currentView === "results") {
    return (
      <SimulationResults
        studentName={studentInfo?.name || "Student"}
        finalScore={{
          wealth: 4500,
          health: 85,
          happiness: 78
        }}
        scenarios={mockScenarios}
        onReturnHome={() => setCurrentView("home")}
      />
    );
  }

  if (currentView === "game") {
    return <GameView />;
  }

  if (currentView === "teacher") {
    return <TeacherDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Teacher Login Button - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="ghost"
          onClick={() => setCurrentView("teacher")}
          className="text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Teacher Login
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Header */}
          <div className="space-y-6">
            <h1 className="text-white">
              Don't spend it all on vodka
            </h1>
            
            <p className="text-slate-300 text-xl max-w-xl mx-auto">
              Learn financial skills through interactive gameplay. Compete with classmates and track your progress.
            </p>
          </div>

          {/* Student Join Component */}
          <div className="pt-4">
            <StudentJoin onJoinGame={handleJoinGame} />
          </div>

          {/* Features */}
          <div className="pt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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