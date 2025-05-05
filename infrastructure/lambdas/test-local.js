require('dotenv').config();
const { handler } = require('./generatePrompt');

async function testLambda() {
  // Test event
  const event = {
    body: JSON.stringify({
      interviewType: 'product',
      roleContext: 'Senior Product Manager for a B2B SaaS company focusing on AI/ML solutions'
    })
  };

  try {
    console.log('Testing Lambda function with event:', JSON.stringify(event, null, 2));
    const result = await handler(event);
    console.log('Lambda response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testLambda(); 