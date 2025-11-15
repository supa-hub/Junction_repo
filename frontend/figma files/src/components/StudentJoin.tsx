import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowRight, User, Hash } from "lucide-react";

interface StudentJoinProps {
  onJoinGame: (gameCode: string, studentName: string) => void;
}

export function StudentJoin({ onJoinGame }: StudentJoinProps) {
  const [step, setStep] = useState<"code" | "name">("code");
  const [gameCode, setGameCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");

  const handleGameCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation - in real app, this would verify the code exists
    if (gameCode.length !== 6) {
      setError("Game code must be 6 characters");
      return;
    }
    
    setError("");
    setStep("name");
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (studentName.trim().length < 2) {
      setError("Please enter your name");
      return;
    }
    
    setError("");
    onJoinGame(gameCode, studentName);
  };

  return (
    <div className="space-y-6">
      {/* Code Entry Step */}
      {step === "code" && (
        <form onSubmit={handleGameCodeSubmit} className="space-y-6">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-8 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="game-code" className="text-white text-lg flex items-center justify-center gap-2">
                <Hash className="w-5 h-5 text-blue-400" />
                Game Code
              </Label>
              <Input
                id="game-code"
                value={gameCode}
                onChange={(e) => {
                  setGameCode(e.target.value.toUpperCase());
                  setError("");
                }}
                className="bg-slate-900 border-slate-600 text-white text-center text-3xl tracking-widest h-20 uppercase"
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg"
              disabled={gameCode.length !== 6}
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm text-center">
              Ask your teacher for the 6-character game code displayed on their screen
            </p>
          </div>
        </form>
      )}

      {/* Name Entry Step */}
      {step === "name" && (
        <form onSubmit={handleNameSubmit} className="space-y-6">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-8 space-y-6">
            {/* Show game code */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-sm mb-1">Game Code</p>
              <p className="text-white text-xl font-mono tracking-widest">{gameCode}</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="student-name" className="text-white text-lg flex items-center justify-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Your Name
              </Label>
              <Input
                id="student-name"
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  setError("");
                }}
                className="bg-slate-900 border-slate-600 text-white text-center text-xl h-16"
                placeholder="Enter your name"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("code");
                  setError("");
                }}
                className="flex-1 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:border-slate-500 h-12"
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                disabled={studentName.trim().length < 2}
              >
                Join Game
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}