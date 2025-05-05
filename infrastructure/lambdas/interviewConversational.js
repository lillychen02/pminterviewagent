const ElevenLabsService = require('./services/elevenlabs');

/**
 * Lambda handler for processing interview conversation using ElevenLabs
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Object} Response object with audio and transcript
 */
exports.handler = async (event, context) => {
  const elevenlabs = new ElevenLabsService();

  try {
    // Extract input from the event
    const { audioData, prompt } = event;

    if (!audioData) {
      throw {
        type: 'ValidationError',
        message: 'Audio data is required'
      };
    }

    if (!prompt) {
      throw {
        type: 'ValidationError',
        message: 'Prompt is required'
      };
    }

    // Convert audio buffer to base64
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Convert speech to text
    const transcript = await elevenlabs.speechToText(audioBuffer);

    // Generate interviewer's response audio
    const responseAudio = await elevenlabs.textToSpeech(prompt);

    return {
      statusCode: 200,
      body: JSON.stringify({
        transcript,
        audioResponse: responseAudio.toString('base64'),
        prompt
      })
    };
  } catch (error) {
    console.error('Error in conversational handler:', error);

    // Format error for Step Functions
    if (error.type === 'ValidationError') {
      throw new Error(JSON.stringify({
        error: error.message,
        type: 'ValidationError'
      }));
    } else {
      throw new Error(JSON.stringify({
        error: error.message || error.toString(),
        type: 'ApiError'
      }));
    }
  }
}; 