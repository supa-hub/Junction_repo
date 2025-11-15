import { useState } from "react";
import {
  Plus,
  Users,
  Play,
  Square,
  Settings,
  ArrowLeft,
  Trash2,
  BarChart3,
  FileText,
  Eye,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Leaderboard } from "./Leaderboard";
import { ClassroomSimulationSummary } from "./ClassroomSimulationSummary";
import { IndividualStudentResults } from "./IndividualStudentResults";

interface Student {
  id: string;
  name: string;
  joinedAt: Date;
}

interface Classroom {
  id: string;
  name: string;
  location: string;
  monthlyIncome: number;
  studentCount: number;
  gameStatus: "active" | "inactive";
  createdAt: Date;
  gameCode: string;
  students: Student[];
}

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function TeacherDashboard() {
  const [view, setView] = useState<"list" | "classroom" | "leaderboard" | "summary" | "student">("list");
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null
  );
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Mock data for individual student results
  const mockStudentData = {
    finalScore: {
      wealth: 4500,
      health: 85,
      happiness: 78
    },
    scenarios: [
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
        happinessImpact: 10,
        timestamp: new Date("2024-11-15T10:30:00")
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
        happinessImpact: 5,
        timestamp: new Date("2024-11-15T10:45:00")
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
        happinessImpact: -5,
        timestamp: new Date("2024-11-15T11:00:00")
      }
    ]
  };

  // Mock data for simulation summary
  const mockSummaryData = {
    classAverage: {
      wealth: 4200,
      health: 82,
      happiness: 76,
    },
    overallStrengths: [
      "83% of students correctly identified the importance of emergency funds",
      "Strong understanding of credit card interest and how to avoid it",
      "Most students prioritized needs over wants in budget scenarios",
      "Good risk assessment when evaluating investment opportunities",
    ],
    overallWeaknesses: [
      "Only 45% recognized the long-term impact of compound interest on savings",
      "Many students underestimated healthcare costs and insurance importance",
      "Limited understanding of how taxes affect take-home pay",
      "Several students made impulse purchases without considering budget constraints",
    ],
    teachingRecommendations: [
      "Dedicate a lesson to compound interest calculations with real-world examples showing how small amounts saved early can grow significantly over time.",
      "Include more scenarios about insurance (health, auto, renters) and help students understand the trade-off between premiums and deductibles.",
      "Create exercises around net vs. gross income, tax brackets, and common deductions to demystify paycheck calculations.",
      "Practice impulse control strategies and the 24-hour rule for purchases. Consider role-playing exercises where students face tempting but unwise spending opportunities.",
      "Incorporate more discussions about balancing financial goals with quality of life - students need to understand that financial literacy isn't just about saving every penny.",
    ],
    scenarioInsights: [
      {
        id: "1",
        title: "Emergency Car Repair",
        scenario: "Your car broke down and needs a $1,200 repair. You have $2,000 in your emergency fund. What do you do?",
        commonMistakes: [
          "15% of students chose to put the repair on a credit card to preserve emergency fund",
          "8% wanted to skip the repair and use public transit without considering job requirements",
        ],
        strongPerformance: [
          "77% correctly used emergency fund and planned to rebuild it",
          "Strong recognition that this is a genuine emergency",
        ],
        avgWealthImpact: -1200,
        avgHealthImpact: 3,
        avgHappinessImpact: 8,
        studentCount: 24,
      },
      {
        id: "2",
        title: "Credit Card Offer",
        scenario: "You receive a credit card offer with 0% APR for 12 months and a $500 sign-up bonus. The regular APR after that is 24.99%. Should you apply?",
        commonMistakes: [
          "32% applied without a clear plan to avoid interest after the promotional period",
          "18% rejected the offer entirely, missing the opportunity for responsible credit building",
        ],
        strongPerformance: [
          "50% planned to use it strategically and pay in full each month",
          "Good awareness of the high APR risk",
        ],
        avgWealthImpact: 350,
        avgHealthImpact: -2,
        avgHappinessImpact: 4,
        studentCount: 24,
      },
      {
        id: "3",
        title: "Investment Opportunity",
        scenario: "A friend is starting a business and asks you to invest $5,000 for a 10% ownership stake. You have $8,000 in savings. What's your decision?",
        commonMistakes: [
          "41% invested without asking for a business plan or financial projections",
          "25% invested more than they could afford to lose",
          "12% made emotional decisions based purely on friendship",
        ],
        strongPerformance: [
          "35% negotiated a smaller investment amount",
          "Strong recognition that mixing friendship and business can be risky",
        ],
        avgWealthImpact: -1800,
        avgHealthImpact: -8,
        avgHappinessImpact: -6,
        studentCount: 24,
      },
    ],
  };

  // Mock data
  const [classrooms, setClassrooms] = useState<Classroom[]>([
    {
      id: "1",
      name: "Period 3 - Financial Literacy",
      location: "Room 204",
      monthlyIncome: 3500,
      studentCount: 24,
      gameStatus: "inactive",
      createdAt: new Date("2024-09-01"),
      gameCode: "ABC123",
      students: [
        {
          id: "s1",
          name: "Alex Chen",
          joinedAt: new Date("2024-09-01"),
        },
        {
          id: "s2",
          name: "Maria Garcia",
          joinedAt: new Date("2024-09-01"),
        },
        {
          id: "s3",
          name: "Jordan Smith",
          joinedAt: new Date("2024-09-02"),
        },
      ],
    },
    {
      id: "2",
      name: "Period 5 - Economics",
      location: "Room 204",
      monthlyIncome: 3500,
      studentCount: 28,
      gameStatus: "active",
      createdAt: new Date("2024-09-01"),
      gameCode: "XYZ789",
      students: [],
    },
    {
      id: "3",
      name: "Period 7 - Personal Finance",
      location: "Room 204",
      monthlyIncome: 3500,
      studentCount: 22,
      gameStatus: "inactive",
      createdAt: new Date("2024-09-01"),
      gameCode: "PQR456",
      students: [],
    },
  ]);

  const [newClassroom, setNewClassroom] = useState({
    name: "",
    location: "",
    monthlyIncome: 3500,
  });

  const handleCreateClassroom = () => {
    const classroom: Classroom = {
      id: Date.now().toString(),
      ...newClassroom,
      studentCount: 0,
      gameStatus: "inactive",
      createdAt: new Date(),
      gameCode: generateGameCode(),
      students: [],
    };
    setClassrooms([...classrooms, classroom]);
    setNewClassroom({ name: "", location: "", monthlyIncome: 3500 });
    setShowCreateDialog(false);
  };

  const handleRemoveStudent = (studentId: string) => {
    if (!selectedClassroom) return;

    const updatedClassrooms = classrooms.map((c) => {
      if (c.id === selectedClassroom.id) {
        return {
          ...c,
          students: c.students.filter((s) => s.id !== studentId),
          studentCount: c.studentCount - 1,
        };
      }
      return c;
    });

    setClassrooms(updatedClassrooms);
    setSelectedClassroom({
      ...selectedClassroom,
      students: selectedClassroom.students.filter((s) => s.id !== studentId),
      studentCount: selectedClassroom.studentCount - 1,
    });
  };

  const handleToggleGame = () => {
    if (!selectedClassroom) return;

    const updatedClassrooms = classrooms.map((c) => {
      if (c.id === selectedClassroom.id) {
        return {
          ...c,
          gameStatus: c.gameStatus === "active" ? "inactive" : "active",
        };
      }
      return c;
    });

    setClassrooms(updatedClassrooms);
    setSelectedClassroom({
      ...selectedClassroom,
      gameStatus: selectedClassroom.gameStatus === "active" ? "inactive" : "active",
    });
  };

  const handleDeleteClassroom = (classroomId: string) => {
    setClassrooms(classrooms.filter((c) => c.id !== classroomId));
  };

  // Individual Student Results view
  if (view === "student" && selectedStudent) {
    return (
      <IndividualStudentResults
        studentName={selectedStudent.name}
        studentId={selectedStudent.id}
        finalScore={mockStudentData.finalScore}
        scenarios={mockStudentData.scenarios}
        onBack={() => {
          setView("classroom");
          setSelectedStudent(null);
        }}
      />
    );
  }

  // Simulation Summary view
  if (view === "summary" && selectedClassroom) {
    return (
      <ClassroomSimulationSummary
        classroomName={selectedClassroom.name}
        studentCount={selectedClassroom.studentCount}
        completionDate={new Date()}
        classAverage={mockSummaryData.classAverage}
        overallStrengths={mockSummaryData.overallStrengths}
        overallWeaknesses={mockSummaryData.overallWeaknesses}
        teachingRecommendations={mockSummaryData.teachingRecommendations}
        scenarioInsights={mockSummaryData.scenarioInsights}
        onBack={() => setView("classroom")}
      />
    );
  }

  // Leaderboard view
  if (view === "leaderboard") {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="bg-slate-800 border-b-2 border-slate-700 p-4">
          <div className="max-w-[1600px] mx-auto flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setView("classroom")}
              className="text-white hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Classroom
            </Button>
            <h2 className="text-white text-xl">
              {selectedClassroom?.name} - Live Leaderboard
            </h2>
          </div>
        </div>
        <Leaderboard />
      </div>
    );
  }

  // Individual classroom view
  if (view === "classroom" && selectedClassroom) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setView("list");
                  setSelectedClassroom(null);
                }}
                className="text-white hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Classrooms
              </Button>
              <div>
                <h1 className="text-white text-3xl">{selectedClassroom.name}</h1>
                <p className="text-slate-400">
                  {selectedClassroom.location} • {selectedClassroom.studentCount} students
                </p>
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-full ${
                selectedClassroom.gameStatus === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-500"
                  : "bg-slate-700 text-slate-400 border border-slate-600"
              }`}
            >
              {selectedClassroom.gameStatus === "active" ? "Game Active" : "No Active Game"}
            </div>
          </div>

          {/* Classroom Info Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-400" />
              <h2 className="text-white text-xl">Classroom Settings</h2>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <Label className="text-slate-400">Location</Label>
                <p className="text-white text-lg">{selectedClassroom.location}</p>
              </div>
              <div>
                <Label className="text-slate-400">Monthly Income (Simulation)</Label>
                <p className="text-white text-lg">
                  ${selectedClassroom.monthlyIncome.toLocaleString()}
                </p>
              </div>
              <div>
                <Label className="text-slate-400">Game Code</Label>
                <p className="text-white text-lg font-mono bg-slate-900 px-3 py-1 rounded inline-block">
                  {selectedClassroom.gameCode}
                </p>
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl mb-2">Game Controls</h2>
                <p className="text-slate-400">
                  {selectedClassroom.gameStatus === "active"
                    ? "Game is currently running. Students can join and play."
                    : "Start a game session for your students."}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleToggleGame}
                  className={
                    selectedClassroom.gameStatus === "active"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }
                  size="lg"
                >
                  {selectedClassroom.gameStatus === "active" ? (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      Stop Game
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Game
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setView("leaderboard")}
                  variant="outline"
                  size="lg"
                  className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Leaderboard
                </Button>
                <Button
                  onClick={() => setView("summary")}
                  variant="outline"
                  size="lg"
                  className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Summary
                </Button>
              </div>
            </div>
          </div>

          {/* Students Management */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-white text-xl">Students</h2>
                <span className="text-slate-400">
                  ({selectedClassroom.students.length})
                </span>
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-2">
              {selectedClassroom.students.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No students added yet. Click "Add Student" to get started.
                </div>
              ) : (
                selectedClassroom.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white">{student.name}</p>
                        <p className="text-slate-400 text-sm">
                          {student.joinedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setView("student");
                        }}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Results
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(student.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Classrooms list view
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-3xl">Teacher Dashboard</h1>
            <p className="text-slate-400">Manage your classrooms and monitor student progress</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Classroom</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Set up a new classroom for your students
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="classroom-name" className="text-white">
                    Classroom Name
                  </Label>
                  <Input
                    id="classroom-name"
                    value={newClassroom.name}
                    onChange={(e) =>
                      setNewClassroom({ ...newClassroom, name: e.target.value })
                    }
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="e.g., Period 3 - Financial Literacy"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-white">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={newClassroom.location}
                    onChange={(e) =>
                      setNewClassroom({ ...newClassroom, location: e.target.value })
                    }
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="e.g., Room 204"
                  />
                </div>
                <div>
                  <Label htmlFor="income" className="text-white">
                    Monthly Income (Simulation)
                  </Label>
                  <Input
                    id="income"
                    type="number"
                    value={newClassroom.monthlyIncome}
                    onChange={(e) =>
                      setNewClassroom({
                        ...newClassroom,
                        monthlyIncome: parseInt(e.target.value),
                      })
                    }
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="3500"
                  />
                </div>
                <Button
                  onClick={handleCreateClassroom}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!newClassroom.name || !newClassroom.location}
                >
                  Create Classroom
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classrooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors cursor-pointer group"
              onClick={() => {
                setSelectedClassroom(classroom);
                setView("classroom");
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-white text-xl mb-1 group-hover:text-blue-400 transition-colors">
                    {classroom.name}
                  </h3>
                  <p className="text-slate-400 text-sm">{classroom.location}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClassroom(classroom.id);
                  }}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Students</span>
                  <span className="text-white">{classroom.studentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Status</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      classroom.gameStatus === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {classroom.gameStatus === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                <span className="text-slate-500 text-xs">
                  Created {classroom.createdAt.toLocaleDateString()}
                </span>
                <span className="text-blue-400 text-sm group-hover:underline">
                  Manage →
                </span>
              </div>
            </div>
          ))}
        </div>

        {classrooms.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-white text-xl mb-2">No Classrooms Yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first classroom to get started
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Classroom
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}