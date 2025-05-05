const { handler } = require('../generatePrompt');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockGetSecretValue = jest.fn().mockReturnThis();
  const mockPromise = jest.fn().mockResolvedValue({
    SecretString: JSON.stringify({ apiKey: 'test-api-key' })
  });

  return {
    SecretsManager: jest.fn(() => ({
      getSecretValue: mockGetSecretValue,
      promise: mockPromise
    }))
  };
});

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Mocked interview question'
              }
            }]
          })
        }
      }
    }))
  };
});

describe('generatePrompt Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY_SECRET_ARN = 'test-secret-arn';
  });

  it('should generate a prompt for valid input', async () => {
    const event = {
      interviewType: 'product',
      roleContext: 'Product Manager role at a tech startup'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.prompt).toBe('Mocked interview question');
    expect(body.interviewType).toBe('product');
    expect(body.roleContext).toBe('Product Manager role at a tech startup');
  });

  it('should handle invalid interview type', async () => {
    const event = {
      interviewType: 'invalid',
      roleContext: 'Product Manager role at a tech startup'
    };

    await expect(handler(event)).rejects.toThrow();
    try {
      await handler(event);
    } catch (error) {
      const errorObj = JSON.parse(error.message);
      expect(errorObj.type).toBe('ValidationError');
      expect(errorObj.error).toBe('Invalid interview type');
    }
  });

  it('should handle invalid role context', async () => {
    const event = {
      interviewType: 'product',
      roleContext: 'too short'
    };

    await expect(handler(event)).rejects.toThrow();
    try {
      await handler(event);
    } catch (error) {
      const errorObj = JSON.parse(error.message);
      expect(errorObj.type).toBe('ValidationError');
      expect(errorObj.error).toBe('Invalid role context');
    }
  });

  it('should handle OpenAI API errors', async () => {
    const { OpenAI } = require('openai');
    const mockCreate = jest.fn().mockRejectedValue(new Error('OpenAI API Error'));
    
    OpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));

    const event = {
      interviewType: 'product',
      roleContext: 'Product Manager role at a tech startup'
    };

    try {
      await handler(event);
    } catch (error) {
      const errorObj = JSON.parse(error.message);
      expect(errorObj.type).toBe('ApiError');
      expect(errorObj.error).toBe('OpenAI API Error');
    }
  });
}); 