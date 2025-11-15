import { useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Eye,
  FileText,
  Play,
  Plus,
  Settings,
  Square,
  Trash2,
  Users,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { ClassroomSimulationSummary } from '../components/teacher/ClassroomSimulationSummary'
import { IndividualStudentResults } from '../components/teacher/IndividualStudentResults'
import { Leaderboard } from '../components/teacher/Leaderboard'

interface Student {
  id: string
  name: string
  joinedAt: Date
}

interface Classroom {
  id: string
  name: string
  location: string
  monthlyIncome: number
  studentCount: number
  gameStatus: 'active' | 'inactive'
  createdAt: Date
  gameCode: string
  students: Student[]
}

type DashboardView = 'list' | 'classroom' | 'leaderboard' | 'summary' | 'student'

const generateGameCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('')
}

const mockStudentData = {
  finalScore: {
    wealth: 4500,
    health: 85,
    happiness: 78,
  },
  scenarios: [
    {
      id: '1',
      title: 'Emergency Car Repair',
      scenario:
        'Your car broke down and needs a $1,200 repair. You have $2,000 in your emergency fund. What do you do?',
      studentResponse:
        "I'll use my emergency fund to pay for the repair since that's exactly what it's for. I'll then focus on rebuilding my emergency fund over the next few months.",
      aiSummary:
        'Excellent decision! You correctly identified this as a genuine emergency and used your emergency fund appropriately. This is exactly what emergency funds are designed for. Your plan to rebuild the fund shows good financial discipline.',
      risks: [],
      goodDecisions: [
        'Used emergency fund for its intended purpose',
        'Avoided going into debt for the repair',
        'Had a plan to rebuild the emergency fund',
      ],
      wealthImpact: -1200,
      healthImpact: 5,
      happinessImpact: 10,
      timestamp: new Date('2024-11-15T10:30:00'),
    },
    {
      id: '2',
      title: 'Credit Card Offer',
      scenario:
        'You receive a credit card offer with 0% APR for 12 months and a $500 sign-up bonus. The regular APR after that is 24.99%. Should you apply?',
      studentResponse:
        "I'll apply for the card to get the bonus, but I'll make sure to pay off the balance in full every month so I never pay interest.",
      aiSummary:
        'Good approach with some caution needed. The sign-up bonus is attractive, but you need to be very disciplined to avoid the high interest rate. Make sure you have a system in place to track due dates and pay in full each month.',
      risks: [
        'High APR after promotional period could be costly if you carry a balance',
        'Risk of overspending with new available credit',
      ],
      goodDecisions: [
        'Planned to pay balance in full to avoid interest',
        'Recognized the value of the sign-up bonus',
      ],
      wealthImpact: 500,
      healthImpact: 0,
      happinessImpact: 5,
      timestamp: new Date('2024-11-15T10:45:00'),
    },
    {
      id: '3',
      title: 'Investment Opportunity',
      scenario:
        "A friend is starting a business and asks you to invest $5,000 for a 10% ownership stake. You have $8,000 in savings. What's your decision?",
      studentResponse:
        "I'll invest $2,000 instead of $5,000. That way I'm supporting my friend but not risking most of my savings on an unproven business.",
      aiSummary:
        "This shows balanced thinking, but there are still significant risks. You reduced your exposure, which is smart, but investing in a friend's business can strain relationships if things go wrong. Consider whether you can afford to lose this money entirely.",
      risks: [
        'Still investing a significant portion of your savings',
        'Mixing business and friendship can be complicated',
        'No mention of due diligence on the business plan',
      ],
      goodDecisions: [
        'Reduced investment amount to protect savings',
        'Maintained emergency fund cushion',
      ],
      wealthImpact: -2000,
      healthImpact: -5,
      happinessImpact: -5,
      timestamp: new Date('2024-11-15T11:00:00'),
    },
  ],
}

