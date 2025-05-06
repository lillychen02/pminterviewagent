import { z } from 'zod';

// Define the scoring criteria schema
export const ScoreCriteriaSchema = z.object({
  clarity: z.number().min(1).max(10),
  relevance: z.number().min(1).max(10),
  depth: z.number().min(1).max(10),
  structure: z.number().min(1).max(10),
  examples: z.number().min(1).max(10),
});

// Define the feedback schema
export const FeedbackSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  summary: z.string(),
});

// Define the complete score schema
export const ScoreSchema = z.object({
  criteria: ScoreCriteriaSchema,
  feedback: FeedbackSchema,
  overallScore: z.number().min(1).max(10),
  timestamp: z.string().datetime(),
});

// TypeScript types derived from schemas
export type ScoreCriteria = z.infer<typeof ScoreCriteriaSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type Score = z.infer<typeof ScoreSchema>;

// Scoring service interface
export interface ScoringService {
  scoreInterview(transcript: string): Promise<Score>;
  validateScore(score: unknown): Score;
}

// Helper function to calculate overall score
export function calculateOverallScore(criteria: ScoreCriteria): number {
  const weights = {
    clarity: 0.25,
    relevance: 0.25,
    depth: 0.2,
    structure: 0.15,
    examples: 0.15,
  };

  return Object.entries(criteria).reduce((sum, [key, value]) => {
    return sum + value * weights[key as keyof typeof weights];
  }, 0);
} 