import { z } from 'zod';

// Configuration schema
const DynamoDBConfigSchema = z.object({
  sessionsTable: z.string().min(1),
  scoresTable: z.string().min(1),
  endpoint: z.string().url().optional(),
});

export type DynamoDBConfig = z.infer<typeof DynamoDBConfigSchema>;

// Configuration validation error
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export function validateEnvVar(name: string): void {
  if (!process.env[name]) {
    throw new ConfigValidationError(`Missing required environment variable: ${name}`);
  }
}

// Load and validate configuration
export function loadDynamoDBConfig(): DynamoDBConfig {
  validateEnvVar('DYNAMODB_ENDPOINT');
  validateEnvVar('SESSIONS_TABLE');
  validateEnvVar('SCORES_TABLE');

  return {
    endpoint: process.env.DYNAMODB_ENDPOINT!,
    sessionsTable: process.env.SESSIONS_TABLE!,
    scoresTable: process.env.SCORES_TABLE!,
  };
} 