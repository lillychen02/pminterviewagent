import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Session, DataAccessError } from '../model/types';
import { validateEnvVar } from '../config/dynamodb';

export class SessionRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    validateEnvVar('SESSIONS_TABLE');
    validateEnvVar('DYNAMODB_ENDPOINT');

    const client = new DynamoDBClient({
      endpoint: process.env.DYNAMODB_ENDPOINT,
    });

    this.client = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.SESSIONS_TABLE!;
  }

  async createSession(session: Session): Promise<void> {
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: session,
        ConditionExpression: 'attribute_not_exists(sessionId)',
      }));
    } catch (error) {
      throw new DataAccessError(
        'Failed to create session',
        'createSession',
        session.sessionId,
        undefined,
        error
      );
    }
  }

  async getSession(sessionId: string): Promise<Session> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: { sessionId },
      }));

      if (!result.Item) {
        throw new DataAccessError(
          'Session not found',
          'getSession',
          sessionId
        );
      }

      return result.Item as Session;
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw new DataAccessError(
        'Failed to get session',
        'getSession',
        sessionId,
        undefined,
        error
      );
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'sessionId') return; // Prevent updating the primary key
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      });

      if (updateExpressions.length === 0) return;

      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { sessionId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(sessionId)',
      }));
    } catch (error) {
      throw new DataAccessError(
        'Failed to update session',
        'updateSession',
        sessionId,
        undefined,
        error
      );
    }
  }

  async listSessionsByUserId(userId: string): Promise<Session[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }));

      return (result.Items || []) as Session[];
    } catch (error) {
      throw new DataAccessError(
        'Failed to list sessions by user',
        'listSessionsByUserId',
        undefined,
        undefined,
        error
      );
    }
  }

  async batchCreateSessions(sessions: Session[]): Promise<void> {
    if (sessions.length === 0) return;

    try {
      const batchSize = 25; // DynamoDB batch write limit
      for (let i = 0; i < sessions.length; i += batchSize) {
        const batch = sessions.slice(i, i + batchSize);
        await this.client.send(new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map(session => ({
              PutRequest: {
                Item: session,
              },
            })),
          },
        }));
      }
    } catch (error) {
      throw new DataAccessError(
        'Failed to batch create sessions',
        'batchCreateSessions',
        undefined,
        undefined,
        error
      );
    }
  }
} 