import { useState } from "react";
import { Button } from "./ui/button";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Users,
  Target,
  Lightbulb,
  Download,
  BookOpen
} from "lucide-react";

interface ScenarioInsight {
  id: string;
  title: string;
  scenario: string;
  commonMistakes: string[];
  strongPerformance: string[];
  avgWealthImpact: number;
  avgHealthImpact: number;
  avgHappinessImpact: number;
  studentCount: number;
}

interface ClassroomSimulationSummaryProps {
  classroomName: string;
  studentCount: number;
  completionDate: Date;
  classAverage: {
    wealth: number;
    health: number;
    happiness: number;
  };
  overallStrengths: string[];
  overallWeaknesses: string[];
  teachingRecommendations: string[];
  scenarioInsights: ScenarioInsight[];
  onBack: () => void;
}

export function ClassroomSimulationSummary({
  classroomName,
  studentCount,
  completionDate,
  classAverage,
  overallStrengths,
  overallWeaknesses,
  teachingRecommendations,
  scenarioInsights,
  onBack,
}: ClassroomSimulationSummaryProps) {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const handleExport = () => {
    // Mock export functionality
    alert("Export functionality would download a PDF report here");
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
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

        {/* Summary Header */}
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-700 rounded-xl p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-white text-3xl mb-2">Simulation Summary</h1>
              <p className="text-purple-200 text-lg">{classroomName}</p>
              <p className="text-purple-300 text-sm mt-1">
                Completed {completionDate.toLocaleDateString()} • {studentCount} students participated
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400">Complete</span>
            </div>
          </div>
          
          {/* Class Averages */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Class Avg. Wealth</div>
              <div className="text-green-400 text-2xl">${classAverage.wealth.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Class Avg. Health</div>
              <div className="text-blue-400 text-2xl">{classAverage.health}%</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">Class Avg. Happiness</div>
              <div className="text-purple-400 text-2xl">{classAverage.happiness}%</div>
            </div>
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-white text-xl">Class Strengths</h2>
            </div>
            <ul className="space-y-3">
              {overallStrengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-300">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <h2 className="text-white text-xl">Areas for Improvement</h2>
            </div>
            <ul className="space-y-3">
              {overallWeaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-300">
                  <span className="text-orange-400 mt-1">!</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Teaching Recommendations */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-white text-xl">Teaching Recommendations</h2>
          </div>
          <div className="space-y-4">
            {teachingRecommendations.map((recommendation, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm">
                  {idx + 1}
                </div>
                <p className="text-slate-300 flex-1">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario-by-Scenario Insights */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-white text-xl">Scenario Analysis</h2>
          </div>

          <div className="space-y-4">
            {scenarioInsights.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
              >
                {/* Scenario Header - Clickable */}
                <button
                  onClick={() =>
                    setExpandedScenario(
                      expandedScenario === scenario.id ? null : scenario.id
                    )
                  }
                  className="w-full text-left p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white mb-1">{scenario.title}</h3>
                      <p className="text-slate-400 text-sm line-clamp-1">
                        {scenario.scenario}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{scenario.studentCount} students</span>
                      </div>
                      <div className="text-slate-400">
                        {expandedScenario === scenario.id ? "−" : "+"}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedScenario === scenario.id && (
                  <div className="border-t border-slate-700">
                    {/* Class Average Impact */}
                    <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700">
                      <div className="flex items-center gap-6">
                        <span className="text-slate-400 text-sm">Class Average Impact:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm">Wealth</span>
                          {scenario.avgWealthImpact >= 0 ? (
                            <span className="text-green-400 flex items-center gap-1 text-sm">
                              <TrendingUp className="w-4 h-4" />
                              +${Math.abs(scenario.avgWealthImpact)}
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1 text-sm">
                              <TrendingDown className="w-4 h-4" />
                              -${Math.abs(scenario.avgWealthImpact)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm">Health</span>
                          {scenario.avgHealthImpact >= 0 ? (
                            <span className="text-green-400 flex items-center gap-1 text-sm">
                              <TrendingUp className="w-4 h-4" />
                              +{Math.abs(scenario.avgHealthImpact)}%
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1 text-sm">
                              <TrendingDown className="w-4 h-4" />
                              {scenario.avgHealthImpact}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm">Happiness</span>
                          {scenario.avgHappinessImpact >= 0 ? (
                            <span className="text-green-400 flex items-center gap-1 text-sm">
                              <TrendingUp className="w-4 h-4" />
                              +{Math.abs(scenario.avgHappinessImpact)}%
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1 text-sm">
                              <TrendingDown className="w-4 h-4" />
                              {scenario.avgHappinessImpact}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 grid md:grid-cols-2 gap-4">
                      {/* Common Mistakes */}
                      {scenario.commonMistakes.length > 0 && (
                        <div>
                          <h4 className="text-orange-400 text-sm mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Common Mistakes
                          </h4>
                          <ul className="space-y-2">
                            {scenario.commonMistakes.map((mistake, idx) => (
                              <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="text-orange-400 mt-0.5">•</span>
                                <span>{mistake}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Strong Performance */}
                      {scenario.strongPerformance.length > 0 && (
                        <div>
                          <h4 className="text-green-400 text-sm mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Strong Performance
                          </h4>
                          <ul className="space-y-2">
                            {scenario.strongPerformance.map((performance, idx) => (
                              <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span>{performance}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Return to Dashboard
          </Button>
          <Button
            onClick={handleExport}
            className="bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Full Report
          </Button>
        </div>
      </div>
    </div>
  );
}
