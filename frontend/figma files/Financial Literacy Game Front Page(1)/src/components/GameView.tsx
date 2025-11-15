import { useState } from "react";
import { Send, Heart, Wallet, Smile } from "lucide-react";

interface Message {
  id: number;
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
}

interface PlayerStats {
  wealth: number;
  health: number;
  happiness: number;
}

export function GameView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Welcome to your financial life simulation! You've just graduated high school and are starting your journey into adulthood. Your first major challenge is finding a place to live.",
      timestamp: new Date(),
    },
    {
      id: 2,
      sender: "ai",
      text: "You've found a promising apartment listing: a studio apartment for $800/month with utilities included. The landlord requires first month's rent, last month's rent, and a security deposit equal to one month's rent. However, you only have $2,000 in savings from your summer job. What do you do?",
      timestamp: new Date(),
    },
  ]);
  
  const [inputText, setInputText] = useState("");
  const [stats, setStats] = useState<PlayerStats>({
    wealth: 75,
    health: 85,
    happiness: 70,
  });

  const [currentScenario] = useState("Finding Your First Apartment");
  const [scenarioProgress] = useState({ current: 1, total: 8 });

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      text: inputText,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputText("");

    // Simulate AI response after a brief delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        sender: "ai",
        text: "Interesting choice! Let me process your decision and see how it affects your situation...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatColor = (value: number) => {
    if (value >= 70) return "text-green-400";
    if (value >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getStatBarColor = (value: number) => {
    if (value >= 70) return "bg-green-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Stats Header */}
      <div className="bg-slate-800 border-b-2 border-slate-700 p-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white text-2xl">{currentScenario}</h2>
              <p className="text-slate-400">
                Scenario {scenarioProgress.current} of {scenarioProgress.total}
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Game</span>
            </div>
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-3 gap-6">
            {/* Wealth */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300">Wealth</span>
                <span className={`ml-auto ${getStatColor(stats.wealth)}`}>
                  {stats.wealth}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStatBarColor(stats.wealth)} transition-all duration-500`}
                  style={{ width: `${stats.wealth}%` }}
                ></div>
              </div>
            </div>

            {/* Health */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-red-400" />
                <span className="text-slate-300">Health</span>
                <span className={`ml-auto ${getStatColor(stats.health)}`}>
                  {stats.health}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStatBarColor(stats.health)} transition-all duration-500`}
                  style={{ width: `${stats.health}%` }}
                ></div>
              </div>
            </div>

            {/* Happiness */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Smile className="w-5 h-5 text-yellow-400" />
                <span className="text-slate-300">Happiness</span>
                <span className={`ml-auto ${getStatColor(stats.happiness)}`}>
                  {stats.happiness}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStatBarColor(stats.happiness)} transition-all duration-500`}
                  style={{ width: `${stats.happiness}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-[1400px] w-full mx-auto p-6">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl p-4 ${
                  message.sender === "ai"
                    ? "bg-slate-800 border border-slate-700 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {message.sender === "ai" && (
                  <div className="text-blue-400 mb-1">AI Scenario Guide</div>
                )}
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-4">
          <div className="flex gap-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response to the scenario in natural language..."
              className="flex-1 bg-slate-900 text-white placeholder-slate-500 rounded-lg p-3 border border-slate-700 focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