const mockSummaryData = {
  classAverage: {
    wealth: 4200,
    health: 82,
    happiness: 76,
  },
  overallStrengths: [
    '83% of students correctly identified the importance of emergency funds',
    'Strong understanding of credit card interest and how to avoid it',
    'Most students prioritized needs over wants in budget scenarios',
    'Good risk assessment when evaluating investment opportunities',
  ],
  overallWeaknesses: [
    'Only 45% recognized the long-term impact of compound interest on savings',
    'Many students underestimated healthcare costs and insurance importance',
    'Limited understanding of how taxes affect take-home pay',
    'Several students made impulse purchases without considering budget constraints',
  ],
  teachingRecommendations: [
    'Dedicate a lesson to compound interest calculations with real-world examples showing how small amounts saved early can grow significantly over time.',
    'Include more scenarios about insurance (health, auto, renters) and help students understand the trade-off between premiums and deductibles.',
    'Create exercises around net vs. gross income, tax brackets, and common deductions to demystify paycheck calculations.',
    'Practice impulse control strategies and the 24-hour rule for purchases. Consider role-playing exercises where students face tempting but unwise spending opportunities.',
    "Incorporate more discussions about balancing financial goals with quality of life - students need to understand that financial literacy isn't just about saving every penny.",
  ],
  scenarioInsights: [
    {
      id: '1',
      title: 'Emergency Car Repair',
      scenario:
        'Your car broke down and needs a $1,200 repair. You have $2,000 in your emergency fund. What do you do?',
      commonMistakes: [
        '15% of students chose to put the repair on a credit card to preserve emergency fund',
        '8% wanted to skip the repair and use public transit without considering job requirements',
      ],
      strongPerformance: [
        '77% correctly used emergency fund and planned to rebuild it',
        'Strong recognition that this is a genuine emergency',
      ],
      avgWealthImpact: -1200,
      avgHealthImpact: 3,
      avgHappinessImpact: 8,
      studentCount: 24,
    },
    {
      id: '2',
      title: 'Credit Card Offer',
      scenario:
        'You receive a credit card offer with 0% APR for 12 months and a $500 sign-up bonus. The regular APR after that is 24.99%. Should you apply?',
      commonMistakes: [
        '32% applied without a clear plan to avoid interest after the promotional period',
        '18% rejected the offer entirely, missing the opportunity for responsible credit building',
      ],
      strongPerformance: [
        '50% planned to use it strategically and pay in full each month',
        'Good awareness of the high APR risk',
      ],
      avgWealthImpact: 350,
      avgHealthImpact: -2,
      avgHappinessImpact: 4,
      studentCount: 24,
    },
    {
      id: '3',
      title: 'Investment Opportunity',
      scenario:
        "A friend is starting a business and asks you to invest $5,000 for a 10% ownership stake. You have $8,000 in savings. What's your decision?",
      commonMistakes: [
        '41% invested without asking for a business plan or financial projections',
        '25% invested more than they could afford to lose',
        '12% made emotional decisions based purely on friendship',
      ],
      strongPerformance: [
        '35% negotiated a smaller investment amount',
        'Strong recognition that mixing friendship and business can be risky',
      ],
      avgWealthImpact: -1800,
      avgHealthImpact: -8,
      avgHappinessImpact: -6,
      studentCount: 24,
    },
  ],
}

