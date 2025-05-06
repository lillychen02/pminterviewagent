const { OpenAI } = require('openai');
const { validateInterviewType, validateRoleContext } = require('../model/validators');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let openai;

/**
 * Lambda handler for generating interview prompts
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Object} Response object with generated prompt
 */
exports.handler = async (event, context) => {
  try {
    // Initialize OpenAI client with API key from Secrets Manager
    if (!openai) {
      const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
      const secretResponse = await secretsClient.send(new GetSecretValueCommand({
        SecretId: process.env.OPENAI_API_KEY_SECRET_ARN
      }));
      let apiKey;
      try {
        // Try to parse as JSON and extract apiKey property
        apiKey = JSON.parse(secretResponse.SecretString).apiKey;
      } catch (e) {
        // If parsing fails, treat as raw string
        apiKey = secretResponse.SecretString;
      }
      openai = new OpenAI({
        apiKey: apiKey,
        maxRetries: 3,
        timeout: 30000,
      });
    }

    // For Step Functions, the input is directly in the event
    let { interviewType, roleContext } = event;

    if (!validateInterviewType(interviewType)) {
      throw {
        type: 'ValidationError',
        message: 'Invalid interview type'
      };
    }
    
    // If roleContext is empty, undefined, or null, use a default
    if (!roleContext || typeof roleContext !== 'string' || roleContext.trim() === "") {
      roleContext = "Google Maps";
    }
    if (!validateRoleContext(roleContext)) {
      throw {
        type: 'ValidationError',
        message: 'Invalid role context'
      };
    }

    // Generate prompt using OpenAI
    const prompt = await generatePrompt(interviewType, roleContext);

    return {
      statusCode: 200,
      body: JSON.stringify({
        prompt,
        interviewType,
        roleContext,
      }),
    };
  } catch (error) {
    console.error('Error generating prompt:', error);
    
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

/**
 * Generates an interview prompt using OpenAI
 * @param {string} interviewType - Type of interview (e.g., 'product', 'technical')
 * @param {string} roleContext - Context about the role being interviewed for
 * @returns {Promise<string>} Generated prompt
 */
async function generatePrompt(interviewType, roleContext) {
  try {
    const systemPrompt = `You are an expert interviewer specializing in ${interviewType} interviews. 
      Generate a relevant interview question based on the following role context: ${roleContext}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate a relevant interview question." }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    throw new Error(error.message);
  }
} 