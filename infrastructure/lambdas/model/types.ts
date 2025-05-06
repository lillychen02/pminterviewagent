import { z } from 'zod';

// Base error class for data access errors
export class DataAccessError extends Error {
  constructor(
    message: string,
    public operation: string,
    public sessionId?: string,
    public scoreId?: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'DataAccessError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      sessionId: this.sessionId,
      scoreId: this.scoreId,
      cause: this.cause,
    };
  }
}

// Session schema and type
export const SessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']),
  interviewType: z.string(),
  roleContext: z.string(),
  ttl: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// Score schema and type
export const ScoreSchema = z.object({
  scoreId: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  overallScore: z.number().min(1).max(10),
  categoryScores: z.object({
    technical: z.number(),
    communication: z.number(),
    problemSolving: z.number(),
  }),
  feedback: z.object({
    strengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
    summary: z.string(),
  }),
  metadata: z.record(z.unknown()).optional(),
  ttl: z.number(),
});

export type Score = z.infer<typeof ScoreSchema>;

// Repository interfaces
export interface ISessionRepository {
  createSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
  listSessionsByUserId(userId: string): Promise<Session[]>;
}

export interface IScoreRepository {
  saveScore(score: Score): Promise<void>;
  saveScores(scores: Score[]): Promise<void>;
  listScoresBySessionId(sessionId: string): Promise<Score[]>;
  listScoresByUserId(userId: string): Promise<Score[]>;
} 