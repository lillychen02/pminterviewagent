const { handler } = require('../generatePrompt');
const { validateInterviewType, validateRoleContext } = require('../validators');

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    })),
    mockCreate // Export the mock for test control
  };
});

// Mock validators
jest.mock('../validators', () => ({
  validateInterviewType: jest.fn(),
  validateRoleContext: jest.fn()
}));

describe('generatePrompt Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Reset OpenAI mock to successful response
    const { mockCreate } = require('openai');
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: 'Mocked interview question'
        }
      }]
    });
  });

  it('should generate a prompt for valid input', async () => {
    // Setup
    validateInterviewType.mockReturnValue(true);
    validateRoleContext.mockReturnValue(true);
    
    const event = {
      body: JSON.stringify({
        interviewType: 'product',
        roleContext: 'Product Manager role at a tech startup'
      })
    };

    // Execute
    const response = await handler(event);

    // Verify
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.prompt).toBe('Mocked interview question');
    expect(body.interviewType).toBe('product');
    expect(body.roleContext).toBe('Product Manager role at a tech startup');
  });

  it('should return 400 for invalid interview type', async () => {
    // Setup
    validateInterviewType.mockReturnValue(false);
    validateRoleContext.mockReturnValue(true);
    
    const event = {
      body: JSON.stringify({
        interviewType: 'invalid',
        roleContext: 'Product Manager role at a tech startup'
      })
    };

    // Execute
    const response = await handler(event);

    // Verify
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid interview type');
  });

  it('should return 400 for invalid role context', async () => {
    // Setup
    validateInterviewType.mockReturnValue(true);
    validateRoleContext.mockReturnValue(false);
    
    const event = {
      body: JSON.stringify({
        interviewType: 'product',
        roleContext: 'too short'
      })
    };

    // Execute
    const response = await handler(event);

    // Verify
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid role context');
  });

  it('should handle OpenAI API errors', async () => {
    // Setup
    validateInterviewType.mockReturnValue(true);
    validateRoleContext.mockReturnValue(true);
    
    const event = {
      body: JSON.stringify({
        interviewType: 'product',
        roleContext: 'Product Manager role at a tech startup'
      })
    };

    // Mock OpenAI error
    const { mockCreate } = require('openai');
    mockCreate.mockRejectedValue(new Error('API Error'));

    // Execute
    const response = await handler(event);

    // Verify
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('API Error');
  });
}); 