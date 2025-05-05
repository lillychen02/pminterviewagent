const { handler } = require('../interviewConversational');

// Mock ElevenLabs service
jest.mock('../services/elevenlabs', () => {
  return jest.fn().mockImplementation(() => ({
    speechToText: jest.fn().mockResolvedValue('Mocked transcript'),
    textToSpeech: jest.fn().mockResolvedValue(Buffer.from('Mocked audio response'))
  }));
});

describe('interviewConversational Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ELEVENLABS_API_KEY_SECRET_ARN = 'test-secret-arn';
  });

  it('should process audio and return transcript with response', async () => {
    const event = {
      audioData: Buffer.from('test audio').toString('base64'),
      prompt: 'Tell me about your experience'
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.transcript).toBe('Mocked transcript');
    expect(Buffer.from(body.audioResponse, 'base64').toString()).toBe('Mocked audio response');
    expect(body.prompt).toBe('Tell me about your experience');
  });

  it('should handle missing audio data', async () => {
    const event = {
      prompt: 'Tell me about your experience'
    };

    try {
      await handler(event);
      fail('Expected an error to be thrown');
    } catch (error) {
      const errorObj = JSON.parse(error.message);
      expect(errorObj.type).toBe('ValidationError');
      expect(errorObj.error).toBe('Audio data is required');
    }
  });

  it('should handle missing prompt', async () => {
    const event = {
      audioData: Buffer.from('test audio').toString('base64')
    };

    try {
      await handler(event);
      fail('Expected an error to be thrown');
    } catch (error) {
      const errorObj = JSON.parse(error.message);
      expect(errorObj.type).toBe('ValidationError');
      expect(errorObj.error).toBe('Prompt is required');
    }
  });

  it('should handle ElevenLabs API errors', async () => {
    const ElevenLabsService = require('../services/elevenlabs');
    const mockCreate = jest.fn().mockRejectedValue(new Error('ElevenLabs API Error'));
    
    ElevenLabsService.mockImplementationOnce(() => ({
      speechToText: jest.fn().mockRejectedValue(new Error('ElevenLabs API Error')),
      textToSpeech: jest.fn()
    }));

    const event = {
      audioData: Buffer.from('test audio').toString('base64'),
      prompt: 'Tell me about your experience'
    };

    try {
      await handler(event);
      fail('Expected an error to be thrown');
    } catch (error) {
      const errorObj = JSON.parse(error.message);
      expect(errorObj.type).toBe('ApiError');
      expect(errorObj.error).toBe('ElevenLabs API Error');
    }
  });
}); 