export type StatName = 'wealth' | 'health' | 'happiness';

export interface PlayerStats {
  wealth: number;
  health: number;
  happiness: number;
  [key: string]: number | string | undefined;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  classroomId?: string;
  createdAt?: number; // unix timestamp (ms)
  stats: PlayerStats; // frontend-visible stats snapshot
  scenariosCompleted?: number;
  lastActiveAt?: number; // unix timestamp (ms)
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
}

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  createdAt?: number; // unix timestamp (ms)
}


export interface ScenarioPrompt {
  id: string;
  text: string;
  options?: string[]; // for choice prompts
  context?: Record<string, unknown>;
  expectedAnswerType?: 'free-text' | 'choice' | 'numeric';
}

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  prompts: ScenarioPrompt[];
  estimatedTimeSeconds?: number;
}

export interface ScenarioEffect {
  stat: StatName | string;
  delta: number;
}

export interface ScenarioResult {
  scenarioId: string;
  userId: string;
  completedAt: number; // unix timestamp (ms)
  effects: ScenarioEffect[]; // backend-computed stat changes
  effectsSummary: string; // AI narrative of the outcome
}

export type GameState = 'waiting' | 'running' | 'finished';

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  score: number;
  statsSnapshot: PlayerStats;
  lastUpdatedAt?: number; // unix timestamp (ms)
}

export interface GameSession {
  id: string;
  classroomId: string;
  startedAt?: number; // unix timestamp (ms)
  endedAt?: number; // unix timestamp (ms)
  durationMinutes?: number;
  state: GameState;
  results?: ScenarioResult[];
  leaderboard?: LeaderboardEntry[];
}

export interface TeacherAnalysis {
  id: string;
  classroomId: string;
  generatedAt: number; // unix timestamp (ms)
  aggregateStats: {
    average: PlayerStats;
    distribution?: Record<string, number[]>;
  };
  weakPoints: Array<{ stat: string; description?: string }>;
  userSummaries?: Array<{ userId: string; highlights?: string[]; recommendedActions?: string[] }>;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  timestamp: number; // unix timestamp (ms)
  stats: PlayerStats;
  gameSessionId?: string;
}

export interface GameConfig {
  durationMinutes: number;
  personalizationSeed?: string;
}
