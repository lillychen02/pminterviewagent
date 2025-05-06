import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OpenAIScoringService } from '../context/openai-scoring-service';
import { z } from 'zod';

// Input validation schema
const RequestSchema = z.object({
  transcript: z.string().min(1),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Parse and validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const body = JSON.parse(event.body);
    const { transcript } = RequestSchema.parse(body);

    // Initialize scoring service
    const scoringService = new OpenAIScoringService();
    await scoringService.init();

    // Get interview score
    const score = await scoringService.scoreInterview(transcript);

    return {
      statusCode: 200,
      body: JSON.stringify(score),
    };
  } catch (error) {
    console.error('Error in scoring handler:', error);

    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request format',
          details: error.errors,
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}; 