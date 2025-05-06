import { ScoreRepository } from '../scoresRepo';
import { Score, DataAccessError } from '../../model/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteTableCommand } from '@aws-sdk/client-dynamodb';

describe('ScoreRepository Integration Tests', () => {
  let scoreRepo: ScoreRepository;
  const testScore: Score = {
    scoreId: 'test-score-1',
    sessionId: 'test-session-1',
    userId: 'test-user-1',
    timestamp: new Date().toISOString(),
    overallScore: 85,
    categoryScores: {
      technical: 90,
      communication: 80,
      problemSolving: 85,
    },
    feedback: {
      strengths: ['Strong technical knowledge', 'Good communication'],
      areasForImprovement: ['Could improve problem-solving approach'],
      summary: 'Overall good performance with room for improvement in problem-solving.',
    },
    metadata: {
      interviewer: 'AI',
      duration: 45,
    },
    ttl: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  beforeAll(() => {
    // Ensure we're using the local DynamoDB
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    process.env.SCORES_TABLE = 'InterviewAgentStack-Dev-scores';
    scoreRepo = new ScoreRepository();
  });

  afterAll(async () => {
    // Clean up the test table
    const client = new DynamoDBClient({ endpoint: 'http://localhost:8000' });
    await client.send(new DeleteTableCommand({
      TableName: process.env.SCORES_TABLE,
    }));
  });

  describe('createScore', () => {
    it('should create a new score', async () => {
      await expect(scoreRepo.createScore(testScore)).resolves.not.toThrow();
    });

    it('should throw DataAccessError when creating duplicate score', async () => {
      await expect(scoreRepo.createScore(testScore)).rejects.toThrow(DataAccessError);
    });

    it('should throw DataAccessError with invalid score data', async () => {
      const invalidScore = { ...testScore, scoreId: undefined } as unknown as Score;
      await expect(scoreRepo.createScore(invalidScore)).rejects.toThrow(DataAccessError);
    });
  });

  describe('getScore', () => {
    it('should retrieve an existing score', async () => {
      const score = await scoreRepo.getScore(testScore.scoreId);
      expect(score).toEqual(testScore);
    });

    it('should throw DataAccessError when score not found', async () => {
      await expect(scoreRepo.getScore('non-existent')).rejects.toThrow(DataAccessError);
    });
  });

  describe('updateScore', () => {
    it('should update an existing score', async () => {
      const updates = {
        overallScore: 90,
        categoryScores: {
          ...testScore.categoryScores,
          technical: 95,
        },
      };
      await expect(scoreRepo.updateScore(testScore.scoreId, updates)).resolves.not.toThrow();
      
      const updatedScore = await scoreRepo.getScore(testScore.scoreId);
      expect(updatedScore.overallScore).toBe(90);
      expect(updatedScore.categoryScores.technical).toBe(95);
    });

    it('should throw DataAccessError when updating non-existent score', async () => {
      await expect(scoreRepo.updateScore('non-existent', { overallScore: 90 }))
        .rejects.toThrow(DataAccessError);
    });

    it('should not allow updating scoreId', async () => {
      await expect(scoreRepo.updateScore(testScore.scoreId, { scoreId: 'new-id' }))
        .rejects.toThrow(DataAccessError);
    });
  });

  describe('listScoresBySessionId', () => {
    it('should list scores for a session', async () => {
      const scores = await scoreRepo.listScoresBySessionId(testScore.sessionId);
      expect(scores).toHaveLength(1);
      expect(scores[0]).toEqual(testScore);
    });

    it('should return empty array for non-existent session', async () => {
      const scores = await scoreRepo.listScoresBySessionId('non-existent-session');
      expect(scores).toHaveLength(0);
    });
  });

  describe('listScoresByUserId', () => {
    it('should list scores for a user', async () => {
      const scores = await scoreRepo.listScoresByUserId(testScore.userId);
      expect(scores).toHaveLength(1);
      expect(scores[0]).toEqual(testScore);
    });

    it('should return empty array for non-existent user', async () => {
      const scores = await scoreRepo.listScoresByUserId('non-existent-user');
      expect(scores).toHaveLength(0);
    });
  });

  describe('batchCreateScores', () => {
    it('should create multiple scores', async () => {
      const scores = Array.from({ length: 3 }, (_, i) => ({
        ...testScore,
        scoreId: `test-score-${i + 2}`,
        sessionId: `test-session-${i + 2}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));

      await expect(scoreRepo.batchCreateScores(scores)).resolves.not.toThrow();
      
      const userScores = await scoreRepo.listScoresByUserId(testScore.userId);
      expect(userScores).toHaveLength(4); // Original + 3 new scores
    });

    it('should handle empty array', async () => {
      await expect(scoreRepo.batchCreateScores([])).resolves.not.toThrow();
    });

    it('should throw DataAccessError with invalid score data', async () => {
      const invalidScores = [
        { ...testScore, scoreId: undefined },
        { ...testScore, scoreId: 'test-score-5' },
      ] as unknown as Score[];
      await expect(scoreRepo.batchCreateScores(invalidScores))
        .rejects.toThrow(DataAccessError);
    });
  });

  describe('Error Handling', () => {
    it('should wrap DynamoDB errors in DataAccessError', async () => {
      // Temporarily set invalid endpoint to force DynamoDB error
      process.env.DYNAMODB_ENDPOINT = 'http://invalid-endpoint';
      const invalidRepo = new ScoreRepository();
      
      await expect(invalidRepo.getScore('test')).rejects.toThrow(DataAccessError);
      
      // Restore valid endpoint
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    });

    it('should include operation and scoreId in error', async () => {
      try {
        await scoreRepo.getScore('non-existent');
      } catch (error) {
        expect(error).toBeInstanceOf(DataAccessError);
        const dataError = error as DataAccessError;
        expect(dataError.operation).toBe('getScore');
        expect(dataError.scoreId).toBe('non-existent');
        expect(dataError.toJSON()).toHaveProperty('operation');
        expect(dataError.toJSON()).toHaveProperty('scoreId');
      }
    });
  });
}); 