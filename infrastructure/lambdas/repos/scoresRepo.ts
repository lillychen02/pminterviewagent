import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Score, DataAccessError } from '../model/types';
import { validateEnvVar } from '../config/dynamodb';

export class ScoreRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    validateEnvVar('SCORES_TABLE');
    validateEnvVar('DYNAMODB_ENDPOINT');

    const client = new DynamoDBClient({
      endpoint: process.env.DYNAMODB_ENDPOINT,
    });

    this.client = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.SCORES_TABLE!;
  }

  async createScore(score: Score): Promise<void> {
    try {
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: score,
        ConditionExpression: 'attribute_not_exists(scoreId)',
      }));
    } catch (error) {
      throw new DataAccessError(
        'Failed to create score',
        'createScore',
        undefined,
        score.scoreId,
        error
      );
    }
  }

  async getScore(scoreId: string): Promise<Score> {
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: { scoreId },
      }));

      if (!result.Item) {
        throw new DataAccessError(
          'Score not found',
          'getScore',
          undefined,
          scoreId
        );
      }

      return result.Item as Score;
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw new DataAccessError(
        'Failed to get score',
        'getScore',
        undefined,
        scoreId,
        error
      );
    }
  }

  async updateScore(scoreId: string, updates: Partial<Score>): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'scoreId') return; // Prevent updating the primary key
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      });

      if (updateExpressions.length === 0) return;

      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { scoreId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(scoreId)',
      }));
    } catch (error) {
      throw new DataAccessError(
        'Failed to update score',
        'updateScore',
        undefined,
        scoreId,
        error
      );
    }
  }

  async listScoresBySessionId(sessionId: string): Promise<Score[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'sessionId-index',
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: {
          ':sessionId': sessionId,
        },
      }));

      return (result.Items || []) as Score[];
    } catch (error) {
      throw new DataAccessError(
        'Failed to list scores by session',
        'listScoresBySessionId',
        sessionId,
        undefined,
        error
      );
    }
  }

  async listScoresByUserId(userId: string): Promise<Score[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }));

      return (result.Items || []) as Score[];
    } catch (error) {
      throw new DataAccessError(
        'Failed to list scores by user',
        'listScoresByUserId',
        undefined,
        undefined,
        error
      );
    }
  }

  async batchCreateScores(scores: Score[]): Promise<void> {
    if (scores.length === 0) return;

    try {
      const batchSize = 25; // DynamoDB batch write limit
      for (let i = 0; i < scores.length; i += batchSize) {
        const batch = scores.slice(i, i + batchSize);
        await this.client.send(new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map(score => ({
              PutRequest: {
                Item: score,
              },
            })),
          },
        }));
      }
    } catch (error) {
      throw new DataAccessError(
        'Failed to batch create scores',
        'batchCreateScores',
        undefined,
        undefined,
        error
      );
    }
  }
} 