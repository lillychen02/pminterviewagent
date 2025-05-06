import { ScoringService, Score, ScoreSchema } from '../model/scoring-model';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { OpenAI } from 'openai';

export class OpenAIScoringService implements ScoringService {
  private openai: OpenAI | null = null;
  private secretsManager: SecretsManager;

  constructor() {
    this.secretsManager = new SecretsManager({
      region: process.env.AWS_REGION,
    });
  }

  async init(): Promise<void> {
    const secretResponse = await this.secretsManager.getSecretValue({
      SecretId: process.env.OPENAI_API_KEY_SECRET_ARN!,
    });
    
    if (!secretResponse.SecretString) {
      throw new Error('OpenAI API key not found in Secrets Manager');
    }

    this.openai = new OpenAI({
      apiKey: secretResponse.SecretString,
    });
  }

  async scoreInterview(transcript: string): Promise<Score> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Call init() first.');
    }

    const prompt = `
      Please evaluate this PM interview response. Provide a structured evaluation with scores and feedback.
      Score each criterion from 1-10:
      - Clarity: How clear and well-articulated is the response?
      - Relevance: How well does it address the question?
      - Depth: How thorough and detailed is the analysis?
      - Structure: How well-organized is the response?
      - Examples: How effectively are examples used?

      Also provide:
      - Key strengths (list 2-3 points)
      - Areas for improvement (list 2-3 points)
      - Brief summary feedback

      Transcript:
      ${transcript}

      Respond in JSON format matching this structure:
      {
        "criteria": {
          "clarity": number,
          "relevance": number,
          "depth": number,
          "structure": number,
          "examples": number
        },
        "feedback": {
          "strengths": string[],
          "improvements": string[],
          "summary": string
        },
        "overallScore": number,
        "timestamp": string (ISO date)
      }
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert PM interviewer who provides detailed, structured feedback."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    const rawScore = JSON.parse(content);
    return this.validateScore(rawScore);
  }

  validateScore(score: unknown): Score {
    return ScoreSchema.parse(score);
  }
} 