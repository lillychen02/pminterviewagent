const { OpenAI } = require('openai');
const { validateInterviewType, validateRoleContext } = require('./validators');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

/**
 * Lambda handler for generating interview prompts
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Object} Response object with generated prompt
 */
exports.handler = async (event, context) => {
  try {
    // Validate input
    const { interviewType, roleContext } = JSON.parse(event.body);
    
    if (!validateInterviewType(interviewType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid interview type'
        })
      };
    }
    
    if (!validateRoleContext(roleContext)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid role context'
        })
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
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

/**
 * Generates an interview prompt using OpenAI
 * @param {string} interviewType - Type of interview (e.g., 'product', 'technical')
 * @param {string} roleContext - Context about the role being interviewed for
 * @returns {Promise<string>} Generated prompt
 */
async function generatePrompt(interviewType, roleContext) {
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
} 