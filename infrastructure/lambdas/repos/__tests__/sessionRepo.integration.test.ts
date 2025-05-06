import { SessionRepository } from '../sessionRepo';
import { Session, DataAccessError } from '../../model/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteTableCommand } from '@aws-sdk/client-dynamodb';

describe('SessionRepository Integration Tests', () => {
  let sessionRepo: SessionRepository;
  const testSession: Session = {
    sessionId: 'test-session-1',
    userId: 'test-user-1',
    timestamp: new Date().toISOString(),
    status: 'ACTIVE',
    interviewType: 'product',
    roleContext: 'Google Maps',
    ttl: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    metadata: {
      browser: 'Chrome',
      device: 'Desktop',
    },
  };

  beforeAll(() => {
    // Ensure we're using the local DynamoDB
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    process.env.SESSIONS_TABLE = 'InterviewAgentStack-Dev-sessions';
    sessionRepo = new SessionRepository();
  });

  afterAll(async () => {
    // Clean up the test table
    const client = new DynamoDBClient({ endpoint: 'http://localhost:8000' });
    await client.send(new DeleteTableCommand({
      TableName: process.env.SESSIONS_TABLE,
    }));
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      await expect(sessionRepo.createSession(testSession)).resolves.not.toThrow();
    });

    it('should throw DataAccessError when creating duplicate session', async () => {
      await expect(sessionRepo.createSession(testSession)).rejects.toThrow(DataAccessError);
    });

    it('should throw DataAccessError with invalid session data', async () => {
      const invalidSession = { ...testSession, sessionId: undefined };
      await expect(sessionRepo.createSession(invalidSession as Session)).rejects.toThrow(DataAccessError);
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      const session = await sessionRepo.getSession(testSession.sessionId);
      expect(session).toEqual(testSession);
    });

    it('should throw DataAccessError when session not found', async () => {
      await expect(sessionRepo.getSession('non-existent')).rejects.toThrow(DataAccessError);
    });
  });

  describe('updateSession', () => {
    it('should update an existing session', async () => {
      const updates = {
        status: 'COMPLETED' as const,
        metadata: { completedAt: new Date().toISOString() },
      };
      await expect(sessionRepo.updateSession(testSession.sessionId, updates)).resolves.not.toThrow();
      
      const updatedSession = await sessionRepo.getSession(testSession.sessionId);
      expect(updatedSession.status).toBe('COMPLETED');
      expect(updatedSession.metadata?.completedAt).toBeDefined();
    });

    it('should throw DataAccessError when updating non-existent session', async () => {
      await expect(sessionRepo.updateSession('non-existent', { status: 'COMPLETED' }))
        .rejects.toThrow(DataAccessError);
    });

    it('should not allow updating sessionId', async () => {
      await expect(sessionRepo.updateSession(testSession.sessionId, { sessionId: 'new-id' }))
        .rejects.toThrow(DataAccessError);
    });
  });

  describe('listSessionsByUserId', () => {
    it('should list sessions for a user', async () => {
      const sessions = await sessionRepo.listSessionsByUserId(testSession.userId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(testSession);
    });

    it('should return empty array for non-existent user', async () => {
      const sessions = await sessionRepo.listSessionsByUserId('non-existent-user');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('batchCreateSessions', () => {
    it('should create multiple sessions', async () => {
      const sessions = Array.from({ length: 3 }, (_, i) => ({
        ...testSession,
        sessionId: `test-session-${i + 2}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));

      await expect(sessionRepo.batchCreateSessions(sessions)).resolves.not.toThrow();
      
      const userSessions = await sessionRepo.listSessionsByUserId(testSession.userId);
      expect(userSessions).toHaveLength(4); // Original + 3 new sessions
    });

    it('should handle empty array', async () => {
      await expect(sessionRepo.batchCreateSessions([])).resolves.not.toThrow();
    });

    it('should throw DataAccessError with invalid session data', async () => {
      const invalidSessions = [
        { ...testSession, sessionId: undefined } as unknown as Session,
        { ...testSession, sessionId: 'test-session-5' },
      ];
      await expect(sessionRepo.batchCreateSessions(invalidSessions))
        .rejects.toThrow(DataAccessError);
    });
  });

  describe('GSI Queries', () => {
    it('should query by userId', async () => {
      const sessions = await sessionRepo.listSessionsByUserId(testSession.userId);
      expect(sessions).toHaveLength(4); // Original + 3 from batch create
      expect(sessions[0].userId).toBe(testSession.userId);
    });

    it('should return empty array for non-existent userId', async () => {
      const sessions = await sessionRepo.listSessionsByUserId('non-existent-user');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('TTL Handling', () => {
    it('should set TTL correctly', async () => {
      const session = await sessionRepo.getSession(testSession.sessionId);
      expect(session.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should update TTL on session update', async () => {
      const newTTL = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
      await sessionRepo.updateSession(testSession.sessionId, { ttl: newTTL });
      
      const updatedSession = await sessionRepo.getSession(testSession.sessionId);
      expect(updatedSession.ttl).toBe(newTTL);
    });

    it('should throw DataAccessError with invalid TTL', async () => {
      const invalidTTL = Math.floor(Date.now() / 1000) - 3600; // 1 hour in the past
      await expect(sessionRepo.updateSession(testSession.sessionId, { ttl: invalidTTL }))
        .rejects.toThrow(DataAccessError);
    });
  });

  describe('Error Handling', () => {
    it('should wrap DynamoDB errors in DataAccessError', async () => {
      // Temporarily set invalid endpoint to force DynamoDB error
      process.env.DYNAMODB_ENDPOINT = 'http://invalid-endpoint';
      const invalidRepo = new SessionRepository();
      
      await expect(invalidRepo.getSession('test')).rejects.toThrow(DataAccessError);
      
      // Restore valid endpoint
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    });

    it('should include operation and sessionId in error', async () => {
      try {
        await sessionRepo.getSession('non-existent');
      } catch (error) {
        expect(error).toBeInstanceOf(DataAccessError);
        const dataError = error as DataAccessError;
        expect(dataError.operation).toBe('getSession');
        expect(dataError.sessionId).toBe('non-existent');
        expect(dataError.toJSON()).toHaveProperty('operation');
        expect(dataError.toJSON()).toHaveProperty('sessionId');
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary DynamoDB errors', async () => {
      // Simulate temporary error by using invalid endpoint
      process.env.DYNAMODB_ENDPOINT = 'http://invalid-endpoint';
      const invalidRepo = new SessionRepository();
      
      await expect(invalidRepo.getSession('test')).rejects.toThrow(DataAccessError);
      
      // Restore valid endpoint
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
      const validRepo = new SessionRepository();
      
      // Should work after recovery
      const session = await validRepo.getSession(testSession.sessionId);
      expect(session).toEqual(testSession);
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => {
        const session = {
          ...testSession,
          sessionId: `concurrent-session-${i}`,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        };
        return sessionRepo.createSession(session);
      });

      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      const sessions = await sessionRepo.listSessionsByUserId(testSession.userId);
      expect(sessions.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle partial batch failures', async () => {
      const sessions = [
        { ...testSession, sessionId: 'valid-session-1' },
        { ...testSession, sessionId: undefined } as unknown as Session,
        { ...testSession, sessionId: 'valid-session-2' },
      ];

      await expect(sessionRepo.batchCreateSessions(sessions))
        .rejects.toThrow(DataAccessError);
      
      // Verify that valid sessions were not created
      const validSession1 = await sessionRepo.getSession('valid-session-1')
        .catch(() => null);
      const validSession2 = await sessionRepo.getSession('valid-session-2')
        .catch(() => null);
      
      expect(validSession1).toBeNull();
      expect(validSession2).toBeNull();
    });
  });
}); 