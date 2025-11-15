import { useState } from "react";
import {
  Plus,
  Users,
  Play,
  Square,
  Settings,
  ArrowLeft,
  Trash2,
  UserPlus,
  BarChart3,
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

interface Student {
  id: string;
  name: string;
  email: string;
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
  students: Student[];
}

export function TeacherDashboard() {
  const [view, setView] = useState<"list" | "classroom" | "leaderboard">("list");
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);

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
      students: [
        {
          id: "s1",
          name: "Alex Chen",
          email: "alex.chen@school.edu",
          joinedAt: new Date("2024-09-01"),
        },
        {
          id: "s2",
          name: "Maria Garcia",
          email: "maria.garcia@school.edu",
          joinedAt: new Date("2024-09-01"),
        },
        {
          id: "s3",
          name: "Jordan Smith",
          email: "jordan.smith@school.edu",
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
      students: [],
    },
  ]);

  const [newClassroom, setNewClassroom] = useState({
    name: "",
    location: "",
    monthlyIncome: 3500,
  });

  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
  });

  const handleCreateClassroom = () => {
    const classroom: Classroom = {
      id: Date.now().toString(),
      ...newClassroom,
      studentCount: 0,
      gameStatus: "inactive",
      createdAt: new Date(),
      students: [],
    };
    setClassrooms([...classrooms, classroom]);
    setNewClassroom({ name: "", location: "", monthlyIncome: 3500 });
    setShowCreateDialog(false);
  };

  const handleAddStudent = () => {
    if (!selectedClassroom) return;
    
    const student: Student = {
      id: Date.now().toString(),
      ...newStudent,
      joinedAt: new Date(),
    };

    const updatedClassrooms = classrooms.map((c) => {
      if (c.id === selectedClassroom.id) {
        return {
          ...c,
          students: [...c.students, student],
          studentCount: c.studentCount + 1,
        };
      }
      return c;
    });

    setClassrooms(updatedClassrooms);
    setSelectedClassroom({
      ...selectedClassroom,
      students: [...selectedClassroom.students, student],
      studentCount: selectedClassroom.studentCount + 1,
    });
    setNewStudent({ name: "", email: "" });
    setShowAddStudentDialog(false);
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
                  {selectedClassroom.id.toUpperCase().slice(0, 6)}
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
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Leaderboard
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
              <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Student</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Add a student to this classroom
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-name" className="text-white">
                        Student Name
                      </Label>
                      <Input
                        id="student-name"
                        value={newStudent.name}
                        onChange={(e) =>
                          setNewStudent({ ...newStudent, name: e.target.value })
                        }
                        className="bg-slate-900 border-slate-700 text-white"
                        placeholder="Enter student name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="student-email" className="text-white">
                        Email
                      </Label>
                      <Input
                        id="student-email"
                        type="email"
                        value={newStudent.email}
                        onChange={(e) =>
                          setNewStudent({ ...newStudent, email: e.target.value })
                        }
                        className="bg-slate-900 border-slate-700 text-white"
                        placeholder="student@school.edu"
                      />
                    </div>
                    <Button
                      onClick={handleAddStudent}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={!newStudent.name || !newStudent.email}
                    >
                      Add Student
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
                    className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white">{student.name}</p>
                        <p className="text-slate-400 text-sm">{student.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