export function TeacherDashboardPage() {
  const [view, setView] = useState<DashboardView>('list')
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [classrooms, setClassrooms] = useState<Classroom[]>([
    {
      id: '1',
      name: 'Period 3 - Financial Literacy',
      location: 'Room 204',
      monthlyIncome: 3500,
      studentCount: 24,
      gameStatus: 'inactive',
      createdAt: new Date('2024-09-01'),
      gameCode: 'ABC123',
      students: [
        { id: 's1', name: 'Alex Chen', joinedAt: new Date('2024-09-01') },
        { id: 's2', name: 'Maria Garcia', joinedAt: new Date('2024-09-01') },
        { id: 's3', name: 'Jordan Smith', joinedAt: new Date('2024-09-02') },
      ],
    },
    {
      id: '2',
      name: 'Period 5 - Economics',
      location: 'Room 204',
      monthlyIncome: 3500,
      studentCount: 28,
      gameStatus: 'active',
      createdAt: new Date('2024-09-01'),
      gameCode: 'XYZ789',
      students: [],
    },
    {
      id: '3',
      name: 'Period 7 - Personal Finance',
      location: 'Room 204',
      monthlyIncome: 3500,
      studentCount: 22,
      gameStatus: 'inactive',
      createdAt: new Date('2024-09-01'),
      gameCode: 'PQR456',
      students: [],
    },
  ])
  const [newClassroom, setNewClassroom] = useState({ name: '', location: '', monthlyIncome: 3500 })

  const handleCreateClassroom = () => {
    if (!newClassroom.name || !newClassroom.location) return

    const classroom: Classroom = {
      id: Date.now().toString(),
      ...newClassroom,
      studentCount: 0,
      gameStatus: 'inactive',
      createdAt: new Date(),
      gameCode: generateGameCode(),
      students: [],
    }

    setClassrooms((previous) => [...previous, classroom])
    setNewClassroom({ name: '', location: '', monthlyIncome: 3500 })
    setShowCreateDialog(false)
  }

  const handleRemoveStudent = (studentId: string) => {
    if (!selectedClassroom) return

    const updated = classrooms.map((classroom) => {
      if (classroom.id !== selectedClassroom.id) return classroom
      return {
        ...classroom,
        students: classroom.students.filter((student) => student.id !== studentId),
        studentCount: Math.max(0, classroom.studentCount - 1),
      }
    })

    const current = updated.find((classroom) => classroom.id === selectedClassroom.id) ?? null

    setClassrooms(updated)
    setSelectedClassroom(current)
  }

  const handleToggleGame = () => {
    if (!selectedClassroom) return

    const updated = classrooms.map((classroom) => {
      if (classroom.id !== selectedClassroom.id) return classroom
      return {
        ...classroom,
        gameStatus: classroom.gameStatus === 'active' ? 'inactive' : 'active',
      }
    })

    const current = updated.find((classroom) => classroom.id === selectedClassroom.id) ?? null
    setClassrooms(updated)
    setSelectedClassroom(current)
  }

  const handleDeleteClassroom = (classroomId: string) => {
    setClassrooms((previous) => previous.filter((classroom) => classroom.id !== classroomId))
    if (selectedClassroom?.id === classroomId) {
      setSelectedClassroom(null)
      setView('list')
    }
  }

  if (view === 'student' && selectedStudent) {
    return (
      <IndividualStudentResults
        studentName={selectedStudent.name}
        studentId={selectedStudent.id}
        finalScore={mockStudentData.finalScore}
        scenarios={mockStudentData.scenarios}
        onBack={() => {
          setSelectedStudent(null)
          setView('classroom')
        }}
      />
    )
  }

  if (view === 'summary' && selectedClassroom) {
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
        onBack={() => setView('classroom')}
      />
    )
  }

  if (view === 'leaderboard') {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="border-b-2 border-slate-700 bg-slate-800 p-4">
          <div className="mx-auto flex max-w-[1600px] items-center gap-4">
            <Button variant="ghost" onClick={() => setView('classroom')} className="text-white hover:bg-slate-700">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Classroom
            </Button>
            <h2 className="text-xl text-white">{selectedClassroom?.name} - Live Leaderboard</h2>
          </div>
        </div>
        <Leaderboard />
      </div>
    )
  }

  if (view === 'classroom' && selectedClassroom) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setView('list')
                  setSelectedClassroom(null)
                }}
                className="text-white hover:bg-slate-800"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Classrooms
              </Button>
              <div>
                <h1 className="text-3xl text-white">{selectedClassroom.name}</h1>
                <p className="text-slate-400">
                  {selectedClassroom.location} • {selectedClassroom.studentCount} students
                </p>
              </div>
            </div>
            <div
              className={`rounded-full px-4 py-2 text-sm ${
                selectedClassroom.gameStatus === 'active'
                  ? 'border border-green-500 bg-green-500/20 text-green-400'
                  : 'border border-slate-600 bg-slate-800 text-slate-400'
              }`}
            >
              {selectedClassroom.gameStatus === 'active' ? 'Game Active' : 'No Active Game'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl text-white">Classroom Settings</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <Label className="text-slate-400">Location
                </Label>
                <p className="text-lg text-white">{selectedClassroom.location}</p>
              </div>
              <div>
                <Label className="text-slate-400">Monthly Income (Simulation)</Label>
                <p className="text-lg text-white">${selectedClassroom.monthlyIncome.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-slate-400">Game Code</Label>
                <p className="inline-block rounded bg-slate-900 px-3 py-1 font-mono text-lg text-white">
                  {selectedClassroom.gameCode}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl text-white">Game Controls</h2>
                <p className="text-slate-400">
                  {selectedClassroom.gameStatus === 'active'
                    ? 'Game is currently running. Students can join and play.'
                    : 'Start a game session for your students.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleToggleGame}
                  className={selectedClassroom.gameStatus === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  size="lg"
                >
                  {selectedClassroom.gameStatus === 'active' ? (
                    <>
                      <Square className="mr-2 h-5 w-5" />
                      Stop Game
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Start Game
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setView('leaderboard')}
                  variant="outline"
                  size="lg"
                  className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  View Leaderboard
                </Button>
                <Button
                  onClick={() => setView('summary')}
                  variant="outline"
                  size="lg"
                  className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  View Summary
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl text-white">Students</h2>
              <span className="text-slate-400">({selectedClassroom.students.length})</span>
            </div>
            <div className="space-y-2">
              {selectedClassroom.students.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No students added yet. Click "Add Student" to get started.
                </div>
              ) : (
                selectedClassroom.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-4 transition hover:border-slate-600"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white">{student.name}</p>
                        <p className="text-sm text-slate-400">{student.joinedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
                        onClick={() => {
                          setSelectedStudent(student)
                          setView('student')
                        }}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View Results
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                        onClick={() => handleRemoveStudent(student.id)}
                        aria-label={`Remove ${student.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-white">Teacher Dashboard</h1>
            <p className="text-slate-400">Manage your classrooms and monitor student progress</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-700 bg-slate-900">
              <DialogHeader>
                <DialogTitle>Create New Classroom</DialogTitle>
                <DialogDescription>Set up a new classroom for your students</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="classroom-name" className="text-white">
                    Classroom Name
                  </Label>
                  <Input
                    id="classroom-name"
                    value={newClassroom.name}
                    onChange={(event) =>
                      setNewClassroom((previous) => ({ ...previous, name: event.target.value }))
                    }
                    placeholder="e.g., Period 3 - Financial Literacy"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-white">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={newClassroom.location}
                    onChange={(event) =>
                      setNewClassroom((previous) => ({ ...previous, location: event.target.value }))
                    }
                    placeholder="e.g., Room 204"
                    className="mt-2"
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
                    onChange={(event) =>
                      setNewClassroom((previous) => ({
                        ...previous,
                        monthlyIncome: Number(event.target.value) || 0,
                      }))
                    }
                    placeholder="3500"
                    className="mt-2"
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-6 transition hover:border-slate-600"
              onClick={() => {
                setSelectedClassroom(classroom)
                setView('classroom')
              }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl text-white transition group-hover:text-blue-400">
                    {classroom.name}
                  </h3>
                  <p className="text-sm text-slate-400">{classroom.location}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDeleteClassroom(classroom.id)
                  }}
                  className="text-slate-400 hover:bg-red-900/20 hover:text-red-400"
                  aria-label={`Delete ${classroom.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Students</span>
                  <span className="text-white">{classroom.studentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Status</span>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      classroom.gameStatus === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {classroom.gameStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4 text-sm text-slate-500">
                <span>Created {classroom.createdAt.toLocaleDateString()}</span>
                <span className="text-blue-400">Manage →</span>
              </div>
            </div>
          ))}
        </div>

        {classrooms.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <Users className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="mb-2 text-xl text-white">No Classrooms Yet</h3>
            <p className="mb-6 text-slate-400">Create your first classroom to get started</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Classroom
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
