import { OpenAIScoringService } from '../context/openai-scoring-service';
import { Score } from '../model/scoring-model';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManager, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    criteria: {
                      clarity: 8,
                      relevance: 7,
                      depth: 9,
                      structure: 8,
                      examples: 7,
                    },
                    feedback: {
                      strengths: [
                        'Clear articulation of ideas',
                        'Strong analytical depth',
                      ],
                      improvements: [
                        'Could use more specific examples',
                        'Structure could be more cohesive',
                      ],
                      summary: 'Strong response with room for improvement in examples',
                    },
                    overallScore: 7.8,
                    timestamp: new Date().toISOString(),
                  }),
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

// Mock SecretsManager
const secretsManagerMock = mockClient(SecretsManager);

describe('OpenAIScoringService', () => {
  let scoringService: OpenAIScoringService;

  beforeEach(() => {
    secretsManagerMock.reset();
    secretsManagerMock.on(GetSecretValueCommand).resolves({
      SecretString: 'mock-api-key',
    });
    scoringService = new OpenAIScoringService();
  });

  it('should initialize with API key from Secrets Manager', async () => {
    await scoringService.init();
    expect(secretsManagerMock.calls()).toHaveLength(1);
  });

  it('should score interview transcript and return valid score object', async () => {
    await scoringService.init();
    const transcript = 'Sample interview response';
    const score = await scoringService.scoreInterview(transcript);

    // Verify score structure
    expect(score).toHaveProperty('criteria');
    expect(score).toHaveProperty('feedback');
    expect(score).toHaveProperty('overallScore');
    expect(score).toHaveProperty('timestamp');

    // Verify criteria scores are within range
    Object.values(score.criteria).forEach(value => {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    });
  });

  it('should throw error for invalid score format', () => {
    const invalidScore = {
      criteria: {
        clarity: 11, // Invalid: > 10
      },
    };

    expect(() => {
      scoringService.validateScore(invalidScore);
    }).toThrow();
  });

  it('should throw error if not initialized', async () => {
    const transcript = 'Sample interview response';
    await expect(scoringService.scoreInterview(transcript)).rejects.toThrow(
      'OpenAI client not initialized'
    );
  });
}); 