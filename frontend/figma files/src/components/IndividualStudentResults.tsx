import { useState } from "react";
import { Button } from "./ui/button";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  User,
  Download
} from "lucide-react";

interface ScenarioResult {
  id: string;
  title: string;
  scenario: string;
  studentResponse: string;
  aiSummary: string;
  risks: string[];
  goodDecisions: string[];
  wealthImpact: number;
  healthImpact: number;
  happinessImpact: number;
  timestamp: Date;
}

interface IndividualStudentResultsProps {
  studentName: string;
  studentId: string;
  finalScore: {
    wealth: number;
    health: number;
    happiness: number;
  };
  scenarios: ScenarioResult[];
  onBack: () => void;
}

export function IndividualStudentResults({
  studentName,
  studentId,
  finalScore,
  scenarios,
  onBack,
}: IndividualStudentResultsProps) {
  const [currentScenario, setCurrentScenario] = useState(0);

  const scenario = scenarios[currentScenario];

  const handleNext = () => {
    if (currentScenario < scenarios.length - 1) {
      setCurrentScenario(currentScenario + 1);
    }
  };

  const handlePrevious = () => {
    if (currentScenario > 0) {
      setCurrentScenario(currentScenario - 1);
    }
  };

  const handleExport = () => {
    // Mock export functionality
    alert(`Export functionality would download ${studentName}'s report as PDF`);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Classroom
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Student Summary Header */}
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-700 rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-white text-3xl mb-1">{studentName}</h1>
              <p className="text-purple-200">Student Performance Review</p>
            </div>
          </div>
          
          {/* Final Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-green-400 text-2xl mb-1">${finalScore.wealth.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">Final Wealth</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-blue-400 text-2xl mb-1">{finalScore.health}%</div>
              <div className="text-slate-400 text-sm">Final Health</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-purple-400 text-2xl mb-1">{finalScore.happiness}%</div>
              <div className="text-slate-400 text-sm">Final Happiness</div>
            </div>
          </div>
        </div>

        {/* Scenario Review Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl">
            Student Responses ({currentScenario + 1} of {scenarios.length})
          </h2>
          <div className="text-slate-400 text-sm">
            {scenario.timestamp.toLocaleString()}
          </div>
        </div>

        {/* Scenario Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {/* Scenario Header */}
          <div className="bg-slate-900 border-b border-slate-700 p-6">
            <h3 className="text-white text-xl mb-2">{scenario.title}</h3>
            <p className="text-slate-300">{scenario.scenario}</p>
          </div>

          {/* Student Response */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-1">Student Response</p>
                <p className="text-white leading-relaxed">{scenario.studentResponse}</p>
              </div>
            </div>
          </div>

          {/* Impact Indicators */}
          <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Impact:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Wealth</span>
                {scenario.wealthImpact >= 0 ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +${Math.abs(scenario.wealthImpact)}
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    -${Math.abs(scenario.wealthImpact)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Health</span>
                {scenario.healthImpact >= 0 ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{Math.abs(scenario.healthImpact)}%
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    {scenario.healthImpact}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Happiness</span>
                {scenario.happinessImpact >= 0 ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +{Math.abs(scenario.happinessImpact)}%
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    {scenario.happinessImpact}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">AI</span>
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-sm mb-2">AI Analysis</p>
                <p className="text-white leading-relaxed">{scenario.aiSummary}</p>
              </div>
            </div>
          </div>

          {/* Risks & Good Decisions */}
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* Risks */}
            {scenario.risks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h4>Areas for Improvement</h4>
                </div>
                <ul className="space-y-2">
                  {scenario.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Good Decisions */}
            {scenario.goodDecisions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h4>Great Decisions</h4>
                </div>
                <ul className="space-y-2">
                  {scenario.goodDecisions.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentScenario === 0}
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous Scenario
          </Button>

          {/* Dots Indicator */}
          <div className="flex gap-2">
            {scenarios.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentScenario(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentScenario
                    ? "bg-blue-500 w-6"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
                aria-label={`Go to scenario ${idx + 1}`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentScenario === scenarios.length - 1}
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Next Scenario
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Teacher Notes Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-purple-400" />
            <h3 className="text-white text-lg">Teacher Notes</h3>
          </div>
          <textarea
            placeholder="Add private notes about this student's performance..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="mt-3 flex justify-end">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Save Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
